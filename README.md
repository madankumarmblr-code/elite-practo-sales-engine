# Elite Practo Sales AI

Full-stack AI-powered sales automation platform for healthcare outreach — Sarvam Voice AI, Meta WhatsApp Cloud API, Meta Llama intelligence, SQLite persistence, and Vercel-ready deployment.

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20 (ESM) + Express |
| Database | SQLite via `better-sqlite3` |
| Frontend | React 18 + Vite |
| Deployment | Vercel (frontend static + backend serverless) |
| Voice AI | Sarvam Indus Samvaad |
| Messaging | Meta WhatsApp Cloud API |
| AI | Meta Llama |

## Quick Start

```bash
# Install all dependencies (root + backend + frontend)
npm install

# Copy and fill in secrets
cp .env.example .env

# Seed the database (creates default users + integrations)
npm run seed

# Start dev servers (backend :5060, frontend :5173)
npm run dev
```

## Default Login Credentials

| User | Password |
|---|---|
| `karan` | `admin123` |
| `superadmin` | `SuperAdmin@123` |

## API Endpoints

| Route | Description |
|---|---|
| `GET /api/health` | Health check |
| `POST /api/auth/login` | Login |
| `GET /api/auth/me` | Current user |
| `GET /api/sarvam/config` | Sarvam Voice config |
| `POST /api/sarvam/calls/outbound` | Trigger voice call |
| `GET /api/sarvam/calls/interactions` | Call logs |
| `GET /api/whatsapp/config` | WhatsApp config |
| `POST /api/whatsapp/send-message` | Send WhatsApp text |
| `POST /api/whatsapp/send-template` | Send template message |
| `GET /api/leads` | List leads |
| `POST /api/leads` | Create lead |

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Set all environment variables from `.env.example` in Vercel dashboard
4. Deploy — Vercel auto-routes `/api/*` to the serverless function

## Docker

```bash
# Build & run
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Environment Variables

See [`.env.example`](.env.example) for all required and optional variables.
