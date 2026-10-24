import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TIMEOUT_MS = 20_000;
const ECOMMERCE_CATEGORY = "521";
const WRITE_SCOPE = "demande_paiement.write";
const READ_SCOPE = "demande_paiement.read";

type PispiToken = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

export type PispiRequestToPay = {
  txId: string;
  payeurAlias?: string;
  payeAlias?: string;
  montant?: number;
  statut?: string;
  statutRaison?: string;
  end2endId?: string;
  endToEndId?: string;
  dateDemande?: string;
  dateIrrevocabilite?: string;
  [key: string]: unknown;
};

type PispiConfig = {
  baseUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  payeeAlias: string;
  webhookSecret: string;
  scopePrefix: string;
  environment: "sandbox" | "production";
};

let cachedToken: { key: string; value: string; expiresAt: number } | null = null;

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function requireHttps(name: string, value: string): string {
  if (!value) throw new Error(`${name} manquant`);
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${name} doit utiliser HTTPS`);
  return value.replace(/\/$/, "");
}

export function pispiConfig(): PispiConfig {
  const environment = (env("PISPI_ENVIRONMENT") || "sandbox").toLowerCase();
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("PISPI_ENVIRONMENT doit valoir sandbox ou production");
  }
  if (environment === "production") {
    throw new Error("PI-SPI production nécessite le mTLS/PICERT du participant; l’adaptateur actuel est limité au sandbox");
  }
  return {
    baseUrl: requireHttps("PISPI_API_BASE_URL", env("PISPI_API_BASE_URL")),
    tokenUrl: requireHttps("PISPI_TOKEN_URL", env("PISPI_TOKEN_URL")),
    clientId: env("PISPI_CLIENT_ID") || (() => { throw new Error("PISPI_CLIENT_ID manquant"); })(),
    clientSecret: env("PISPI_CLIENT_SECRET") || (() => { throw new Error("PISPI_CLIENT_SECRET manquant"); })(),
    apiKey: env("PISPI_API_KEY") || (() => { throw new Error("PISPI_API_KEY manquante"); })(),
    payeeAlias: env("PISPI_PAYEE_ALIAS") || (() => { throw new Error("PISPI_PAYEE_ALIAS manquant"); })(),
    webhookSecret: env("PISPI_WEBHOOK_SECRET"),
    scopePrefix: env("PISPI_SCOPE_PREFIX") || "piz/",
    environment,
  };
}

function scopeValue(config: PispiConfig, scopes: string[]): string {
  return scopes.map(scope => scope.includes("/") ? scope : `${config.scopePrefix}${scope}`).join(" ");
}

async function accessToken(scopes: string[]): Promise<string> {
  const config = pispiConfig();
  const scope = scopeValue(config, scopes);
  const cacheKey = `${config.tokenUrl}|${config.clientId}|${scope}`;
  if (cachedToken?.key === cacheKey && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope,
  });
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  let data: PispiToken & { error?: string; error_description?: string };
  try {
    data = await response.json() as PispiToken & { error?: string; error_description?: string };
  } catch {
    throw new Error("Réponse OAuth2 PI-SPI invalide");
  }
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Authentification PI-SPI indisponible");
  }
  cachedToken = {
    key: cacheKey,
    value: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 300)) * 1000,
  };
  return data.access_token;
}

async function apiFetch(path: string, init: RequestInit | undefined, scopes: string[]) {
  const config = pispiConfig();
  const token = await accessToken(scopes);
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${token}`,
      "X-API-Key": config.apiKey,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  let data: any = null;
  try { data = await response.json(); } catch { /* handled below */ }
  return { ok: response.ok, status: response.status, data };
}

export async function createPispiRequestToPay(options: {
  txId: string;
  payerAlias: string;
  amount: number;
  purpose: "create" | "extend";
  cotisationId: string;
}) {
  const config = pispiConfig();
  if (!/^[0-9a-f-]{36}$/i.test(options.payerAlias)) throw new Error("Alias PI-SPI payeur invalide");
  const amount = Math.round(Number(options.amount));
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Montant PI-SPI invalide");
  const dateLimitePaiement = new Date(Date.now() + 2 * 60_000).toISOString();
  const payload = {
    txId: options.txId,
    confirmation: false,
    categorie: ECOMMERCE_CATEGORY,
    payeurAlias: options.payerAlias,
    payeAlias: config.payeeAlias,
    montant: amount,
    dateLimitePaiement,
    motif: options.purpose === "extend" ? "Prolongation Mastercota" : "Frais Mastercota",
    refDocType: "CINV",
    refDocNumero: `MC-${options.cotisationId}`,
  };
  const result = await apiFetch("/demandes-paiements", {
    method: "POST",
    body: JSON.stringify(payload),
  }, [WRITE_SCOPE]);
  if (!result.ok || !result.data) {
    throw new Error(result.data?.message || result.data?.detail || "Création de la demande PI-SPI impossible");
  }
  return result.data as PispiRequestToPay;
}

export async function getPispiRequestToPay(txId: string): Promise<PispiRequestToPay> {
  const result = await apiFetch(`/demandes-paiements/${encodeURIComponent(txId)}`, undefined, [READ_SCOPE]);
  if (!result.ok || !result.data) {
    throw new Error(result.data?.message || result.data?.detail || "Vérification PI-SPI indisponible");
  }
  return result.data as PispiRequestToPay;
}

export function pispiStatus(value: PispiRequestToPay): string {
  return String(value.statut || "").toUpperCase();
}

export function pispiEndToEndId(value: PispiRequestToPay): string | null {
  const id = value.end2endId || value.endToEndId;
  return typeof id === "string" && id ? id : null;
}

export function verifyPispiWebhookSignature(rawBody: string, signature: string | null | undefined): boolean {
  const secret = env("PISPI_WEBHOOK_SECRET");
  if (!secret || !signature) return false;
  const received = signature.trim().replace(/^sha256=/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export function pispiWebhookTxIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const items = Array.isArray(root.data) ? root.data : [root];
  const ids = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const txId = (item as Record<string, unknown>).txId;
    if (typeof txId === "string" && txId) ids.add(txId);
  }
  return [...ids];
}

export function resetPispiTokenCacheForTests() {
  cachedToken = null;
}
