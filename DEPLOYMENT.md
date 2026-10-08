# Deployment Guide

Two deployable units: `backend/` (Express API) and the repo root (Vite React
frontend). No shared infra is required beyond MongoDB and an AI gateway.

## 1. MongoDB

Use MongoDB Atlas (free tier is enough) or any MongoDB ≥ 4.4. You only need the
connection string — collections and indexes are created automatically on first
use (`AssistantThread`, `AssistantUsage`, `UserCredits`, `products`, `auths`).

## 2. Backend

Any Node host: Render, Railway, Fly.io, or a VPS (`node app.js`, PM2, Docker).

**Required env vars:**

| Var | Notes |
|---|---|
| `JWT_SECRET` | **Required** — app refuses to boot without it |
| `DB_URL` | e.g. `mongodb+srv://user:pass@cluster.mongodb.net/benna_assistant` |
| `PORT` | set by the platform usually; default 1942 |
| `LOVABLE_API_KEY` | direct AI gateway key, **or** |
| `BENNA_AI_PROXY_URL` + `BENNA_AI_PROXY_SECRET` | proxy fallback pair |

**Optional:** `ASSISTANT_FREE_DAILY_TURNS` (15), `ASSISTANT_DAILY_CAP` (120),
`ASSISTANT_INTENT_MODEL`, `ASSISTANT_REPLY_MODEL`, `ASSISTANT_SIM_FLOOR`,
`PG_URL` / `SUPABASE_DB_URL` (semantic search — skipped safely if unset).

**After deploy:** `node scripts/seedProducts.js` once to load the demo catalog,
and `POST /api/users/auth/registration` to create the first user.
Health check for the platform: `GET /health`.

### Sign-in correctness in production

Auth is plain JWT — no cookies, no Redis, no OTP — so there are **no extra
dependencies** that could break sign-in after deployment:

- `POST /api/users/auth/registration` → creates user + free credits, returns token
- `POST /api/users/auth/customer/login` → returns `{ token, userDetail }`
- Every assistant route runs `authenticate` (JWT verify + user-exists check)

The earlier "Invalid or missing API key" error was **not** a code bug — it
happened because the frontend was pointed at the real Benna production API.
The standalone backend does **not** require `x-api-key`; leave `VITE_API_KEY`
empty unless you add the `publicApiKey` middleware yourself.

## 3. Frontend

Any static host: Vercel, Netlify, Cloudflare Pages, GitHub Pages.

```
Build command: npm install && npm run build
Output dir:      dist
```

**Build-time env var:**

```
VITE_API_URL=https://<your-backend-domain>/api
```

⚠️ `VITE_*` vars are inlined at **build** time — set this before building, and
rebuild if the backend URL changes.

**SPA fallback is required**: configure a rewrite `/* → /index.html` so deep
links like `/assistant/<threadId>` and `/login` load on refresh. On Vercel this
works automatically; on Netlify add `public/_redirects` with
`/* /index.html 200`; nginx: `try_files $uri /index.html`.

## 4. Post-deploy smoke test

```bash
curl https://<api>/health                      # {"status":"ok"}
curl -X POST https://<api>/api/users/auth/registration \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"t@t.com","password":"secret123"}'
# → open https://<frontend>/assistant → Sign in → chat works
```

## Known limitations (by design)

- No OTP/email verification — register logs in immediately
- No token blacklist/session device tracking (simplified JWT)
- Vendor chat, PayTabs credits purchase, and BOQ/RFQ pages are stubs/links
- pgvector semantic search disabled unless `PG_URL`/`SUPABASE_DB_URL` set
