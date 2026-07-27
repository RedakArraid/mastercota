import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { query } from "./lib/db.js";
import { verifyToken } from "./lib/auth.js";
import {
  getPublicOpenWaSettings,
  updateOpenWaSettings,
} from "./lib/openwa-settings.js";
import {
  getSessionStatus,
  pingOpenWa,
  sendTextMessage,
} from "./lib/openwa.js";

const COOKIE = "mc_session";

type UserRow = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  avatar_url: string | null;
  paystack_subaccount_id: string | null;
  created_at: string;
};

async function requireAdmin(c: Context) {
  const token =
    c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ||
    getCookie(c, COOKIE);
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session) return null;
  const { rows } = await query<UserRow>(
    `SELECT id, phone, name, role, avatar_url, paystack_subaccount_id, created_at
     FROM users WHERE id = $1`,
    [session.id]
  );
  const user = rows[0];
  if (!user || user.role !== "admin") return null;
  return user;
}

export const adminRoutes = new Hono();

adminRoutes.use("*", async (c, next) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Accès admin requis" }, 403);
  await next();
});

adminRoutes.get("/stats", async (c) => {
  const [
    users,
    cotisations,
    contributions,
    volume,
    recent,
    otp24h,
    volumeSeries,
    usersSeries,
    statusBreakdown,
    cotisationStatus,
    topCotisations,
  ] = await Promise.all([
    query<{ n: string; week: string }>(
      `SELECT count(*)::text AS n,
              count(*) FILTER (WHERE created_at > now() - interval '7 days')::text AS week
       FROM users`
    ),
    query<{ n: string; active: string; closed: string; completed: string }>(
      `SELECT count(*)::text AS n,
              count(*) FILTER (WHERE status = 'active')::text AS active,
              count(*) FILTER (WHERE status = 'closed')::text AS closed,
              count(*) FILTER (WHERE status = 'completed')::text AS completed
       FROM cotisations`
    ),
    query<{ n: string; paid: string; pending: string; failed: string; week: string }>(
      `SELECT count(*)::text AS n,
              count(*) FILTER (WHERE status = 'paid')::text AS paid,
              count(*) FILTER (WHERE status = 'pending')::text AS pending,
              count(*) FILTER (WHERE status = 'failed')::text AS failed,
              count(*) FILTER (WHERE status = 'paid' AND created_at > now() - interval '7 days')::text AS week
       FROM contributions`
    ),
    query<{ total: string; week: string }>(
      `SELECT COALESCE(sum(amount),0)::text AS total,
              COALESCE(sum(amount) FILTER (WHERE created_at > now() - interval '7 days'),0)::text AS week
       FROM contributions WHERE status = 'paid'`
    ),
    query(
      `SELECT c.id, c.contributor_name, c.amount, c.status, c.created_at,
              cot.title AS cotisation_title, cot.slug
       FROM contributions c
       JOIN cotisations cot ON cot.id = c.cotisation_id
       ORDER BY c.created_at DESC LIMIT 12`
    ),
    query<{ n: string }>(
      `SELECT count(*)::text AS n FROM otp_codes
       WHERE created_at > now() - interval '24 hours'`
    ),
    query<{ day: string; volume: string; count: string }>(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
              COALESCE(sum(c.amount) FILTER (WHERE c.status = 'paid'), 0)::text AS volume,
              count(c.id) FILTER (WHERE c.status = 'paid')::text AS count
       FROM generate_series(
              (current_date - interval '13 days')::date,
              current_date,
              '1 day'
            ) AS d(day)
       LEFT JOIN contributions c
         ON c.created_at::date = d.day
       GROUP BY d.day
       ORDER BY d.day`
    ),
    query<{ day: string; count: string }>(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
              count(u.id)::text AS count
       FROM generate_series(
              (current_date - interval '13 days')::date,
              current_date,
              '1 day'
            ) AS d(day)
       LEFT JOIN users u ON u.created_at::date = d.day
       GROUP BY d.day
       ORDER BY d.day`
    ),
    query<{ status: string; n: string; volume: string }>(
      `SELECT status,
              count(*)::text AS n,
              COALESCE(sum(amount),0)::text AS volume
       FROM contributions
       GROUP BY status`
    ),
    query<{ status: string; n: string }>(
      `SELECT status, count(*)::text AS n FROM cotisations GROUP BY status`
    ),
    query(
      `SELECT c.id, c.title, c.slug, c.target_amount, c.current_amount, c.status,
              CASE WHEN c.target_amount > 0
                THEN round((c.current_amount / c.target_amount) * 100)::text
                ELSE '0' END AS progress
       FROM cotisations c
       WHERE c.status = 'active'
       ORDER BY c.current_amount DESC
       LIMIT 5`
    ),
  ]);

  return c.json({
    stats: {
      users: Number(users.rows[0]?.n ?? 0),
      usersWeek: Number(users.rows[0]?.week ?? 0),
      cotisations: Number(cotisations.rows[0]?.n ?? 0),
      cotisationsActive: Number(cotisations.rows[0]?.active ?? 0),
      cotisationsClosed: Number(cotisations.rows[0]?.closed ?? 0),
      cotisationsCompleted: Number(cotisations.rows[0]?.completed ?? 0),
      contributions: Number(contributions.rows[0]?.n ?? 0),
      contributionsPaid: Number(contributions.rows[0]?.paid ?? 0),
      contributionsPending: Number(contributions.rows[0]?.pending ?? 0),
      contributionsFailed: Number(contributions.rows[0]?.failed ?? 0),
      contributionsWeek: Number(contributions.rows[0]?.week ?? 0),
      volumePaid: Number(volume.rows[0]?.total ?? 0),
      volumeWeek: Number(volume.rows[0]?.week ?? 0),
      otpLast24h: Number(otp24h.rows[0]?.n ?? 0),
    },
    charts: {
      volumeByDay: volumeSeries.rows.map((r) => ({
        day: r.day,
        volume: Number(r.volume),
        count: Number(r.count),
      })),
      usersByDay: usersSeries.rows.map((r) => ({
        day: r.day,
        count: Number(r.count),
      })),
      contributionStatus: statusBreakdown.rows.map((r) => ({
        status: r.status,
        count: Number(r.n),
        volume: Number(r.volume),
      })),
      cotisationStatus: cotisationStatus.rows.map((r) => ({
        status: r.status,
        count: Number(r.n),
      })),
    },
    topCotisations: topCotisations.rows,
    recentContributions: recent.rows,
  });
});

