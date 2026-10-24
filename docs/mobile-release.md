# Releases Android et iOS

Ce document décrit la chaîne de release mobile de Mastercota.

## Identité de l'application

- Nom : **Mastercota**
- Package Android : `app.mastercota.mastercota`
- Bundle ID iOS : `app.mastercota.mastercota`
- URL API production : `https://mastercota.com`
- URL publique : `https://mastercota.com`
- Version Flutter actuelle : voir `pubspec.yaml`

Les identifiants de package ne doivent plus être changés après la première publication sur les stores.

## Android

### Exigences techniques

Le projet cible explicitement Android 16 / API 36 pour les nouvelles publications Google Play à partir du 31 août 2026.

Le build de production interdit le trafic HTTP non chiffré. Le manifeste debug autorise encore HTTP pour le développement local.

### Signature Google Play

Créer une clé d'upload dédiée et conserver sa sauvegarde hors du dépôt.

Le workflow `.github/workflows/mobile-release.yml` attend les secrets GitHub suivants :

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Le workflow produit :

`build/app/outputs/bundle/release/app-release.aab`

Google Play App Signing doit rester activé. Pour les Android App Links, utiliser l'empreinte SHA-256 du **certificat App Signing de Google Play**, pas uniquement celle de la clé d'upload.

Définir ensuite sur le déploiement web :

`ANDROID_APP_CERT_SHA256=<empreinte SHA-256 Play App Signing>`

Plusieurs empreintes peuvent être séparées par une virgule ou un point-virgule pendant une rotation de certificat.

### Store listing Android

Nom : **Mastercota**

Description courte proposée :

> Organisez vos cotisations de groupe et suivez clairement les contributions.

Description longue proposée :

> Mastercota aide les organisateurs de cotisations communautaires à créer une page claire, la partager dans leur groupe et suivre les contributions signalées et confirmées. Les fonds sont versés directement à l'organisateur. Mastercota prélève 0 % sur les contributions. L'organisateur paie uniquement le forfait Mastercota applicable à sa cotisation.

Catégorie recommandée : Finance ou Productivité selon le positionnement final retenu dans Play Console.

Ne pas présenter Mastercota comme une banque, un portefeuille électronique ou un service de conservation de fonds.

## iOS

### Exigences techniques

Le déploiement minimum est iOS 15.

Les soumissions App Store doivent être construites avec une version Xcode / SDK acceptée par Apple au moment de l'envoi. La CI `ios-mobile` compile l'application en release sans signature sur `macos-latest`.

### Signature App Store

Le workflow de release attend :

- `IOS_DISTRIBUTION_CERTIFICATE_BASE64` : certificat Apple Distribution au format .p12 encodé en base64
- `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64` : profil App Store de `app.mastercota.mastercota`
- `IOS_PROVISIONING_PROFILE_NAME`
- `IOS_TEAM_ID`

Le workflow produit un IPA signé dans `build/ios/ipa/`.

Le projet contient actuellement le Team ID `7WUWLG5X48`. Si le compte Apple de publication utilise un autre Team ID, le workflow le remplace pendant le build.

### App Store metadata

Nom : **Mastercota**

Sous-titre proposé :

> Cotisations simples et bien suivies

Texte promotionnel proposé :

> Créez votre cotisation, partagez-la dans votre groupe et gardez un suivi clair des contributions.

Mots-clés proposés :

`cotisation,collecte,groupe,association,entraide,contribution,WhatsApp`

Description proposée :

> Mastercota simplifie l'organisation des cotisations communautaires. Créez une page, partagez-la avec votre groupe et suivez les transferts signalés puis confirmés par l'organisateur. Les contributions sont versées directement à l'organisateur et Mastercota prélève 0 % sur leur montant.

## Universal Links / App Links

Les liens publics de la forme :

`https://mastercota.com/c/<slug>`

sont configurés pour ouvrir l'écran public correspondant dans l'application.

Le domaine expose :

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

Variables serveur nécessaires :

- `APPLE_TEAM_ID` (par défaut : Team ID actuellement configuré dans le projet)
- `IOS_BUNDLE_ID` (par défaut : `app.mastercota.mastercota`)
- `ANDROID_APP_CERT_SHA256`

Après déploiement, vérifier ces deux URLs depuis Internet avant de tester les liens natifs.

## Données et confidentialité

Le formulaire de confidentialité des stores doit refléter le produit réel :

Données manipulées par Mastercota :

- numéro de téléphone pour la connexion ;
- nom du profil ;
- informations de cotisation ;
- noms / téléphones / montants déclarés par les contributeurs ;
- références et statuts des frais Mastercota ;
- mode de réception configuré par l'organisateur.

Mastercota ne doit pas déclarer qu'il conserve les fonds des contributions.

Les permissions photo / caméra servent à la photo de couverture lorsqu'elle est utilisée. Ne demander une permission qu'au moment de l'action correspondante.

## Deep link smoke test

Android :

1. installer un build signé dont le certificat correspond à `assetlinks.json` ;
2. ouvrir `https://mastercota.com/c/<slug>` depuis Chrome ou un message ;
3. vérifier l'ouverture directe de la page publique Mastercota.

iOS :

1. installer le build TestFlight/App Store associé au domaine ;
2. ouvrir le même lien depuis Notes ou Messages ;
3. vérifier que Safari n'est pas utilisé et que l'écran public s'ouvre dans l'app.

## Publication

Avant une release publique :

1. incrémenter `version: x.y.z+build` dans `pubspec.yaml` ;
2. vérifier la CI `Verify` entièrement verte ;
3. exécuter `Mobile Release` ;
4. tester l'AAB en piste interne Google Play ;
5. tester l'IPA via TestFlight ;
6. vérifier login OTP, création, paiement des frais, partage, contribution publique, confirmation et logout ;
7. vérifier les liens universels ;
8. vérifier les textes légaux et l'identité réelle de l'éditeur ;
9. seulement ensuite promouvoir vers Production / App Store.

## Éléments externes qui ne peuvent pas vivre dans Git

- clé de signature Android ;
- certificat Apple Distribution ;
- profil de provisioning ;
- accès Google Play Console ;
- accès App Store Connect ;
- identité juridique de l'éditeur ;
- captures finales issues de vrais appareils.

Ces éléments doivent rester dans les coffres de secrets et les consoles officielles, jamais dans le dépôt.
