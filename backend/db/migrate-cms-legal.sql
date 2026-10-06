-- Pages légales + CMS : alignement produit (0 % contributions, Wave, frais durée)

UPDATE pages
SET
  title = 'Conditions générales',
  excerpt = 'Les règles d''utilisation de Mastercota.',
  body_md = E'## Conditions générales d''utilisation\n\nEn utilisant Mastercota, vous acceptez les présentes conditions.\n\n### Compte\n\nVous vous connectez avec votre numéro WhatsApp (code OTP). Vous êtes responsable de l''accès à votre compte.\n\n### Cotisations\n\nVous êtes responsable du contenu de vos cotisations et de l''usage des fonds collectés. Mastercota fournit la page publique et le suivi, nous ne sommes pas une banque.\n\n### Contributions\n\nLes contributions vont **directement sur votre Wave**. Mastercota ne prend **0 %** sur les montants envoyés par vos proches.\n\n### Frais de durée\n\nPour garder une cotisation active, l''organisateur paie des frais de durée (1re cotisation gratuite 35 jours par numéro). Ce n''est pas un prélèvement sur les contributions. Voir la page Frais sur le site.\n\n### Confirmation des paiements\n\nAprès un paiement Wave, le contributeur signale « J''ai payé ». L''organisateur vérifie dans Wave et confirme dans Mastercota.',
  nav_label = 'CGU',
  nav_placement = 'footer',
  published = true,
  updated_at = now()
WHERE slug = 'cgu';

UPDATE pages
SET
  title = 'Confidentialité',
  excerpt = 'Comment nous traitons vos données.',
  body_md = E'## Politique de confidentialité\n\n### Données collectées\n\n- **Numéro de téléphone** : connexion par code WhatsApp (OTP).\n- **Profil organisateur** : nom, lien ou numéro Wave pour recevoir les contributions.\n- **Contributions** : nom, téléphone, montant, statut de paiement.\n\n### Paiements\n\nLes contributions sont effectuées **via Wave** directement vers l''organisateur. Mastercota ne stocke pas l''argent des cotisations.\n\nLes frais de durée (organisateur) peuvent être payés via un prestataire de paiement sécurisé (Paystack).\n\n### WhatsApp\n\nLes codes de connexion sont envoyés via WhatsApp.\n\n### Contact\n\nPour toute question : support@mastercota.com',
  nav_label = 'Confidentialité',
  nav_placement = 'footer',
  published = true,
  updated_at = now()
WHERE slug = 'confidentialite';

UPDATE pages
SET
  title = 'Mentions légales',
  excerpt = 'Informations légales Mastercota.',
  body_md = E'## Mentions légales\n\n**Mastercota**, plateforme de cotisations communautaires.\n\nCotisations via lien WhatsApp. Réception des fonds sur **Wave**. 0 % Mastercota sur les contributions.\n\nContact : support@mastercota.com',
  nav_label = 'Mentions légales',
  nav_placement = 'footer',
  published = true,
  updated_at = now()
WHERE slug = 'mentions-legales';
