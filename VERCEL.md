# Vercel deploy (UI + API)

This repo deploys to Vercel as:

- **Static UI** → `frontend/dist` (Vite)
- **API** → serverless Express at `/api/*` (`api/index.js`)

SQLite runs under `/tmp` on Vercel (ephemeral across cold starts; fine for demos). For durable production data, use Docker/VPS (HOSTING.md).

## Dashboard settings (important)

| Setting | Value |
|---------|--------|
| Framework Preset | Other / Vite (auto from `vercel.json`) |
| **Root Directory** | **leave empty** (repo root — do **not** set to `backend`) |
| Build & Output | handled by `vercel.json` |

If an old Vercel project was created with Root Directory `backend`, create a **new** project from the repo root or clear Root Directory.

## Deploy

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Confirm Root Directory is empty
3. Deploy

Or CLI:

```bash
npm i -g vercel
vercel
```

## What works on Vercel

- Login / Super Admin
- Dashboard, leads, contacts
- Lead generator (sheet sync on first API request)
- Commercial Suite (static HTML + `/api/commercial/*`)
- Autopilot dry-run, integrations, settings, import/export

## Notes

- First API request after a cold start may take longer (sheet sync + DB seed).
- Serverless SQLite in `/tmp` is not shared across all instances — prefer Docker for long-term CRM data.
- Optional: set `CORS_ORIGIN` in Vercel env if you call the API from another origin (same-origin UI does not need it).
