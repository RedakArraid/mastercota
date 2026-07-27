import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "mc_session";

export type SessionUser = {
  id: string;
  phone: string;
};

function secretKey() {
  const secret = process.env.JWT_SECRET ?? "dev-mastercota-change-me";
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
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
