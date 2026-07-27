import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateSlug } from "@/lib/format";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { rows } = await query(
    `SELECT * FROM cotisations WHERE owner_id = $1 ORDER BY created_at DESC`,
    [session.id]
  );
  return NextResponse.json({ cotisations: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, description, target_amount, deadline, cover_url, settings } =
    body;
  if (!title || !target_amount || !deadline) {
    return NextResponse.json(
      { error: "title, target_amount, deadline requis" },
      { status: 400 }
    );
  }
  const slug = generateSlug(String(title));
  try {
    const { rows } = await query(
      `INSERT INTO cotisations
        (title, description, target_amount, deadline, owner_id, cover_url, slug, settings)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
       RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        Number(target_amount),
        deadline,
        session.id,
        cover_url || null,
        slug,
        JSON.stringify(settings ?? {}),
      ]
    );
    return NextResponse.json({ cotisation: rows[0] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json(
      {
        error: msg.includes("duplicate")
          ? "Ce titre existe déjà. Essayez un autre."
          : msg,
      },
      { status: 400 }
    );
  }
}
