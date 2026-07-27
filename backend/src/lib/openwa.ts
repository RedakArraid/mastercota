function baseUrl() {
  return (process.env.OPENWA_BASE_URL ?? "http://openwa-api:2785").replace(
    /\/$/,
    ""
  );
}

export async function sendOtpWhatsApp(phoneE164: string, code: string) {
  const sessionId = process.env.OPENWA_SESSION_ID;
  const apiKey = process.env.OPENWA_API_KEY;
  if (!sessionId || !apiKey) {
    throw new Error("OPENWA_SESSION_ID et OPENWA_API_KEY sont requis");
  }
  const digits = phoneE164.replace(/\D/g, "");
  const chatId = `${digits}@c.us`;
  const text =
    `*Mastercota*\nVotre code de vérification est : *${code}*\n` +
    `Il expire dans 10 minutes. Ne le partagez avec personne.`;

  const res = await fetch(
    `${baseUrl()}/api/sessions/${sessionId}/messages/send-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ chatId, text }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenWA ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}
