# Mastercota

> Plateforme de cotisations communautaires pour l'Afrique francophone.  
> **Flutter · Next.js · PostgreSQL · OpenWA · Paystack**

---

## Stack technique

| Couche | Technologie |
|---|---|
| Mobile | Flutter 3.x (iOS & Android) |
| Web / API | Next.js 15 + shadcn (`web-app/`) |
| Base | PostgreSQL |
| OTP | OpenWA (WhatsApp) |
| Paiement | Paystack |
| État (mobile) | Riverpod |
| Navigation (mobile) | GoRouter |

---

## Installation rapide

### Prérequis

- Flutter 3.x
- Node 22+
- PostgreSQL 16+
- Instance [OpenWA](https://openwa.soubadigital.com) (session WhatsApp + API key)
- Compte [Paystack](https://paystack.com)

### 1. Cloner et installer

```bash
git clone <repo>
cd mastercota
flutter pub get
cd web-app && npm install && cd ..
```

### 2. Configurer l'API (`web-app/.env`)

Voir [`web-app/.env.example`](web-app/.env.example) :

- `DATABASE_URL`, `JWT_SECRET`
- `OPENWA_BASE_URL`, `OPENWA_API_KEY`, `OPENWA_SESSION_ID`
- `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`

### 3. Schéma Postgres

```bash
psql "$DATABASE_URL" -f web-app/db/schema.sql
```

### 4. Lancer

```bash
# API + web
cd web-app && npm run dev

# Mobile (pointe vers API_BASE_URL, défaut https://mastercota.com)
flutter run -d ios
```

### Production VPS

```bash
cd /root/mastercota
# renseigner .env (Postgres, JWT, OpenWA, Paystack)
docker compose up -d --build
```

Webhook Paystack : `https://mastercota.com/api/paystack/webhook`

---

## Structure

```
lib/                 # App Flutter
web-app/             # Next.js UI + API routes
web-app/db/schema.sql
design-tokens.json
```

### Auth OTP (OpenWA)

```
App → POST /api/auth/send-otp → OpenWA send-text (WhatsApp)
App → POST /api/auth/verify-otp → JWT session
```

### Paiement

```
Contributeur → POST /api/paystack/initialize → Paystack Checkout
Webhook → POST /api/paystack/webhook → contribution paid + trigger amount
```

---

## Modèle économique

Frais de service **1%** sur chaque contribution.

---

## Roadmap

- [x] MVP cotisations + page publique + Paystack
- [x] Auth OTP WhatsApp (OpenWA) + Postgres
- [ ] V2 — Tontines, QR code, export PDF

## Licence

Propriétaire — © 2025 Mastercota
