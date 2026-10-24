export type PlatformPaymentProvider = "pispi" | "paystack";

export type PlatformPaymentAvailability = {
  provider: PlatformPaymentProvider;
  enabled: boolean;
  reason?: string;
};

/**
 * PI-SPI is the strategic primary rail, but production activation must wait
 * for credentials and an API contract from an homologated participant.
 *
 * This module deliberately does not auto-fallback between providers: a user
 * must explicitly choose the backup rail to avoid double-payment risk.
 */
export function primaryPlatformPaymentProvider(): PlatformPaymentProvider {
  const value = (process.env.PLATFORM_PAYMENT_PRIMARY || "paystack").trim().toLowerCase();
  if (value !== "pispi" && value !== "paystack") {
    throw new Error("PLATFORM_PAYMENT_PRIMARY doit valoir pispi ou paystack");
  }
  return value;
}

export function platformPaymentAvailability(): PlatformPaymentAvailability[] {
  const pispiEnabled = process.env.PISPI_ENABLED === "true";
  const pispiParticipant = (process.env.PISPI_PARTICIPANT || "").trim();
  const pispiBaseUrl = (process.env.PISPI_API_BASE_URL || "").trim();
  const pispiTokenUrl = (process.env.PISPI_TOKEN_URL || "").trim();
  const pispiClientId = (process.env.PISPI_CLIENT_ID || "").trim();
  const pispiClientSecret = (process.env.PISPI_CLIENT_SECRET || "").trim();
  const pispiApiKey = (process.env.PISPI_API_KEY || "").trim();
  const pispiPayeeAlias = (process.env.PISPI_PAYEE_ALIAS || "").trim();
  const pispiEnvironment = (process.env.PISPI_ENVIRONMENT || "sandbox").trim().toLowerCase();
  const paystackEnabled = Boolean((process.env.PAYSTACK_SECRET_KEY || "").trim());

  return [
    {
      provider: "pispi",
      enabled: pispiEnabled && pispiEnvironment === "sandbox" && Boolean(pispiParticipant) && Boolean(pispiBaseUrl) && Boolean(pispiTokenUrl) && Boolean(pispiClientId) && Boolean(pispiClientSecret) && Boolean(pispiApiKey) && Boolean(pispiPayeeAlias),
      ...(
        pispiEnabled && pispiEnvironment === "sandbox" && pispiParticipant && pispiBaseUrl && pispiTokenUrl && pispiClientId && pispiClientSecret && pispiApiKey && pispiPayeeAlias
          ? {}
          : {
              reason:
                pispiEnvironment === "production"
                  ? "PI-SPI production reste bloqué jusqu’à l’installation mTLS/PICERT du participant."
                  : "PI-SPI sandbox nécessite participant, URLs, OAuth2, clé API et alias bénéficiaire.",
            }
      ),
    },
    {
      provider: "paystack",
      enabled: paystackEnabled,
      ...(paystackEnabled
        ? {}
        : { reason: "PAYSTACK_SECRET_KEY non configurée." }),
    },
  ];
}

export function assertPlatformPaymentProviderAvailable(provider: PlatformPaymentProvider) {
  const status = platformPaymentAvailability().find(item => item.provider === provider);
  if (!status?.enabled) {
    throw new Error(status?.reason || `Fournisseur de paiement indisponible: ${provider}`);
  }
}

/**
 * Returns the backup option only. Callers must present it to the user and
 * obtain an explicit choice; never initialize it automatically after failure.
 */
export function backupPlatformPaymentProvider(
  primary = primaryPlatformPaymentProvider()
): PlatformPaymentProvider | null {
  if (primary === "pispi") {
    const paystack = platformPaymentAvailability().find(item => item.provider === "paystack");
    return paystack?.enabled ? "paystack" : null;
  }
  return null;
}
