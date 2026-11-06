# BrandGuard — Automated Brand Governance & Regulatory Compliance

A comprehensive, production-ready human-in-the-loop compliance platform for brand copy, clinical claims, and regulatory advertising codes (built for the clean beauty brand **Verdant Skin**).

---

## Architecture Overview

* **Fullstack Vercel Deployment**: React 18 / Vite frontend in `dist/` combined with Serverless Express API in `api/index.js`.
* **Alternative Split Deployment**: Frontend on **Vercel**, standalone Node.js Express server on **Render**.
* **AI & Rules Pipeline**: Official Google Gen AI SDK (`@google/genai`) with structured JSON schema enforcement, coupled with strict regex-based brand rule engines, PII redaction, and deterministic claim validation.
* **Storage**: In-memory repository pattern backed by serialized JSON store (`/tmp/brandguard_db.json` on Vercel serverless; `backend/data/db.json` on persistent/local).

---

## 1. Fullstack Deployment on Vercel (Recommended)

You can deploy the complete frontend and backend serverless API together in a single Vercel project:

### Step-by-Step Instructions:
1. Log in to your Vercel account / scope: **[https://vercel.com/sanskar-ec31](https://vercel.com/sanskar-ec31)**
2. Click **"Add New..."** → **"Project"**.
3. Import your GitHub repository: `mangluniatanish-git/Brandguard-`.
4. Configure the Project:
   * **Project Name**: `BrandGuard`
   * **Framework Preset**: `Vite`
   * **Root Directory**: `./` (leave default)
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. **Environment Variables**:
   Under **Environment Variables**, add:
   * `JWT_SECRET`: A secure string of at least 16 characters (e.g., `brandguard_secure_jwt_prod_secret_2026`)
   * `GEMINI_API_KEY`: Your Google Gemini API Key
   * `GEMINI_MODEL`: `gemini-1.5-flash`
   * `AI_ENABLED`: `true`
   * `REDACTION_ENABLED`: `true`
   * `DEMO_MODE`: `true`
   *(Note: `VITE_API_URL` is optional! When omitted, frontend calls `/api/*` on the same Vercel origin seamlessly).*
6. Click **Deploy**.
7. Once deployed, test the health check at:
   `https://<your-project>.vercel.app/api/health`

---

## 2. Alternative Backend Deployment (Render)

If you prefer running a dedicated Express Node.js instance on [Render](https://render.com):

1. **Connect Repository**: Link your GitHub repository in Render.
2. **Service Settings**:
   * **Name**: `brandguard-api`
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node src/server.js`
   * **Health Check Path**: `/api/health`
3. **Environment Variables**:
   * `PORT`: *(automatically provided by Render)*
   * `JWT_SECRET`: Secret key (min 16 chars)
   * `FRONTEND_URL`: Production Vercel URL (e.g., `https://brandguard-sanskar-ec31.vercel.app`)
   * `GEMINI_API_KEY`: Your Gemini API key
   * `GEMINI_MODEL`: `gemini-1.5-flash`
   * `AI_ENABLED`: `true`
   * `REDACTION_ENABLED`: `true`
   * `DEMO_MODE`: `true`

---

## 3. Data Persistence & Ephemeral Storage

* On serverless platforms (Vercel) and free tier hosts (Render), the filesystem is ephemeral:
  * When Vercel boots a serverless function instance, `backend/src/repo/dbRepo.js` auto-seeds `/tmp/brandguard_db.json`.
  * On Render, if `data/db.json` is missing, seed runs automatically on startup.
* To reset the demo state at any time, an admin user can call:
  `POST /api/admin/reset-demo`

---

## 4. Security & Zero-Secret Audit

* **No Frontend Secrets**: The frontend communicates solely over HTTP with session-scoped Bearer JWTs and relative API proxies. No Gemini API keys, JWT secrets, database credentials, or private hashes exist in the frontend code (`src/`), build bundles (`dist/`), or public assets.
* **Length-Preserving PII Redaction**: Personal identifying information (emails and phone numbers) in submitted copy is automatically redacted with matching `'X'` masks before any payload is dispatched to Gemini.
* **CORS Protection**: The backend allows requests from `FRONTEND_URL`, localhost development, and `*.vercel.app` domains.

---

## 5. Local Development

### Backend
```bash
cd backend
npm install
npm run seed     # Seeds backend/data/db.json
npm run dev      # Runs server on http://localhost:3001
npm test         # Runs full Vitest suite (49 tests passing)
```

### Frontend
```bash
# From root directory
npm install
npm run dev      # Runs Vite dev server on http://localhost:5173
npm run build    # Generates production bundle in dist/
```

### Health Check
```bash
curl http://localhost:3001/api/health
# Response: {"status":"ok","uptime":...,"timestamp":"...","service":"BrandGuard API"}
```
