import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  const signature = req.headers.get("x-paystack-signature");
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
  }

  const bodyText = await req.text();
  const hash = createHmac("sha512", secret).update(bodyText).digest("hex");
  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(bodyText);
  if (event.event === "charge.success" && event.data?.status === "success") {
    const reference = event.data.reference as string;
    const channel = (event.data.channel as string) || "mobile_money";
    await query(
      `UPDATE contributions
       SET status = 'paid', payment_method = $1
       WHERE paystack_reference = $2 AND status <> 'paid'`,
      [channel, reference]
    );
  }

  return NextResponse.json({ received: true });
}
