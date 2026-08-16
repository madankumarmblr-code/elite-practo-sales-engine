# Practo Sales Automation

Full-stack suite with:

1. **Classic app** (`frontend` + `backend`) — Lead Generator + Commercial Proposal Suite on https://www.salesmaster.live
2. **PractoPulse** — Healthcare sales automation for Reach & Prime inside sales (Lead Discovery / ElevenLabs Voice Calls / WhatsApp Gateway / Cold Email Sequencer / Claude AI / Gamma Decks)


## PractoPulse (new)

```bash
npm install
npm run dev:pulse
```

Open http://localhost:3000 — see `practopulse/README.md`.

## Classic Lead Generator + Commercial Suite

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

Full steps: **[HOSTING.md](./HOSTING.md)** and **[VERCEL.md](./VERCEL.md)**.

### Super Admin login (classic app)

| Field | Value |
|------|-------|
| User ID | `superadmin` |
| Email | `superadmin@practo.sales` |
| Password | `SuperAdmin@123` |
