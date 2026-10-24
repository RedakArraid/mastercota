# Mastercota

Plateforme de gestion et de suivi de cotisations communautaires : web Next.js, application Flutter, API Hono et PostgreSQL.

Mastercota vend l’outil d’organisation, pas la conservation de l’argent. Les contributions sont versées directement à l’organisateur. Aujourd’hui, le produit prend en charge Wave Business ou un transfert vers son numéro Wave. Le contributeur signale son transfert ; l’organisateur vérifie la réception, puis confirme ou refuse. Seuls les montants confirmés alimentent le total. Mastercota prélève 0 % sur les contributions.

L’organisateur paie un forfait Mastercota selon la durée : première cotisation de 35 jours offerte par numéro, puis 2 000 FCFA pour 1–15 jours, 4 000 pour 16–35 jours ou 10 000 pour 36–60 jours. Une prolongation de 10 jours coûte 2 000 FCFA, avec une limite totale de 60 jours. Le forfait n’est pas calculé sur le montant collecté. Une cotisation payante n’est publiée qu’après confirmation du paiement ; sa durée commence à l’activation.

Pour les frais Mastercota, l’architecture de paiement est conçue pour utiliser PI-SPI comme rail principal dès qu’un participant homologué est validé en production, avec Paystack comme secours explicite. Tant que les prérequis PI-SPI production (partenaire, contrat, mTLS/PICERT et identifiants) ne sont pas réunis, le rail actif peut rester Paystack. Le fournisseur de paiement des frais reste un détail d’infrastructure et n’est pas exposé comme proposition de valeur au client.

## Cycle d’une cotisation

| État | Comportement |
| --- | --- |
| Frais en attente | Page privée, paiement reprenable ; aucune contribution possible avant activation. |
| Active | Nouveaux transferts possibles jusqu’à la fin du jour de l’échéance. |
| Objectif atteint | Les nouveaux transferts s’arrêtent. Augmenter l’objectif réactive la collecte si la période reste valide ; sinon une prolongation admissible est nécessaire. |
| Clôturée manuellement | Les nouveaux transferts s’arrêtent. Les paiements déjà reçus restent enregistrables. Une prolongation conserve la clôture ; la réouverture demande une action explicite et une échéance valide. |
| Expirée | Les paiements déjà reçus restent enregistrables. Une prolongation peut réactiver la collecte uniquement si sa nouvelle échéance n’est pas déjà passée, dans la limite d’une prolongation et de 60 jours au total. |

La création et l’enregistrement d’une contribution exigent un `request_id` UUID. Les interfaces conservent cet identifiant et les données de la demande pendant une interruption réseau, y compris après rechargement. Une reprise identique retrouve le même enregistrement ; réutiliser la clé avec un contenu différent est refusé. Les clients API doivent suivre ce contrat ; déployer les clients web et mobiles compatibles avec cette version du backend.

Les modifications utilisent `expected_edit_version` pour détecter une modification concurrente. L’actualisation du suivi ne remplace pas une saisie en cours. L’organisateur peut modifier titre, description, objectif et réglages depuis le web et l’application mobile.

Avant un nouveau transfert Wave, les interfaces vérifient que la collecte est encore ouverte et que les coordonnées affichées sont à jour. Un transfert déjà effectué peut toujours être signalé après clôture, expiration ou atteinte de l’objectif. Il reste en attente jusqu’à la vérification de sa réception par l’organisateur. Les montants réellement reçus restent enregistrables même si le minimum ou les réglages ont changé entre-temps.

Un paiement Paystack reçu n’équivaut pas automatiquement à un service appliqué : `application_status` distingue `pending`, `applied` et `review_required`. Une prolongation payée trop tard ou un paiement supplémentaire est conservé avec sa référence et signalé à l’organisateur et aux administrateurs, sans annoncer une activation ni un remboursement fictif. Les paiements à examiner sont visibles dans **Administration → Frais Mastercota**. Le support doit vérifier le paiement et traiter le remboursement éventuel auprès de Paystack ; cette opération n’est pas automatisée par l’application. L’administrateur clôture ensuite l’examen avec une note : l’auteur, la date et l’historique du paiement sont conservés, et l’examen ne bloque plus une nouvelle prolongation admissible. Cette clôture enregistre le travail du support ; elle ne déclenche pas de remboursement.

