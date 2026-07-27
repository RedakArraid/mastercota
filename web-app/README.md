# Mastercota Web

Next.js 15 + shadcn — API Postgres + OTP WhatsApp (OpenWA) + Paystack.

## Stack

- PostgreSQL (conteneur `mastercota-db`)
- Auth OTP via **OpenWA** (`POST …/messages/send-text`)
- Sessions JWT (cookie httpOnly web / Bearer mobile)
- Paystack (initialize, webhook, subaccount)

## Démarrage local

```bash
cd web-app
cp .env.example .env.local
# renseigner DATABASE_URL, JWT_SECRET, OpenWA, Paystack
docker compose up -d db   # ou Postgres local
psql $DATABASE_URL -f db/schema.sql
npm install && npm run dev
```

## Variables critiques

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Postgres |
| `JWT_SECRET` | Signature sessions |
| `OPENWA_*` | Envoi OTP WhatsApp |
| `PAYSTACK_SECRET_KEY` | Paiements / webhook |
| `OTP_DEV_CODE` | Bypass OTP en dev (ex. `123456`) |

## Webhook Paystack

`https://mastercota.com/api/paystack/webhook`
