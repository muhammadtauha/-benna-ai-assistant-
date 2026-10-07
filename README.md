# Benna AI Procurement Assistant — Standalone Build

A standalone duplicate of the **AI Procurement Assistant** feature from the Benna
storefront (`benna-mobile-app` @ `origin/main`): a bilingual (EN/AR) chat
workspace with conversation history, streaming answers, ranked product cards,
BOQ/RFQ handoffs, and a sign-in gate — backed by a small Express + MongoDB API.

See `AI_PROCUREMENT_ASSISTANT.md` (repo root of the original workspace) for the
full feature spec and API contract.

## Layout

```
├── src/                  # Vite + React 18 + TS frontend (Tailwind, react-router 6)
│   ├── pages/AssistantPage.tsx            # 3-column workspace (/assistant, /assistant/:threadId)
│   ├── pages/AuthPage.tsx                 # Sign in / register → /login, /register
│   ├── components/assistant/              # AssistantChat, AssistantProductCard, AssistantBubble
│   ├── components/AgentTransitionScreen.tsx
│   ├── hooks/useAssistant.ts              # conversation state machine
│   ├── lib/api-assistant.ts               # SSE-over-POST streaming client
│   └── contexts/                          # Auth, Language (EN/AR), Cart (localStorage)
└── backend/              # Express 4 + Mongoose API
    ├── routes/users.js + assistant.routes.js
    ├── app/user/controller/assistant.controller.js
    ├── app/user/services/assistant/       # router → intent → retrieval → ranker → synthesize
    ├── app/user/model/                    # assistantThread, assistantUsage, userCredits, creditTransaction
    ├── app/auth/                          # JWT register/login/me
    └── scripts/seedProducts.js            # demo catalog
```

## API surface

All under `POST/GET/DELETE {API_URL}/users/website/assistant/*`
(SSE chat, quota, threads list/get/delete) plus auth:
`POST /api/users/auth/registration`, `POST /api/users/auth/customer/login`,
`GET /api/users/auth/me`.

## Run it

```bash
# 1) Backend
cd backend
cp .env.example .env          # set JWT_SECRET and an AI key (LOVABLE_API_KEY or BENNA_AI_PROXY_*)
npm install
npm run seed:products         # loads a 7-product demo catalog
npm run dev                   # http://localhost:1942

# 2) Frontend
cd ..
cp .env.example .env          # VITE_API_URL=http://localhost:1942/api
npm install
npm run dev                   # http://localhost:5173 → redirects to /assistant
```

Open `/assistant` signed out → you get the "Sign in to use the assistant" gate →
Sign in → create an account → chat.

## Notes / trims vs. the original

- Auth is simplified JWT (no Redis blacklist/session-device record, no OTP).
- Vendor chat ("Chat with seller") is a stub (`ChatManager.tsx`).
- pgvector semantic search is optional — without `PG_URL`/`SUPABASE_DB_URL` the
  retrieval layer falls back to Mongo keyword search automatically.
- Credits are real (shared `userCredits` model, 50 free starting balance,
  15 free AI turns/day then 1 credit/turn, 120/day hard cap) but there is no
  PayTabs purchase flow in this build.
- BOQ/RFQ handoff cards link to `/build-project` and `/rfqs` — placeholder
  routes in this repo; point them at real pages when integrating.
