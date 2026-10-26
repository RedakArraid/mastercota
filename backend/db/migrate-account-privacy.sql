-- Account deletion, retention safeguards and mobile-store support.

CREATE TABLE IF NOT EXISTS free_cotisation_history (
  phone_fingerprint text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tombstone owner for Academy courses whose instructor deleted their account.
-- Existing learners keep purchased access while the courses disappear from the public catalogue.
INSERT INTO users (id, phone, name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'system:academy-deleted-instructor',
  'Instructeur supprimé',
  'user'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pages (slug, title, excerpt, body_md, nav_label, nav_placement, sort_order, published)
VALUES (
  'support',
  'Support Mastercota',
  'Aide et contact pour Mastercota et Mastercota Academy.',
  E'## Support Mastercota\n\nPour toute question liée à votre compte, une cotisation, une contribution, un cours Academy ou un paiement, contactez **support@mastercota.com**.\n\n### Avant de nous écrire\n\nIndiquez si possible la page ou le cours concerné, la référence affichée si un paiement est concerné et une description précise du problème.\n\n### Sécurité\n\nNe transmettez jamais votre code OTP WhatsApp, une clé API ou un secret de paiement.\n\n### Fonds\n\nLes contributions et les paiements de cours sont versés directement au bénéficiaire concerné. Mastercota ne conserve pas ces fonds.',
  'Support',
  'footer',
  50,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title,
  excerpt=EXCLUDED.excerpt,
  body_md=EXCLUDED.body_md,
  nav_label=EXCLUDED.nav_label,
  nav_placement=EXCLUDED.nav_placement,
  sort_order=EXCLUDED.sort_order,
  published=true,
  updated_at=now();

UPDATE pages
SET body_md = body_md || E'\n\n### Suppression du compte\n\nVous pouvez supprimer votre compte directement dans l’application ou depuis https://mastercota.com/suppression-compte. La suppression retire votre profil, vos sessions, vos données d’apprentissage et les données personnelles associées. Une empreinte HMAC non réversible du numéro peut être conservée uniquement pour empêcher la réutilisation abusive de l’offre de première cotisation.\n\nSi vous avez contribué à une cotisation organisée par une autre personne, le montant confirmé peut être conservé afin de préserver sa comptabilité, mais votre nom, votre téléphone et votre note sont anonymisés.\n\nSi vous êtes instructeur Academy et que des apprenants ont déjà obtenu un accès à vos cours, les cours concernés sont archivés et conservés sous un propriétaire système neutre afin de préserver les accès déjà achetés et les certificats. Aucun nouvel achat n’est possible après cette suppression. Les paiements Academy encore en attente doivent être résolus avant la suppression du compte.\n\nLes prestataires externes peuvent conserver leurs propres traces conformément à leurs obligations légales et contractuelles.'
WHERE slug='confidentialite'
  AND body_md NOT LIKE '%### Suppression du compte%';
