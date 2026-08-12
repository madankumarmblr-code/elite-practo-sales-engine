# Vercel deploy (UI + API)

## Demo login

| Field | Value |
|-------|--------|
| User ID | `superadmin` |
| Password | `SuperAdmin@123` |

## How deploy works

`vercel.json` does **not** use `outputDirectory` (that mode is static-only and breaks `/api`).

Instead the build:

1. Builds Vite → `frontend/dist`
2. Copies it to `public/` (static CDN)
3. Deploys `api/index.js` as a serverless Express function
4. Rewrites `/api/*` → `/api` and SPA routes → `/index.html`

## Dashboard settings

| Setting | Value |
|---------|--------|
| **Root Directory** | **empty** (repo root — never `backend`) |
| Framework | Other / leave default (`vercel.json` controls build) |

After deploy, open `/api/health` — it must return JSON `{ "ok": true }`, not the HTML app.

## Deploy

```bash
npm i -g vercel
vercel
```

Or import the GitHub repo at [vercel.com/new](https://vercel.com/new).

## Notes

- SQLite lives in `/tmp` on Vercel (ephemeral). Use Docker/VPS for durable CRM data.
- First API request after a cold start can be slower (seed + sheet sync).
