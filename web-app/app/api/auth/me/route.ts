import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const { rows } = await query(
    `SELECT id, phone, name, avatar_url, paystack_subaccount_id, created_at
     FROM users WHERE id = $1`,
    [session.id]
  );
  if (!rows[0]) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: rows[0] });
}
