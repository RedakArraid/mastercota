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
import { sendOtpWhatsApp } from "./lib/openwa.js";
import { paystackFetch } from "./lib/paystack.js";
import { generateSlug } from "./lib/format.js";

const app = new Hono();
const COOKIE = "mc_session";

app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
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
    if (!process.env.OPENWA_API_KEY || process.env.OTP_DEV_LOG === "1") {
      console.log(`[OTP DEV] ${phone} → ${code}`);
    }
    if (process.env.OPENWA_API_KEY && process.env.OPENWA_SESSION_ID) {
      await sendOtpWhatsApp(phone, code);
    } else if (process.env.NODE_ENV === "production" && !process.env.OTP_DEV_CODE) {
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
      await query<{ id: string; phone: string; name: string | null }>(
        `SELECT id, phone, name FROM users WHERE phone = $1`,
        [phone]
      )
    ).rows[0];
    if (!user) {
      user = (
        await query<{ id: string; phone: string; name: string | null }>(
          `INSERT INTO users (phone) VALUES ($1) RETURNING id, phone, name`,
          [phone]
        )
      ).rows[0];
    }
    const jwt = await signSession({ id: user.id, phone: user.phone });
    setCookie(c, COOKIE, jwt, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return c.json({
      token: jwt,
      user: { id: user.id, phone: user.phone, name: user.name },
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Erreur vérification" },
      500
    );
  }
});

app.post("/api/auth/logout", async (c) => {
  deleteCookie(c, COOKIE, { path: "/" });
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
  const { title, description, target_amount, deadline, cover_url, settings } =
    body;
  if (!title || !target_amount || !deadline) {
    return c.json({ error: "title, target_amount, deadline requis" }, 400);
  }
  try {
    const { rows } = await query(
      `INSERT INTO cotisations
        (title, description, target_amount, deadline, owner_id, cover_url, slug, settings)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        Number(target_amount),
        deadline,
        session.id,
        cover_url || null,
        generateSlug(String(title)),
        JSON.stringify(settings ?? {}),
      ]
    );
    return c.json({ cotisation: rows[0] });
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

app.get("/api/cotisations/by-slug/:slug", async (c) => {
  const { rows } = await query(`SELECT * FROM cotisations WHERE slug = $1`, [
    c.req.param("slug"),
  ]);
  if (!rows[0]) return c.json({ error: "Introuvable" }, 404);
  return c.json({ cotisation: rows[0] });
});

app.get("/api/cotisations/:id", async (c) => {
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
  if (body.status) {
    const { rows } = await query(
      `UPDATE cotisations SET status = $1 WHERE id = $2 RETURNING *`,
      [body.status, id]
    );
    return c.json({ cotisation: rows[0] });
  }
  if (body.settings) {
    const { rows } = await query(
      `UPDATE cotisations SET settings = $1::jsonb WHERE id = $2 RETURNING *`,
      [JSON.stringify(body.settings), id]
    );
    return c.json({ cotisation: rows[0] });
  }
  return c.json({ error: "Rien à mettre à jour" }, 400);
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
    const { rows: cots } = await query<{ owner_id: string }>(
      `SELECT owner_id FROM cotisations WHERE id = $1`,
      [cotisation_id]
    );
    if (!cots[0]) return c.json({ error: "Cotisation introuvable" }, 404);
    const { rows: owners } = await query<{
      paystack_subaccount_id: string | null;
    }>(`SELECT paystack_subaccount_id FROM users WHERE id = $1`, [
      cots[0].owner_id,
    ]);
    const contributionId = randomUUID();
    const cleanPhone = String(contributor_phone).replace(/[^0-9]/g, "");
    const payload: Record<string, unknown> = {
      email: `${cleanPhone}@mastercota.com`,
      amount: Math.round(Number(amount) * 100),
      reference: contributionId,
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
        Number(amount),
      ]
    );
    return c.json({
      authorization_url: data.data.authorization_url,
      reference: contributionId,
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
    await query(
      `UPDATE contributions SET status = 'paid', payment_method = $1
       WHERE paystack_reference = $2 AND status <> 'paid'`,
      [event.data.channel || "mobile_money", event.data.reference]
    );
  }
  return c.json({ received: true });
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

const port = Number(process.env.PORT ?? 4000);
console.log(`mastercota-backend on :${port}`);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
