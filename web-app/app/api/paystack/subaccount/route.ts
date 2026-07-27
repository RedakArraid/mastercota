import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { paystackFetch } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { business_name, settlement_bank, account_number } = await req.json();
  if (!business_name || !settlement_bank || !account_number) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const { ok, data } = await paystackFetch("/subaccount", {
    method: "POST",
    body: JSON.stringify({
      business_name,
      settlement_bank,
      account_number,
      percentage_charge: 1.0,
    }),
  });
  if (!ok) {
    return NextResponse.json(
      { error: data.message || "Création sous-compte échouée" },
      { status: 400 }
    );
  }

  const code = data.data.subaccount_code as string;
  await query(
    `UPDATE users SET paystack_subaccount_id = $1 WHERE id = $2`,
    [code, session.id]
  );
  return NextResponse.json({ subaccount_code: code });
}
