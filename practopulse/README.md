# PractoPulse — B2B Sales Engine for Practo Reach & Prime

Next.js 15 (App Router) + TypeScript + Tailwind + Zustand + React Query.

## Features

- **Lead Finder** — City / locality / specialty filters, Apify sourcing (simulated without keys), Clay enrich, Claude product-fit (Reach / Prime / Hybrid)
- **Outreach** — Smartlead + HeyReach campaign launchers
- **Pitch Studio** — Gamma decks, ElevenLabs voice notes, Claude scripts
- **Meeting Hub** — Google Calendar demo holds + Fireflies summaries
- **Systems** — Notion + Obsidian sync stubs
- **Settings** — Local API key store for all integrations
- **Webhooks** — `/api/webhooks/lead-scraped`, `outreach-reply`, `demo-booked`

## Run

```bash
cd practopulse
npm install
npm run dev
```

Open http://localhost:3000

From repo root:

```bash
npm run dev:pulse
```

## Mock data

Indian clinic leads (Bangalore, Mumbai, Hyderabad, Chennai, Pune, Delhi-NCR) ship in `src/lib/mock/leads.ts` for UI testing before live Apify/Clay.

## Live keys

Set in **Settings** UI or `practopulse/.env.local` (see `.env.example`). Without keys, all integrations run in **safe simulation mode**.