adminRoutes.get("/users", async (c) => {
  const q = c.req.query("q")?.trim();
  const limit = Math.min(Number(c.req.query("limit") || 50), 200);
  const params: unknown[] = [];
  let where = "";
  if (q) {
    params.push(`%${q}%`);
    where = `WHERE phone ILIKE $1 OR coalesce(name,'') ILIKE $1`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT id, phone, name, role, paystack_subaccount_id, created_at,
            (SELECT count(*) FROM cotisations WHERE owner_id = users.id) AS cotisations_count
     FROM users
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return c.json({ users: rows });
});

adminRoutes.patch("/users/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  if (body.role !== "admin" && body.role !== "user") {
    return c.json({ error: "role invalide" }, 400);
  }
  const { rows } = await query(
    `UPDATE users SET role = $1 WHERE id = $2
     RETURNING id, phone, name, role, created_at`,
    [body.role, id]
  );
  if (!rows[0]) return c.json({ error: "Introuvable" }, 404);
  return c.json({ user: rows[0] });
});

adminRoutes.get("/cotisations", async (c) => {
  const status = c.req.query("status");
  const limit = Math.min(Number(c.req.query("limit") || 50), 200);
  const params: unknown[] = [];
  let where = "";
  if (status) {
    params.push(status);
    where = `WHERE c.status = $1`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT c.*, u.phone AS owner_phone, u.name AS owner_name,
            (SELECT count(*) FROM contributions WHERE cotisation_id = c.id AND status = 'paid') AS paid_count
     FROM cotisations c
     JOIN users u ON u.id = c.owner_id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return c.json({ cotisations: rows });
});

adminRoutes.get("/contributions", async (c) => {
  const status = c.req.query("status");
  const limit = Math.min(Number(c.req.query("limit") || 50), 200);
  const params: unknown[] = [];
  let where = "";
  if (status) {
    params.push(status);
    where = `WHERE c.status = $1`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT c.*, cot.title AS cotisation_title, cot.slug
     FROM contributions c
     JOIN cotisations cot ON cot.id = c.cotisation_id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return c.json({ contributions: rows });
});

adminRoutes.get("/openwa", async (c) => {
  const openwa = await getPublicOpenWaSettings();
  return c.json({ openwa });
});

adminRoutes.patch("/openwa", async (c) => {
  const body = await c.req.json();
  const openwa = await updateOpenWaSettings({
    enabled: body.enabled,
    baseUrl: body.baseUrl,
    apiKey: body.apiKey,
    sessionId: body.sessionId,
  });
  return c.json({ openwa });
});

adminRoutes.get("/openwa/status", async (c) => {
  const settings = await getPublicOpenWaSettings();
  if (!settings.configured) {
    return c.json({
      reachable: false,
      configured: false,
      message: "Configuration incomplète",
    });
  }
  try {
    await pingOpenWa();
  } catch (e) {
    return c.json({
      reachable: false,
      configured: true,
      message: e instanceof Error ? e.message : "API injoignable",
    });
  }
  try {
    const session = await getSessionStatus();
    return c.json({
      reachable: true,
      configured: true,
      session,
    });
  } catch (e) {
    return c.json({
      reachable: true,
      configured: true,
      message: e instanceof Error ? e.message : "Session introuvable",
    });
  }
});

adminRoutes.post("/openwa/test", async (c) => {
  const body = await c.req.json();
  const phone = String(body.phone || "").trim();
  if (!phone.startsWith("+")) {
    return c.json({ error: "Numéro international requis (+…)" }, 400);
  }
  const settings = await getPublicOpenWaSettings();
  if (!settings.configured || !settings.enabled) {
    return c.json({ error: "OpenWA non actif ou incomplet" }, 400);
  }
  try {
    const session = await getSessionStatus();
    if (!session.connected) {
      return c.json(
        {
          error: `Session non connectée (${session.status || "inconnu"})`,
        },
        400
      );
    }
    await sendTextMessage(
      phone,
      "*Mastercota*\nMessage de test OpenWA — configuration OK."
    );
    return c.json({ message: "Message de test envoyé" });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Échec envoi" },
      400
    );
  }
});

adminRoutes.get("/pages", async (c) => {
  const { rows } = await query(
    `SELECT * FROM pages ORDER BY sort_order ASC, title ASC`
  );
  return c.json({ pages: rows });
});

adminRoutes.patch("/pages/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { rows } = await query(
    `UPDATE pages SET
       title = COALESCE($1, title),
       excerpt = COALESCE($2, excerpt),
       body_md = COALESCE($3, body_md),
       published = COALESCE($4, published),
       nav_label = COALESCE($5, nav_label),
       nav_placement = COALESCE($6, nav_placement),
       sort_order = COALESCE($7, sort_order),
       updated_at = now()
     WHERE id = $8 RETURNING *`,
    [
      body.title ?? null,
      body.excerpt ?? null,
      body.body_md ?? null,
      typeof body.published === "boolean" ? body.published : null,
      body.nav_label ?? null,
      body.nav_placement ?? null,
      body.sort_order ?? null,
      id,
    ]
  );
  if (!rows[0]) return c.json({ error: "Introuvable" }, 404);
  return c.json({ page: rows[0] });
});

