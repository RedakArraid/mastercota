import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { paystackFetch } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { account_number, bank_code } = await req.json();
  if (!account_number || !bank_code) {
    return NextResponse.json(
      { error: "account_number and bank_code required" },
      { status: 400 }
    );
  }
  const qs = new URLSearchParams({
    account_number: String(account_number),
    bank_code: String(bank_code),
  });
  const { ok, data } = await paystackFetch(`/bank/resolve?${qs}`);
  if (!ok) {
    return NextResponse.json(
      { error: data.message || "Numéro invalide" },
      { status: 400 }
    );
  }
  return NextResponse.json({
    account_name: data.data?.account_name ?? "",
  });
}
