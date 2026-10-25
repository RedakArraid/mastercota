# Déclarations de données mobile

Ce document sert de base aux formulaires Google Play Data safety et App Store App Privacy. Les déclarations des consoles doivent être revérifiées à chaque release.

## Données utilisées

### Numéro de téléphone

Usage :
- création et identification du compte ;
- OTP WhatsApp ;
- sécurisation de session ;
- éligibilité à la première cotisation offerte ;
- réservation éventuelle d'une invitation Academy à un numéro.

Lié au compte : oui.

### Nom de profil

Usage :
- personnalisation ;
- affichage organisateur/instructeur ;
- nom affiché sur un certificat Academy.

### Contenu utilisateur

Peut inclure :
- cotisations, descriptions et réglages ;
- contributions signalées ;
- profils et contenus de cours Academy ;
- discussions, avis et réponses de quiz ;
- progression d'apprentissage ;
- annonces instructeur.

### Données de transaction

Mastercota conserve les références, montants et statuts nécessaires à la réconciliation :
- des frais Mastercota ;
- des paiements de cours signalés par les apprenants.

Mastercota ne collecte pas les secrets de carte ou Mobile Money saisis directement chez un prestataire externe.

## Ce que Mastercota ne fait pas

- pas de publicité comportementale ;
- pas de vente de données ;
- pas de tracking publicitaire ;
- pas de localisation précise ;
- pas d'accès au carnet d'adresses ;
- pas de conservation des fonds de contribution ou des paiements destinés aux instructeurs.

## Sécurité

- API production en HTTPS ;
- jeton mobile dans Keychain / Keystore via flutter_secure_storage ;
- sessions révocables ;
- contrôles d'accès serveur pour le contenu Academy premium ;
- réponses correctes des quiz non exposées avant notation ;
- URLs de contenu Academy externes en HTTPS hors développement local.

## Suppression du compte

URL publique : https://mastercota.com/suppression-compte

La suppression retire le compte, ses sessions, ses cotisations personnelles, ses données d'apprentissage et les données personnelles associées.

Si la première cotisation offerte a déjà été utilisée, Mastercota conserve uniquement une empreinte HMAC non réversible du numéro afin qu'une suppression/recréation ne réinitialise pas l'offre gratuite.

Les contributions confirmées dans les cotisations d'autres organisateurs peuvent être conservées pour maintenir leur comptabilité, mais le nom, le téléphone et la note sont anonymisés.

Si un instructeur Academy supprime son compte :
- tout paiement apprenant encore en attente doit être résolu avant la suppression ;
- les cours ayant déjà des apprenants sont archivés et réassignés à un propriétaire système neutre ;
- les apprenants conservent leurs accès et certificats ;
- les cours ne sont plus proposés à de nouveaux acheteurs.

Les prestataires externes peuvent conserver leurs propres traces selon leurs obligations légales et contractuelles.

## App Store Privacy Manifest

L'application iOS embarque `ios/Runner/PrivacyInfo.xcprivacy`.

Le manifeste déclare les catégories fonctionnelles utilisées par l'application : nom, numéro de téléphone, identifiant de compte, contenu utilisateur et historique de transaction. Elles sont liées à l'utilisateur, utilisées pour la fonctionnalité de l'application et non pour le tracking.

Avant chaque soumission App Store, examiner le rapport de confidentialité agrégé de l'archive Xcode, notamment les Required Reason APIs provenant des plugins Flutter.
