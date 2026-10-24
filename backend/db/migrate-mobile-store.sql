-- Public support page required by mobile store listings.
INSERT INTO pages (slug, title, excerpt, body_md, nav_label, nav_placement, sort_order)
VALUES (
  'support',
  'Support Mastercota',
  'Aide et contact pour les utilisateurs Mastercota.',
  E'## Support Mastercota\n\nPour toute question liée à votre compte, une cotisation, une contribution ou un paiement de frais Mastercota, contactez-nous à **support@mastercota.com**.\n\n### Avant de nous écrire\n\nIndiquez si possible :\n\n- le titre de la cotisation ;\n- la référence affichée dans Mastercota si un paiement est concerné ;\n- votre numéro de téléphone de compte ;\n- une description précise du problème.\n\n### Sécurité\n\nNe transmettez jamais votre mot de passe, un code OTP reçu sur WhatsApp, une clé API ou un secret de paiement. Mastercota ne vous demandera jamais ces informations par email.\n\n### Contributions\n\nLes fonds des contributions sont versés directement à l''organisateur. Mastercota ne conserve pas l''argent de la cotisation.',
  'Support',
  'footer',
  50
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body_md = EXCLUDED.body_md,
  nav_label = EXCLUDED.nav_label,
  nav_placement = EXCLUDED.nav_placement,
  sort_order = EXCLUDED.sort_order,
  published = true,
  updated_at = now();


UPDATE pages
SET body_md = body_md || E'\n\n### Suppression du compte\n\nVous pouvez supprimer votre compte directement dans l’application ou depuis https://mastercota.com/suppression-compte. La suppression efface votre compte, vos cotisations, vos données de profil, vos OTP et les données associées au service. Si vous avez contribué à une cotisation organisée par une autre personne, le montant confirmé peut être conservé afin de préserver son total, mais votre nom, votre téléphone et votre note sont anonymisés. Des données minimales peuvent rester chez les prestataires de paiement selon leurs propres obligations légales et contractuelles.'
WHERE slug = 'confidentialite'
  AND body_md NOT LIKE '%### Suppression du compte%';
