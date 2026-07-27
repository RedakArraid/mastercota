-- MASTERCOTA — schéma PostgreSQL
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text UNIQUE NOT NULL,
  name        text,
  avatar_url  text,
  paystack_subaccount_id text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes(phone);

CREATE TABLE IF NOT EXISTS cotisations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text UNIQUE NOT NULL,
  title          text NOT NULL,
  description    text,
  cover_url      text,
  target_amount  numeric NOT NULL CHECK (target_amount > 0),
  current_amount numeric NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline       date NOT NULL,
  owner_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'closed', 'completed')),
  settings       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cotisations_owner_idx ON cotisations(owner_id);
CREATE INDEX IF NOT EXISTS cotisations_slug_idx ON cotisations(slug);
CREATE INDEX IF NOT EXISTS cotisations_status_idx ON cotisations(status);

CREATE TABLE IF NOT EXISTS contributions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotisation_id       uuid NOT NULL REFERENCES cotisations(id) ON DELETE CASCADE,
  contributor_name    text NOT NULL,
  contributor_phone   text NOT NULL,
  amount              numeric NOT NULL CHECK (amount > 0),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'failed')),
  paystack_reference  text UNIQUE,
  payment_method      text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contributions_cotisation_idx ON contributions(cotisation_id);
CREATE INDEX IF NOT EXISTS contributions_paystack_idx ON contributions(paystack_reference);
CREATE INDEX IF NOT EXISTS contributions_status_idx ON contributions(status);

CREATE OR REPLACE FUNCTION update_cotisation_amount()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE cotisations
    SET current_amount = current_amount + NEW.amount
    WHERE id = NEW.cotisation_id;

    UPDATE cotisations
    SET status = 'completed'
    WHERE id = NEW.cotisation_id
      AND current_amount >= target_amount
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_contribution_paid ON contributions;
CREATE TRIGGER on_contribution_paid
  AFTER INSERT OR UPDATE ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_cotisation_amount();

CREATE TABLE IF NOT EXISTS site_config (
  id               int PRIMARY KEY DEFAULT 1,
  phone_whatsapp   text NOT NULL DEFAULT '',
  email_contact    text NOT NULL DEFAULT '',
  email_support    text NOT NULL DEFAULT 'support@mastercota.com',
  social_instagram text NOT NULL DEFAULT '',
  social_facebook  text NOT NULL DEFAULT '',
  social_twitter   text NOT NULL DEFAULT '',
  social_tiktok    text NOT NULL DEFAULT '',
  social_youtube   text NOT NULL DEFAULT '',
  doc_cgu_url      text NOT NULL DEFAULT '',
  doc_privacy_url  text NOT NULL DEFAULT '',
  doc_mentions_url text NOT NULL DEFAULT '',
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_config_singleton CHECK (id = 1)
);

INSERT INTO site_config (id) VALUES (1) ON CONFLICT DO NOTHING;
