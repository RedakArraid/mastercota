import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { rateLimit, clientAddress } from "./lib/security.js";
import { amountField, phoneField, textField, settingsField, optionalUrl, requestIdField } from "./lib/validation.js";
import { query, transaction } from "./lib/db.js";
import {
  bearerUser,
  generateOtp,
  hashOtp,
  signSession,
  verifyToken,
} from "./lib/auth.js";
import { sendOtpWhatsApp, isOpenWaActive } from "./lib/openwa.js";
import { paystackFetch } from "./lib/paystack.js";
import { generateSlug } from "./lib/format.js";
import { feesFromNet } from "./lib/fees.js";
import {
  FREE_DURATION_DAYS,
  MAX_DURATION_DAYS,
  activatePlatformPayment,
  activatePispiPlatformPayment,
  deadlineFromDuration,
  freeEligibleForPhone,
  getOwnerPhone,
  initializePlatformFeePaystack,
  initializePlatformFeePispi,
  quoteDuration,
  canExtend,
  EXTENSION_DAYS,
} from "./lib/billing.js";
import { normalizeWavePhone, normalizeWavePayLink } from "./lib/wave.js";
import { getPispiRequestToPay, pispiStatus, pispiWebhookTxIds, verifyPispiWebhookSignature } from "./lib/pispi.js";
import { activePlatformPaymentProvider, assertPlatformPaymentProviderAvailable, type PlatformPaymentProvider } from "./lib/platform-payment-provider.js";
import { adminRoutes } from "./admin.js";
import { runtimeReadiness } from "./lib/runtime-readiness.js";

export const app = new Hono();
const COOKIE = "mc_session";

const APP_ORIGIN = (process.env.APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const ADMIN_ORIGIN = APP_ORIGIN.replace("://", "://admin.");
const ALLOWED_ORIGINS = new Set([
  APP_ORIGIN,
  ADMIN_ORIGIN,
  ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"]),
]);

function cookieDomain(): string | undefined {
  try {
    const host = new URL(APP_ORIGIN).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return undefined;
    return `.${host.replace(/^www\./, "")}`;
  } catch {
    return undefined;
  }
}

app.use(
  "*",
  cors({
    origin: (origin) =>
      origin && ALLOWED_ORIGINS.has(origin) ? origin : APP_ORIGIN,
    credentials: true,
  })
);

app.use("*", secureHeaders());
app.use("*", bodyLimit({ maxSize: 128 * 1024, onError: c => c.json({ error: "Requête trop volumineuse" }, 413) }));
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  const providerWebhook = c.req.path === "/api/paystack/webhook" || c.req.path === "/api/pispi/webhook";
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !providerWebhook) {
    const origin = c.req.header("origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) return c.json({ error: "Origine non autorisée" }, 403);
    if (!c.req.header("content-type")?.includes("application/json")) return c.json({ error: "Content-Type application/json requis" }, 415);
  }
  await next();
  if (c.res.status === 401 && getCookie(c, COOKIE)) {
    const domain = cookieDomain();
    deleteCookie(c, COOKIE, { path: "/", ...(domain ? { domain } : {}) });
  }
});
app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return c.json({ error: "JSON invalide" }, 400);
  console.error("[api]", c.req.method, c.req.path, error.name);
  return c.json({ error: "Une erreur est survenue. Réessayez." }, 500);
});

app.get("/health", c => c.json({ ok: true, service: "mastercota-backend" }));
app.get("/ready", async c => {
  const readiness = await runtimeReadiness();
  return c.json(readiness, readiness.ok ? 200 : 503);
});

app.post("/api/auth/send-otp", async c => {
  const phone = phoneField((await c.req.json()).phone);
  await rateLimit(`otp-send-ip:${clientAddress(c)}`, 30, 3600);
  await rateLimit(`otp-send-minute:${phone}`, 1, 60);
  await rateLimit(`otp-send-hour:${phone}`, 5, 3600);
  const active = await isOpenWaActive();
  const devCode = process.env.NODE_ENV !== "production" ? process.env.OTP_DEV_CODE : undefined;
  if (!active && !devCode) return c.json({ error: "Connexion WhatsApp temporairement indisponible" }, 503);
  const code = devCode || generateOtp();
  const id = await transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`otp:${phone}`]);
    await client.query("UPDATE otp_codes SET consumed_at = now() WHERE phone = $1 AND consumed_at IS NULL", [phone]);
    const { rows } = await client.query("INSERT INTO otp_codes (phone, code_hash, expires_at) VALUES ($1,$2,now() + interval '10 minutes') RETURNING id", [phone, hashOtp(code)]);
    return rows[0].id;
  });
  try {
    if (active) await sendOtpWhatsApp(phone, code);
  } catch {
    await query("UPDATE otp_codes SET consumed_at = now() WHERE id = $1", [id]);
    return c.json({ error: "Envoi WhatsApp impossible. Réessayez dans une minute." }, 503);
  }
  return c.json({ ok: true });
});

