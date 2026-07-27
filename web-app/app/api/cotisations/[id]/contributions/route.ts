import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await getSessionFromRequest(req);
  const { rows: cots } = await query(
    `SELECT owner_id FROM cotisations WHERE id = $1`,
    [id]
  );
  if (!cots[0]) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  const isOwner = session?.id === cots[0].owner_id;
  const { rows } = await query(
    isOwner
      ? `SELECT * FROM contributions WHERE cotisation_id = $1 ORDER BY created_at DESC`
      : `SELECT id, cotisation_id, contributor_name, amount, status, created_at
         FROM contributions WHERE cotisation_id = $1 AND status = 'paid'
         ORDER BY created_at DESC LIMIT 50`,
    [id]
  );
  return NextResponse.json({ contributions: rows });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const { rows: owned } = await query(
    `SELECT id FROM cotisations WHERE id = $1 AND owner_id = $2`,
    [id, session.id]
  );
  if (!owned[0]) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { contributor_name, contributor_phone, amount } = body;
  if (!contributor_name || !contributor_phone || !amount) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }
  const { rows } = await query(
    `INSERT INTO contributions
      (cotisation_id, contributor_name, contributor_phone, amount, status, payment_method)
     VALUES ($1,$2,$3,$4,'paid','manual')
     RETURNING *`,
    [id, contributor_name.trim(), contributor_phone.trim(), Number(amount)]
  );
  return NextResponse.json({ contribution: rows[0] });
}
