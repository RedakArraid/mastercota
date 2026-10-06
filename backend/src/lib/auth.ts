import { SignJWT, jwtVerify } from "jose";
import { createHash, randomInt } from "crypto";
import { query } from "./db.js";

export type SessionUser = { id: string; phone: string; session_version?: number };

function secretKey() {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") throw new Error("JWT_SECRET manquant");
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? "dev-mastercota-change-me"
  );
}

export function hashOtp(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function generateOtp() {
  return String(randomInt(100000, 1000000));
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ phone: user.phone, version: user.session_version ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  let payload;
  try {
    payload = (await jwtVerify(token, secretKey(), { algorithms: ["HS256"] })).payload;
  } catch { return null; }
  if (!payload.sub || typeof payload.phone !== "string") return null;
  // Database outages must not look like revoked credentials to the clients.
  const { rows } = await query<{ session_version: number }>("SELECT session_version FROM users WHERE id::text = $1", [payload.sub]);
  if (!rows[0] || payload.version !== rows[0].session_version) return null;
  return { id: payload.sub, phone: payload.phone, session_version: rows[0].session_version };
}

export function bearerUser(authHeader: string | undefined) {
  if (!authHeader?.startsWith("Bearer ")) return Promise.resolve(null);
  return verifyToken(authHeader.slice(7));
}