app.post("/api/auth/verify-otp", async c => {
  const body = await c.req.json();
  const phone = phoneField(body.phone);
  const token = textField(body.token, "Code", 6);
  if (!/^\d{6}$/.test(token)) return c.json({ error: "Code à 6 chiffres requis" }, 400);
  await rateLimit(`otp-verify-ip:${clientAddress(c)}`, 100, 600);
  await rateLimit(`otp-verify:${phone}`, 10, 600);
  const valid = await transaction(async client => {
    const { rows } = await client.query(`SELECT * FROM otp_codes WHERE phone = $1 AND consumed_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [phone]);
    const otp = rows[0];
    if (!otp || otp.attempts >= 5) return false;
    if (otp.code_hash !== hashOtp(token)) {
      await client.query("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1", [otp.id]);
      return false;
    }
    await client.query("UPDATE otp_codes SET consumed_at = now() WHERE id = $1", [otp.id]);
    return true;
  });
  if (!valid) return c.json({ error: "Code invalide ou expiré" }, 401);
  const bootstrap = (process.env.ADMIN_PHONES || "").split(",").map(p => p.trim());
  const { rows } = await query(`INSERT INTO users (phone, role) VALUES ($1,$2) ON CONFLICT (phone) DO UPDATE SET role = CASE WHEN $2 = 'admin' THEN 'admin' ELSE users.role END RETURNING *`, [phone, bootstrap.includes(phone) ? "admin" : "user"]);
  const user = rows[0];
  const jwt = await signSession({ id: user.id, phone: user.phone, session_version: user.session_version });
  const domain = cookieDomain();
  setCookie(c, COOKIE, jwt, { httpOnly: true, sameSite: "Lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30, ...(domain ? { domain } : {}) });
  return c.json({ token: jwt, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
});

async function requireUser(c: Parameters<typeof getCookie>[0]) {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "") || getCookie(c, COOKIE);
  return token ? verifyToken(token) : null;
}

app.post("/api/auth/logout", async c => {
  const session = await requireUser(c);
  if (session) await query("UPDATE users SET session_version = session_version + 1 WHERE id = $1", [session.id]);
  const domain = cookieDomain();
  deleteCookie(c, COOKIE, { path: "/", ...(domain ? { domain } : {}) });
  return c.json({ ok: true });
});

app.get("/api/auth/me", async c => {
  const session = await requireUser(c);
  if (!session) return c.json({ user: null }, 401);
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [session.id]);
  return c.json({ user: rows[0] });
});

export async function autoCloseExpiredCotisations() {
  await query("UPDATE cotisations SET status = 'closed', close_reason = 'expired' WHERE status = 'active' AND deadline < CURRENT_DATE");
  await query("DELETE FROM request_limits WHERE expires_at < now() - interval '1 day'");
  await query("DELETE FROM otp_codes WHERE expires_at < now() - interval '1 day'");
}

// ── Cotisations ─────────────────────────────────────────
app.get("/api/cotisations", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  await query("UPDATE cotisations SET status='closed', close_reason='expired' WHERE owner_id=$1 AND status='active' AND deadline<CURRENT_DATE", [session.id]);
  const { rows } = await query(
    `SELECT * FROM cotisations WHERE owner_id = $1 ORDER BY created_at DESC`,
    [session.id]
  );
  return c.json({ cotisations: rows });
});

app.post("/api/cotisations", async c => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  const title = textField(body.title, "Titre", 160);
  const description = textField(body.description, "Description", 5000, false);
  const target = amountField(body.target_amount);
  const settings = settingsField(body.settings ?? {});
  const cover = optionalUrl(body.cover_url);
  const requestId = requestIdField(body.request_id);
  if (!Number.isInteger(body.duration_days) || (body.use_free !== undefined && typeof body.use_free !== "boolean")) return c.json({ error: "Durée ou offre invalide" }, 400);
  const payload = JSON.stringify({ title, description, target, settings, cover, duration_days: body.duration_days, use_free: body.use_free === true });
  const cotisation = await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`create:${session.id}:${requestId}`]);
    const { rows: previous } = await client.query('SELECT *, request_payload = $3::jsonb AS same_request FROM cotisations WHERE owner_id = $1 AND request_id = $2', [session.id, requestId, payload]);
    if (previous[0]) {
      if (!previous[0].same_request) throw new HTTPException(409, { message: 'Cette requête a déjà créé une cotisation avec des informations différentes' });
      delete previous[0].same_request;
      return previous[0];
    }
    const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [session.id]);
    const user = users[0];
    const mode = user.wave_payout_mode || (user.wave_pay_link ? "business" : "phone");
    if (!(mode === "business" ? user.wave_pay_link : user.wave_phone)) throw new HTTPException(400, { message: "Configurez votre réception Wave avant de créer une cotisation" });
    await client.query("INSERT INTO phone_entitlements (phone) VALUES ($1) ON CONFLICT DO NOTHING", [user.phone]);
    const { rows: entitlements } = await client.query("SELECT * FROM phone_entitlements WHERE phone = $1 FOR UPDATE", [user.phone]);
    const quote = quoteDuration({ durationDays: body.duration_days, freeEligible: entitlements[0].free_cotisations_used < 1, useFree: body.use_free === true });
    if (!quote || (body.use_free && !quote.isFree)) throw new HTTPException(400, { message: "Offre gratuite déjà utilisée ou durée invalide (1 à 60 jours)" });
    const { rows } = await client.query(`INSERT INTO cotisations (title,description,target_amount,deadline,owner_id,cover_url,slug,settings,duration_days,starts_at,platform_fee_amount,platform_fee_status,is_free_tier,status,request_id,request_payload)
      VALUES ($1,$2,$3,CURRENT_DATE + $4::int,$5,$6,$7,$8::jsonb,$4,CURRENT_DATE,$9,$10,$11,$12,$13,$14::jsonb) RETURNING *`,
      [title, description || null, target, quote.durationDays, session.id, cover, generateSlug(title), JSON.stringify(settings), quote.fee, quote.isFree ? "free" : "pending", quote.isFree, quote.isFree ? "active" : "pending_fee", requestId, payload]);
    if (quote.isFree) await client.query("UPDATE phone_entitlements SET free_cotisations_used = free_cotisations_used + 1, updated_at = now() WHERE phone = $1", [user.phone]);
    return rows[0];
  });
  if (cotisation.platform_fee_status !== 'pending') return c.json({ cotisation, payment_required: false }, 201);
  const activeProvider = await activePlatformPaymentProvider();
  if (activeProvider === "pispi") {
    const { rows: latest } = await query('SELECT * FROM cotisations WHERE id=$1', [cotisation.id]);
    return c.json({
      cotisation: latest[0],
      payment_required: true,
      payment_action_required: "payment_identifier",
    }, 201);
  }
  try {
    const payment = await initializePlatformFeePaystack({ userId: session.id, phone: session.phone, cotisationId: cotisation.id, purpose: "create", amount: Number(cotisation.platform_fee_amount), durationDays: cotisation.duration_days, callbackPath: `/cotisation/${cotisation.id}/frais` });
    const { rows: latest } = await query('SELECT * FROM cotisations WHERE id=$1', [cotisation.id]);
    return c.json({ cotisation: latest[0], ...publicCheckout(payment) }, 201);
  } catch {
    // The saved cotisation can be resumed; never tell a client to create it again.
    const { rows: latest } = await query('SELECT * FROM cotisations WHERE id=$1', [cotisation.id]);
    return c.json({ cotisation: latest[0], reference: latest[0].platform_fee_reference, payment_required: latest[0].platform_fee_status === 'pending', payment_error: "Cotisation enregistrée. Ouvrez-la pour reprendre le paiement des frais." }, 201);
  }
});

app.get("/api/cotisations/billing-quote", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const durationDays = Number(c.req.query("duration_days"));
  const useFree = c.req.query("use_free") === "1" || c.req.query("use_free") === "true";
  const phone = await getOwnerPhone(session.id);
  if (!phone) return c.json({ error: "Profil introuvable" }, 400);
  const freeEligible = await freeEligibleForPhone(phone);
  const quote = quoteDuration({
    durationDays,
    freeEligible,
    useFree,
  });
  if (!quote) {
    return c.json({ error: `Durée invalide (1–${MAX_DURATION_DAYS} jours)` }, 400);
  }
  return c.json({
    quote,
    freeEligible,
    freeDurationDays: FREE_DURATION_DAYS,
    maxDurationDays: MAX_DURATION_DAYS,
    presets: [
      { days: 15, fee: 2000 },
      { days: 35, fee: 4000 },
      { days: 60, fee: 10_000 },
    ],
    extension: { days: 10, fee: 2000 },
  });
});

app.get("/api/cotisations/billing-info", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const phone = await getOwnerPhone(session.id);
  if (!phone) return c.json({ error: "Profil introuvable" }, 400);
  const freeEligible = await freeEligibleForPhone(phone);
  return c.json({
    freeEligible,
    freeDurationDays: FREE_DURATION_DAYS,
    maxDurationDays: MAX_DURATION_DAYS,
    presets: [
      { days: 15, fee: 2000, label: "15 jours" },
      { days: 35, fee: 4000, label: "35 jours" },
      { days: 60, fee: 10_000, label: "60 jours" },
    ],
    extension: { days: 10, fee: 2000 },
  });
});

function publicCheckout(payment: Record<string, any>) {
  return {
    payment_required: payment.payment_required === true,
    ...(payment.authorization_url ? { authorization_url: payment.authorization_url } : {}),
    ...(payment.reference ? { reference: payment.reference } : {}),
    ...(payment.application_status ? { application_status: payment.application_status } : {}),
    ...(payment.review_reason ? { review_reason: payment.review_reason } : {}),
    ...(payment.review_resolved_at ? { review_resolved_at: payment.review_resolved_at } : {}),
    ...(payment.review_resolution_note ? { review_resolution_note: payment.review_resolution_note } : {}),
    payment_status: payment.payment_required === false ? "paid" : "pending",
  };
}

function publicCotisation(cot: Record<string, any>) {
  const settings = cot.settings ?? {};
  return {
    id: cot.id, slug: cot.slug, title: cot.title, description: cot.description,
    cover_url: cot.cover_url, status: cot.status, close_reason: cot.close_reason, deadline: cot.deadline, created_at: cot.created_at,
    settings, owner_name: cot.owner_name,
    owner_wave_phone: cot.owner_wave_payout_mode === "business" ? null : cot.owner_wave_phone,
    owner_wave_pay_link: cot.owner_wave_payout_mode === "phone" ? null : cot.owner_wave_pay_link,
    owner_wave_payout_mode: cot.owner_wave_payout_mode,
    current_amount: settings.show_progress === false ? 0 : cot.current_amount,
    target_amount: settings.show_target_amount === false ? 0 : cot.target_amount,
    progress_percent: settings.show_progress === false ? 0 : Math.min(100, Number(cot.current_amount) / Number(cot.target_amount) * 100),
  };
}

async function ownerCotisation(cot: Record<string, any>) {
  const { rows: payments } = await query("SELECT status,application_status,review_reason,review_resolved_at,review_resolved_by,review_resolution_note,COALESCE(provider_reference,paystack_reference) AS reference,purpose FROM platform_payments WHERE cotisation_id=$1 ORDER BY (application_status='review_required' AND review_resolved_at IS NULL) DESC, created_at DESC LIMIT 1", [cot.id]);
  const today = (await query('SELECT CURRENT_DATE::text AS today')).rows[0].today;
  const feeValid = ['free', 'paid', 'waived', 'none'].includes(cot.platform_fee_status);
  const ext = canExtend({ startsAt: cot.starts_at, deadline: cot.deadline, extensionCount: Number(cot.extension_count) });
  const extensionError = !feeValid || cot.status === 'pending_fee' ? 'Payez d’abord les frais de création' : Number(cot.current_amount) >= Number(cot.target_amount) ? 'L’objectif est atteint. Augmentez-le avant de demander une prolongation.' : !ext.ok ? ext.error : ext.newDeadline < today ? 'La prolongation serait déjà expirée' : payments[0]?.application_status === 'review_required' && !payments[0].review_resolved_at ? 'Un paiement doit être examiné par le support' : null;
  return { ...cot, platform_payment: payments[0] ?? null, lifecycle: {
    can_reopen: cot.status === 'closed' && cot.deadline >= today && feeValid && Number(cot.current_amount) < Number(cot.target_amount),
    can_extend: extensionError === null,
    can_record_contribution: cot.status !== 'pending_fee' && feeValid,
    extension_error: extensionError,
  } };
}

for (const route of ["/api/cotisations/by-slug/:slug", "/api/cotisations/:id"]) {
  app.get(route, async c => {
    const slug = c.req.param("slug");
    const value = slug || c.req.param("id");
    const { rows } = await query(`SELECT c.*, u.wave_phone AS owner_wave_phone, u.wave_pay_link AS owner_wave_pay_link, u.wave_payout_mode AS owner_wave_payout_mode, u.name AS owner_name FROM cotisations c JOIN users u ON u.id = c.owner_id WHERE ${slug ? "c.slug" : "c.id::text"} = $1`, [value]);
    const cot = rows[0];
    if (!cot) return c.json({ error: "Introuvable" }, 404);
    const session = await requireUser(c);
    const owner = session?.id === cot.owner_id;
    if (!owner && cot.status === "pending_fee") return c.json({ error: "Introuvable" }, 404);
    // Enforce expiration at every read, independently of the maintenance timer.
    if (cot.status === "active") {
      const { rows: expired } = await query("UPDATE cotisations SET status = 'closed', close_reason = 'expired' WHERE id = $1 AND status = 'active' AND deadline < CURRENT_DATE RETURNING status, close_reason", [cot.id]);
      if (expired[0]) Object.assign(cot, expired[0]);
    }
    return c.json({ cotisation: owner ? await ownerCotisation(cot) : publicCotisation(cot) });
  });
}

app.patch("/api/cotisations/:id", async c => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  if (body.deadline !== undefined || body.duration_days !== undefined || body.platform_fee_status !== undefined) return c.json({ error: "La durée se modifie uniquement par une prolongation payante" }, 400);
  const cotisation = await transaction(async client => {
    const { rows } = await client.query("SELECT *, deadline < CURRENT_DATE AS expired FROM cotisations WHERE id::text = $1 AND owner_id = $2 FOR UPDATE", [c.req.param("id"), session.id]);
    const cot = rows[0];
    if (!cot) throw new HTTPException(403, { message: "Forbidden" });
    if (body.expected_edit_version !== undefined && (!Number.isInteger(body.expected_edit_version) || body.expected_edit_version !== cot.edit_version)) throw new HTTPException(409, { message: 'La cotisation a été modifiée ailleurs. Rechargez ses informations avant d’enregistrer.' });
    if (body.status !== undefined && body.status !== cot.status) {
      if (!["active", "closed"].includes(body.status) || cot.status === "pending_fee") throw new HTTPException(400, { message: "Transition de statut interdite" });
      if (body.status === "active" && (cot.expired || !["free", "paid", "waived", "none"].includes(cot.platform_fee_status))) throw new HTTPException(400, { message: "Payez les frais ou prolongez la cotisation avant de la réactiver" });
    }
    const target = body.target_amount === undefined ? Number(cot.target_amount) : amountField(body.target_amount);
    let status = body.status ?? cot.status;
    let closeReason = cot.close_reason;
    if (body.status === 'closed') closeReason = 'manual';
    if (body.status === 'active') closeReason = null;
    if (status === 'completed' && Number(cot.current_amount) < target) {
      status = cot.expired ? 'closed' : 'active';
      closeReason = cot.expired ? 'expired' : null;
    }
    if (status === 'active' && cot.expired) { status = 'closed'; closeReason = 'expired'; }
    if (status === "active" && Number(cot.current_amount) >= target) status = "completed";
    const { rows: updated } = await client.query(`UPDATE cotisations AS c SET title=$1, description=$2, target_amount=$3, cover_url=$4, status=$5, settings=$6::jsonb, close_reason=$8, edit_version=c.edit_version+1
      FROM users AS u WHERE c.id=$7 AND u.id=c.owner_id
      RETURNING c.*, u.wave_phone AS owner_wave_phone, u.wave_pay_link AS owner_wave_pay_link, u.wave_payout_mode AS owner_wave_payout_mode, u.name AS owner_name`, [
      body.title === undefined ? cot.title : textField(body.title, "Titre", 160),
      body.description === undefined ? cot.description : textField(body.description, "Description", 5000, false) || null,
      target, body.cover_url === undefined ? cot.cover_url : optionalUrl(body.cover_url), status,
      JSON.stringify(body.settings === undefined ? cot.settings : { ...cot.settings, ...settingsField(body.settings) }), cot.id, closeReason]);
    return updated[0];
  });
  return c.json({ cotisation: await ownerCotisation(cotisation) });
});

app.get("/api/cotisations/:id/contributions", async c => {
  const session = await requireUser(c);
  const { rows: cots } = await query("SELECT * FROM cotisations WHERE id::text = $1", [c.req.param("id")]);
  const cot = cots[0];
  if (!cot || (cot.status === "pending_fee" && session?.id !== cot.owner_id)) return c.json({ error: "Introuvable" }, 404);
  if (session?.id === cot.owner_id) {
    const { rows } = await query("SELECT * FROM contributions WHERE cotisation_id = $1 ORDER BY created_at DESC", [cot.id]);
    return c.json({ contributions: rows });
  }
  const settings = cot.settings ?? {};
  if (settings.show_contributors === false && settings.show_best_contributor === false) return c.json({ contributions: [] });
  const { rows } = await query(`SELECT id, cotisation_id, contributor_name, amount, status, created_at FROM contributions WHERE cotisation_id = $1 AND status = 'paid' ORDER BY ${settings.show_contributors === false ? "amount DESC, created_at ASC LIMIT 1" : "created_at DESC LIMIT 100"}`, [cot.id]);
  return c.json({ contributions: rows });
});

app.post("/api/cotisations/:id/contributions", async c => {
  const session = await requireUser(c);
  const body = await c.req.json();
  const manual = body.payment_method === "manual";
  const amount = amountField(body.amount);
  const phone = phoneField(body.contributor_phone);
  const note = textField(body.note, "Note", 500, false) || null;
  const requestId = requestIdField(body.request_id);
  if (!manual) await rateLimit(`contribution:${clientAddress(c)}`, 60, 3600);
  const result = await transaction(async client => {
    const { rows: cots } = await client.query(`SELECT c.*, c.deadline < CURRENT_DATE AS expired, u.wave_payout_mode, u.wave_phone, u.wave_pay_link FROM cotisations c JOIN users u ON u.id=c.owner_id WHERE c.id::text=$1 FOR UPDATE OF c`, [c.req.param("id")]);
    const cot = cots[0];
    if (!cot) throw new HTTPException(404, { message: "Cotisation introuvable" });
    if (manual && session?.id !== cot.owner_id) throw new HTTPException(403, { message: "Forbidden" });
    const name = textField(body.contributor_name, "Nom", 100, false) || "Anonyme";
    if (requestId) {
      const { rows } = await client.query("SELECT * FROM contributions WHERE cotisation_id = $1 AND request_id = $2", [cot.id, requestId]);
      if (rows[0]) {
        if (rows[0].contributor_phone !== phone || rows[0].contributor_name !== name || rows[0].note !== note || Number(rows[0].amount) !== amount || (rows[0].payment_method === "manual") !== manual) throw new HTTPException(409, { message: "Identifiant déjà utilisé" });
        return rows[0];
      }
    }
    if (cot.status === 'pending_fee' || cot.platform_fee_status === 'pending') throw new HTTPException(400, { message: 'Payez les frais de création avant d’enregistrer des contributions' });
    // This endpoint records money already transferred. Closing collection or changing its minimum must not hide a receipt.
    if (cot.status === 'active' && cot.expired) await client.query("UPDATE cotisations SET status='closed', close_reason='expired' WHERE id=$1", [cot.id]);
    const mode = cot.wave_payout_mode || (cot.wave_pay_link ? "business" : "phone");
    const { rows } = await client.query(`INSERT INTO contributions (cotisation_id, contributor_name, contributor_phone, amount, status, payment_method, note, request_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [cot.id, name, phone, amount, manual ? "paid" : "awaiting_confirmation", manual ? "manual" : mode === "business" ? "wave_business" : "wave_p2p", note, requestId ?? null]);
    if (!manual) await client.query("INSERT INTO notifications (user_id,title,body,cotisation_id) VALUES ($1,$2,$3,$4)", [cot.owner_id, "Contribution à vérifier", `${name} signale un paiement de ${amount} FCFA. Vérifiez sa réception dans Wave.`, cot.id]);
    return rows[0];
  });
  return c.json({ contribution: manual ? result : { id: result.id, status: result.status, amount: result.amount } }, 201);
});

for (const action of ["confirm", "reject"] as const) {
  app.post(`/api/contributions/:id/${action}`, async c => {
    const session = await requireUser(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const contribution = await transaction(async client => {
      const { rows } = await client.query(`SELECT c.*, cot.owner_id FROM contributions c JOIN cotisations cot ON cot.id = c.cotisation_id WHERE c.id::text = $1 FOR UPDATE OF c`, [c.req.param("id")]);
      const row = rows[0];
      if (!row) throw new HTTPException(404, { message: "Introuvable" });
      if (row.owner_id !== session.id) throw new HTTPException(403, { message: "Forbidden" });
      const target = action === "confirm" ? "paid" : "rejected";
      if (row.status === target) return row;
      if (row.status !== "awaiting_confirmation" || !["wave_business", "wave_p2p"].includes(row.payment_method)) throw new HTTPException(400, { message: "Cette contribution ne peut plus être modifiée" });
      const { rows: updated } = await client.query("UPDATE contributions SET status = $2 WHERE id = $1 RETURNING *", [row.id, target]);
      return updated[0];
    });
    return c.json({ contribution });
  });
}

app.get("/api/notifications", async c => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { rows } = await query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100", [session.id]);
  return c.json({ notifications: rows });
});
app.post("/api/notifications/read", async c => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { id } = await c.req.json();
  await query("UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL AND ($2::text IS NULL OR id::text=$2)", [session.id, id ?? null]);
  return c.json({ ok: true });
});


