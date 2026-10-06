import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE = "mc_session";

export type SessionUser = {
  id: string;
  phone: string;
};

function secretKey() {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") throw new Error("JWT_SECRET manquant");
  const secret = process.env.JWT_SECRET ?? "dev-mastercota-change-me";
  return new TextEncoder().encode(secret);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.phone !== "string") return null;
    return { id: payload.sub, phone: payload.phone };
  } catch {
    return null;
  }
}
