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

-- Contenu landing dynamique (JSON éditable)
ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS landing jsonb NOT NULL DEFAULT '{
    "hero_title": "Cotisez ensemble, facilement",
    "hero_subtitle": "Créez une cotisation, partagez un lien, recevez via Mobile Money. Simple, transparent, pensé pour la Côte d''Ivoire.",
    "cta_primary": "Créer une cotisation",
    "cta_secondary": "Voir comment ça marche",
    "features": [
      {"title": "Lien public", "body": "Partagez /c/votre-slug sur WhatsApp. Vos proches contribuent sans créer de compte."},
      {"title": "Mobile Money", "body": "Wave, MTN, Orange — paiement sécurisé et confirmation automatique."},
      {"title": "Suivi en direct", "body": "Barre de progression et liste des contributeurs mis à jour en temps réel."}
    ]
  }'::jsonb;

-- Pages CMS dynamiques (header / footer / contenu)
CREATE TABLE IF NOT EXISTS pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  excerpt       text NOT NULL DEFAULT '',
  body_md       text NOT NULL DEFAULT '',
  published     boolean NOT NULL DEFAULT true,
  nav_label     text,
  nav_placement text NOT NULL DEFAULT 'none'
                  CHECK (nav_placement IN ('header', 'footer', 'both', 'none')),
  sort_order    int NOT NULL DEFAULT 100,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO pages (slug, title, excerpt, body_md, nav_label, nav_placement, sort_order)
VALUES
  (
    'comment-ca-marche',
    'Comment ça marche',
    'Créez, partagez, collectez.',
    E'## 1. Créez votre cotisation\n\nIndiquez un objectif, une date limite et un titre clair.\n\n## 2. Partagez le lien\n\nEnvoyez `mastercota.com/c/votre-slug` sur WhatsApp.\n\n## 3. Recevez les contributions\n\nMobile Money via Paystack. Votre tableau de bord se met à jour automatiquement.',
    'Comment ça marche',
    'header',
    10
  ),
  (
    'cgu',
    'Conditions générales',
    'Les règles d''utilisation de Mastercota.',
    E'## Conditions générales d''utilisation\n\nEn utilisant Mastercota, vous acceptez les présentes conditions.\n\n### Compte\nVous êtes responsable de la confidentialité de votre accès téléphone.\n\n### Cotisations\nVous êtes responsable du contenu et de l''usage des fonds collectés.\n\n### Commission\nMastercota prélève 1 % sur chaque contribution encaissée.',
    'CGU',
    'footer',
    20
  ),
  (
    'confidentialite',
    'Confidentialité',
    'Comment nous traitons vos données.',
    E'## Politique de confidentialité\n\nNous collectons le numéro de téléphone pour l''authentification et le suivi des contributions.\n\nLes paiements sont traités par Paystack. Les OTP sont envoyés via WhatsApp (OpenWA).',
    'Confidentialité',
    'footer',
    30
  ),
  (
    'mentions-legales',
    'Mentions légales',
    'Informations légales Mastercota.',
    E'## Mentions légales\n\n**Mastercota** — plateforme de cotisations communautaires.\n\nContact : support@mastercota.com',
    'Mentions légales',
    'footer',
    40
  )
ON CONFLICT (slug) DO NOTHING;