// ── Paystack ────────────────────────────────────────────
// Contributions go directly to Wave; keep historical verification only.
app.post("/api/paystack/initialize", c => c.json({ error: "Mettez l'application à jour pour contribuer via Wave" }, 410));

async function applyCharge(charge: { reference: string; status: string; amount: number; currency: string; channel?: string }) {
  const { rows: fees } = await query("SELECT id FROM platform_payments WHERE paystack_reference=$1", [charge.reference]);
  if (fees[0]) return activatePlatformPayment(charge.reference, charge);
  const { rows } = await query("UPDATE contributions SET status='paid', payment_method=$2 WHERE paystack_reference=$1 AND status='pending' AND amount * 100=$3 AND $4='XOF' RETURNING id", [charge.reference, charge.channel || "mobile_money", charge.amount, charge.currency]);
  if (rows[0]) return { ok: true };
  const { rows: paid } = await query("SELECT id FROM contributions WHERE paystack_reference=$1 AND status='paid' AND amount * 100=$2 AND $3='XOF'", [charge.reference, charge.amount, charge.currency]);
  return paid[0] ? { ok: true } : { ok: false, error: "Paiement inconnu ou incohérent" };
}
app.post("/api/paystack/webhook", async c => {
  const signature = c.req.header("x-paystack-signature") ?? "";
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !/^[a-f0-9]{128}$/i.test(signature)) return c.json({ error: "Signature invalide" }, 401);
  const text = await c.req.text();
  const hash = createHmac("sha512", secret).update(text).digest();
  if (!timingSafeEqual(hash, Buffer.from(signature, "hex"))) return c.json({ error: "Signature invalide" }, 401);
  const event = JSON.parse(text);
  if (event.event === "charge.success" && event.data?.status === "success") {
    const result = await applyCharge(event.data);
    if (!result.ok) return c.json({ error: result.error }, 503);
  }
  return c.json({ received: true });
});

