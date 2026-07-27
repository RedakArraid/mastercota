import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { generateOtp, hashOtp } from "@/lib/auth";
import { sendOtpWhatsApp } from "@/lib/openwa";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string" || !phone.startsWith("+")) {
      return NextResponse.json(
        { error: "Numéro international requis (ex: +225…)" },
        { status: 400 }
      );
    }

    const code = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `INSERT INTO otp_codes (phone, code_hash, expires_at) VALUES ($1, $2, $3)`,
      [phone, hashOtp(code), expires.toISOString()]
    );

    // Dev bypass: log code if OpenWA not configured
    if (!process.env.OPENWA_API_KEY || process.env.OTP_DEV_LOG === "1") {
      console.log(`[OTP DEV] ${phone} → ${code}`);
    }

    if (process.env.OPENWA_API_KEY && process.env.OPENWA_SESSION_ID) {
      await sendOtpWhatsApp(phone, code);
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "OpenWA non configuré" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur OTP" },
      { status: 500 }
    );
  }
}
