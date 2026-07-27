import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { rows } = await query(
    `SELECT id, phone, name, avatar_url, paystack_subaccount_id, created_at
     FROM users WHERE id = $1`,
    [session.id]
  );
  return NextResponse.json({ user: rows[0] ?? null });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { rows } = await query(
    `UPDATE users SET
       name = COALESCE($1, name),
       avatar_url = COALESCE($2, avatar_url)
     WHERE id = $3
     RETURNING id, phone, name, avatar_url, paystack_subaccount_id, created_at`,
    [body.name ?? null, body.avatar_url ?? null, session.id]
  );
  return NextResponse.json({ user: rows[0] });
}