## Démarrage local

Node 22+, PostgreSQL 16+, Flutter 3.35+ et Dart 3.9+.

### Avec Docker

```bash
docker compose -f docker-compose.local.yml up -d --build
```

Web : http://localhost:3000. API : http://localhost:4000. Le code local `123456` fonctionne après une demande de code. Aucun WhatsApp n’est envoyé. Les frais payants exigent une clé Paystack de test via `PAYSTACK_TEST_SECRET_KEY`. Sans clé, la cotisation est conservée et son paiement peut être repris ultérieurement. Ce fichier Compose est réservé au développement.

### Sans Docker pour les applications

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm ci --prefix backend
npm ci --prefix frontend
npm run db:migrate --prefix backend
npm run dev --prefix backend
# Dans un autre terminal :
npm run dev --prefix frontend
```

Renseigner `DATABASE_URL` dans `backend/.env`. Utiliser le même `JWT_SECRET` dans les deux applications et `APP_URL=http://localhost:3000` côté API. Les requêtes web `/api/*` sont transmises au backend.

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:4000 --dart-define=APP_BASE_URL=http://localhost:3000
```

Sur émulateur Android, utiliser `http://10.0.2.2:4000` pour l’API et `http://10.0.2.2:3000` pour `APP_BASE_URL`. Sur téléphone physique, utiliser une API HTTPS accessible depuis l’appareil. Le paiement des frais ouvre le navigateur : revenir ensuite dans l’application et actualiser la cotisation pour vérifier son activation.

## Vérifications reproductibles

Une base de test distincte est obligatoire. Les tests effacent uniquement la base explicitement nommée `mastercota_test`.

```bash
docker run -d --name mastercota-test-db \
  -e POSTGRES_USER=mastercota_test \
  -e POSTGRES_PASSWORD=mastercota_local_test \
  -e POSTGRES_DB=mastercota_test \
  -p 127.0.0.1:55432:5432 postgres:16-alpine
export TEST_DATABASE_URL=postgresql://mastercota_test:mastercota_local_test@127.0.0.1:55432/mastercota_test
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate --prefix backend
npm run build --prefix backend
npm test --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
(cd frontend && npx playwright install chromium)
npm run test:e2e --prefix frontend
flutter analyze
flutter test
```

Les tests API utilisent PostgreSQL réel. Les prestataires de paiement sont simulés et aucun message WhatsApp ni paiement réel n’est déclenché. Les tests navigateur démarrent une API isolée sur 4001 et le web sur 3100. Ne pas lancer simultanément tests API et tests navigateur contre la même base. L’intégration continue exécute ces vérifications sur chaque push et PR.

La recette automatisée couvre notamment les reprises après réponse perdue, les requêtes concurrentes, la fin de journée, les clôtures et réouvertures, l’objectif atteint puis augmenté, les signalements tardifs, les conflits d’édition et les frais reçus mais non appliqués. Les scénarios navigateur vérifient les formulaires pendant l’actualisation et la reprise après rechargement. Flutter vérifie les états, l’édition et les reprises après redémarrage. Les appels prestataires restent simulés : une recette sur les vrais comptes et appareils est nécessaire avant ouverture publique.

Les polices web sont incluses dans `frontend/public/fonts` avec leurs licences : la compilation ne dépend plus de Google Fonts. Les audits npm des dépendances de production sont sans alerte au 6 octobre 2026. L’audit complet signale encore `braces`, utilisé par les outils ESLint de développement, sans correction compatible proposée ; il doit rester suivi lors des mises à jour.

## Production

