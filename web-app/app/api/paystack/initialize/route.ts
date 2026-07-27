import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "@/lib/db";
import { paystackFetch } from "@/lib/paystack";

export async function POST(req: Request) {
  try {
    const { cotisation_id, amount, contributor_name, contributor_phone } =
      await req.json();
    if (!cotisation_id || !amount || !contributor_name || !contributor_phone) {
      return NextResponse.json(
        { error: "cotisation_id, amount, contributor_name, contributor_phone requis" },
        { status: 400 }
      );
    }

    const { rows: cots } = await query<{
      title: string;
      owner_id: string;
    }>(`SELECT title, owner_id FROM cotisations WHERE id = $1`, [cotisation_id]);
    if (!cots[0]) {
      return NextResponse.json({ error: "Cotisation introuvable" }, { status: 404 });
    }

    const { rows: owners } = await query<{
      paystack_subaccount_id: string | null;
    }>(`SELECT paystack_subaccount_id FROM users WHERE id = $1`, [
      cots[0].owner_id,
    ]);

    const contributionId = randomUUID();
    const cleanPhone = String(contributor_phone).replace(/[^0-9]/g, "");
    const email = `${cleanPhone}@mastercota.com`;
    const amountInSubunits = Math.round(Number(amount) * 100);

    const payload: Record<string, unknown> = {
      email,
      amount: amountInSubunits,
      reference: contributionId,
    };
    if (owners[0]?.paystack_subaccount_id) {
      payload.subaccount = owners[0].paystack_subaccount_id;
      payload.bearer = "subaccount";
    }

    const { ok, data } = await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!ok) {
      return NextResponse.json(
        { error: data.message || "Paystack initialize failed" },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO contributions
        (id, cotisation_id, contributor_name, contributor_phone, amount, status, paystack_reference)
       VALUES ($1,$2,$3,$4,$5,'pending',$1)`,
      [
        contributionId,
        cotisation_id,
        contributor_name,
        contributor_phone,
        Number(amount),
      ]
    );

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: contributionId,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
