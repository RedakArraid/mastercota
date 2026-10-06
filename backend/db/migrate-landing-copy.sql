-- Align landing CMS with product truth (Wave only, 0%, manual confirm)
UPDATE site_config
SET landing = '{
  "hero_title": "Une cotisation WhatsApp. L’argent arrive sur votre Wave.",
  "hero_subtitle": "Créez une page, partagez le lien. Vos proches paient via Wave. Mastercota prend 0 % sur ce qu’ils envoient.",
    "cta_primary": "Créer ma cotisation (gratuit 35 jours)",
  "cta_secondary": "Voir les frais",
  "features": [
    {"title": "Lien WhatsApp", "body": "Partagez votre page. Vos proches contribuent sans créer de compte."},
    {"title": "Argent sur Wave", "body": "Les contributions vont directement sur votre Wave. Mastercota ne garde rien."},
    {"title": "Suivi simple", "body": "Vous confirmez chaque paiement. Le total de la cotisation se met à jour."}
  ]
}'::jsonb,
updated_at = now()
WHERE id = 1;

-- Hide outdated CMS nav pages that duplicate product routes
UPDATE pages
SET nav_placement = 'none',
    published = false,
    updated_at = now()
WHERE slug IN ('comment-ca-marche', 'methodes', 'tarifs', 'frais');
