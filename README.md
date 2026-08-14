# Practo Sales Automation

Full-stack sales automation suite for clinic and healthcare outreach — **ready to host on one port**.

## Features

- **Super Admin** — users, permissions, system health & logs
- **Simple login** — user ID / email + password
- **Lead Generator** — Google Sheet auto-sync (city → zone → speciality)
- **Commercial Suite** — Prime / Reach / Video proposals with live sheet inventory
- **Autopilot AI** — separate WhatsApp, Gmail, Calls pilots + records & dialogues
- **API Integrations** — multi-provider connectors with self-test
- **Lead Conversion Engine** — ingest webhook → WhatsApp AI autopilot → **Commercial Proposal Suite only** (Ray / Prime / Reach), with `city_location` + `speciality` preserved end-to-end

## Local development

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/health
- Conversion status: http://localhost:4000/api/v1/status

### Conversion API (v1)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/leads/ingest` | Ingest Practo lead (`PRACTO_RAY` / `PRACTO_PRIME` / `PRACTO_REACH`) + auto WhatsApp pitch |
| `POST` | `/api/v1/whatsapp/inbound` | Stateful WhatsApp autopilot replies |
| `POST` | `/api/v1/proposals/generate` | **Commercial Proposal Suite only** (no Basic/Standard/Gold tiers) |
| `GET` | `/api/v1/status` or `/status` | Component health |

Protect webhooks with `LEAD_INGEST_SECRET` (`X-Webhook-Secret` header). Importable n8n workflow: `integrations/n8n/practo-lead-conversion.json`.

## Host (production)

### Fastest — Docker

```bash
docker compose up -d --build
```

Open **http://localhost:8080**

### Node (VPS)

```bash
npm install
npm run build
NODE_ENV=production PORT=8080 npm start
```

Full steps, Nginx, env vars, Vercel, and systemd: see **[HOSTING.md](./HOSTING.md)** and **[VERCEL.md](./VERCEL.md)**.

> **Vercel:** Import with Root Directory empty. After deploy, `/api/health` must return JSON. Login: `superadmin` / `SuperAdmin@123`. Prefer Docker for durable data.

### Super Admin login

| Field | Value |
|------|-------|
| User ID | `superadmin` |
| Email | `superadmin@practo.sales` |
| Password | `SuperAdmin@123` |

Change this password after go-live and create users in **Super Admin**.

## Inventory source (Google Sheet)

Auto-syncs every 15 minutes from the published CSV (no manual CSV upload):

`https://docs.google.com/spreadsheets/d/e/2PACX-1vQTl9Yrc0MVODAlLUTrHvOCJZxrm7bpEMV3xAX1d3UYiXQIeGySyOe8t1Jk8evBTQg2rSeC8akfGfxr/pub?gid=305008958&single=true&output=csv`

Cached under `DATA_DIR` (default `backend/data/locations-sheet.csv`). Manual refresh: `POST /api/sheet/sync`.
