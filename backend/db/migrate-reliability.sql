ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version int NOT NULL DEFAULT 0;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0;
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS authorization_url text;
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'XOF';
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS contributions_request_idx ON contributions(cotisation_id, request_id) WHERE request_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS request_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS request_limits_expiry_idx ON request_limits(expires_at);
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  cotisation_id uuid REFERENCES cotisations(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);
