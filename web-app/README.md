# Mastercota Web (`web-app`)

Front web Next.js 15 + shadcn/ui pour Mastercota. Même backend Supabase / Paystack / Termii que l’app Flutter.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix)
- `@supabase/ssr` (auth cookies + Realtime client)
- Plus Jakarta Sans, palette navy + or

## Démarrage

```bash
cd web-app
cp .env.local.example .env.local
# renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|---|---|
| `/onboarding` | Entrée produit |
| `/auth/phone`, `/auth/otp` | Auth OTP SMS |
| `/home` | Liste des cotisations |
| `/cotisation/create`, `/cotisation/[id]` | Création + détail Realtime |
| `/profile`, `/profile/payout` | Profil + sous-compte Paystack |
| `/c/[slug]` | Page publique de contribution |

## Design tokens

Source de vérité partagée avec Flutter :
- [`design-tokens.json`](./design-tokens.json)
- copie à la racine : [`../design-tokens.json`](../design-tokens.json)
