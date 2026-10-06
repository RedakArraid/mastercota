-- Retirer les longs tirets (—) des textes CMS visibles

UPDATE site_config
SET landing = jsonb_set(
  jsonb_set(
    landing,
    '{cta_primary}',
    '"Créer ma cotisation (gratuit 35 jours)"'::jsonb
  ),
  '{cta_secondary}',
  '"Voir les frais"'::jsonb
),
updated_at = now()
WHERE id = 1
  AND landing->>'cta_primary' LIKE '%—%';

UPDATE pages
SET body_md = replace(replace(body_md, ' — ', ', '), '**Mastercota** —', '**Mastercota**,'),
    updated_at = now()
WHERE body_md LIKE '%—%';