adminRoutes.get("/site-config", async (c) => {
  const { rows } = await query(`SELECT * FROM site_config WHERE id = 1`);
  return c.json({ config: rows[0] ?? null });
});

adminRoutes.patch("/site-config", async (c) => {
  const body = await c.req.json();
  const { rows } = await query(
    `UPDATE site_config SET
       phone_whatsapp = COALESCE($1, phone_whatsapp),
       email_contact = COALESCE($2, email_contact),
       email_support = COALESCE($3, email_support),
       social_instagram = COALESCE($4, social_instagram),
       social_facebook = COALESCE($5, social_facebook),
       social_twitter = COALESCE($6, social_twitter),
       social_tiktok = COALESCE($7, social_tiktok),
       social_youtube = COALESCE($8, social_youtube),
       landing = COALESCE($9::jsonb, landing),
       updated_at = now()
     WHERE id = 1 RETURNING *`,
    [
      body.phone_whatsapp ?? null,
      body.email_contact ?? null,
      body.email_support ?? null,
      body.social_instagram ?? null,
      body.social_facebook ?? null,
      body.social_twitter ?? null,
      body.social_tiktok ?? null,
      body.social_youtube ?? null,
      body.landing ? JSON.stringify(body.landing) : null,
    ]
  );
  return c.json({ config: rows[0] });
});
