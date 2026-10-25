import { query } from "./db.js";
import { isOpenWaActive } from "./openwa.js";
import {
  activePlatformPaymentProvider,
  platformPaymentAvailability,
} from "./platform-payment-provider.js";

export type ReadinessCheck = {
  ok: boolean;
  required: boolean;
  detail?: string;
};

export type RuntimeReadiness = {
  ok: boolean;
  mode: "production" | "non-production";
  checks: {
    database: ReadinessCheck;
    otp: ReadinessCheck;
    platformPayments: ReadinessCheck;
    pispiProduction: ReadinessCheck;
  };
};

export async function runtimeReadiness(): Promise<RuntimeReadiness> {
  const production = process.env.NODE_ENV === "production";
  const checks: RuntimeReadiness["checks"] = {
    database: { ok: false, required: true },
    otp: { ok: false, required: production },
    platformPayments: { ok: false, required: production },
    pispiProduction: {
      ok: process.env.PISPI_ENABLED !== "true" ||
        (process.env.PISPI_ENVIRONMENT || "sandbox").toLowerCase() !== "production",
      required: production && process.env.PISPI_ENABLED === "true",
    },
  };

  try {
    await query("SELECT 1");
    checks.database = { ok: true, required: true };
  } catch {
    checks.database = {
      ok: false,
      required: true,
      detail: "PostgreSQL indisponible",
    };
  }

  try {
    const active = await isOpenWaActive();
    checks.otp = active
      ? { ok: true, required: production }
      : {
          ok: !production,
          required: production,
          detail: "OpenWA/WhatsApp non configuré ou désactivé",
        };
  } catch {
    checks.otp = {
      ok: !production,
      required: production,
      detail: "Configuration OTP inaccessible",
    };
  }

  try {
    const provider = await activePlatformPaymentProvider();
    const availability = platformPaymentAvailability().find(
      item => item.provider === provider
    );
    checks.platformPayments = availability?.enabled
      ? { ok: true, required: production, detail: provider }
      : {
          ok: !production,
          required: production,
          detail:
            availability?.reason ||
            "Aucun rail de paiement Mastercota utilisable",
        };
  } catch {
    checks.platformPayments = {
      ok: !production,
      required: production,
      detail: "Routage des paiements inaccessible",
    };
  }

  if (checks.pispiProduction.required && !checks.pispiProduction.ok) {
    checks.pispiProduction.detail =
      "PI-SPI production reste bloqué jusqu'au mTLS/PICERT du participant";
  }

  const ok = Object.values(checks).every(
    check => !check.required || check.ok
  );

  return {
    ok,
    mode: production ? "production" : "non-production",
    checks,
  };
}
