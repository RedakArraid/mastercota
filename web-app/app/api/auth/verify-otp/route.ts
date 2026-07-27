import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  hashOtp,
  setSessionCookie,
  signSession,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { phone, token } = await req.json();
    if (!phone || !token || String(token).length !== 6) {
      return NextResponse.json({ error: "phone et code à 6 chiffres requis" }, { status: 400 });
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

      if (rows.length === 0) {
        return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 401 });
      }

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
    await setSessionCookie(jwt);

    return NextResponse.json({
      token: jwt,
      user: { id: user.id, phone: user.phone, name: user.name },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur vérification" },
      { status: 500 }
    );
  }
}