app.post("/api/pispi/webhook", async c => {
  const raw = await c.req.text();
  if (!verifyPispiWebhookSignature(raw, c.req.header("x-signature"))) {
    return c.json({ error: "Signature invalide" }, 401);
  }
  let payload: unknown;
  try { payload = JSON.parse(raw); }
  catch { return c.json({ error: "JSON invalide" }, 400); }

  for (const txId of pispiWebhookTxIds(payload)) {
    const { rows } = await query(
      "SELECT id,status FROM platform_payments WHERE provider='pispi' AND provider_reference=$1 LIMIT 1",
      [txId]
    );
    if (!rows[0] || rows[0].status === "paid") continue;
    let remote;
    try { remote = await getPispiRequestToPay(txId); }
    catch { return c.json({ error: "Vérification PI-SPI temporairement indisponible" }, 503); }
    const status = pispiStatus(remote);
    if (status === "IRREVOCABLE") {
      const result = await activatePispiPlatformPayment(txId, remote);
      if (!result.ok) return c.json({ error: result.error }, 503);
    } else if (["REJETE", "ANNULE"].includes(status)) {
      await query(
        "UPDATE platform_payments SET status='failed',metadata=metadata || $2::jsonb WHERE id=$1 AND status='pending'",
        [rows[0].id, JSON.stringify({ pispi_status: status, pispi_reason: remote.statutRaison ?? null })]
      );
    } else {
      await query(
        "UPDATE platform_payments SET metadata=metadata || $2::jsonb WHERE id=$1",
        [rows[0].id, JSON.stringify({ pispi_status: status })]
      );
    }
  }
  return c.json({ received: true });
});

