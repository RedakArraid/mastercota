import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await getSessionFromRequest(req);
  const { rows } = await query(`SELECT * FROM cotisations WHERE id = $1`, [id]);
  const cot = rows[0];
  if (!cot) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (session?.id !== cot.owner_id && !["active", "completed", "closed"].includes(cot.status)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ cotisation: cot });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json();
  const { rows: owned } = await query(
    `SELECT id FROM cotisations WHERE id = $1 AND owner_id = $2`,
    [id, session.id]
  );
  if (!owned[0]) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.status) {
    const { rows } = await query(
      `UPDATE cotisations SET status = $1 WHERE id = $2 RETURNING *`,
      [body.status, id]
    );
    return NextResponse.json({ cotisation: rows[0] });
  }
  if (body.settings) {
    const { rows } = await query(
      `UPDATE cotisations SET settings = $1::jsonb WHERE id = $2 RETURNING *`,
      [JSON.stringify(body.settings), id]
    );
    return NextResponse.json({ cotisation: rows[0] });
  }
  return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
}
