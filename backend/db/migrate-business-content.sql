-- Canonical business copy: provider-neutral platform fees, direct-to-organizer funds,
-- and no unsupported product promises.

UPDATE site_config
SET landing = '{
  "hero_title": "Organisez votre cotisation. Gardez le suivi clair.",
  "hero_subtitle": "Créez une page, partagez-la dans votre groupe et suivez les contributions au même endroit. L’argent va directement à l’organisateur : Mastercota prend 0 % sur les contributions.",
  "cta_primary": "Créer ma première cotisation",
  "cta_secondary": "Comment ça marche",
  "features": [
    {"title": "Un lien pour le groupe", "body": "Partagez votre page dans WhatsApp ou ailleurs. Les participants contribuent sans créer de compte."},
    {"title": "Fonds versés directement", "body": "Les contributions sont envoyées directement à l’organisateur. Mastercota ne conserve pas l’argent collecté."},
    {"title": "Suivi et confirmation", "body": "Chaque transfert signalé reste visible jusqu’à sa confirmation par l’organisateur."}
  ]
}'::jsonb,
updated_at = now()
WHERE id = 1;

UPDATE pages
SET
  title = 'Conditions générales',
  excerpt = 'Les règles d''utilisation de Mastercota.',
  body_md = E'## Conditions générales d''utilisation\n\nEn utilisant Mastercota, vous acceptez les présentes conditions.\n\n### Rôle de Mastercota\n\nMastercota est un outil de création, de partage et de suivi de cotisations communautaires. Mastercota ne reçoit, ne conserve et ne redistribue pas les fonds versés au titre des contributions.\n\n### Compte\n\nVous vous connectez avec votre numéro de téléphone au moyen d''un code envoyé sur WhatsApp. Vous êtes responsable de l''accès à votre compte.\n\n### Cotisations\n\nL''organisateur est responsable du contenu de sa cotisation, de son objectif, de l''usage des fonds reçus et des informations qu''il communique aux participants.\n\n### Contributions\n\nLes contributions sont versées directement à l''organisateur par le moyen de réception pris en charge par Mastercota. Aujourd''hui, Mastercota prend en charge Wave. Mastercota prélève **0 %** sur le montant des contributions.\n\nLorsqu''un transfert est signalé par un participant, l''organisateur doit vérifier qu''il a réellement reçu les fonds avant de le confirmer. Seuls les montants confirmés sont ajoutés au total affiché.\n\n### Frais Mastercota\n\nL''organisateur paie un forfait Mastercota selon la durée choisie pour la cotisation. Ce forfait rémunère l''accès à l''outil et n''est pas calculé en pourcentage des fonds collectés. La première cotisation peut être offerte selon les conditions affichées dans l''application.\n\nLes frais Mastercota peuvent être réglés via un prestataire de paiement pris en charge par la plateforme. Le prestataire utilisé peut évoluer sans modifier le prix affiché à l''organisateur.\n\n### Paiements à examiner\n\nUn paiement de frais reçu peut nécessiter une vérification avant l''activation ou la prolongation du service. Dans ce cas, Mastercota n''applique pas automatiquement le service une seconde fois et le support traite la situation à partir de la référence du paiement.',
  nav_label = 'CGU',
  nav_placement = 'footer',
  published = true,
  updated_at = now()
WHERE slug = 'cgu';

UPDATE pages
SET
  title = 'Confidentialité',
  excerpt = 'Comment Mastercota traite les données utiles au service.',
  body_md = E'## Politique de confidentialité\n\n### Données utilisées\n\n- **Numéro de téléphone** : connexion par code WhatsApp et sécurisation du compte.\n- **Profil organisateur** : nom et informations nécessaires au mode de réception choisi.\n- **Cotisations** : titre, description, objectif, durée, réglages et historique.\n- **Contributions** : nom, téléphone, montant, note éventuelle et statut de confirmation.\n- **Frais Mastercota** : références, montants, statut et informations nécessaires à la réconciliation du paiement.\n\n### Fonds des cotisations\n\nMastercota ne conserve pas les fonds des contributions. Ils sont versés directement à l''organisateur via le moyen de réception configuré.\n\n### Prestataires\n\nMastercota peut utiliser des prestataires pour l''envoi des codes WhatsApp et le règlement des frais Mastercota. Le prestataire de paiement peut varier. Chaque prestataire traite les données nécessaires à son service selon ses propres conditions.\n\n### Contact\n\nPour toute question relative à vos données : support@mastercota.com',
  nav_label = 'Confidentialité',
  nav_placement = 'footer',
  published = true,
  updated_at = now()
WHERE slug = 'confidentialite';

UPDATE pages
SET
  title = 'Mentions légales',
  excerpt = 'Informations sur le service Mastercota.',
  body_md = E'## Mentions légales\n\n**Mastercota** est une plateforme de gestion et de suivi de cotisations communautaires.\n\nMastercota ne conserve pas les fonds des contributions et prélève **0 %** sur leur montant. L''organisateur paie un forfait distinct pour l''utilisation du service selon la durée choisie.\n\nContact : support@mastercota.com\n\nLes informations légales complètes relatives à l''éditeur et à l''hébergeur doivent être renseignées avec les données réelles de l''exploitant avant l''ouverture publique du service.',
  nav_label = 'Mentions légales',
  nav_placement = 'footer',
  published = true,
  updated_at = now()
WHERE slug = 'mentions-legales';
