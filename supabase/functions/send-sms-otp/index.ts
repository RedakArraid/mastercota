import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface SmsHookPayload {
  user: {
    id: string;
    phone: string;
  };
  sms: {
    otp: string;
  };
}

async function verifySignature(req: Request, body: string): Promise<boolean> {
  const signature = req.headers.get("x-supabase-signature");
  if (!signature) return false;

  const rawSecret = Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "";
  const secretBase64 = rawSecret.replace("whsec_", "");
  const secretBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expectedHex = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === `v1=${expectedHex}`;
}

Deno.serve(async (req: Request) => {
  const body = await req.text();

  const valid = await verifySignature(req, body);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload: SmsHookPayload = JSON.parse(body);
  const phone = payload.user.phone;
  const otp = payload.sms.otp;

  const response = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: phone,
      from: "Mastercota",
      sms: `Votre code de vérification Mastercota : ${otp}. Valable 10 minutes.`,
      type: "plain",
      channel: "generic",
      api_key: Deno.env.get("TERMII_API_KEY"),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Termii error:", errorText);
    return new Response(JSON.stringify({ error: errorText }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await response.json();
  console.log("SMS sent via Termii:", result);

  return new Response(JSON.stringify({}), {
    headers: { "Content-Type": "application/json" },
  });
});
