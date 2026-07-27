import { createHash, randomInt } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  signSession,
  verifyToken,
  type SessionUser,
} from "@/lib/auth-token";

export {
  SESSION_COOKIE,
  signSession,
  verifyToken,
  type SessionUser,
};

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionUser | null> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return verifyToken(auth.slice(7));
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
