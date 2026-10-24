# Livraison Android et iOS

Ce document décrit la chaîne de livraison mobile de Mastercota.

## Identité des applications

- Nom : **Mastercota**
- Android package : `app.mastercota.mastercota`
- iOS bundle ID : `app.mastercota.mastercota`
- Domaine public : `https://mastercota.com`
- Support : `https://mastercota.com/p/support`
- Confidentialité : `https://mastercota.com/p/confidentialite`
- Suppression de compte : `https://mastercota.com/suppression-compte`

La version source est définie dans `pubspec.yaml`. Pour chaque release, le workflow manuel reçoit explicitement `version_name` et un `build_number` strictement croissant.

## Validation continue

La workflow `.github/workflows/verify.yml` exécute :

### Android

- Flutter pub get ;
- génération des icônes ;
- flutter analyze ;
- flutter test ;
- build APK debug ;
- build AAB release sans signature de production ;
- API Android 36.

### iOS

- runner macOS 26 ;
- vérification Xcode / SDK iPhoneOS ;
- Flutter pub get ;
- génération des icônes ;
- build iOS Release sans signature ;
- artefact `.app` compressé.

Ces builds valident que le code compile sur les deux plateformes. Ils ne remplacent pas les builds signés destinés aux stores.

## Android - secrets de release

Créer une clé d'upload Google Play et ajouter les secrets GitHub suivants :

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Pour l'upload automatique vers le canal **Internal Testing** :

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64`

Le compte de service Google Play doit avoir uniquement les permissions nécessaires à la livraison de l'application.

### App Links Android

Le site expose :

`https://mastercota.com/.well-known/assetlinks.json`

Configurer en production :

`ANDROID_APP_LINK_SHA256_CERT_FINGERPRINT`

La valeur peut contenir plusieurs empreintes SHA-256 séparées par des virgules. Pour une application distribuée via Google Play, inclure l'empreinte du certificat **Play App Signing**. Ajouter aussi l'empreinte de la clé d'upload uniquement si un build signé avec cette clé doit être testé directement.

Le lien public pris en charge par l'application est :

`https://mastercota.com/c/<slug>`

## iOS - secrets de release

Le bundle ID doit exister dans Apple Developer avec la capacité **Associated Domains**.

Secrets GitHub nécessaires à la signature :

- `IOS_DISTRIBUTION_CERTIFICATE_BASE64`
- `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`
- `IOS_PROVISIONING_PROFILE_NAME`
- `IOS_TEAM_ID`
- `IOS_KEYCHAIN_PASSWORD`

L'application embarque un `PrivacyInfo.xcprivacy`. Après création d'une archive signée, générer également le rapport de confidentialité agrégé dans Xcode avant la première soumission et après toute modification importante des plugins.

Pour l'upload optionnel vers App Store Connect / TestFlight :

- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_PRIVATE_KEY_BASE64`

Le profil de provisioning doit correspondre à `app.mastercota.mastercota` et inclure Associated Domains.

### Universal Links iOS

Le site expose :

`https://mastercota.com/.well-known/apple-app-site-association`

Configurer :

`APPLE_TEAM_ID`

L'entitlement iOS contient :

`applinks:mastercota.com`

Le domaine ouvre uniquement les pages publiques `/c/*`.

## Workflow de release

Dans GitHub Actions, lancer **Mobile Release**.

Entrées :

- plateforme : both / android / ios ;
- version publique : ex. `1.0.0` ;
- build number : entier croissant ;
- upload_to_testing :
  - false : produit uniquement les artefacts signés ;
  - true : envoie Android vers Google Play Internal Testing et iOS vers App Store Connect / TestFlight.

Le workflow ne publie jamais automatiquement une version grand public en production. La promotion finale reste une action volontaire dans les consoles Google Play et App Store Connect.

## Suppression de compte

Mastercota permet la suppression :

- dans l'application mobile : Profil -> Supprimer mon compte ;
- dans le web : Profil -> Supprimer le compte ;
- via la ressource publique `/suppression-compte`.

Le backend supprime les données du compte et anonymise les contributions déjà confirmées chez d'autres organisateurs afin de préserver leurs totaux sans conserver le nom, le téléphone ou la note de la personne supprimée.

## Recette avant TestFlight / Internal Testing

Tester sur au moins un appareil Android réel et un iPhone réel :

1. installation propre ;
2. onboarding ;
3. OTP WhatsApp ;
4. configuration de réception ;
5. cotisation gratuite ;
6. cotisation payante ;
7. retour dans l'app après checkout externe ;
8. partage du lien public ;
9. ouverture d'un lien `mastercota.com/c/...` depuis WhatsApp ;
10. contribution publique ;
11. retour depuis Wave ;
12. confirmation organisateur ;
13. clôture / réouverture / prolongation ;
14. perte réseau pendant création ou contribution ;
15. déconnexion ;
16. suppression de compte ;
17. réinstallation puis nouvelle connexion.

## Avant ouverture publique

Les points suivants nécessitent des comptes externes réels et ne peuvent pas être inventés dans le dépôt :

- compte Google Play Console ;
- compte Apple Developer / App Store Connect ;
- clé d'upload Android ;
- certificat Apple Distribution ;
- provisioning profile ;
- clé API App Store Connect ;
- compte de service Google Play ;
- empreinte Play App Signing ;
- identifiants légaux réels de l'éditeur ;
- informations fiscales / bancaires demandées par les stores.

En production, configurer également un `DATA_RETENTION_SECRET` stable (32 caractères minimum) afin de pseudonymiser l'historique anti-abus lié à l'offre gratuite.

Ne jamais committer ces secrets.
