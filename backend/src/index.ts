import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createHmac, randomUUID } from "crypto";
import { query } from "./lib/db.js";
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
  deadlineFromDuration,
  freeEligibleForPhone,
  getOwnerPhone,
  initializePlatformFeePaystack,
  markFreeUsed,
  quoteDuration,
  canExtend,
  EXTENSION_DAYS,
} from "./lib/billing.js";
import { adminRoutes } from "./admin.js";

const app = new Hono();
const COOKIE = "mc_session";

const APP_ORIGIN = (process.env.APP_URL ?? "https://mastercota.com").replace(
  /\/$/,
  ""
);
const ADMIN_ORIGIN = APP_ORIGIN.replace("://", "://admin.");
const ALLOWED_ORIGINS = new Set([
  APP_ORIGIN,
  ADMIN_ORIGIN,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function cookieDomain(): string | undefined {
  try {
    const host = new URL(APP_ORIGIN).hostname;
    if (host === "localhost" || host.endsWith(".local")) return undefined;
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

async function sessionFrom(c: {
  req: { header: (k: string) => string | undefined };
}) {
  const auth = c.req.header("authorization");
  const fromBearer = await bearerUser(auth);
  if (fromBearer) return fromBearer;
  // cookie read via helper in handlers
  return null;
}

app.get("/health", (c) => c.json({ ok: true, service: "mastercota-backend" }));

// ── Auth ────────────────────────────────────────────────
app.post("/api/auth/send-otp", async (c) => {
  try {
    const { phone } = await c.req.json();
    if (!phone || typeof phone !== "string" || !phone.startsWith("+")) {
      return c.json({ error: "Numéro international requis" }, 400);
    }
    const code = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await query(
      `INSERT INTO otp_codes (phone, code_hash, expires_at) VALUES ($1,$2,$3)`,
      [phone, hashOtp(code), expires.toISOString()]
    );
    if (process.env.OTP_DEV_LOG === "1" || !(await isOpenWaActive())) {
      console.log(`[OTP DEV] ${phone} → ${code}`);
    }
    if (await isOpenWaActive()) {
      await sendOtpWhatsApp(phone, code);
    } else if (
      process.env.NODE_ENV === "production" &&
      !process.env.OTP_DEV_CODE
    ) {
      return c.json({ error: "OpenWA non configuré" }, 500);
    }
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Erreur OTP" }, 500);
  }
});

app.post("/api/auth/verify-otp", async (c) => {
  try {
    const { phone, token } = await c.req.json();
    if (!phone || !token || String(token).length !== 6) {
      return c.json({ error: "phone et code à 6 chiffres requis" }, 400);
    }
    const devCode = process.env.OTP_DEV_CODE;
    const isDevBypass = Boolean(devCode && String(token) === devCode);
    if (!isDevBypass) {
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM otp_codes
         WHERE phone = $1 AND code_hash = $2 AND consumed_at IS NULL AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1`,
        [phone, hashOtp(String(token))]
      );
      if (!rows[0]) return c.json({ error: "Code invalide ou expiré" }, 401);
      await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [
        rows[0].id,
      ]);
    }
    let user = (
      await query<{
        id: string;
        phone: string;
        name: string | null;
        role: string;
      }>(`SELECT id, phone, name, role FROM users WHERE phone = $1`, [phone])
    ).rows[0];
    if (!user) {
      user = (
        await query<{
          id: string;
          phone: string;
          name: string | null;
          role: string;
        }>(
          `INSERT INTO users (phone) VALUES ($1) RETURNING id, phone, name, role`,
          [phone]
        )
      ).rows[0];
    }
    const bootstrap = (process.env.ADMIN_PHONES || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (bootstrap.includes(phone) && user.role !== "admin") {
      const updated = await query<{
        id: string;
        phone: string;
        name: string | null;
        role: string;
      }>(
        `UPDATE users SET role = 'admin' WHERE id = $1
         RETURNING id, phone, name, role`,
        [user.id]
      );
      user = updated.rows[0] ?? user;
    }
    const jwt = await signSession({ id: user.id, phone: user.phone });
    const domain = cookieDomain();
    setCookie(c, COOKIE, jwt, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      ...(domain ? { domain } : {}),
    });
    return c.json({
      token: jwt,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Erreur vérification" },
      500
    );
  }
});

app.post("/api/auth/logout", async (c) => {
  const domain = cookieDomain();
  deleteCookie(c, COOKIE, { path: "/", ...(domain ? { domain } : {}) });
  return c.json({ ok: true });
});

app.get("/api/auth/me", async (c) => {
  const token =
    c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ||
    getCookie(c, COOKIE);
  const session = token ? await verifyToken(token) : null;
  if (!session) return c.json({ user: null }, 401);
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [
    session.id,
  ]);
  if (!rows[0]) return c.json({ user: null }, 401);
  return c.json({ user: rows[0] });
});

async function requireUser(c: Parameters<typeof getCookie>[0]) {
  const token =
    c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ||
    getCookie(c, COOKIE);
  return token ? verifyToken(token) : null;
}

async function autoCloseExpiredCotisations() {
  try {
    await query(
      `UPDATE cotisations
       SET status = 'closed'
       WHERE status = 'active'
         AND deadline < CURRENT_DATE`
    );
  } catch (e) {
    console.error("[auto-close]", e);
  }
}

setInterval(autoCloseExpiredCotisations, 15 * 60 * 1000);
autoCloseExpiredCotisations();

// ── Cotisations ─────────────────────────────────────────
app.get("/api/cotisations", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { rows } = await query(
    `SELECT * FROM cotisations WHERE owner_id = $1 ORDER BY created_at DESC`,
    [session.id]
  );
  return c.json({ cotisations: rows });
});

app.post("/api/cotisations", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  const {
    title,
    description,
    target_amount,
    cover_url,
    settings,
    duration_days,
    use_free,
  } = body;
  if (!title || !target_amount || duration_days == null) {
    return c.json(
      { error: "title, target_amount et duration_days requis" },
      400
    );
  }
  try {
    const phone = await getOwnerPhone(session.id);
    if (!phone) return c.json({ error: "Profil introuvable" }, 400);
    const freeEligible = await freeEligibleForPhone(phone);
    const quote = quoteDuration({
      durationDays: Number(duration_days),
      freeEligible,
      useFree: Boolean(use_free),
    });
    if (!quote) {
      return c.json(
        {
          error: `Durée invalide (1–${MAX_DURATION_DAYS} jours)`,
        },
        400
      );
    }
    if (use_free && !quote.isFree) {
      return c.json(
        {
          error: `La cotisation gratuite est limitée à ${FREE_DURATION_DAYS} jours, ou déjà utilisée`,
        },
        400
      );
    }

    const deadline = deadlineFromDuration(quote.durationDays);
    const startsAt = new Date().toISOString().slice(0, 10);
    const isFree = quote.isFree;
    const status = isFree ? "active" : "pending_fee";
    const feeStatus = isFree ? "free" : "pending";

    const { rows } = await query(
      `INSERT INTO cotisations
        (title, description, target_amount, deadline, owner_id, cover_url, slug, settings,
         duration_days, starts_at, platform_fee_amount, platform_fee_status, is_free_tier, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        Number(target_amount),
        deadline,
        session.id,
        cover_url || null,
        generateSlug(String(title)),
        JSON.stringify(settings ?? {}),
        quote.durationDays,
        startsAt,
        quote.fee,
        feeStatus,
        isFree,
        status,
      ]
    );
    const cotisation = rows[0];

    if (isFree) {
      await markFreeUsed(phone);
      return c.json({ cotisation, payment_required: false });
    }

    const payment = await initializePlatformFeePaystack({
      userId: session.id,
      phone,
      cotisationId: cotisation.id,
      purpose: "create",
      amount: quote.fee,
      durationDays: quote.durationDays,
      callbackPath: `/cotisation/${cotisation.id}/frais`,
      metadata: {},
    });
    return c.json({
      cotisation,
      payment_required: true,
      authorization_url: payment.authorization_url,
      reference: payment.reference,
      fee: quote.fee,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    return c.json(
      {
        error: msg.includes("duplicate")
          ? "Ce titre existe déjà. Essayez un autre."
          : msg,
      },
      400
    );
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

app.get("/api/cotisations/by-slug/:slug", async (c) => {
  await autoCloseExpiredCotisations();
  const { rows } = await query(`SELECT * FROM cotisations WHERE slug = $1`, [
    c.req.param("slug"),
  ]);
  if (!rows[0]) return c.json({ error: "Introuvable" }, 404);
  return c.json({ cotisation: rows[0] });
});

app.get("/api/cotisations/:id", async (c) => {
  await autoCloseExpiredCotisations();
  const { rows } = await query(`SELECT * FROM cotisations WHERE id = $1`, [
    c.req.param("id"),
  ]);
  if (!rows[0]) return c.json({ error: "Introuvable" }, 404);
  return c.json({ cotisation: rows[0] });
});

app.patch("/api/cotisations/:id", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const { rows: owned } = await query(
    `SELECT id FROM cotisations WHERE id = $1 AND owner_id = $2`,
    [id, session.id]
  );
  if (!owned[0]) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  // La deadline ne se modifie que via prolongation payante
  const { rows } = await query(
    `UPDATE cotisations SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       target_amount = COALESCE($3, target_amount),
       cover_url = COALESCE($4, cover_url),
       status = COALESCE($5, status),
       settings = COALESCE($6::jsonb, settings)
     WHERE id = $7
     RETURNING *`,
    [
      body.title?.trim() ?? null,
      body.description !== undefined
        ? body.description?.trim() || null
        : null,
      body.target_amount != null ? Number(body.target_amount) : null,
      body.cover_url !== undefined ? body.cover_url || null : null,
      body.status ?? null,
      body.settings != null ? JSON.stringify(body.settings) : null,
      id,
    ]
  );
  return c.json({ cotisation: rows[0] });
});

app.get("/api/cotisations/:id/contributions", async (c) => {
  const session = await requireUser(c);
  const id = c.req.param("id");
  const { rows: cots } = await query(
    `SELECT owner_id FROM cotisations WHERE id = $1`,
    [id]
  );
  if (!cots[0]) return c.json({ error: "Introuvable" }, 404);
  const isOwner = session?.id === cots[0].owner_id;
  const { rows } = await query(
    isOwner
      ? `SELECT * FROM contributions WHERE cotisation_id = $1 ORDER BY created_at DESC`
      : `SELECT id, cotisation_id, contributor_name, amount, status, created_at,
                contributor_phone, paystack_reference, payment_method
         FROM contributions WHERE cotisation_id = $1 AND status = 'paid'
         ORDER BY created_at DESC LIMIT 50`,
    [id]
  );
  return c.json({ contributions: rows });
});

app.post("/api/cotisations/:id/contributions", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const { rows: owned } = await query(
    `SELECT id FROM cotisations WHERE id = $1 AND owner_id = $2`,
    [id, session.id]
  );
  if (!owned[0]) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  const { contributor_name, contributor_phone, amount } = body;
  if (!contributor_name || !contributor_phone || !amount) {
    return c.json({ error: "Champs requis manquants" }, 400);
  }
  const { rows } = await query(
    `INSERT INTO contributions
      (cotisation_id, contributor_name, contributor_phone, amount, status, payment_method)
     VALUES ($1,$2,$3,$4,'paid','manual') RETURNING *`,
    [id, contributor_name.trim(), contributor_phone.trim(), Number(amount)]
  );
  return c.json({ contribution: rows[0] });
});

// ── Paystack ────────────────────────────────────────────
app.post("/api/paystack/initialize", async (c) => {
  try {
    const { cotisation_id, amount, contributor_name, contributor_phone } =
      await c.req.json();
    if (!cotisation_id || !amount || !contributor_name || !contributor_phone) {
      return c.json({ error: "Champs requis manquants" }, 400);
    }
    let quote;
    try {
      quote = feesFromNet(Number(amount));
    } catch {
      return c.json({ error: "Montant invalide" }, 400);
    }
    const { rows: cots } = await query<{
      owner_id: string;
      slug: string;
      status: string;
    }>(`SELECT owner_id, slug, status FROM cotisations WHERE id = $1`, [
      cotisation_id,
    ]);
    if (!cots[0]) return c.json({ error: "Cotisation introuvable" }, 404);
    if (cots[0].status !== "active") {
      return c.json({ error: "Cette cotisation n'accepte plus de paiements" }, 400);
    }
    const { rows: owners } = await query<{
      paystack_subaccount_id: string | null;
    }>(`SELECT paystack_subaccount_id FROM users WHERE id = $1`, [
      cots[0].owner_id,
    ]);
    const contributionId = randomUUID();
    const cleanPhone = String(contributor_phone).replace(/[^0-9]/g, "");
    const appUrl = (
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://mastercota.com"
    ).replace(/\/$/, "");
    const payload: Record<string, unknown> = {
      email: `${cleanPhone}@mastercota.com`,
      amount: Math.round(quote.gross * 100),
      reference: contributionId,
      callback_url: `${appUrl}/c/${cots[0].slug}/retour?ref=${contributionId}`,
      metadata: {
        type: "contribution",
        net_amount: quote.net,
        fee: quote.fee,
        gross_amount: quote.gross,
        cotisation_id,
        slug: cots[0].slug,
      },
    };
    if (owners[0]?.paystack_subaccount_id) {
      payload.subaccount = owners[0].paystack_subaccount_id;
      payload.bearer = "subaccount";
    }
    const { ok, data } = await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!ok) {
      return c.json(
        { error: data.message || "Paystack initialize failed" },
        400
      );
    }
    await query(
      `INSERT INTO contributions
        (id, cotisation_id, contributor_name, contributor_phone, amount, status, paystack_reference)
       VALUES ($1,$2,$3,$4,$5,'pending',$1)`,
      [
        contributionId,
        cotisation_id,
        contributor_name,
        contributor_phone,
        quote.net,
      ]
    );
    return c.json({
      authorization_url: data.data.authorization_url,
      reference: contributionId,
      net: quote.net,
      gross: quote.gross,
      fee: quote.fee,
    });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});

app.post("/api/paystack/webhook", async (c) => {
  const signature = c.req.header("x-paystack-signature");
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!signature || !secret) {
    return c.json({ error: "Missing signature/secret" }, 400);
  }
  const bodyText = await c.req.text();
  const hash = createHmac("sha512", secret).update(bodyText).digest("hex");
  if (hash !== signature) return c.json({ error: "Invalid signature" }, 401);
  const event = JSON.parse(bodyText);
  if (event.event === "charge.success" && event.data?.status === "success") {
    const reference = event.data.reference as string;
    const metaType = event.data.metadata?.type;
    if (metaType === "platform_fee") {
      await activatePlatformPayment(reference);
    } else {
      await query(
        `UPDATE contributions SET status = 'paid', payment_method = $1
         WHERE paystack_reference = $2 AND status <> 'paid'`,
        [event.data.channel || "mobile_money", reference]
      );
    }
  }
  return c.json({ received: true });
});

app.get("/api/platform-payments/verify/:reference", async (c) => {
  const reference = c.req.param("reference");
  const { ok, data } = await paystackFetch(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
  if (!ok) {
    return c.json({ error: data.message || "Vérification impossible" }, 400);
  }
  const status = data.data?.status as string | undefined;
  if (status === "success") {
    const result = await activatePlatformPayment(reference);
    if (!result.ok) return c.json({ error: result.error }, 404);
  }
  const { rows } = await query(
    `SELECT pp.*, c.slug, c.title, c.status AS cotisation_status
     FROM platform_payments pp
     LEFT JOIN cotisations c ON c.id = pp.cotisation_id
     WHERE pp.paystack_reference = $1`,
    [reference]
  );
  return c.json({
    paystack_status: status,
    payment: rows[0] ?? null,
  });
});

app.post("/api/cotisations/:id/extend", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
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
  if (owned[0].status === "pending_fee") {
    return c.json({ error: "Payez d'abord les frais de création" }, 400);
  }
  const ext = canExtend({
    startsAt: owned[0].starts_at,
    deadline: owned[0].deadline,
    extensionCount: Number(owned[0].extension_count),
  });
  if (!ext.ok) return c.json({ error: ext.error }, 400);
  const phone = await getOwnerPhone(session.id);
  if (!phone) return c.json({ error: "Profil introuvable" }, 400);
  try {
    const payment = await initializePlatformFeePaystack({
      userId: session.id,
      phone,
      cotisationId: id,
      purpose: "extend",
      amount: ext.fee,
      durationDays: EXTENSION_DAYS,
      callbackPath: `/cotisation/${id}/frais`,
      metadata: { new_deadline: ext.newDeadline },
    });
    return c.json({
      payment_required: true,
      authorization_url: payment.authorization_url,
      reference: payment.reference,
      fee: ext.fee,
      extension_days: EXTENSION_DAYS,
      new_deadline: ext.newDeadline,
    });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Erreur" }, 400);
  }
});

app.post("/api/cotisations/:id/pay-fee", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
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
  if (
    owned[0].status !== "pending_fee" &&
    owned[0].platform_fee_status !== "pending"
  ) {
    return c.json({ error: "Aucun frais en attente" }, 400);
  }
  const fee = Number(owned[0].platform_fee_amount);
  if (!fee || fee <= 0) return c.json({ error: "Montant frais invalide" }, 400);
  const phone = await getOwnerPhone(session.id);
  if (!phone) return c.json({ error: "Profil introuvable" }, 400);
  try {
    const payment = await initializePlatformFeePaystack({
      userId: session.id,
      phone,
      cotisationId: id,
      purpose: "create",
      amount: fee,
      durationDays: owned[0].duration_days ?? undefined,
      callbackPath: `/cotisation/${id}/frais`,
    });
    return c.json({
      payment_required: true,
      authorization_url: payment.authorization_url,
      reference: payment.reference,
      fee,
    });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Erreur" }, 400);
  }
});

app.get("/api/paystack/verify/:reference", async (c) => {
  const reference = c.req.param("reference");
  const { ok, data } = await paystackFetch(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
  if (!ok) {
    return c.json({ error: data.message || "Vérification impossible" }, 400);
  }
  const status = data.data?.status as string | undefined;
  if (status === "success") {
    await query(
      `UPDATE contributions SET status = 'paid',
         payment_method = COALESCE($1, payment_method)
       WHERE paystack_reference = $2 AND status <> 'paid'`,
      [data.data?.channel || "mobile_money", reference]
    );
  }
  const { rows } = await query(
    `SELECT c.*, cot.slug, cot.title AS cotisation_title
     FROM contributions c
     JOIN cotisations cot ON cot.id = c.cotisation_id
     WHERE c.paystack_reference = $1`,
    [reference]
  );
  return c.json({
    paystack_status: status,
    contribution: rows[0] ?? null,
  });
});

app.post("/api/paystack/verify-account", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { account_number, bank_code } = await c.req.json();
  if (!account_number || !bank_code) {
    return c.json({ error: "account_number and bank_code required" }, 400);
  }
  const qs = new URLSearchParams({
    account_number: String(account_number),
    bank_code: String(bank_code),
  });
  const { ok, data } = await paystackFetch(`/bank/resolve?${qs}`);
  if (!ok) return c.json({ error: data.message || "Numéro invalide" }, 400);
  return c.json({ account_name: data.data?.account_name ?? "" });
});

app.post("/api/paystack/subaccount", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { business_name, settlement_bank, account_number } = await c.req.json();
  if (!business_name || !settlement_bank || !account_number) {
    return c.json({ error: "Champs requis manquants" }, 400);
  }
  const { ok, data } = await paystackFetch("/subaccount", {
    method: "POST",
    body: JSON.stringify({
      business_name,
      settlement_bank,
      account_number,
      percentage_charge: 1.0,
    }),
  });
  if (!ok) {
    return c.json(
      { error: data.message || "Création sous-compte échouée" },
      400
    );
  }
  const code = data.data.subaccount_code as string;
  await query(`UPDATE users SET paystack_subaccount_id = $1 WHERE id = $2`, [
    code,
    session.id,
  ]);
  return c.json({ subaccount_code: code });
});

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
  const { rows } = await query(
    `UPDATE users SET
       name = COALESCE($1, name),
       avatar_url = COALESCE($2, avatar_url)
     WHERE id = $3 RETURNING *`,
    [body.name ?? null, body.avatar_url ?? null, session.id]
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

const port = Number(process.env.PORT ?? 4000);
console.log(`mastercota-backend on :${port}`);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
