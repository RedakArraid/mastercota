# Mastercota

> Plateforme de cotisations communautaires pour l'Afrique francophone.  
> **Flutter · Next.js · Hono · PostgreSQL · OpenWA · Paystack**

---

## Structure

```
mastercota/
  frontend/     # Next.js 15 + shadcn (UI web)
  backend/      # API Hono (auth, cotisations, Paystack, CMS)
  ios/          # Flutter iOS
  android/      # Flutter Android
  lib/          # Code Dart partagé Flutter
  design-tokens.json
  docker-compose.yml
```

---

## Stack

| Couche | Technologie |
|---|---|
| Mobile | Flutter 3.x (`ios/` + `android/` + `lib/`) |
| Frontend | Next.js 15 + shadcn (`frontend/`) |
| Backend | Hono + PostgreSQL (`backend/`) |
| OTP | OpenWA (WhatsApp) |
| Paiement | Paystack |

---

## Dev local

### Prérequis

- Flutter 3.x, Node 22+, PostgreSQL 16+
- Instance OpenWA + compte Paystack

### 1. Backend

```bash
cp backend/.env.example backend/.env
# renseigner DATABASE_URL, JWT_SECRET, Paystack, OpenWA
psql "$DATABASE_URL" -f backend/db/schema.sql
psql "$DATABASE_URL" -f backend/db/migrate-pages.sql
cd backend && npm install && npm run dev   # :4000
```

### 2. Frontend

```bash
cp frontend/.env.example frontend/.env.local
# BACKEND_URL=http://127.0.0.1:4000
cd frontend && npm install && npm run dev   # :3000
```

Le frontend proxy `/api/*` vers le backend (`next.config.ts`).

### 3. Mobile

```bash
flutter pub get
flutter run -d ios   # API_BASE_URL=https://mastercota.com par défaut
```

---

## Production (VPS)

```bash
cd /root/mastercota
cp .env.example .env   # Postgres, JWT, OpenWA, Paystack
docker compose up -d --build
```

Webhook Paystack : `https://mastercota.com/api/paystack/webhook`

---

## Auth OTP (OpenWA)

```
App → POST /api/auth/send-otp → OpenWA WhatsApp
App → POST /api/auth/verify-otp → JWT (cookie mc_session / Bearer)
```

## Paiement

```
Contributeur → POST /api/paystack/initialize → Checkout
Webhook → POST /api/paystack/webhook → contribution paid
```

---

## Modèle économique

Frais de service **1%** sur chaque contribution.

## Licence

Propriétaire — © 2025 Mastercota
