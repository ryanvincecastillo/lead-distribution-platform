# Lead Distribution Platform

A full-stack lead capture and routing system. One public form collects leads, captures the
visitor's IP address, rejects duplicate emails, and routes each lead to the eligible broker
that is furthest behind its target share — respecting every broker's own timezone, opening
hours, working days and daily cap.

- **Frontend** — Next.js 16 (App Router, React 19, TypeScript, Tailwind v4)
- **Backend** — Express 5 + TypeScript, Prisma ORM, MySQL
- **Auth** — JWT in an httpOnly cookie
- **Process manager** — PM2

---

## Contents

- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Database setup and migrations](#database-setup-and-migrations)
- [Running the app](#running-the-app)
- [How lead distribution works](#how-lead-distribution-works)
- [API reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Operations: restart, logs, troubleshooting](#operations-restart-logs-troubleshooting)
- [Security notes](#security-notes)
- [Test notes](#test-notes)

---

## Architecture

```
                    ┌──────────────────────────────────────────┐
   visitor ────────▶│  Next.js  (public port 8228)             │
   admin   ────────▶│                                          │
                    │  /login  /dashboard  /brokers  /leads    │
                    │  /form   /distribution                   │
                    │  /{slug}            ← public lead form   │
                    │  /api/[...path]     ← server-side proxy  │
                    └───────────────────┬──────────────────────┘
                                        │ 127.0.0.1 only
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │  Express API  (private port 8229)        │
                    │  auth · brokers · form · distribution    │
                    │  leads · public intake                   │
                    └───────────────────┬──────────────────────┘
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │  MySQL                                   │
                    └──────────────────────────────────────────┘
```

**The browser never talks to the API directly.** Every request goes to the Next.js app's own
`/api/*` route, which forwards it server-side to the private Express port. Three consequences:

1. The backend port is never exposed publicly, as the deployment requires.
2. The session cookie is same-origin, so it stays `httpOnly` with no CORS negotiation.
3. The proxy forwards the original client IP as `X-Forwarded-For`, so the API records the
   real visitor address rather than the loopback address of the Next.js process.

---

## Repository layout

```
.
├── backend/                  Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma     Data model
│   │   ├── migrations/       Versioned SQL migrations
│   │   └── seed.ts           Admin account (+ optional demo brokers)
│   └── src/
│       ├── config/env.ts     Environment parsed and validated at boot
│       ├── lib/              Prisma client, logger, JWT, cookies, errors
│       ├── middleware/       auth, validation, rate limiting, error handling
│       └── modules/
│           ├── auth/         Login, logout, session
│           ├── brokers/      Broker CRUD + per-broker lead views
│           ├── forms/        The single lead form
│           ├── distribution/ Distribution config + the routing engine
│           ├── leads/        Lead listing, manual assignment, intake
│           └── public/       Unauthenticated visitor endpoints
└── frontend/                 Next.js admin dashboard + public form
    ├── app/
    │   ├── (admin)/          Authenticated dashboard routes
    │   ├── (auth)/login/     Sign-in
    │   ├── [slug]/           Public lead form
    │   └── api/[...path]/    Server-side proxy to the private API
    ├── components/           UI primitives, layout shell, feature components
    └── lib/                  API client, types, formatting helpers
```

---

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/ryanvincecastillo/lead-distribution-platform.git
cd lead-distribution-platform
```

### 2. Install dependencies

The frontend and backend are separate Node projects; install each.

```bash
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..
```

Requires **Node.js 20+** (developed on 22.14) and **MySQL 8**.

### 3. Set environment variables

Copy each example file and fill in real values. Neither `.env` file is committed.

```bash
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env.local
```

See [Environment variables](#environment-variables) for what each one does.

### 4. Provide a MySQL database

Either point `DATABASE_URL` at an existing MySQL server, or start one with Docker:

```bash
cd backend
docker compose up -d
```

That starts MySQL 8 on host port **3307** with database `lead_distribution` and user
`ldp_user` / `ldp_pass`, matching the default `DATABASE_URL` in `.env.example`.

> Prisma creates a temporary shadow database when generating migrations in development.
> If your MySQL user cannot create databases, grant it once:
> `GRANT ALL PRIVILEGES ON *.* TO 'your_user'@'%'; FLUSH PRIVILEGES;`
> This is a development-only requirement — `prisma migrate deploy` in production does not
> use a shadow database.

---

## Environment variables

### Backend — `backend/.env`

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development`, `test` or `production` |
| `PORT` | no | `4400` | Port the API listens on (**8229** on the VPS) |
| `DATABASE_URL` | **yes** | — | MySQL connection string |
| `JWT_SECRET` | **yes** | — | Session signing key; min 16 chars, min 32 in production |
| `JWT_EXPIRES_IN` | no | `7d` | Session lifetime |
| `CORS_ORIGIN` | no | `http://localhost:3000` | Allowed origin(s), comma-separated |
| `COOKIE_NAME` | no | `ldp_session` | Session cookie name |
| `COOKIE_SECURE` | no | `false` | Set `true` when served over HTTPS |
| `TRUST_PROXY` | no | `1` | Proxy hop count used to resolve the client IP |
| `LOG_LEVEL` | no | `info` | `fatal` … `trace` |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Global rate-limit window |
| `RATE_LIMIT_MAX` | no | `300` | Requests per window per IP |
| `AUTH_RATE_LIMIT_MAX` | no | `10` | Failed logins per 15 minutes per IP |
| `PUBLIC_LEAD_RATE_LIMIT_MAX` | no | `20` | Public form submissions per minute per IP |
| `ADMIN_EMAIL` | **yes** (seed) | — | Admin account created by the seed |
| `ADMIN_PASSWORD` | **yes** (seed) | — | Admin password; hashed with bcrypt, never stored plain |

The API validates this configuration on boot and **exits immediately** if anything is
missing or malformed, rather than starting and failing on the first request.

### Frontend — `frontend/.env.local`

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `BACKEND_INTERNAL_URL` | no | `http://127.0.0.1:4400` | Internal API address (**`http://127.0.0.1:8229`** on the VPS) |

Deliberately **not** prefixed `NEXT_PUBLIC_`: it is read only on the server, so the private
backend address is never shipped to the browser.

---

## Database setup and migrations

Migrations are versioned SQL under `backend/prisma/migrations/` and are committed, so any
environment can be reproduced exactly.

```bash
cd backend

# Development — creates/updates migrations from schema.prisma
npm run db:migrate

# Production — applies existing migrations without generating new ones
npm run db:deploy

# Create the admin account from ADMIN_EMAIL / ADMIN_PASSWORD
npm run db:seed

# Drop everything, re-run all migrations, re-seed (destructive)
npm run db:reset
```

The seed creates **only the admin user**. Brokers, the form and the distribution are left
for the reviewer to create through the UI — seeding a form would make the "a second form
cannot be created" rule impossible to demonstrate. To also create three demo brokers across
different timezones:

```bash
SEED_DEMO=1 npm run db:seed
```

### Schema

| Table | Purpose |
| --- | --- |
| `users` | Admin accounts (bcrypt password hashes) |
| `brokers` | Name, active flag, daily cap, timezone, opening/closing time, working days, soft-delete |
| `forms` | The single lead form — name, slug, created date |
| `distributions` | The single distribution, bound to the form |
| `distribution_brokers` | Broker membership: percentage share + active flag |
| `leads` | Name, email, phone, IP address, status, assigned broker, timestamps |
| `lead_events` | Append-only routing audit log with the full eligibility snapshot |

`forms` and `distributions` each carry a `singleton` column that always defaults to `1` and
holds a unique index. A second row is therefore **rejected by the database**, not merely by
application code that two concurrent requests could both pass.

---

## Running the app

### Development

Two terminals:

```bash
# Terminal 1 — API on http://localhost:4400
cd backend && npm run dev

# Terminal 2 — web app on http://localhost:3000
cd frontend && npm run dev
```

Then open **http://localhost:3000** and sign in with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Production build

```bash
cd backend  && npm run build   # TypeScript -> dist/
cd frontend && npm run build   # Next.js production build
```

### Suggested first run

1. Sign in.
2. **Brokers** — create a few, each with its own timezone, hours, working days and daily cap.
3. **Lead form** — create the single form, e.g. slug `lead-registration`.
4. **Distribution** — select brokers, set their percentages, create it.
5. Open the public URL shown on the Lead form page and submit a lead.
6. Watch it land on **Leads**, the broker's detail page, and the distribution detail page.

---

## How lead distribution works

When the public form is submitted, the API runs these steps inside a single database
transaction:

1. **Save the lead** — name, email, phone, form, timestamp and the visitor's IP address.
2. **Normalise the email** — `email.trim().toLowerCase()`.
3. **Duplicate check** — if this email was *ever assigned to a broker* before, the lead is
   marked `duplicate` and is never routed. Two unsent submissions from the same address are
   not duplicates, because nothing was ever delivered.
4. **Find the distribution** — if none exists, the lead is `unsent`.
5. **Filter brokers** — a broker is eligible only if it is active, included and active in
   the distribution, has a percentage above zero, is under its daily cap, and is currently
   inside its working days and opening hours **in its own timezone**.
6. **Compute the deficit** for every eligible broker:

   ```
   targetAfterLead = (totalSentToday + 1) × brokerPercentage / 100
   deficit         = targetAfterLead − brokerSentToday
   ```

7. **Select** the eligible broker with the highest deficit. Ties break toward the broker
   with fewer leads today, then the lower broker id so the result is deterministic.
8. **Assign** the lead and mark it `sent`.
9. **If nobody is eligible**, the lead is `unsent` and appears on the distribution detail
   page with the reason it could not be routed.
10. **Manual assignment** — an admin can assign any unsent lead to a broker. This overrides
    opening hours and the daily cap by design, but never the duplicate rule.

### Worked example

With 10 leads already sent today:

| Broker | Share | Sent today | Target after next lead | Deficit | Outcome |
| --- | --- | --- | --- | --- | --- |
| A | 50% | 4 | 5.5 | **+1.5** | receives the next lead |
| B | 30% | 3 | 3.3 | +0.3 | behind, smaller deficit |
| C | 20% | 3 | 2.2 | −0.8 | already above target |

### Details worth knowing

- **Timezone correctness.** Opening hours are stored as `HH:mm` wall-clock strings with an
  IANA timezone, never as absolute timestamps, so they stay correct across daylight saving.
- **Overnight shifts.** A window such as `22:00–06:00` is supported; the working-day check
  applies to the day the shift *started*, so a Friday night shift stays open into Saturday.
- **Daily cap.** Counted against the broker's own calendar day, so a Manila broker's counter
  rolls over at Manila midnight regardless of where the server runs.
- **Concurrency.** Assignment takes a row lock on the distribution, so two simultaneous
  submissions cannot both read "9 of 10 sent" and push a broker past its cap.
- **Auditability.** Every routing decision writes a `lead_events` row containing the deficit
  and skip reason for each broker considered.

---

## API reference

All admin routes require the session cookie. Responses are `{ data }`, or
`{ error: { code, message, details? } }` on failure.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | – | Sign in; sets the session cookie |
| `POST` | `/api/auth/logout` | – | Clear the session |
| `GET` | `/api/auth/me` | ✓ | Current admin |
| `GET` | `/api/brokers` | ✓ | List brokers with today's counts |
| `POST` | `/api/brokers` | ✓ | Create a broker |
| `GET` | `/api/brokers/:id` | ✓ | Broker detail |
| `GET` | `/api/brokers/:id/leads` | ✓ | Leads received by a broker |
| `PATCH` | `/api/brokers/:id` | ✓ | Update a broker |
| `DELETE` | `/api/brokers/:id` | ✓ | Soft-delete a broker |
| `GET` | `/api/form` | ✓ | The single form, or `null` |
| `POST` | `/api/form` | ✓ | Create the form (once) |
| `GET` | `/api/distribution` | ✓ | The distribution with its broker line-up |
| `POST` | `/api/distribution` | ✓ | Create the distribution (once) |
| `PUT` | `/api/distribution/brokers` | ✓ | Replace the broker line-up and percentages |
| `GET` | `/api/distribution/leads` | ✓ | Every lead that passed through the distribution |
| `GET` | `/api/leads` | ✓ | Leads, filterable and paginated |
| `GET` | `/api/leads/stats` | ✓ | Dashboard totals |
| `POST` | `/api/leads/:id/assign` | ✓ | Manually assign an unsent lead |
| `GET` | `/api/public/forms/:slug` | – | Public form lookup |
| `POST` | `/api/public/forms/:slug/leads` | – | Submit a lead (captures IP) |
| `GET` | `/health` | – | Liveness probe |

---

## Testing

### Unit tests — the routing engine

```bash
cd backend
npm test          # 26 tests
npm run test:watch
```

Covers the engine directly: timezone and DST boundaries, overnight windows that cross
midnight, invalid schedules, daily-cap enforcement, the deficit formula against the
specification's worked example, tie-breaking, and a 100-lead simulation asserting the split
converges exactly on the configured percentages.

### End-to-end tests — the whole product in a browser

```bash
cd frontend
npx playwright install chromium   # first run only
npm run test:e2e                  # 29 tests
npm run test:e2e:ui               # interactive runner
```

The two suites walk the specification in order — `admin-workflow.spec.ts` covers login,
the singleton rules, the required "Oops, please create a form first." prompt and broker
management; `lead-lifecycle.spec.ts` covers public submission, the 5/3/2 split, email
normalisation, IP capture, duplicate blocking, cap and opening-hours skipping, manual
assignment and the reporting pages.

They run serially against a **live application and a database containing only the seeded
admin account**, because they assert rules like "a second form cannot be created". Reset
first:

```bash
cd backend && npm run db:reset
```

Point them at any deployment:

```bash
E2E_BASE_URL=http://YOUR_SERVER_IP:8228 \
E2E_ADMIN_PASSWORD=your_admin_password \
npm run test:e2e
```

---

## Deployment

Deployed with PM2 as two processes: the Next.js app on the **public** port and the Express
API bound to **loopback only**, so the API is unreachable from outside the host.

### 1. Clone and install

```bash
git clone https://github.com/ryanvincecastillo/lead-distribution-platform.git
cd lead-distribution-platform
cd backend && npm ci && cd ..
cd frontend && npm ci && cd ..
```

> **npm 11.19 and later** block package install scripts by default and print
> `npm warn install-scripts`. That means Prisma's `postinstall` does not run, so the client
> is not generated automatically. The next step runs `prisma generate` explicitly, which
> covers it — no script approval is required.

### 2. Configure

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

`backend/.env`:

```
NODE_ENV=production
PORT=8229
HOST=127.0.0.1
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@127.0.0.1:3306/DB_NAME"
JWT_SECRET=<a long random string, 32+ characters>
CORS_ORIGIN=http://YOUR_SERVER_IP:8228
COOKIE_SECURE=false
ADMIN_EMAIL=<admin email>
ADMIN_PASSWORD=<a strong password>
```

Generate a secret with `openssl rand -base64 48`.

`frontend/.env.local`:

```
BACKEND_INTERNAL_URL=http://127.0.0.1:8229
```

### 3. Set up the database

```bash
cd backend
npx prisma generate
npm run db:deploy    # applies migrations
npm run db:seed      # creates the admin account
```

### 4. Build

```bash
cd backend  && npm run build && cd ..
cd frontend && npm run build && cd ..
```

### 5. Start with PM2

```bash
npm install -g pm2        # or: npx pm2
pm2 start ecosystem.config.js
pm2 save                  # restore this process list on reboot
pm2 status
```

The app is then reachable at **http://YOUR_SERVER_IP:8228**.

---

## Operations: restart, logs, troubleshooting

```bash
pm2 status                     # process list and health
pm2 restart ecosystem.config.js  # restart everything
pm2 restart ldp-api            # restart just the API
pm2 restart ldp-web            # restart just the web app
pm2 stop all
pm2 delete all                 # remove from PM2
```

### Logs

```bash
pm2 logs                  # both processes, live
pm2 logs ldp-api          # API only
pm2 logs ldp-web --lines 200
pm2 flush                 # clear stored logs
```

Log files are written under `logs/` in the project root.

### Deploying an update

```bash
git pull
cd backend  && npm ci && npx prisma generate && npm run db:deploy && npm run build && cd ..
cd frontend && npm ci && npm run build && cd ..
pm2 restart ecosystem.config.js
```

### Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `502` from the web app | API process is down — `pm2 logs ldp-api` |
| API exits immediately on boot | Invalid `.env`; the startup log names the offending variable |
| `P1001: Can't reach database server` | Wrong `DATABASE_URL`, or MySQL is not running |
| Login succeeds then immediately bounces | `COOKIE_SECURE=true` while serving over plain HTTP |
| Every lead shows the same IP | `TRUST_PROXY` does not match the real number of proxy hops |
| Leads all land `unsent` | No broker is open right now, all are capped, or none are in the distribution |

---

## Security notes

- Passwords hashed with bcrypt (cost 12); plaintext is never stored or logged.
- Sessions are `httpOnly`, `sameSite=lax` JWT cookies — unreadable from JavaScript.
- Login answers identically for an unknown email and a wrong password, and does the same
  bcrypt work in both cases, so the endpoint cannot be used to enumerate accounts.
- Rate limits on the login endpoint (failed attempts only) and on the public form.
- Every input is validated server-side with zod; the browser is never trusted.
- `helmet` security headers, a 100 kB JSON body cap, and compression.
- Logs redact cookies, authorization headers and anything password-shaped.
- The backend binds to loopback in production; only the Next.js port is public.
- No secret reaches the browser: the API address is a server-only variable.
- `.env` files are git-ignored; `.env.example` contains placeholders only.

---

## Test notes

Verified end-to-end against the specification's test cases:

| # | Case | Result |
| --- | --- | --- |
| 1 | Login works | ✅ |
| 2 | Create multiple brokers | ✅ |
| 3 | Create one lead form | ✅ |
| 4 | A second form cannot be created | ✅ blocked in UI, API and database |
| 5 | Distribution before a form shows **Oops, please create a form first.** | ✅ |
| 6 | Create one distribution after the form exists | ✅ auto-linked to the form |
| 7 | A second distribution cannot be created | ✅ |
| 8 | Add brokers to the distribution with percentages | ✅ |
| 9 | Submit a lead from `/{formName}` | ✅ |
| 10 | Lead IP address is saved | ✅ real visitor IP, forwarded through the proxy |
| 11 | Lead is assigned to an eligible broker | ✅ |
| 12 | Lead appears in the broker's leads view with its IP | ✅ |
| 13 | Distribution detail shows sent, duplicate and unsent leads | ✅ with the reason for each |
| 14 | Resubmitting the same email becomes a duplicate | ✅ never routed |
| 15 | A broker at its daily cap is skipped | ✅ |
| 16 | A closed broker is skipped | ✅ evaluated in the broker's timezone |
| 17 | Manually assign an unsent lead | ✅ |
| 18 | The deployed app works after a restart | ✅ `pm2 save` restores both processes |

Automated coverage: unit tests over the routing engine, plus a browser suite driving the
real UI through the full admin workflow and lead lifecycle.

### Reviewer credentials

The live URL and admin credentials are supplied with the submission. They are intentionally
absent from this repository.
