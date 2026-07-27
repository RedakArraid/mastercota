-- Migration incrémentale (DB déjà initialisée)
ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS landing jsonb NOT NULL DEFAULT '{
    "hero_title": "Cotisez ensemble, facilement",
    "hero_subtitle": "Créez une cotisation, partagez un lien, recevez via Mobile Money.",
    "cta_primary": "Créer une cotisation",
    "cta_secondary": "Voir comment ça marche",
    "features": [
      {"title": "Lien public", "body": "Partagez /c/votre-slug sur WhatsApp."},
      {"title": "Mobile Money", "body": "Wave, MTN, Orange — confirmation auto."},
      {"title": "Suivi en direct", "body": "Progression mise à jour en continu."}
    ]
  }'::jsonb;

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
    E'## 1. Créez votre cotisation\n\nIndiquez un objectif et une date limite.\n\n## 2. Partagez le lien\n\nEnvoyez le lien public sur WhatsApp.\n\n## 3. Recevez\n\nMobile Money via Paystack, tableau de bord mis à jour.',
    'Comment ça marche',
    'header',
    10
  ),
  (
    'cgu',
    'Conditions générales',
    'Règles d''utilisation.',
    E'## CGU\n\nEn utilisant Mastercota vous acceptez ces conditions.\n\n### Commission\n1 % sur chaque contribution.',
    'CGU',
    'footer',
    20
  ),
  (
    'confidentialite',
    'Confidentialité',
    'Traitement des données.',
    E'## Confidentialité\n\nTéléphone pour auth OTP WhatsApp. Paiements via Paystack.',
    'Confidentialité',
    'footer',
    30
  ),
  (
    'mentions-legales',
    'Mentions légales',
    'Informations légales.',
    E'## Mentions légales\n\nMastercota — support@mastercota.com',
    'Mentions légales',
    'footer',
    40
  )
ON CONFLICT (slug) DO NOTHING;
