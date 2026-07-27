-- Billing plateforme : 1re cotisation gratuite / téléphone, frais selon durée

CREATE TABLE IF NOT EXISTS phone_entitlements (
  phone                  text PRIMARY KEY,
  free_cotisations_used  int NOT NULL DEFAULT 0,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cotisations
  ADD COLUMN IF NOT EXISTS duration_days int,
  ADD COLUMN IF NOT EXISTS starts_at date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS platform_fee_reference text,
  ADD COLUMN IF NOT EXISTS is_free_tier boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extension_count int NOT NULL DEFAULT 0;

-- Élargir les statuts cotisation (pending_fee)
ALTER TABLE cotisations DROP CONSTRAINT IF EXISTS cotisations_status_check;
ALTER TABLE cotisations
  ADD CONSTRAINT cotisations_status_check
  CHECK (status IN ('pending_fee', 'active', 'closed', 'completed'));

ALTER TABLE cotisations DROP CONSTRAINT IF EXISTS cotisations_platform_fee_status_check;
ALTER TABLE cotisations
  ADD CONSTRAINT cotisations_platform_fee_status_check
  CHECK (platform_fee_status IN ('none', 'free', 'pending', 'paid', 'waived'));

CREATE TABLE IF NOT EXISTS platform_payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cotisation_id       uuid REFERENCES cotisations(id) ON DELETE SET NULL,
  purpose             text NOT NULL CHECK (purpose IN ('create', 'extend')),
  amount              numeric NOT NULL CHECK (amount > 0),
  duration_days       int,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'failed')),
  paystack_reference  text UNIQUE,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  paid_at             timestamptz
);

CREATE INDEX IF NOT EXISTS platform_payments_user_idx ON platform_payments(user_id);
CREATE INDEX IF NOT EXISTS platform_payments_cotisation_idx ON platform_payments(cotisation_id);