app.get("/api/platform-payments/verify/:reference", async c => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const reference = c.req.param("reference");
  const { rows: owned } = await query(
    `SELECT * FROM platform_payments
     WHERE user_id=$2 AND (provider_reference=$1 OR paystack_reference=$1)
     ORDER BY created_at DESC LIMIT 1`,
    [reference, session.id]
  );
  const payment = owned[0];
  if (!payment) return c.json({ error: "Introuvable" }, 404);
  const provider = (payment.provider || "paystack") as PlatformPaymentProvider;
  let providerStatus = payment.status === "paid"
    ? (provider === "pispi" ? "IRREVOCABLE" : "success")
    : String(payment.metadata?.pispi_status || "pending");

  if (payment.status !== "paid") {
    await rateLimit(`verify-fee:${session.id}`, 120, 600);
    if (provider === "pispi") {
      let remote;
      try { remote = await getPispiRequestToPay(reference); }
      catch { return c.json({ error: "Vérification temporairement indisponible" }, 502); }
      providerStatus = pispiStatus(remote);
      if (providerStatus === "IRREVOCABLE") {
        const result = await activatePispiPlatformPayment(reference, remote);
        if (!result.ok) return c.json({ error: result.error }, 409);
      } else if (["REJETE", "ANNULE"].includes(providerStatus)) {
        await query(
          "UPDATE platform_payments SET status='failed',metadata=metadata || $2::jsonb WHERE id=$1 AND status='pending'",
          [payment.id, JSON.stringify({ pispi_status: providerStatus, pispi_reason: remote.statutRaison ?? null })]
        );
      } else {
        await query(
          "UPDATE platform_payments SET metadata=metadata || $2::jsonb WHERE id=$1",
          [payment.id, JSON.stringify({ pispi_status: providerStatus })]
        );
      }
    } else {
      const { ok, data } = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
      if (!ok) return c.json({ error: "Vérification temporairement indisponible" }, 502);
      providerStatus = data.data?.status;
      if (providerStatus === "success") {
        const result = await activatePlatformPayment(reference, data.data);
        if (!result.ok) return c.json({ error: result.error }, 409);
      } else if (["failed", "abandoned", "reversed"].includes(providerStatus)) {
        await query(
          "UPDATE platform_payments SET status='failed',metadata=metadata || $2::jsonb WHERE id=$1 AND status='pending'",
          [payment.id, JSON.stringify({ provider_status: providerStatus })]
        );
      }
    }
  }

  const { rows } = await query(
    `SELECT pp.status,pp.amount,pp.purpose,pp.application_status,pp.review_reason,
            pp.review_resolved_at,pp.review_resolved_by,pp.review_resolution_note,pp.paid_at,pp.created_at,
            c.slug,c.title,c.status AS cotisation_status
     FROM platform_payments pp
     LEFT JOIN cotisations c ON c.id=pp.cotisation_id
     WHERE pp.id=$1`,
    [payment.id]
  );
  const current = rows[0];
  return c.json({
    payment_status: current?.status ?? "pending",
    payment: current ?? null,
  });
});

