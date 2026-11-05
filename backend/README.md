# BrandGuard Backend API

Robust, secure Node.js & Express REST API for **BrandGuard** content compliance and human brand governance for the fictional skincare brand **Verdant Skin**.

---

## Architecture & Design

- **Runtime & Language**: Node.js 20+, JavaScript (ES Modules).
- **Core Stack**: Express, Zod (request validation), JSONWebToken (JWT), bcryptjs (password hashing), Helmet (security headers), CORS (origin-restricted), express-rate-limit, Multer, pino (structured logging), dotenv.
- **AI SDK**: Current official Google Gen AI SDK for Node (`@google/genai`).
- **Data Layer (`backend/src/repo/dbRepo.js`)**: Clean, async repository module currently backed by an atomic, serialized JSON file store (`backend/data/db.json`). No direct file access outside the repository module.
- **Testing**: Vitest + Supertest.

---

## Environment Variables (`.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | API server listening port | `3001` |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | *(dev secret in .env)* |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |
| `GEMINI_API_KEY` | Google Gemini API Key | *(loaded from env)* |
| `GEMINI_MODEL` | Gemini model variant | `gemini-1.5-flash` |
| `AI_ENABLED` | Enable or disable external AI checks | `true` |
| `REDACTION_ENABLED` | Enable length-preserving PII redaction | `true` |
| `DEMO_MODE` | Allow one-click demo login by role | `true` |

> **Security Note**: Never log content text or the API key. Pino is configured with redaction paths for `password`, `token`, `text`, `content`, and API keys.

---

## Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Seed Database
Seed the demo users (with bcrypt-hashed passwords), guidelines, approved facts, terminology, and sample content:
```bash
npm run seed
```

### 4. Run Tests
```bash
npm test
```

### 5. Start Server
```bash
npm run dev
# or in production:
npm start
```

---

## Swapping the Repository Layer for Supabase

All data access is encapsulated strictly in `backend/src/repo/dbRepo.js`. To swap the file-backed store for Supabase:
1. Install `@supabase/supabase-js`.
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env`.
3. Keep the exact exported function signatures in `backend/src/repo/dbRepo.js` (`getContent`, `saveFinding`, `listFindings`, `getUserById`, `updateFinding`, `addComment`, etc.) and replace internal atomic file operations with Supabase client queries (`supabase.from('content').select(...)`).
4. None of the route handlers or business services need modification because they interact solely through the repo interface.

---

## API Endpoints (Prefix: `/api`)

### Auth
- `POST /api/auth/login` — Email + password login with bcrypt verification, returns JWT token.
- `POST /api/auth/demo-login` — `{ role }` demo login (when `DEMO_MODE=true`).
- `GET /api/auth/me` — Returns current authenticated user profile (`requireAuth`).
- `GET /api/auth/demo-users` — Returns safe demo user list for demo pickers.

### Brand (Coming in Step 2)
- `GET /api/brand` — Brand guidelines, facts, terminology, settings.
- `PUT /api/brand/guidelines` — (Admin) Update guideline clause.
- `PUT /api/brand/facts` — (Admin) Update approved facts.
- `PUT /api/brand/terminology` — (Admin) Update preferred/banned terms.

### Upload & Content (Step 2 & Step 5)
- `POST /api/upload` — Upload PDF/DOCX/TXT (max 5 MB) and extract text.
- `GET /api/content` — List content items with optional query filters.
- `POST /api/content` — Create new content draft.
- `GET /api/content/:id` — Retrieve single content item.
- `PUT /api/content/:id` — Update content (creates a new version).

### Review & Findings (Step 3 & Step 4)
- `POST /api/content/:id/review` — Run deterministic rules + Gemini AI review pipeline.
- `GET /api/content/:id/findings` — Retrieve findings for content.
- `PATCH /api/findings/:id` — Update finding action (`accepted` | `edited` | `dismissed`).

### Comments & Status (Step 2)
- `POST /api/content/:id/comments` — Add reviewer comment to content.
- `PATCH /api/content/:id/status` — State machine transition with validation.

### Insights & Settings (Step 5)
- `GET /api/insights` — Aggregated metrics and Recharts data.
- `GET /api/settings` — Get AI, redaction, and disclosure settings.
- `PUT /api/settings` — (Admin) Update settings.