1. Renseigner `.env` à partir de `.env.example` : mot de passe PostgreSQL, secret JWT aléatoire de 32 caractères minimum, `NEXT_PUBLIC_APP_URL` HTTPS, paramètres du prestataire de paiement actif et paramètres OpenWA. Ne jamais définir `OTP_DEV_CODE` ou `OTP_DEV_LOG` en production : l’API refuse alors de démarrer.
2. Connecter la session OpenWA utilisée pour les OTP. `ADMIN_PHONES` contient les numéros internationaux autorisés à devenir administrateurs lors de leur connexion.
3. Préparer les réseaux externes Traefik `traefik_network` et OpenWA `openwa-network`, les DNS et les certificats HTTPS.
4. Sauvegarder la base existante avec `scripts/backup.sh` avant mise à jour.
5. Compiler avec `docker compose build`, puis suspendre les écritures de l’ancienne version avec `docker compose stop backend frontend` avant `docker compose up -d`. Prévoir cette courte interruption lors de la mise à jour : les anciennes et nouvelles API ne doivent pas écrire simultanément pendant la migration du cycle de vie. Le service `migrate` applique les migrations une fois, sous verrou ; le backend démarre après sa réussite. Les migrations fonctionnent également sur une base déjà initialisée. Distribuer également le client mobile compatible avec les identifiants de requête obligatoires.
6. Configurer le webhook du prestataire actif. Pour Paystack : `https://mastercota.com/api/paystack/webhook`. Pour PI-SPI, suivre le contrat du participant retenu et n’activer la production qu’après validation mTLS/PICERT.
7. Exécuter `scripts/check-health.sh`, puis valider connexion WhatsApp, cotisation gratuite, paiement de frais, retour du navigateur, contribution Wave et confirmation par l’organisateur.

`TRUST_PROXY=true` suppose un backend accessible uniquement derrière le proxy de confiance qui fixe `X-Real-IP`. Ne pas exposer le port backend directement en production. Les sessions mobiles utilisent Keychain/Keystore ; la déconnexion révoque toutes les sessions du compte. Les codes expirent au bout de 10 minutes avec 5 essais maximum ; les limites d’envoi sont persistées dans PostgreSQL.

Pour les frais Mastercota, chaque tentative reste liée à son prestataire d’origine. La référence, le montant, la devise et le statut sont vérifiés avant activation. Les confirmations répétées sont traitées une fois. Une interruption réseau ne supprime pas une référence existante et un changement de prestataire ne doit jamais déclencher automatiquement un second débit.

## Sauvegarde et exploitation

```bash
scripts/backup.sh
scripts/check-restore.sh backups/mastercota-YYYYMMDDTHHMMSSZ.dump
scripts/check-health.sh
docker compose logs --tail=100 backend migrate
```

Le test de restauration crée une base distincte et ne remplace jamais la principale. Programmer la sauvegarde quotidienne, copier les sauvegardes hors du serveur et surveiller `/ready` (API + accès base), le processus OpenWA et les erreurs backend. Ces scripts préparent l’exploitation ; leur planification et les alertes doivent être configurées sur le serveur réellement utilisé.

Les anciens paiements Paystack de contribution peuvent encore être vérifiés ; les nouvelles contributions utilisent le parcours direct vers l’organisateur. Un paiement supplémentaire pour un service déjà activé reste dans l’historique, passe en examen et ne réapplique pas ce service. Un échec ou une interruption d’initialisation ne supprime jamais l’ancienne référence. Une vérification prestataire indisponible ne déclenche pas un second paiement. Le support doit examiner les éventuels remboursements dans le tableau de bord Paystack.

## Livraison mobile

Android : copier `android/key.properties.example` vers `android/key.properties`, renseigner le keystore de publication puis exécuter `flutter build appbundle --release --dart-define=API_BASE_URL=https://mastercota.com`. La compilation release refuse une signature manquante au lieu d’utiliser la clé debug. Les fichiers de signature sont exclus de Git.

iOS : sélectionner l’équipe Apple et les profils de distribution dans Xcode, puis `flutter build ipa --release --dart-define=API_BASE_URL=https://mastercota.com`. La capacité Keychain est déclarée. Vérifier sur un appareil réel l’OTP, les deux modes Wave et le retour de paiement avant distribution.

Les textes légaux, l’identité de l’éditeur et les coordonnées de support doivent être renseignés avec les informations réelles via le CMS avant publication. Aucune identité d’entreprise ou validation réglementaire n’est inventée dans le dépôt.


## Android et iOS

La préparation de release mobile (AAB Android, build iOS, liens universels, signature et checklist stores) est documentée dans [`docs/mobile-release.md`](docs/mobile-release.md).

La CI vérifie désormais :
- APK debug Android ;
- AAB release Android signé avec une clé éphémère de CI ;
- build iOS release sans signature sur macOS.

Le workflow manuel `Mobile Release` produit les artefacts signés avec les secrets de publication réels. Les clés, certificats et profils de provisioning ne doivent jamais être commités.