function paymentIdentifier(body: Record<string, unknown>): string {
  const value = typeof body.payment_identifier === "string" ? body.payment_identifier.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HTTPException(400, { message: "Identifiant de paiement requis" });
  }
  return value;
}

app.post("/api/cotisations/:id/extend", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const provider = await activePlatformPaymentProvider();
  try { assertPlatformPaymentProviderAvailable(provider); }
  catch { return c.json({ error: "Paiement temporairement indisponible" }, 503); }

  const id = c.req.param("id");
  const { rows: owned } = await query<{
    id: string;
    deadline: string;
    starts_at: string;
    extension_count: number;
    status: string;
  }>(
    `SELECT id, deadline, starts_at, extension_count, status
     FROM cotisations WHERE id = $1 AND owner_id = $2`,
    [id, session.id]
  );
  if (!owned[0]) return c.json({ error: "Forbidden" }, 403);
  if (owned[0].status === "pending_fee") return c.json({ error: "Payez d'abord les frais de création" }, 400);
  const ext = canExtend({
    startsAt: owned[0].starts_at,
    deadline: owned[0].deadline,
    extensionCount: Number(owned[0].extension_count),
  });
  if (!ext.ok) return c.json({ error: ext.error }, 400);

  try {
    const payment = provider === "pispi"
      ? await initializePlatformFeePispi({
          userId: session.id,
          cotisationId: id,
          purpose: "extend",
          payerAlias: paymentIdentifier(body),
          metadata: { new_deadline: ext.newDeadline },
        })
      : await (async () => {
          const phone = await getOwnerPhone(session.id);
          if (!phone) throw new Error("Profil introuvable");
          return initializePlatformFeePaystack({
            userId: session.id,
            phone,
            cotisationId: id,
            purpose: "extend",
            amount: ext.fee,
            durationDays: EXTENSION_DAYS,
            callbackPath: `/cotisation/${id}/frais`,
            metadata: { new_deadline: ext.newDeadline },
          });
        })();
    return c.json({
      ...publicCheckout(payment),
      fee: ext.fee,
      extension_days: EXTENSION_DAYS,
      new_deadline: ext.newDeadline,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    return c.json({
      error: /autre moyen|prestataire|PI-SPI|Paystack/i.test(message)
        ? "Un paiement est déjà en cours ou temporairement indisponible. Réessayez plus tard."
        : message,
    }, 400);
  }
});

app.post("/api/cotisations/:id/pay-fee", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const provider = await activePlatformPaymentProvider();
  try { assertPlatformPaymentProviderAvailable(provider); }
  catch { return c.json({ error: "Paiement temporairement indisponible" }, 503); }

  const id = c.req.param("id");
  const { rows: owned } = await query<{
    id: string;
    status: string;
    platform_fee_amount: string;
    platform_fee_status: string;
    duration_days: number | null;
  }>(
    `SELECT id, status, platform_fee_amount, platform_fee_status, duration_days
     FROM cotisations WHERE id = $1 AND owner_id = $2`,
    [id, session.id]
  );
  if (!owned[0]) return c.json({ error: "Forbidden" }, 403);
  if (owned[0].status !== "pending_fee" && owned[0].platform_fee_status !== "pending") {
    return c.json({ error: "Aucun frais en attente" }, 400);
  }
  const fee = Number(owned[0].platform_fee_amount);
  if (!fee || fee <= 0) return c.json({ error: "Montant frais invalide" }, 400);

  try {
    const payment = provider === "pispi"
      ? await initializePlatformFeePispi({
          userId: session.id,
          cotisationId: id,
          purpose: "create",
          payerAlias: paymentIdentifier(body),
        })
      : await (async () => {
          const phone = await getOwnerPhone(session.id);
          if (!phone) throw new Error("Profil introuvable");
          return initializePlatformFeePaystack({
            userId: session.id,
            phone,
            cotisationId: id,
            purpose: "create",
            amount: fee,
            durationDays: owned[0].duration_days ?? undefined,
            callbackPath: `/cotisation/${id}/frais`,
          });
        })();
    return c.json({ ...publicCheckout(payment), fee });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    return c.json({
      error: /autre moyen|prestataire|PI-SPI|Paystack/i.test(message)
        ? "Un paiement est déjà en cours ou temporairement indisponible. Réessayez plus tard."
        : message,
    }, 400);
  }
});

