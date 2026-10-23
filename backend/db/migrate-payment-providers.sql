-- Prépare les frais Mastercota pour plusieurs rails de paiement.
-- PI-SPI devient le rail cible principal via un participant homologué.
-- Paystack reste disponible comme secours explicite.

ALTER TABLE platform_payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS provider_reference text,
  ADD COLUMN IF NOT EXISTS pricing_version text NOT NULL DEFAULT 'legacy-2026-10',
  ADD COLUMN IF NOT EXISTS billing_plan text;

UPDATE platform_payments
SET provider_reference = paystack_reference
WHERE provider_reference IS NULL
  AND paystack_reference IS NOT NULL;

ALTER TABLE platform_payments
  DROP CONSTRAINT IF EXISTS platform_payments_provider_check;

ALTER TABLE platform_payments
  ADD CONSTRAINT platform_payments_provider_check
  CHECK (provider IN ('pispi', 'paystack'));

CREATE UNIQUE INDEX IF NOT EXISTS platform_payments_provider_reference_uidx
  ON platform_payments(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_payments_provider_status_idx
  ON platform_payments(provider, status, created_at DESC);

COMMENT ON COLUMN platform_payments.provider IS
  'Rail utilisé pour payer les frais Mastercota: pispi ou paystack.';
COMMENT ON COLUMN platform_payments.provider_reference IS
  'Référence retournée par le fournisseur; paystack_reference reste temporairement conservée pour compatibilité.';
COMMENT ON COLUMN platform_payments.pricing_version IS
  'Version commerciale ayant servi à établir le prix afin de conserver un historique auditable.';
