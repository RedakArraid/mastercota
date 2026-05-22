# Mastercota 🤝

> Plateforme de cotisations communautaires pour l'Afrique francophone.  
> **Flutter · Supabase · Paystack · Termii**

---

## Stack technique

| Couche | Technologie |
|---|---|
| Mobile | Flutter 3.44+ (iOS & Android) |
| Backend | Supabase (Auth OTP, PostgreSQL, Realtime) |
| Paiement | Paystack (subaccounts + webhooks) |
| SMS OTP | Termii (via Supabase Auth Hook) |
| Email | Hostinger (SMTP) |
| État | Riverpod 2.5+ |
| Navigation | GoRouter 14.2+ |

---

## Installation rapide

### Prérequis

- Flutter 3.44+ (`flutter --version`)
- Un projet [Supabase](https://supabase.com) créé (plan Pro recommandé)
- Un compte [Paystack](https://paystack.com)
- Un compte [Termii](https://termii.com) avec crédit SMS
- Une adresse email sur [Hostinger](https://hostinger.com) (ex: `support@mastercota.com`)

### 1. Cloner et installer les dépendances

```bash
git clone <repo>
cd mastercota
flutter pub get
```

### 2. Configurer Supabase

Renseigner les clés dans `lib/core/constants/app_constants.dart` :

```dart
static const String supabaseUrl = 'https://xxxx.supabase.co';
static const String supabaseAnonKey = 'eyJ...';
```

Ou via dart-define (recommandé en CI/CD) :

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ...
```

### 3. Créer la base de données

Dans l'éditeur SQL du projet Supabase, exécuter :

```
supabase/schema.sql
```

### 4. Déployer les Edge Functions

```bash
supabase link --project-ref <project-ref>
supabase functions deploy
```

### 5. Configurer les secrets Supabase

Dans **Dashboard → Project Settings → Edge Functions → Secrets** :

| Secret | Description |
|---|---|
| `PAYSTACK_SECRET_KEY` | Clé secrète Paystack |
| `TERMII_API_KEY` | Live API Key Termii |
| `SEND_SMS_HOOK_SECRET` | Secret de signature du hook SMS (généré par Supabase) |

### 6. Configurer l'auth SMS (Termii via Hook)

**Étape A — Activer Phone Auth**
- Dashboard → Authentication → Providers → Phone
- Activer "Enable Phone provider"
- Activer "Enable phone confirmations"
- SMS OTP Length : `6`
- Cliquer Save

**Étape B — Enregistrer le hook SMS**
- Dashboard → Authentication → Hooks → Send SMS
- Hook type : `HTTPS`
- URL : `https://<project-ref>.supabase.co/functions/v1/send-sms-otp`
- Copier la clé de signature générée → l'ajouter comme secret `SEND_SMS_HOOK_SECRET`

**Étape C — Numéros de test (optionnel)**
- Dashboard → Authentication → Providers → Phone → Test Phone Numbers
- Exemple : `+22500000001=123456`
- Permet de tester sans envoyer de vrai SMS

### 7. Configurer l'email (Hostinger SMTP)

Dans **Dashboard Supabase → Project Settings → Auth → SMTP Settings** :

| Paramètre | Valeur |
|---|---|
| Enable Custom SMTP | Activé |
| Sender email | `support@mastercota.com` |
| Sender name | `Mastercota` |
| Host | `smtp.hostinger.com` |
| Port | `465` |
| Username | `support@mastercota.com` |
| Password | Mot de passe de la boîte mail Hostinger |

> Le mot de passe SMTP est le même que celui de la boîte mail défini dans **hPanel → Emails → Manage**.

### 8. Configurer Paystack

Renseigner la clé publique dans `lib/core/constants/app_constants.dart` :

```dart
static const String paystackPublicKey = 'pk_live_...';
```

Configurer le webhook Paystack :
- Dashboard Paystack → Settings → Webhooks
- URL : `https://<project-ref>.supabase.co/functions/v1/paystack-webhook`

### 9. Lancer l'app

```bash
# iOS Simulator
flutter run -d ios

# Android Emulator
flutter run -d android

# Voir tous les devices
flutter devices
```

---

## Structure du projet

```
lib/
├── main.dart                          # Entry point — Supabase init, Riverpod
├── app.dart                           # MaterialApp.router + dark theme
│
├── core/
│   ├── constants/app_constants.dart   # URLs, clés, constantes métier
│   ├── theme/
│   │   ├── app_colors.dart            # Palette complète + gradients
│   │   ├── app_text_styles.dart       # Typographie Plus Jakarta Sans
│   │   └── app_theme.dart             # ThemeData dark Material3
│   ├── router/app_router.dart         # GoRouter + redirect guards auth
│   ├── services/supabase_service.dart # Client Supabase singleton
│   └── widgets/
│       ├── app_button.dart            # Bouton primaire/secondaire + loading
│       ├── app_text_field.dart        # Champ texte réutilisable
│       ├── glass_card.dart            # Carte glassmorphism
│       ├── mastercota_logo.dart       # Logo animé
│       └── navigation_shell.dart     # Shell de navigation partagé
│
└── features/
    ├── auth/
    │   ├── providers/auth_provider.dart   # sendOtp, verifyOtp, logout, upsert profil
    │   └── screens/
    │       ├── splash_screen.dart         # Logo animé + redirect
    │       ├── onboarding_screen.dart     # 3 slides + pagination
    │       ├── phone_screen.dart          # Saisie numéro + country code +225
    │       └── otp_screen.dart            # Pinput 6 chiffres + countdown 60s
    │
    ├── home/
    │   ├── screens/home_screen.dart       # Dashboard + liste cotisations
    │   └── widgets/cotisation_card.dart   # Card gradient + barre de progression
    │
    ├── cotisation/
    │   ├── models/cotisation_model.dart         # CotisationModel + ContributionModel
    │   ├── providers/cotisation_provider.dart   # CRUD + streams Realtime
    │   ├── screens/
    │   │   ├── create_cotisation_screen.dart    # Formulaire création
    │   │   ├── cotisation_detail_screen.dart    # Dashboard temps réel
    │   │   └── public_contribution_page.dart    # Page publique de contribution (lien partagé)
    │   └── widgets/
    │       └── contribution_dialog.dart         # Dialogue saisie contribution manuelle
    │
    └── profile/
        └── screens/
            ├── profile_screen.dart          # Profil, édition, déconnexion
            └── payout_settings_screen.dart  # Configuration compte de retrait (Mobile Money / banque)
```

---

## Edge Functions Supabase

| Fonction | JWT | Rôle |
|---|---|---|
| `send-sms-otp` | Non | Auth Hook — envoie le code OTP via Termii |
| `paystack-initialize` | Non | Initialise un paiement Paystack |
| `paystack-webhook` | Non | Reçoit les confirmations de paiement Paystack |
| `paystack-subaccount` | Oui | Crée un sous-compte Paystack pour un utilisateur |
| `paystack-verify-account` | Oui | Vérifie un numéro de compte bancaire ou Mobile Money |
| `dev-auth` | Non | Authentification rapide en mode développement |

---

## Routes de navigation

| Route | Écran | Accès |
|---|---|---|
| `/splash` | Splash screen | Public |
| `/onboarding` | Onboarding 3 slides | Public |
| `/auth/phone` | Saisie du numéro | Public |
| `/auth/otp` | Vérification OTP | Public |
| `/home` | Dashboard principal | Authentifié |
| `/profile` | Profil utilisateur | Authentifié |
| `/profile/payout` | Paramètres de retrait | Authentifié |
| `/cotisation/create` | Créer une cotisation | Authentifié |
| `/cotisation/:id` | Détail + contributions | Authentifié |
| `/c/:slug` | Page publique de contribution | Public |

---

## Base de données

Voir [`supabase/schema.sql`](supabase/schema.sql) pour le schéma complet.

### Tables principales

| Table | Description |
|---|---|
| `users` | Profil utilisateur lié à `auth.users` |
| `cotisations` | Les cotisations créées par les utilisateurs |
| `contributions` | Chaque paiement reçu sur une cotisation |
| `site_config` | Configuration globale de la plateforme (singleton) |

### Trigger automatique

Un trigger PostgreSQL met à jour `current_amount` et passe la cotisation en `completed` automatiquement quand une contribution passe à `paid` via le webhook Paystack.

---

## Flux SMS OTP

```
App Flutter
    │  signInWithOtp(phone)
    ▼
Supabase Auth — génère le code OTP
    │  déclenche le Hook "Send SMS"
    ▼
Edge Function send-sms-otp
    │  vérifie la signature HMAC-SHA256
    │  appelle l'API Termii
    ▼
Termii → SMS envoyé à l'utilisateur
    │
    ▼
App Flutter
    │  verifyOTP(phone, code)
    ▼
Supabase Auth ✓ — session créée
```

## Flux de paiement

```
Contributeur → Page publique /c/:slug → Paystack Checkout
                                               │
                                       Webhook Paystack
                                               │
                              Edge Function paystack-webhook
                                               │
                                  Trigger DB → current_amount++
                                               │
                              Realtime → Dashboard mis à jour en live
```

---

## Modèle économique

**Frais de service de 1%** appliqués sur chaque contribution reçue.

---

## Coûts d'infrastructure estimés

| Service | Coût | Détail |
|---|---|---|
| Supabase Pro | 25$/mois | Requis pour Auth Hooks |
| Termii SMS | ~3-5 FCFA/SMS | ~0,005-0,008$ par OTP envoyé |

Estimation mensuelle selon l'activité :

| Utilisateurs actifs | SMS/mois | Total estimé |
|---|---|---|
| 100 | ~300 | ~27$/mois |
| 500 | ~1 500 | ~37$/mois |
| 2 000 | ~6 000 | ~75$/mois |

---

## Roadmap

- [x] **MVP** — Auth OTP SMS, création de cotisation, dashboard, partage public
- [x] **SMS via Termii** — Hook Auth Supabase + vérification de signature
- [x] **Paiements** — Paystack Mobile Money + sous-comptes + webhooks
- [x] **Profil** — Édition, paramètres de retrait (Mobile Money / banque)
- [ ] **V2** — Tontines, QR code, export PDF
- [ ] **V3** — API publique, multi-langues

---

## Licence

Propriétaire — © 2025 Mastercota
