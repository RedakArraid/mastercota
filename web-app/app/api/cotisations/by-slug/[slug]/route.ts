import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const { rows } = await query(`SELECT * FROM cotisations WHERE slug = $1`, [
    slug,
  ]);
  if (!rows[0]) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  return NextResponse.json({ cotisation: rows[0] });
}
