# BrandGuard — Automated Brand Governance & Regulatory Compliance

A comprehensive, production-ready human-in-the-loop compliance platform for brand copy, clinical claims, and regulatory advertising codes (built for the clean beauty brand **Verdant Skin**).

---

## Architecture Overview

* **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, React Router 6. Deployed on **Vercel**.
* **Backend**: Node.js, Express, Zod validation, JWT authentication, Multer document parsing, Pino logging. Deployed on **Render**.
* **AI & Rules Pipeline**: Official Google Gen AI SDK (`@google/genai`) with structured JSON schema enforcement, coupled with strict regex-based brand rule engines, PII redaction, and deterministic claim validation.
* **Storage**: In-memory repository pattern backed by serialized JSON store (`backend/data/db.json`).

---

## 1. Backend Deployment (Render)

Deploy the backend as a **Web Service** on [Render](https://render.com):

1. **Connect Repository**: Link your GitHub repository in Render.
2. **Service Settings**:
   * **Name**: `brandguard-api` (or your chosen service name)
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node src/server.js`
   * **Health Check Path**: `/api/health`

3. **Environment Variables**:
   In the Render dashboard under **Environment**, configure the following variables:

   | Variable | Example Value | Description |
   |:---|:---|:---|
   | `PORT` | *(set automatically by Render)* | Port the Express server listens on. Read dynamically from `process.env.PORT`. |
   | `JWT_SECRET` | `your_long_secure_random_jwt_secret_32_bytes` | Secret key (min 16 chars) used to sign and verify JWT authentication tokens. |
   | `FRONTEND_URL` | `https://your-app.vercel.app` | **Strict CORS origin**. Set to your production Vercel frontend URL (do not include trailing slash). |
   | `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API key. |
   | `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini model variant used for claim verification. |
   | `AI_ENABLED` | `true` | Enables AI compliance scan via Gemini. If set to `false`, reviews run in deterministic rules-only mode. |
   | `REDACTION_ENABLED`| `true` | Enforces character-preserving PII redaction before sending copy to external AI APIs. |
   | `DEMO_MODE` | `true` | Enables 1-click persona switching (Creator, Reviewer, Manager, Admin) for testing and demonstrations. |

> [!NOTE]
> **Ephemeral Storage & Auto-Seeding**: Because Render free instances utilize temporary, ephemeral disk storage, any file changes to `data/db.json` reset when the service spins down or redeploys. To ensure uninterrupted operation:
> * On startup, if `backend/data/db.json` is missing, the backend automatically initializes with the full seed dataset (users, guidelines, approved facts, terminology, and sample contents).
> * An admin can restore the fresh seed dataset at any time via the admin endpoint:
>   `POST /api/admin/reset-demo` (Requires `admin` role token).

---

## 2. Frontend Deployment (Vercel)

Deploy the frontend on [Vercel](https://vercel.com):

1. **Import Project**: Select the GitHub repository.
2. **Project Settings**:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `./` (Root directory of the repo)
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
3. **Environment Variables**:
   Configure the following variable in Vercel project settings:

   | Variable | Value | Description |
   |:---|:---|:---|
   | `VITE_API_URL` | `https://brandguard-api.onrender.com` | Base URL of your deployed Render backend (without trailing slash). |

4. **SPA Client-Side Routing**:
   The repository includes a root [`vercel.json`](file:///e:/BrandGovernance/vercel.json) that rewrites all incoming routes to `/index.html`:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
   This ensures that refreshing pages on deep URLs (such as `/review/cnt-01`, `/brand-library`, or `/review-queue`) routes cleanly without `404 Not Found` errors.

---

## 3. Security & Zero-Secret Audit

* **No Frontend Secrets**: The frontend communicates solely over HTTP with the backend using session-scoped Bearer JWTs and relative API proxies. No Gemini API keys, JWT secrets, database credentials, or private hashes exist in the frontend code (`src/`), build bundles (`dist/`), or public assets.
* **Length-Preserving PII Redaction**: Personal identifying information (emails and phone numbers) in submitted copy is automatically redacted with matching `'X'` masks before any payload is dispatched to Gemini.
* **CORS Lockdown**: In production, the backend rejects any browser request whose `Origin` header does not match `FRONTEND_URL`.

---

## 4. Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run seed     # Seeds backend/data/db.json
npm run dev      # Runs server on http://localhost:3001
npm test         # Runs full Vitest suite (49 tests)
```

### Frontend
```bash
# From root directory
npm install
npm run dev      # Runs Vite dev server on http://localhost:5173
npm run build    # Generates production bundle in dist/
```

### Health Check
Verify the API is running locally or in production:
```bash
curl http://localhost:3001/api/health
# Response: {"status":"ok","uptime":12,"timestamp":"...","service":"BrandGuard API"}
```