app.get("/api/paystack/verify/:reference", async c => {
  await rateLimit(`verify-legacy:${clientAddress(c)}`, 60, 600);
  const reference = c.req.param("reference");
  const { rows } = await query("SELECT id,status,amount FROM contributions WHERE paystack_reference=$1", [reference]);
  if (!rows[0]) return c.json({ error: "Introuvable" }, 404);
  const { ok, data } = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (!ok) return c.json({ error: "Vérification temporairement indisponible" }, 502);
  if (data.data?.status === "success") {
    const result = await applyCharge(data.data);
    if (!result.ok) return c.json({ error: result.error }, 409);
    rows[0].status = "paid";
  }
  return c.json({ paystack_status: data.data?.status, contribution: rows[0] });
});
app.post("/api/paystack/verify-account", c => c.json({ error: "Configurez Wave depuis votre profil" }, 410));
app.post("/api/paystack/subaccount", c => c.json({ error: "Configurez Wave depuis votre profil" }, 410));



// ── Profile / site / pages ──────────────────────────────
app.get("/api/profile", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [
    session.id,
  ]);
  return c.json({ user: rows[0] ?? null });
});

app.patch("/api/profile", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();

  let wavePhone: string | null | undefined = undefined;
  let wavePayLink: string | null | undefined = undefined;
  let waveMode: "business" | "phone" | null | undefined = undefined;

  if (body.wave_payout_mode !== undefined) {
    const m = body.wave_payout_mode;
    if (m === null || m === "") {
      waveMode = null;
    } else if (m === "business" || m === "phone") {
      waveMode = m;
    } else {
      return c.json({ error: "Mode Wave invalide (business ou phone)" }, 400);
    }
  }

  if (body.wave_phone !== undefined) {
    if (body.wave_phone === null || body.wave_phone === "") {
      wavePhone = null;
    } else {
      wavePhone = phoneField(normalizeWavePhone(String(body.wave_phone)));
      if (!wavePhone) {
        return c.json({ error: "Numéro Wave invalide" }, 400);
      }
    }
  }
  if (body.wave_pay_link !== undefined) {
    if (body.wave_pay_link === null || body.wave_pay_link === "") {
      wavePayLink = null;
    } else {
      wavePayLink = normalizeWavePayLink(String(body.wave_pay_link));
      if (!wavePayLink) {
        return c.json(
          {
            error:
              "Lien Wave Business invalide. Collez https://pay.wave.com/m/M_…/c/ci/",
          },
          400
        );
      }
    }
  }

  // Si on change de mode, on valide le champ requis et on peut vider l’autre
  if (waveMode === "business") {
    const link =
      wavePayLink !== undefined
        ? wavePayLink
        : (
            await query<{ wave_pay_link: string | null }>(
              `SELECT wave_pay_link FROM users WHERE id = $1`,
              [session.id]
            )
          ).rows[0]?.wave_pay_link;
    if (!link) {
      return c.json(
        { error: "Ajoutez votre lien Wave Business pour ce mode" },
        400
      );
    }
    if (wavePhone === undefined) wavePhone = null;
  }
  if (waveMode === "phone") {
    const phone =
      wavePhone !== undefined
        ? wavePhone
        : (
            await query<{ wave_phone: string | null }>(
              `SELECT wave_phone FROM users WHERE id = $1`,
              [session.id]
            )
          ).rows[0]?.wave_phone;
    if (!phone) {
      return c.json(
        { error: "Ajoutez votre numéro Wave pour ce mode" },
        400
      );
    }
    if (wavePayLink === undefined) wavePayLink = null;
  }

  const { rows } = await query(
    `UPDATE users SET
       name = COALESCE($1, name),
       avatar_url = COALESCE($2, avatar_url),
       wave_phone = CASE WHEN $3::boolean THEN $4 ELSE wave_phone END,
       wave_pay_link = CASE WHEN $5::boolean THEN $6 ELSE wave_pay_link END,
       wave_payout_mode = CASE WHEN $7::boolean THEN $8 ELSE wave_payout_mode END
     WHERE id = $9 RETURNING *`,
    [
      body.name === undefined ? null : textField(body.name, "Nom", 100),
      body.avatar_url === undefined ? null : optionalUrl(body.avatar_url),
      wavePhone !== undefined,
      wavePhone ?? null,
      wavePayLink !== undefined,
      wavePayLink ?? null,
      waveMode !== undefined,
      waveMode,
      session.id,
    ]
  );
  return c.json({ user: rows[0] });
});

app.get("/api/site-config", async (c) => {
  const { rows } = await query(`SELECT * FROM site_config WHERE id = 1`);
  return c.json({ config: rows[0] ?? null });
});

app.get("/api/pages", async (c) => {
  const slug = c.req.query("slug");
  try {
    if (slug) {
      const { rows } = await query(
        `SELECT * FROM pages WHERE slug = $1 AND published = true`,
        [slug]
      );
      return c.json({ page: rows[0] ?? null });
    }
    const { rows } = await query(
      `SELECT id, slug, title, excerpt, nav_label, nav_placement, sort_order
       FROM pages WHERE published = true ORDER BY sort_order ASC`
    );
    return c.json({ pages: rows });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Erreur", pages: [] },
      500
    );
  }
});

app.route("/api/admin", adminRoutes);
