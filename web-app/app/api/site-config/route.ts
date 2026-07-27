import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const { rows } = await query(`SELECT * FROM site_config WHERE id = 1`);
  return NextResponse.json({ config: rows[0] ?? null });
}
