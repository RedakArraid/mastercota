-- Migration incrémentale (DB déjà initialisée)
ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS landing jsonb NOT NULL DEFAULT '{
    "hero_title": "Une cotisation WhatsApp. L’argent arrive sur votre Wave.",
    "hero_subtitle": "Créez une page, partagez le lien. Vos proches paient via Wave. Mastercota prend 0 % sur ce qu’ils envoient.",
    "cta_primary": "Créer ma cotisation (gratuit 35 jours)",
    "cta_secondary": "Voir les frais",
    "features": [
      {"title": "Lien WhatsApp", "body": "Partagez votre page. Vos proches contribuent sans créer de compte."},
      {"title": "Argent sur Wave", "body": "Les contributions vont directement sur votre Wave. Mastercota ne garde rien."},
      {"title": "Suivi simple", "body": "Vous confirmez chaque paiement. Le total de la cotisation se met à jour."}
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
    'Créez, partagez, collectez via Wave.',
    E'## 1. Créez votre cotisation\n\nIndiquez un objectif et une durée.\n\n## 2. Partagez le lien\n\nEnvoyez le lien public sur WhatsApp.\n\n## 3. Recevez sur Wave\n\nVos proches paient via Wave. Vous confirmez. Mastercota : 0 % sur les contributions.',
    'Comment ça marche',
    'none',
    10
  ),
  (
    'cgu',
    'Conditions générales',
    'Règles d''utilisation.',
    E'## CGU\n\nEn utilisant Mastercota vous acceptez ces conditions.\n\n### Contributions\n\n0 % Mastercota sur les montants envoyés. L''argent va sur Wave de l''organisateur.\n\n### Frais de durée\n\nL''organisateur paie pour garder la page active (1re cotisation gratuite 35 jours).',
    'CGU',
    'footer',
    20
  ),
  (
    'confidentialite',
    'Confidentialité',
    'Traitement des données.',
    E'## Confidentialité\n\nTéléphone pour auth OTP WhatsApp. Contributions via Wave. Frais de durée via prestataire sécurisé.',
    'Confidentialité',
    'footer',
    30
  ),
  (
    'mentions-legales',
    'Mentions légales',
    'Informations légales.',
    E'## Mentions légales\n\nMastercota, support@mastercota.com',
    'Mentions légales',
    'footer',
    40
  )
ON CONFLICT (slug) DO NOTHING;
