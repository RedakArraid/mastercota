-- Admin-only routing for Mastercota platform fee payments.
-- New attempts use the active provider. Existing attempts remain bound to
-- their original provider to avoid accidental double charges.

CREATE TABLE IF NOT EXISTS platform_payment_settings (
  id               int PRIMARY KEY DEFAULT 1,
  active_provider  text NOT NULL DEFAULT 'paystack'
                     CHECK (active_provider IN ('pispi', 'paystack')),
  updated_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_payment_settings_singleton CHECK (id = 1)
);

INSERT INTO platform_payment_settings (id, active_provider)
VALUES (1, 'paystack')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS platform_payment_provider_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_provider  text NOT NULL CHECK (from_provider IN ('pispi', 'paystack')),
  to_provider    text NOT NULL CHECK (to_provider IN ('pispi', 'paystack')),
  changed_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  note           text NOT NULL CHECK (length(trim(note)) BETWEEN 1 AND 500),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_payment_provider_events_created_idx
  ON platform_payment_provider_events(created_at DESC);
