# EQUORSE_assesment_task

A small full-stack app that takes support requests from a public form, stores them, classifies them into a category using an AI model (with a safe fallback), and shows them in an admin dashboard.

- **Frontend:** React 19 + TypeScript + Vite + Tailwind (`support_request_application_frontend/`)
- **Backend:** Express 5 + Prisma + PostgreSQL (`support_request_application_backend/`)
- **AI:** Groq (`openai/gpt-oss-120b`) via `groq-sdk`, used only to classify the message text

---

## 1. How to run the application locally

### Prerequisites
- Node.js 18+
- pnpm (`npm i -g pnpm`)
- A PostgreSQL database (this project was built against Supabase Postgres, but any Postgres instance works)
- A Groq API key ([console.groq.com](https://console.groq.com))

### Backend setup

```bash
cd support_request_application_backend
pnpm install
```

Create a `.env` file (see `.env.example`):

```env
DATABASE_URL=postgresql://...       # pooled connection string (Supabase: "Connection pooling" URL)
DIRECT_URL=postgresql://...         # direct connection string, used by Prisma for migrations
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=any_long_random_string
```

Run the Prisma migrations and generate the client:

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

Start the server:

```bash
pnpm dev      # nodemon, auto-restarts on changes
# or
pnpm start    # plain node
```

The API runs on `http://localhost:8000` by default (`PORT` env var to override).

### Frontend setup

```bash
cd support_request_application_frontend
pnpm install
```

Create a `.env` file (see `.env.example`):

```env
VITE_PUBLIC_URL="http://localhost:8000"
```

Start the dev server:

```bash
pnpm dev
```

Vite will print the local URL (default `http://localhost:5173`).

- `/` — the public support request form
- `/login` — admin login
-the sample credentials to bypass login
```bash
email:- admin@gmail.com password123456
```
- `/dashboard` — admin view of all submitted requests (requires logging in via `/login` first — see [Limitations](#7-assumptions-limitations-and-trade-offs))

To create an admin user, call `POST /signup` once (e.g. with curl or Postman) with `{ "name", "email", "password" }`, then log in through `/login` in the UI.

---

## 2. The main request flow: frontend → backend → database → AI/fallback → admin view

1. **Frontend (`Form.tsx`)** — user fills name, email, message, priority and submits.
   - The message and email are normalized client-side (trimmed, lower-cased, whitespace collapsed) before being sent.
   - The frontend also keeps a short-lived duplicate cache in `localStorage` purely to give the user instant feedback before the request even reaches the server (see [Duplicate detection](#3-how-duplicate-detection-works)).
   - `POST /request` is called with `{ name, email, message, priority }`.

2. **Backend receives the request (`index.js`, `POST /request`)**:
   - Validates that `name`, `email`, and `message` are present (`422` if not).
   - Checks the database for a duplicate of the same request within the last 60 seconds.
   - If it's a genuinely new request, it is **saved to the database immediately** with a placeholder classification of `GENERAL` and `status: PENDING`, and `200 OK` is returned to the user right away — the client never waits on the AI call.

3. **AI classification runs asynchronously, after the response is already sent.**
   - `ProcessMessage(request)` is fired (not awaited) right after the row is created.
   - It calls `AiProcessor(message)` (`Agent.js`), which sends **only the message text** to Groq with a system prompt instructing it to return one of `SALES / BILLING / TECHNICAL / GENERAL` as strict JSON (enforced via `response_format: json_schema`).
   - If Groq returns a valid category, the request row is updated (`classified_as`) with the real category.
   - If the call fails or returns something invalid, the row is simply left as `GENERAL` (see [AI failure handling](#4-what-happens-when-the-ai-call-fails-or-returns-an-invalid-category)).

4. **Database (Postgres via Prisma)** stores everything: `Request` rows (`name`, `email`, `message`, `priority`, `classified_as`, `status`, `classification_source`, `created_at`) and `User` rows for admin login.

5. **Admin view (`Dashboard.tsx`)**:
   - `GET /request` returns all rows.
   - The dashboard renders them in a table with filters for priority and category, plus summary cards (total tickets, high-priority count, top category).
   - Because classification happens asynchronously, a request may briefly show as `GENERAL` in the dashboard until the AI job finishes and updates it — a manual refresh (re-fetch) picks up the final category.

---

## 3. How duplicate detection works

**Server-side (source of truth), in `POST /request`:**
- A request is considered a duplicate of another if it has the **same `name`, `email`, and `message`** as a request created **within the last 60 seconds**.
- If a duplicate is found:
  - If the *new* submission has a **higher priority** than the stored one, the existing row's `priority` is upgraded in place and no new row is created.
  - If the new submission's priority is **equal or lower**, it's treated as a true duplicate and silently dropped (no new row, no error surfaced — the API still responds `200`).
  - If no duplicate is found, a new row is created normally.

**Client-side (`Form.tsx`)** keeps its own 60-second cache in `localStorage`, keyed by normalized `email` + normalized `message`, purely to:
  - Give the user immediate feedback ("Duplicate request prevented within the last 60 seconds") without waiting on a round trip.
  - This is a UX convenience only — it is **not** the authority on duplicates (it's per-browser and easily bypassed), so the server always re-checks independently.

**What counts as a duplicate:** exact match on name + email + message within the time window — not fuzzy/semantic similarity. Two messages that mean the same thing but are worded differently are *not* deduplicated.

---

## 4. What happens when the AI call fails or returns an invalid category

The request is **never blocked or lost** because of the AI:

- The row is written to the database with `classified_as: GENERAL` *before* the AI is ever called, and the API responds success to the user immediately.
- `ProcessMessage` then tries to classify in the background:
  - If the Groq call throws (network error, rate limit, timeout, etc.), the `catch` block just logs the error and returns — the row is left as `GENERAL`.
  - If Groq responds but returns something that isn't valid JSON, or a `category` that isn't one of the four allowed values, `extractCategory` returns `null` and the code explicitly falls back to `"GENERAL"` before writing to the DB.
  - The `response_format: json_schema` constraint on the Groq call also constrains the model itself to only emit one of the four enum values, so this is a belt-and-suspenders check.

Net effect: worst case, a request just sits classified as `GENERAL` — it's always saved, always visible in the dashboard, and never causes a failed submission for the end user.

---

## 5. What data is sent to the AI provider, and what is intentionally excluded

**Sent to Groq:** only the raw `message` text, plus a fixed system prompt describing the four categories and the required output format.

**Deliberately excluded:** `name`, `email`, `priority`, and any internal fields (`id`, `status`, timestamps) are never included in the AI request payload. The classifier only ever sees the free-text message body — this limits what PII reaches a third-party API to the minimum needed to do the job (intent classification doesn't need to know who's asking).

---

## 6. How high-priority requests are handled

- **Duplicate resolution:** priority is the tie-breaker used when the same message is resubmitted within 60 seconds — if a duplicate arrives with a higher priority (`Low < Medium < High`), the existing request's priority is upgraded in place rather than being dropped, so a follow-up "this is urgent!" resubmission isn't silently ignored.
- **Admin dashboard:** requests are visually flagged by priority (a red/amber/green badge), there's a dedicated "High priority" count in the summary cards, and admins can filter the table to show only `High` priority requests.
- **Not currently done:** priority does **not** change AI classification order, urgency, or SLA — all pending requests are classified in the same fire-and-forget queue regardless of priority (see [Limitations](#7-assumptions-limitations-and-trade-offs)), and there's no notification/escalation for high-priority tickets.

---

## 7. Assumptions, limitations, and trade-offs

- **Async classification over a message queue.** Given the scope and time constraints, I used a simple "save first, classify in the background" pattern instead of introducing RabbitMQ or a job queue. It satisfies "AI must never block the request" without the operational overhead of a broker for what's a lightweight assignment. Trade-off: no retry logic if the async classification job fails outright before writing anything, and no persistent job queue — an in-flight classification is lost if the process crashes.
- **Exact-match duplicate detection.** Deduplication is name + email + message, exact match, 60-second window — not a fuzzy/semantic check. This is simple and predictable but won't catch near-duplicates ("please help" vs "please help!!").
- **Classification source is always recorded as "AI".** The schema has a `classification_source` enum (`AI` / `HUMAN`) for future manual reclassification by an admin, but the current backend doesn't expose an endpoint for a human to override a category — every row is written as `AI` today.
- **Dashboard auth is client-guarded, not server-enforced.** `/login` and `/signup` issue a JWT, and the frontend gates the `/dashboard` route on a token existing in `localStorage`. However, `GET /request` on the backend does **not** currently require that JWT (the `authMiddleware` exists in `middleware/middleware.js` but isn't wired onto the route). This was a scope trade-off given the time limit — in a production version, `GET /request` (and any future admin-only routes) should require the `Authorization: Bearer <token>` header and verify it server-side.
- **No pagination/rate limiting.** `GET /request` returns the entire table; fine for an assignment/demo, not for production volume. There's also no rate limiting on `POST /request`, so it's not resistant to submission spam beyond the duplicate check.
- **CORS is fully open (`origin: "*"`).** Reasonable for a quick deployment/demo, not something you'd want as-is in production.
- **Priority values differ slightly between frontend and DB.** The frontend UI only offers `Low / Medium / High`; the Prisma enum matches this now, but `priorityMap` in the backend lower-cases and compares against `low/medium/high`, so any client sending unexpected casing or the legacy `Mid` value (referenced in some frontend fallback logic) would need to match exactly or fall through to defaults.

---

## 8. Which AI/coding tools were used, and for what

- **Claude** — used to help analyze/organize the codebase and draft this README, and as a general coding assistant while building out pieces of the app.
- **Groq (`openai/gpt-oss-120b`)** — this is the *product's* AI dependency, not a dev tool: it's the model that performs the actual support-message classification at runtime (see sections 2–5 above).
