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

Deno.serve(async (req: Request) => {
  const payload: SmsHookPayload = await req.json();

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
