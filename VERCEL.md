# Vercel deploy (UI + API)

This repo deploys to Vercel as:

- **Static UI** → `frontend/dist` (Vite)
- **API** → serverless Express at `/api/*` (`api/[...path].js`)

## Demo login

| Field | Value |
|-------|--------|
| User ID | `superadmin` |
| Email | `superadmin@practo.sales` |
| Password | `SuperAdmin@123` |

## Dashboard settings (important)

| Setting | Value |
|---------|--------|
| **Root Directory** | **leave empty** (repo root — do **not** set to `backend`) |
| Build & Output | handled by `vercel.json` |

If an old project was created as `*-backend` with Root Directory `backend`, either clear Root Directory or create a **new** project from the repo root.

## Deploy

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Confirm Root Directory is empty
3. Deploy

After deploy, open `/api/health` — you should see JSON `{ "ok": true, ... }`, not the HTML login page.

## Notes

- SQLite on Vercel uses `/tmp` (ephemeral across cold starts). Prefer Docker/VPS for durable CRM data.
- First API request after a cold start may take longer (sheet sync + DB seed).
