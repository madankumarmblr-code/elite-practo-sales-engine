# Practo Sales Automation

Full-stack suite focused on **Lead Generator** (city → zone → speciality search) and **Commercial Proposal Suite**.

## Features

- **Lead Generator** — Google Sheet search values + authentic Practo.com / maps discovery, export CSV/JSON
- **Commercial Suite** — Prime / Reach / Video proposals with live sheet inventory
- **Simple login** — user ID / email + password

## Local development

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/health

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

Change this password after go-live.

## Inventory source (Google Sheet)

Auto-syncs every 15 minutes from the published CSV (no manual CSV upload):

`https://docs.google.com/spreadsheets/d/e/2PACX-1vQTl9Yrc0MVODAlLUTrHvOCJZxrm7bpEMV3xAX1d3UYiXQIeGySyOe8t1Jk8evBTQg2rSeC8akfGfxr/pub?gid=305008958&single=true&output=csv`

Cached under `DATA_DIR` (default `backend/data/locations-sheet.csv`). Manual refresh: `POST /api/sheet/sync`.
