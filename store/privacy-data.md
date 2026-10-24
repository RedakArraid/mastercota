# Déclarations de données mobile

Ce document sert de base aux formulaires Google Play Data safety et App Store App Privacy. Vérifier les réponses dans les consoles au moment de chaque release.

## Données utilisées par Mastercota

### Numéro de téléphone

Usage :
- création / identification du compte ;
- OTP WhatsApp ;
- sécurisation de session ;
- éligibilité à la première cotisation offerte.

Lié au compte : oui.

### Nom de profil

Usage :
- personnalisation du compte ;
- affichage organisateur lorsque le produit l'utilise.

Optionnel : oui.

### Données de cotisation

Exemples :
- titre ;
- description ;
- objectif ;
- durée ;
- réglages ;
- historique d'état.

Catégorie : contenu créé par l'utilisateur.

### Données de contribution

Exemples :
- nom du contributeur ;
- téléphone ;
- montant ;
- note éventuelle ;
- statut.

Un participant public peut fournir ces données sans créer de compte.

### Paiements des frais Mastercota

Mastercota conserve les références, montants, états et informations nécessaires à la réconciliation du paiement de ses propres frais.

Mastercota ne collecte pas les identifiants de carte ou secrets Mobile Money saisis chez le prestataire de paiement.

## Ce que Mastercota ne fait pas

- pas de publicité ;
- pas de vente de données ;
- pas de tracking publicitaire ;
- pas de conservation des fonds de contribution ;
- pas d'accès caméra / photothèque dans la version mobile actuelle ;
- pas de localisation précise ;
- pas de carnet d'adresses.

## Sécurité

- API de production en HTTPS ;
- jeton mobile stocké dans Keychain / Keystore via flutter_secure_storage ;
- déconnexion avec révocation des sessions ;
- suppression de compte accessible dans l'application.

## Suppression

URL publique : https://mastercota.com/suppression-compte

La suppression efface le compte, ses cotisations, les OTP, le numéro de téléphone en clair utilisé pour l'éligibilité, les paiements Mastercota liés au compte via cascade et les notifications.

Si la première cotisation offerte a déjà été utilisée, Mastercota conserve uniquement une empreinte HMAC du numéro pour empêcher qu'une suppression puis recréation du compte réinitialise cette offre. Cette empreinte ne contient pas le numéro en clair et est utilisée uniquement pour la prévention d'abus.

Les contributions confirmées dans les cotisations d'autres organisateurs peuvent être conservées pour maintenir leur comptabilité, mais :
- nom -> Compte supprimé ;
- téléphone -> identifiant technique sans numéro ;
- note -> supprimée.

Les prestataires externes peuvent conserver leurs propres traces de transaction selon leurs obligations légales ou contractuelles.

## App Store Privacy Manifest

Le code applicatif Mastercota n'ajoute pas volontairement de Required Reason API native.

Les plugins Flutter doivent fournir leurs propres manifestes lorsque requis par Apple. Avant la première soumission App Store, générer l'archive Xcode et examiner le rapport de confidentialité agrégé. Toute API à raison obligatoire détectée dans le code applicatif doit être déclarée avec une raison Apple approuvée avant l'upload.
