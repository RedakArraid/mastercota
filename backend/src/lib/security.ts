import { createHash } from "node:crypto";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { query } from "./db.js";

export function validateEnvironment() {
  if (process.env.NODE_ENV !== "production") return;
  const secret = process.env.JWT_SECRET ?? "";
  if (secret.length < 32 || /change.?me|dev-mastercota/i.test(secret)) throw new Error("JWT_SECRET doit être un secret aléatoire d'au moins 32 caractères");
  if (process.env.OTP_DEV_CODE || process.env.OTP_DEV_LOG === "1") throw new Error("Les options OTP de développement sont interdites en production");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant");
  if (!process.env.APP_URL?.startsWith("https://")) throw new Error("APP_URL HTTPS requis en production");
}

export function clientAddress(c: Context): string {
  if (process.env.TRUST_PROXY === "true") return c.req.header("x-real-ip") || "unknown-proxy";
  try { return getConnInfo(c).remote.address ?? "unknown"; } catch { return "local-test"; }
}

/** Persistent atomic buckets also work with multiple API instances. */
export async function rateLimit(key: string, limit: number, seconds: number) {
  const digest = createHash("sha256").update(key).digest("hex");
  const { rows } = await query<{ hits: number }>(
    `INSERT INTO request_limits (key, hits, expires_at)
     VALUES ($1, 1, now() + $2 * interval '1 second')
     ON CONFLICT (key) DO UPDATE SET
       hits = CASE WHEN request_limits.expires_at <= now() THEN 1 ELSE request_limits.hits + 1 END,
       expires_at = CASE WHEN request_limits.expires_at <= now() THEN now() + $2 * interval '1 second' ELSE request_limits.expires_at END
     RETURNING hits`, [digest, seconds]);
  if (rows[0].hits > limit) throw new HTTPException(429, { message: "Trop de tentatives. Réessayez dans quelques minutes." });
}
