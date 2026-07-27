import {
  getEffectiveOpenWaConfig,
  isOpenWaActive,
} from "./openwa-settings.js";

function phoneToChatId(phoneE164: string) {
  const digits = String(phoneE164 || "").replace(/\D/g, "");
  if (!digits) throw new Error("Numéro de téléphone invalide");
  return `${digits}@c.us`;
}

async function openWaFetch(
  path: string,
  opts: { method?: string; body?: unknown } = {}
) {
  const config = await getEffectiveOpenWaConfig();
  if (!config.baseUrl || !config.apiKey) {
    throw new Error("OpenWA non configuré");
  }
  const url = `${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (typeof data === "object" &&
        data &&
        "message" in data &&
        String((data as { message: unknown }).message)) ||
      (typeof data === "string" && data) ||
      `OpenWA HTTP ${res.status}`;
    throw new Error(String(msg).slice(0, 300));
  }
  return data;
}

export async function getSessionStatus() {
  const config = await getEffectiveOpenWaConfig();
  if (!config.sessionId) throw new Error("Session OpenWA non configurée");
  const session = (await openWaFetch(
    `/sessions/${encodeURIComponent(config.sessionId)}`
  )) as {
    id?: string;
    name?: string;
    status?: string;
    phone?: string | null;
    pushName?: string | null;
    lastError?: string | null;
    connectedAt?: string | null;
    lastActive?: string | null;
  };
  return {
    id: session.id,
    name: session.name,
    status: session.status,
    phone: session.phone || null,
    pushName: session.pushName || null,
    connected: session.status === "ready",
    lastError: session.lastError || null,
    connectedAt: session.connectedAt || null,
    lastActive: session.lastActive || null,
  };
}

export async function sendTextMessage(phoneE164: string, text: string) {
  const config = await getEffectiveOpenWaConfig();
  if (!config.sessionId) throw new Error("Session OpenWA non configurée");
  return openWaFetch(
    `/sessions/${encodeURIComponent(config.sessionId)}/messages/send-text`,
    {
      method: "POST",
      body: { chatId: phoneToChatId(phoneE164), text },
    }
  );
}

export async function pingOpenWa() {
  await openWaFetch("/health");
  return true;
}

export async function sendOtpWhatsApp(phoneE164: string, code: string) {
  const active = await isOpenWaActive();
  if (!active) {
    throw new Error("OpenWA non actif");
  }
  const text =
    `*Mastercota*\nVotre code de vérification est : *${code}*\n` +
    `Il expire dans 10 minutes. Ne le partagez avec personne.`;
  return sendTextMessage(phoneE164, text);
}

export { isOpenWaActive };
