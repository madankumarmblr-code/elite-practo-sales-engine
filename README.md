# NexusHub — Full-Stack Project Studio

A modern, high-performance Full-Stack application powered by **React 19 (Vite)** and **Node.js (Express)**.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Starts both Express backend (`http://localhost:5001`) and Vite React frontend (`http://localhost:5173`) concurrently:
```bash
npm run dev
```

### 3. Individual Commands
- **Backend only**: `npm run dev:backend`
- **Frontend only**: `npm run dev:frontend`
- **Production Build**: `npm run build`
- **Production Server**: `npm run start:prod`

---

## 🏗️ Project Architecture

```text
├── backend/
│   ├── src/
│   │   ├── config.js         # Environment & directory configuration
│   │   ├── app.js            # Express middlewares, routing & error handling
│   │   ├── index.js          # HTTP server bootstrap & graceful shutdown
│   │   ├── routes/           # REST endpoints (/api/health, /api/projects, etc.)
│   │   └── services/         # State store & business logic
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.js     # Centralized API service
│   │   ├── components/       # Header, StatsGrid, ProjectCard, Modals, Feed
│   │   ├── styles/index.css  # Custom modern design system (vanilla CSS)
│   │   ├── App.jsx           # Main dashboard & live orchestration
│   │   └── main.jsx          # React 19 entry point
│   └── vite.config.js        # Vite config with backend proxy
└── package.json              # Monorepo workspace orchestration
```
