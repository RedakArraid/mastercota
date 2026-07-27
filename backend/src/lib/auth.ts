import { SignJWT, jwtVerify } from "jose";
import { createHash, randomInt } from "crypto";

export type SessionUser = { id: string; phone: string };

function secretKey() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? "dev-mastercota-change-me"
  );
}

export function hashOtp(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function generateOtp() {
  return String(randomInt(100000, 999999));
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ phone: user.phone })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.phone !== "string") return null;
    return { id: payload.sub, phone: payload.phone };
  } catch {
    return null;
  }
}

export function bearerUser(authHeader: string | undefined) {
  if (!authHeader?.startsWith("Bearer ")) return Promise.resolve(null);
  return verifyToken(authHeader.slice(7));
}
