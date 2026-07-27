-- Admin role + OpenWA settings (singleton)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

CREATE TABLE IF NOT EXISTS openwa_settings (
  id          text PRIMARY KEY DEFAULT 'default',
  enabled     boolean NOT NULL DEFAULT false,
  base_url    text,
  api_key     text,
  session_id  text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT openwa_settings_singleton CHECK (id = 'default')
);

INSERT INTO openwa_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;
