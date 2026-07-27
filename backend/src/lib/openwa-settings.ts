import { query } from "./db.js";

export type OpenWaSource = "db" | "env" | "none";

export type EffectiveOpenWaConfig = {
  enabled: boolean;
  baseUrl: string | null;
  apiKey: string | null;
  sessionId: string | null;
  source: OpenWaSource;
};

export type PublicOpenWaSettings = {
  enabled: boolean;
  baseUrl: string;
  sessionId: string;
  hasApiKey: boolean;
  configured: boolean;
  source: OpenWaSource;
  updatedAt: string | null;
};

type DbRow = {
  id: string;
  enabled: boolean;
  base_url: string | null;
  api_key: string | null;
  session_id: string | null;
  updated_at: Date | string;
};

function fromEnv() {
  return {
    enabled: process.env.OPENWA_ENABLED === "true",
    baseUrl: process.env.OPENWA_BASE_URL?.trim() || null,
    apiKey: process.env.OPENWA_API_KEY?.trim() || null,
    sessionId: process.env.OPENWA_SESSION_ID?.trim() || null,
    source: "env" as const,
  };
}

/** Normalize to `…/api` (OpenWA REST root). */
export function normalizeBaseUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let url = raw.trim().replace(/\/+$/, "");
  if (!url.endsWith("/api")) url += "/api";
  return url;
}

function isConfigured(baseUrl: string | null, apiKey: string | null, sessionId: string | null) {
  return Boolean(baseUrl?.trim() && apiKey && sessionId?.trim());
}

async function getDbSettings(): Promise<DbRow | null> {
  try {
    const { rows } = await query<DbRow>(
      `SELECT * FROM openwa_settings WHERE id = 'default'`
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getEffectiveOpenWaConfig(): Promise<EffectiveOpenWaConfig> {
  const db = await getDbSettings();
  if (db && isConfigured(db.base_url, db.api_key, db.session_id)) {
    return {
      enabled: Boolean(db.enabled),
      baseUrl: normalizeBaseUrl(db.base_url),
      apiKey: db.api_key,
      sessionId: db.session_id!.trim(),
      source: "db",
    };
  }

  const env = fromEnv();
  if (isConfigured(env.baseUrl, env.apiKey, env.sessionId)) {
    return {
      enabled: env.enabled || process.env.OPENWA_ENABLED !== "false",
      baseUrl: normalizeBaseUrl(env.baseUrl),
      apiKey: env.apiKey,
      sessionId: env.sessionId!,
      source: "env",
    };
  }

  return {
    enabled: false,
    baseUrl: null,
    apiKey: null,
    sessionId: null,
    source: "none",
  };
}

export async function isOpenWaActive() {
  const config = await getEffectiveOpenWaConfig();
  return (
    config.enabled &&
    Boolean(config.baseUrl && config.apiKey && config.sessionId)
  );
}

export async function getPublicOpenWaSettings(): Promise<PublicOpenWaSettings> {
  const db = await getDbSettings();
  const env = fromEnv();
  const usingDb = Boolean(
    db && isConfigured(db.base_url, db.api_key, db.session_id)
  );

  if (usingDb && db) {
    return {
      enabled: Boolean(db.enabled),
      baseUrl: db.base_url || "",
      sessionId: db.session_id || "",
      hasApiKey: Boolean(db.api_key),
      configured: true,
      source: "db",
      updatedAt:
        typeof db.updated_at === "string"
          ? db.updated_at
          : db.updated_at?.toISOString?.() ?? null,
    };
  }

  const configured = isConfigured(env.baseUrl, env.apiKey, env.sessionId);
  return {
    enabled: configured
      ? env.enabled || process.env.OPENWA_ENABLED !== "false"
      : false,
    baseUrl: env.baseUrl || "",
    sessionId: env.sessionId || "",
    hasApiKey: Boolean(env.apiKey),
    configured,
    source: configured ? "env" : "none",
    updatedAt: null,
  };
}

export async function updateOpenWaSettings(payload: {
  enabled?: boolean;
  baseUrl?: string;
  apiKey?: string;
  sessionId?: string;
}) {
  const sets: string[] = ["updated_at = now()"];
  const vals: unknown[] = [];
  let i = 1;

  if (payload.enabled !== undefined) {
    sets.push(`enabled = $${i++}`);
    vals.push(Boolean(payload.enabled));
  }
  if (payload.baseUrl !== undefined) {
    sets.push(`base_url = $${i++}`);
    vals.push(
      payload.baseUrl?.trim() ? normalizeBaseUrl(payload.baseUrl) : null
    );
  }
  if (payload.sessionId !== undefined) {
    sets.push(`session_id = $${i++}`);
    vals.push(payload.sessionId?.trim() || null);
  }
  if (payload.apiKey !== undefined && payload.apiKey !== "") {
    sets.push(`api_key = $${i++}`);
    vals.push(payload.apiKey);
  }

  await query(
    `INSERT INTO openwa_settings (id) VALUES ('default') ON CONFLICT DO NOTHING`
  );
  await query(
    `UPDATE openwa_settings SET ${sets.join(", ")} WHERE id = 'default'`,
    vals
  );
  return getPublicOpenWaSettings();
}
