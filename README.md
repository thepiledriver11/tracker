# Training Tracker

A single-user hypertrophy training tracker. Next.js 15 (App Router) on Railway,
installed to an iPhone home screen as a PWA, with Telegram notifications and an
offline-first logging queue.

Built from the spec in [`files/01-build-spec.md`](files/01-build-spec.md); the
UI follows [`files/02-ui-reference.html`](files/02-ui-reference.html).

## Stack

- **Next.js 15** (App Router, TypeScript) — one service serves the UI, API,
  Telegram webhook and cron endpoints.
- **Postgres** (Railway plugin) via **Prisma** — the single source of truth.
- **Recharts** for charts, **Tailwind** for styling.
- **idb-keyval + a sync queue** for offline logging; a hand-rolled service worker
  for the app shell.
- **jose** signed cookie for PIN auth; **bcryptjs** for the PIN hash.

## What's built

All seven phases from the spec:

1. Foundation — schema, migrations, seed, PIN auth, 5-tab PWA shell, icons.
2. Today + active session — the descending ladder, ± steppers (no keyboard),
   rest timer, unilateral L/R, last-session reference numbers, finish flow.
3. Offline — IndexedDB queue with client UUIDs, idempotent server writes,
   service-worker shell cache, "N pending sync" pill.
4. Body & nutrition — measurements + trends, nutrition day/week, food shortcuts.
5. Progress & dashboard — per-exercise charts, PR board, adherence heatmap,
   tonnage, e1RM index, bodyweight-vs-calories, walks, Round-1 progression chips.
6. Telegram — inbound commands + DST-aware hourly cron (morning / nudge / recap)
   + session-finish summary.
7. Polish — JSON export, program view, empty states, reduced-motion, safe-area.

## Local development

```bash
npm install
cp .env.example .env.local          # then fill in the values below
npx prisma migrate deploy           # apply migrations to your DATABASE_URL
npm run seed                        # load the 6-day program (spec §11)
npm run dev
```

Generate a PIN hash for `APP_PIN_HASH`:

```bash
npx tsx scripts/hash-pin.ts 1234
```

The PWA icons are committed under `public/icons`. Regenerate them with
`npm run icons` if you change the artwork in `scripts/generate-icons.ts`.

## Environment variables

| Var | Where from |
|---|---|
| `DATABASE_URL` | Railway Postgres plugin |
| `APP_PIN_HASH` | `npx tsx scripts/hash-pin.ts <pin>` |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `TELEGRAM_BOT_TOKEN` | BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | any random string |
| `CRON_SECRET` | any random string |
| `NEXT_PUBLIC_APP_URL` | the Railway domain |
| `TZ` | `Australia/Sydney` |

## Deploy to Railway

1. **Create the service** from this repo. Add the **Postgres** plugin — it
   provides `DATABASE_URL`.
2. Set all env vars above on the `web` service.
3. Deploy. `railway.json` builds with `npm run build`; the start command runs
   `prisma migrate deploy` then `next start`, so migrations apply on every boot.
4. **Seed once**, after the first deploy. Either run it from the CLI:
   ```bash
   railway run npm run seed
   ```
   …or, with no terminal, set `SEED_ON_START=1` on the web service for a single
   deploy (the container seeds on boot), then **remove the variable** — the seed
   rebuilds the program each run and would wipe manual program edits if left on.
5. **Cron** — add three Railway cron schedules (they run hourly by design; each
   endpoint checks Sydney local time, so the 4 Oct 2026 DST change needs no edit):

   | Schedule (UTC) | Command |
   |---|---|
   | `0 * * * *` | `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" $NEXT_PUBLIC_APP_URL/api/cron/morning` |
   | `0 * * * *` | `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" $NEXT_PUBLIC_APP_URL/api/cron/nudge` |
   | `0 * * * *` | `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" $NEXT_PUBLIC_APP_URL/api/cron/recap` |

   (Or keep the spec's fixed-UTC schedules — the endpoints are safe either way
   because of the internal time check + per-day guard.)

## Telegram setup (after the domain is live)

1. Create a bot with BotFather; put the token in `TELEGRAM_BOT_TOKEN`.
2. Register the webhook (run once):
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -d "url=$NEXT_PUBLIC_APP_URL/api/telegram/webhook" \
     -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```
3. Message your bot `/start` once. The app captures your chat ID and links it —
   confirm under **Settings → Telegram**.

Inbound commands: `/today`, `/weight 82.4`, `/cals 650 chicken and rice`,
`/walk 45`, `/last lat pulldown`, `/week`.

## Testing the hard parts on the phone

- **Install**: open the Railway URL in mobile Safari → Share → Add to Home
  Screen. It should open standalone with no browser chrome.
- **Offline**: start a session, enable airplane mode, log a full session, turn
  the network back on — the pending-sync pill should drain with no duplicates.
- **DST**: the morning ping should fire at 06:00 Sydney both before and after
  4 Oct 2026 with no crontab change.

## Project layout

```
prisma/            schema, migrations, seed (the 6-day program)
scripts/           icon generation, PIN hashing
src/app/           routes: login, (app)/<tabs>, session/[id], api/*
src/components/    ActiveSession, Stepper, RestTimer, charts, TabBar, …
src/lib/           prisma, auth, metrics, progression, rep-scheme,
                   queries, dashboard, body, telegram, cron, time, offline/*
```
