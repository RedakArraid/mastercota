# Mastercota 🤝

> Plateforme de cotisations communautaires pour l'Afrique francophone.  
> **Flutter · Supabase · Paystack**

---

## Stack technique

| Couche | Technologie |
|---|---|
| Mobile | Flutter 3.44+ (iOS & Android) |
| Backend | Supabase (Auth OTP, PostgreSQL, Realtime, Storage) |
| Paiement | Paystack (subaccounts + webhooks) |
| Notifications | Termii (SMS/WhatsApp) |
| État | Riverpod |
| Navigation | GoRouter |

---

## Installation rapide

### Prérequis

- Flutter 3.44+ installé (`flutter --version`)
- Un projet [Supabase](https://supabase.com) créé
- Un compte [Paystack](https://paystack.com)

### 1. Cloner et installer les dépendances

```bash
git clone <repo>
cd mastercota
flutter pub get
```

### 2. Configurer Supabase

Copiez vos clés dans `lib/core/constants/app_constants.dart` :

```dart
static const String supabaseUrl = 'https://xxxx.supabase.co';
static const String supabaseAnonKey = 'eyJ...';
```

Ou via dart-define (recommandé) :

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ...
```

### 3. Créer la base de données

Dans l'éditeur SQL de votre projet Supabase, exécutez :

```
supabase/schema.sql
```

### 4. Configurer l'auth SMS dans Supabase

- Dashboard → Authentication → Providers → Phone
- Activer Twilio ou Vonage (ou utiliser Supabase built-in pour dev)
- Activer "OTP via SMS"

### 5. Lancer l'app

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
│       └── app_text_field.dart        # Champ texte réutilisable
│
└── features/
    ├── auth/
    │   ├── providers/auth_provider.dart   # Login OTP, logout, upsert profil
    │   └── screens/
    │       ├── splash_screen.dart         # Logo animé + redirect
    │       ├── onboarding_screen.dart     # 3 slides + pagination
    │       ├── phone_screen.dart          # Saisie numéro + country code
    │       └── otp_screen.dart            # Pinput 6 chiffres + countdown
    │
    ├── home/
    │   ├── screens/home_screen.dart       # Dashboard + liste cotisations
    │   └── widgets/cotisation_card.dart   # Card avec gradient + progress bar
    │
    ├── cotisation/
    │   ├── models/cotisation_model.dart   # CotisationModel + ContributionModel
    │   ├── providers/cotisation_provider.dart  # CRUD + streams Realtime
    │   └── screens/
    │       ├── create_cotisation_screen.dart   # Formulaire création
    │       └── cotisation_detail_screen.dart   # Dashboard temps réel
    │
    └── profile/
        └── screens/profile_screen.dart    # Profil + logout
```

---

## Routes de navigation

| Route | Écran |
|---|---|
| `/splash` | Splash screen |
| `/onboarding` | Onboarding 3 slides |
| `/auth/phone` | Saisie du numéro |
| `/auth/otp` | Vérification OTP |
| `/home` | Dashboard principal |
| `/cotisation/create` | Créer une cotisation |
| `/cotisation/:id` | Détail + contributions |
| `/profile` | Profil utilisateur |

---

## Base de données

Voir [`supabase/schema.sql`](supabase/schema.sql) pour le schéma complet.

### Tables principales

- `users` — profil utilisateur lié à `auth.users`
- `cotisations` — les cotisations créées
- `contributions` — chaque paiement reçu

### Trigger automatique

Un trigger PostgreSQL met à jour `current_amount` et passe la cotisation en `completed` automatiquement quand une contribution passe à `paid` via webhook Paystack.

---

## Flux de paiement

```
Contributeur → Formulaire → Paystack Checkout → Mobile Money
                                    ↓
                          Webhook Paystack
                                    ↓
                    Edge Function Supabase (update contribution status)
                                    ↓
                         Trigger DB → current_amount++
                                    ↓
                    Realtime → Dashboard mis à jour en live
                                    ↓
                         SMS confirmation (Termii)
```

---

## Modèle économique

**Frais de service de 2,5%** appliqués sur chaque contribution.

---

## Roadmap

- [x] **MVP** — Auth OTP, création, dashboard, partage
- [ ] **V2** — Tontines, QR code, export PDF
- [ ] **V3** — API publique, multi-langues

---

## Licence

Propriétaire — © 2025 Mastercota
