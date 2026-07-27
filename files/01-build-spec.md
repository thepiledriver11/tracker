# Training Tracker — Build Spec

**Hand this file to Claude Code as the source of truth.** Work through the phases in order; don't build everything at once.

---

## 1. What this is

A single-user training tracker, installed to an iPhone home screen as a PWA, deployed on Railway. It tracks a superset/drop-set gym program, bodyweight and measurements, walks, and manually-entered calories, and pushes reminders and summaries via a Telegram bot.

### Assumptions (change these if wrong)

| Assumption | Value |
|---|---|
| Users | One. No multi-tenancy, no sign-up flow. |
| Auth | Single PIN, stored as a hash in env. Signed HTTP-only cookie, 90-day expiry. That's it. |
| Units | Kilograms, centimetres. No unit switching. |
| Timezone | `Australia/Sydney`. Note DST: AEST (UTC+10) until 4 Oct 2026, AEDT (UTC+11) after. |
| Currency of truth | The Postgres database. No local-only state that can be lost. |
| Push notifications | Telegram only. Do **not** build Web Push — iOS support is fragile and Telegram is more reliable and testable. |

### The one hard constraint

**Logging must work offline.** Gym basements have no signal. The active-session screen writes to IndexedDB first and syncs to the server when connectivity returns. If a set log is ever lost because the network dropped, the app has failed at its primary job.

---

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | One Railway service serves UI, API routes, Telegram webhook and cron endpoints. |
| DB | Postgres (Railway plugin) | — |
| ORM | Prisma | Migrations and seeding are the bulk of Phase 1. |
| Charts | Recharts | Renders acceptably at 390px width. |
| Offline | `idb-keyval` + a sync queue | See §7. |
| PWA | `next-pwa` or a hand-rolled service worker | Hand-rolled is fine and less brittle; the caching needs are simple. |
| Styling | Tailwind | — |
| Validation | Zod on every API boundary | — |

**Do not add:** a state management library, a component library, an auth provider, or a mobile framework. This is a single-user app; the complexity budget goes into the logging UX and the offline queue.

---

## 3. Design direction

> **The visual reference is `02-ui-reference.html` in this folder.** Open it in a browser before writing any UI code. It contains four screens at fidelity plus a token block at the bottom. Where this section and the reference disagree, the reference wins.

Soft glass on a pale sky wash, one jade accent, big thin numerals with superscript units. The numbers are the content; everything else is quiet scaffolding around them. The app gets used one-handed, mid-set, with a shaky grip.

### Tokens

```
--sky        #CBDEF0 → #E9F2FA   page wash (fixed-attachment gradient)
--card       rgba(255,255,255,.92) → rgba(255,255,255,.50)   glass, 168deg
--ink        #223449   primary text
--ink-2      #4A6480   secondary text
--muted      #93A9BF   labels, units, axis
--jade       #43DFA2 → #17BA84   the single accent: active or complete
--amber      #FFB067   personal records ONLY — never decoration
```

Radii: `34px` cards, `22px` panels, `15px` rows.
Lift: `0 24px 44px -22px rgba(28,62,96,.42), 0 4px 10px -4px rgba(28,62,96,.14)`
Inner light: `inset 0 1px 0 rgba(255,255,255,.95)` on every raised surface — this is what makes it read as glass rather than flat.

**No borders anywhere.** Depth comes from shadow only.

### Type

- **Outfit 200** — all large figures. The thinness is the point; never exceed 300 on a numeral.
- **Outfit 600** — screen titles, exercise names.
- **Manrope 500/700** — labels, body copy, table data.
- `font-variant-numeric: tabular-nums` globally. Weight columns must align.
- Units are always superscript: 9px, uppercase, `.1em` tracking, `--muted`.

### Signature element: the descending ladder

The program is built on dropping weight each round, so each superset pair renders as **three glass rungs stepping down and to the right** — widths at 100% / 90% / 80%, so the taper itself encodes the drop. Each rung shows its target load and rep range. Completed rungs fill with the jade gradient and their tick turns solid; the active rung carries a 1.5px jade ring. One glance tells you where you are in the pair.

This is the thing the app is remembered for. Keep everything around it disciplined.

### Gym mode

This palette is deliberately light, and a near-white screen at full brightness in a dim gym is glary. Build **one** variant: on the active-session screen only, swap the sky wash for a deep slate (`#1B2836 → #243646`) and the glass for `rgba(255,255,255,.07) → rgba(255,255,255,.03)`. Ink becomes `#E8EFF6`, muted becomes `#7D93A9`. Jade and amber are unchanged. Toggle in Settings, default on. Every other screen stays light.

### Touch rules

- Minimum 56px tap targets on the logging screen.
- **Never open the numeric keyboard for weight or reps.** Circular ± steppers only: weight in 2.5kg increments (long-press for 1.25kg), reps in 1s. Typing a number with wet hands mid-set is the single worst thing this app could do.
- Rest timer is a persistent bar at the bottom of the session screen once a round is logged.
- Copy is active and consistent: the button says "Log set", the toast says "Set logged".

## 4. Data model

```prisma
model Exercise {
  id            String   @id @default(cuid())
  name          String   @unique
  muscleGroup   String   // chest, back, quads, hams, delts, biceps, triceps, calves, glutes
  equipment     String   // barbell, dumbbell, machine, cable, kettlebell, bodyweight, band
  isUnilateral  Boolean  @default(false)
  notes         String?
  templateItems TemplateExercise[]
  setLogs       SetLog[]
}

model Program {
  id        String    @id @default(cuid())
  name      String
  startDate DateTime  @db.Date
  endDate   DateTime? @db.Date
  isActive  Boolean   @default(false)
  notes     String?
  weeks     ProgramWeek[]
  templates SessionTemplate[]
}

model ProgramWeek {
  id         String  @id @default(cuid())
  programId  String
  weekNumber Int
  startDate  DateTime @db.Date
  block      String   // foundation | overload | deload
  focus      String?  // the one-line note from the plan
  program    Program  @relation(fields: [programId], references: [id], onDelete: Cascade)
  sessions   Session[]
  @@unique([programId, weekNumber])
}

model SessionTemplate {
  id         String @id @default(cuid())
  programId  String
  name       String   // "Push A"
  intent     String   // heavy | volume
  dayOfWeek  Int      // 1 = Mon .. 7 = Sun
  order      Int
  stepperMin Int      // default stepper target for this session
  program    Program        @relation(fields: [programId], references: [id], onDelete: Cascade)
  blocks     TemplateBlock[]
  sessions   Session[]
}

model TemplateBlock {
  id         String @id @default(cuid())
  templateId String
  label      String  // "A", "B", "C", "D"
  kind       String  // superset | single | activation
  rounds     Int     // usually 3
  order      Int
  template   SessionTemplate    @relation(fields: [templateId], references: [id], onDelete: Cascade)
  exercises  TemplateExercise[]
}

model TemplateExercise {
  id          String @id @default(cuid())
  blockId     String
  exerciseId  String
  slot        Int    // 1 or 2 within a superset pair
  repScheme   Json   // see §5
  notes       String?
  block       TemplateBlock @relation(fields: [blockId], references: [id], onDelete: Cascade)
  exercise    Exercise      @relation(fields: [exerciseId], references: [id])
  setLogs     SetLog[]
}

model Session {
  id            String    @id @default(cuid())
  templateId    String?
  programWeekId String?
  date          DateTime  @db.Date
  startedAt     DateTime?
  completedAt   DateTime?
  bodyweightKg  Decimal?  @db.Decimal(5,2)
  stepperMin    Int?
  sessionRpe    Int?      // 1-10, asked once at the end
  notes         String?
  template      SessionTemplate? @relation(fields: [templateId], references: [id])
  programWeek   ProgramWeek?     @relation(fields: [programWeekId], references: [id])
  setLogs       SetLog[]
  @@index([date])
}

model SetLog {
  id                 String   @id @default(cuid())
  sessionId          String
  templateExerciseId String?  // null for ad-hoc exercises added on the fly
  exerciseId         String
  round              Int      // 1, 2, 3 (the descending rounds)
  dropIndex          Int      @default(0) // 0 = the round itself, 1+ = extra drops within it
  weightKg           Decimal  @db.Decimal(6,2)
  reps               Int
  side               String   @default("both") // both | left | right
  rir                Int?
  toFailure          Boolean  @default(false)
  loggedAt           DateTime @default(now())
  session            Session          @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  exercise           Exercise         @relation(fields: [exerciseId], references: [id])
  templateExercise   TemplateExercise? @relation(fields: [templateExerciseId], references: [id])
  @@index([exerciseId, loggedAt])
}

model Measurement {
  id           String   @id @default(cuid())
  date         DateTime @unique @db.Date
  weightKg     Decimal? @db.Decimal(5,2)
  bodyFatPct   Decimal? @db.Decimal(4,1)
  neckCm       Decimal? @db.Decimal(4,1)
  chestCm      Decimal? @db.Decimal(4,1)
  waistCm      Decimal? @db.Decimal(4,1)
  hipsCm       Decimal? @db.Decimal(4,1)
  armLeftCm    Decimal? @db.Decimal(4,1)
  armRightCm   Decimal? @db.Decimal(4,1)
  thighLeftCm  Decimal? @db.Decimal(4,1)
  thighRightCm Decimal? @db.Decimal(4,1)
  calfCm       Decimal? @db.Decimal(4,1)
  photoUrl     String?
  notes        String?
}

model Walk {
  id         String   @id @default(cuid())
  date       DateTime @db.Date
  minutes    Int
  distanceKm Decimal? @db.Decimal(5,2)
  kind       String   // weekday | long
  notes      String?
  @@index([date])
}

model NutritionEntry {
  id        String   @id @default(cuid())
  date      DateTime @db.Date
  meal      String   // breakfast | lunch | dinner | snack
  label     String
  calories  Int
  proteinG  Int?
  carbsG    Int?
  fatG      Int?
  createdAt DateTime @default(now())
  @@index([date])
}

model NutritionTarget {
  id            String   @id @default(cuid())
  effectiveFrom DateTime @db.Date
  calories      Int
  proteinG      Int
  carbsG        Int?
  fatG          Int?
}

model FoodShortcut {          // saved meals for one-tap re-entry
  id       String @id @default(cuid())
  label    String @unique
  calories Int
  proteinG Int?
  carbsG   Int?
  fatG     Int?
  useCount Int    @default(0)
}

model Settings {
  id              String  @id @default("singleton")
  telegramChatId  String?
  timezone        String  @default("Australia/Sydney")
  morningPingAt   String  @default("06:00")
  eveningNudgeAt  String  @default("20:00")
  weeklyRecapDay  Int     @default(7)
  notifyMorning   Boolean @default(true)
  notifyNudge     Boolean @default(true)
  notifyPr        Boolean @default(true)
  notifyRecap     Boolean @default(true)
}
```

**Derived, not stored:** estimated 1RM (Epley: `weight × (1 + reps / 30)`), PRs, volume, adherence. Compute these in query layer functions in `lib/metrics.ts` so there's one implementation. If any of them get slow, add a materialised view later — not now.

---

## 5. Rep scheme JSON

Stored on `TemplateExercise.repScheme`. Drives the target numbers shown on each ladder rung.

**Heavy day:**
```json
{
  "type": "descending",
  "rounds": [
    { "round": 1, "loadPct": 1.00, "repMin": 8,  "repMax": 10, "rir": 2,    "toFailure": false },
    { "round": 2, "loadPct": 0.85, "repMin": 10, "repMax": 12, "rir": 1,    "toFailure": false },
    { "round": 3, "loadPct": 0.72, "repMin": 12, "repMax": 15, "rir": null, "toFailure": true  }
  ]
}
```

**Volume day:**
```json
{
  "type": "descending",
  "rounds": [
    { "round": 1, "loadPct": 1.00, "repMin": 12, "repMax": 15, "rir": 3, "toFailure": false },
    { "round": 2, "loadPct": 0.90, "repMin": 15, "repMax": 18, "rir": 2, "toFailure": false },
    { "round": 3, "loadPct": 0.81, "repMin": 18, "repMax": 20, "rir": 1, "toFailure": false }
  ]
}
```

`loadPct` multiplies the **Round 1 working weight**, which comes from the last logged session for that exercise. Round the result to the nearest 2.5kg for barbell/dumbbell, nearest available increment for machines (default 2.5kg; allow per-exercise override later).

### Progression rule

This is the core logic — implement it in `lib/progression.ts`:

> On **heavy days only**, if Round 1 hit `repMax` in the two most recent sessions for that exercise, suggest +2.5kg (upper body isolation) or +5kg (compound/lower) on the next Round 1.

Surface this as a suggestion chip on the logging screen — "Last time: 70kg × 10. Try 72.5kg" — never as an automatic change. The user decides.

---

## 6. Screens

Bottom tab bar, five tabs. Everything else is a push from within a tab.

### 6.1 Today (default tab)
- Today's scheduled session as the hero card: name, intent badge (heavy/volume), block count, and a single full-width **Start session** button.
- Below: three compact strips — Walk (logged / not, with quick-add), Calories (consumed vs target, thin progress bar), Bodyweight (today's, or prompt to log).
- If nothing scheduled: rest-day card with the walk target for that block.
- Last session summary underneath: date, name, total volume, any PRs.

### 6.2 Active session (full-screen, no tab bar)
The most important screen. Build it after everything else works, and give it the most attention.

- Header: session name, elapsed time, block progress (e.g. "Block B of C").
- One block on screen at a time. For a superset pair, both exercises visible together — you're alternating between them.
- The **descending ladder**: three rungs per exercise, each showing target load and rep range. Tap a rung to open the logger for that round.
- Round logger: exercise name, big weight stepper, big reps stepper, "to failure" toggle on round 3, **Log set**.
- Reference line always shown: last session's actual numbers for that exercise and round, in `--muted`.
- Unilateral exercises: logger shows L / R toggle and requires both before the rung fills.
- On logging round *n* of the second exercise in a pair, auto-start the rest timer (90s heavy / 60s volume) as a bottom bar with skip and +30s.
- End of session: stepper minutes input, session RPE (1–10), optional note, **Finish session**.
- Persistent "Add exercise" for anything done off-plan.

### 6.3 Program
- Program selector at the top (dropdown of all programs, one active).
- 12-week table: week number, dates, block, focus note. Current week highlighted.
- Tap a week → the six sessions for that week, with completion state.
- Tap a session template → read-only view of blocks, pairs and rep schemes.
- Program editor: create/edit programs, templates, blocks and exercise pairs. Basic forms are fine — this gets used a few times a year.

### 6.4 Progress
- Exercise picker (searchable).
- Per exercise: Round 1 weight over time (line, `--accent`) with estimated 1RM overlaid (dashed). PR markers in `--pr`.
- Below the chart: a `tabular-nums` table of every session for that exercise — date, R1 weight × reps, R2, R3, e1RM.
- Separate **PR board**: best e1RM and best weight per exercise, with the date.

### 6.5 Body
- Tabs within: Measurements | Nutrition.
- **Measurements:** entry form (all fields optional — log what you measured), plus trend charts for bodyweight, waist, and arm/thigh. Bodyweight chart shows a 7-day rolling average, not raw daily values — raw daily weight is noise.
- **Nutrition:** day view with a running total against target, meal-grouped entries, and a quick-add row. `FoodShortcut` chips for one-tap repeat entries. Weekly view: bar chart of daily calories with the target as a reference line, plus average protein.

### 6.6 Dashboard
Reached from Today, or a sixth icon in the header. Charts, all Recharts, all readable at 390px:
- **Adherence heatmap** — 12 weeks × 7 days, cell colour by what was logged (session / walk / both / nothing).
- **Weekly tonnage** — bar chart, stacked by session type.
- **e1RM index** — normalised trend across the six main lifts on one line chart.
- **Bodyweight vs calories** — dual axis, 7-day averages both. This is the lean-gain feedback loop; make it the largest chart.
- **Walk minutes per week** — bar, with the block target as a reference line.

### 6.7 Settings
Telegram linking, notification toggles and times, nutrition targets, program management, data export (JSON download of everything).

---

## 7. Offline behaviour

```
Set logged
  → write to IndexedDB queue with a client-generated UUID
  → optimistically update UI
  → if online: POST /api/sets, mark synced on 200
  → if offline: leave queued; retry on `online` event and on app focus
```

- Server uses the client UUID as the primary key to make retries idempotent.
- Service worker caches the app shell and the active program payload so a session can be started cold with no network.
- Show an unobtrusive "3 sets pending sync" pill in the session header when the queue is non-empty. Never block the UI on it.
- On finishing a session offline, queue the whole completion and sync later.

---

## 8. Telegram

Set up via BotFather; store `TELEGRAM_BOT_TOKEN` in env. Chat ID captured by having the user message the bot once, then reading it from the webhook and saving to `Settings`.

### Outbound (cron-driven)

| When | Message |
|---|---|
| 06:00 daily | Today's session, its blocks, and last time's Round 1 numbers for the first exercise. On rest days, the walk target. |
| 20:00 daily | Only if a scheduled session or walk is unlogged. One line, no guilt-tripping. |
| On session finish | Summary: volume, duration, any PRs hit. Sent from the API route, not cron. |
| Sunday 19:00 | Week recap: sessions completed vs 6, walk minutes vs target, average daily calories and protein, bodyweight change vs last week, biggest lift progression. |

### Inbound commands (webhook at `/api/telegram/webhook`)

```
/today            → today's session + whether it's logged
/weight 82.4      → log bodyweight to today's Measurement
/cals 650 chicken and rice   → add a NutritionEntry for today
/walk 45          → log a 45-minute walk today
/last <exercise>  → last three sessions' numbers for that exercise
/week             → current week's adherence so far
```

Verify inbound requests with the `X-Telegram-Bot-Api-Secret-Token` header against `TELEGRAM_WEBHOOK_SECRET`. Ignore any message whose chat ID doesn't match `Settings.telegramChatId`.

---

## 9. PWA and iOS home screen

- `app/manifest.ts` → `display: "standalone"`, `theme_color: "#E9F2FA"`, `background_color: "#E9F2FA"`, `orientation: "portrait"`.
- Icons at 192, 512, and a 512 maskable. Plus `apple-touch-icon` at 180×180 — **iOS ignores the manifest icons**.
- `<meta name="apple-mobile-web-app-capable" content="yes">` and `apple-mobile-web-app-status-bar-style: default` (the app is light; `black-translucent` would put white status-bar text on a pale header).
- Respect safe-area insets: `env(safe-area-inset-bottom)` on the tab bar, or it sits under the home indicator.
- Disable pull-to-refresh (`overscroll-behavior-y: contain`) — it fires constantly during set logging.
- `user-scalable=no` on the viewport, and `font-size: 16px` minimum on inputs, or iOS zooms on focus.
- Add a one-time "Add to Home Screen" hint that only shows in mobile Safari when not already standalone.

---

## 10. Railway deployment

**Services:**
1. `web` — the Next.js app, built from the repo.
2. `postgres` — Railway Postgres plugin.
3. `cron` — Railway cron schedules hitting the web service's endpoints.

**Cron jobs** (Railway cron runs in **UTC** — these values are for AEST, UTC+10):

| Schedule (UTC) | Endpoint | Sydney time |
|---|---|---|
| `0 20 * * *` | `POST /api/cron/morning` | 06:00 |
| `0 10 * * *` | `POST /api/cron/nudge` | 20:00 |
| `0 9 * * 0` | `POST /api/cron/recap` | 19:00 Sun |

> **DST trap:** Sydney moves to AEDT (UTC+11) on **4 October 2026**. Rather than editing crontabs twice a year, schedule each job *hourly* and have the endpoint check the current Sydney local time (via `Intl.DateTimeFormat` with `timeZone: 'Australia/Sydney'`) against `Settings.morningPingAt` etc., firing only on a match and recording a `lastSentDate` to prevent doubles. Do it this way.

All cron endpoints require an `Authorization: Bearer ${CRON_SECRET}` header.

**Environment variables:**
```
DATABASE_URL              (from the Postgres plugin)
APP_PIN_HASH              (bcrypt hash of the PIN)
SESSION_SECRET            (32+ random bytes, for cookie signing)
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
CRON_SECRET
NEXT_PUBLIC_APP_URL
TZ=Australia/Sydney
```

**Deploy notes:** run `prisma migrate deploy` in the release command, not the build step. Seed via a one-off `railway run npm run seed` after the first deploy. Set the Telegram webhook manually once the domain is live.

---

## 11. Seed data

Seed the six-day program exactly as below. Program name: **"6-Day Hypertrophy — Aug–Oct 2026"**, `startDate: 2026-08-03`, `endDate: 2026-10-25`, `isActive: true`.

### Session templates

| Name | Intent | Day | Stepper target |
|---|---|---|---|
| Push A | heavy | Mon (1) | 8 |
| Pull A | heavy | Tue (2) | 8 |
| Lower 1 | heavy | Wed (3) | 6 |
| Push B | volume | Thu (4) | 8 |
| Pull B | volume | Fri (5) | 8 |
| Lower 2 | heavy | Sat (6) | 6 |

### Blocks

**Push A** — heavy scheme
- A · superset · 3 rounds — Dumbbell press / Machine chest press
- B · superset · 3 rounds — Cable fly / Machine shoulder press
- C · superset · 3 rounds — Dumbbell lateral raise / Cable triceps pushdown
- D · single · 3 rounds — Seated overhead DB extension

**Pull A** — heavy scheme
- A · superset · 3 — Lat pulldown / Cable bar biceps curl (cable between legs)
- B · superset · 3 — Machine row (undergrip) / Cable rope straight-arm pulldown
- C · superset · 3 — Cable crossover (rear delt) / Prone incline bench DB curl

**Lower 1** — heavy scheme
- Activation · activation · 2 — Banded hip abduction (2 × 20, untracked)
- A · superset · 3 — Hamstring curl machine / Bulgarian deadlift (straight leg) *[unilateral]*
- B · superset · 3 — Single-leg Smith squat *[unilateral]* / Leg extension
- C · single · 3 — Calf raise

**Push B** — volume scheme
- A · superset · 3 — Machine chest press / Cable fly
- B · superset · 3 — Machine shoulder press / Dumbbell lateral raise
- C · superset · 2 — Cable triceps pushdown / Seated overhead DB extension

**Pull B** — volume scheme
- A · superset · 3 — Lat pulldown (wide) / Cable rope straight-arm pulldown
- B · superset · 3 — Machine row (undergrip) / Cable crossover (rear delt)
- C · superset · 2 — Cable bar biceps curl / Prone incline bench DB curl

**Lower 2** — heavy scheme
- Activation · activation · 2 — Banded hip abduction
- A · superset · 3 — Kettlebell lunge *[unilateral]* / Romanian deadlift
- B · superset · 3 — Hamstring curl machine / Leg extension
- C · single · 3 — Calf raise

### Program weeks

| Wk | Start | Block | Focus |
|---|---|---|---|
| 1 | 2026-08-03 | foundation | Establish Round 1 loads on heavy days. Go deliberately light on B days. |
| 2 | 2026-08-10 | foundation | First progression pass on heavy days. |
| 3 | 2026-08-17 | foundation | Tighten heavy-day rest to 90 sec. |
| 4 | 2026-08-24 | foundation | Third round back on pair C for both B days. |
| 5 | 2026-08-31 | foundation | Peak — Round 3 to genuine failure, heavy days only. |
| 6 | 2026-09-07 | deload | 4 days only. 2 rounds, ~70% load. |
| 7 | 2026-09-14 | overload | Back to 6 days. Heavy loads +2.5% on week 5. |
| 8 | 2026-09-21 | overload | Double-drop on the final pair, heavy days. |
| 9 | 2026-09-28 | overload | Hold the double-drop. Progress Round 1. |
| 10 | 2026-10-05 | overload | 4th round on pair A for Push A and Pull A. |
| 11 | 2026-10-12 | overload | Hardest week. Keep B days easy. |
| 12 | 2026-10-19 | deload | 4 days, 2 rounds, 70%. Retest against week 1. |

Also seed a `NutritionTarget` effective 2026-08-03 and a `Settings` singleton — leave the actual numbers to be set in the UI.

---

## 12. Build phases

Ship each phase to Railway before starting the next. Don't move on until the previous one works on the actual phone.

**Phase 1 — Foundation**
Next.js + Prisma + Postgres on Railway. Schema, migrations, seed script. PIN auth. Empty five-tab shell. PWA manifest and icons; confirm it installs to the home screen and opens standalone.

**Phase 2 — Logging**
Today screen. Active session screen with the descending ladder, steppers, rest timer, unilateral handling, last-session reference numbers. Finish-session flow. *No offline yet — get the happy path right first.*

**Phase 3 — Offline**
IndexedDB queue, idempotent server writes, service worker shell cache, pending-sync indicator. Test properly: airplane mode, log a full session, come back online.

**Phase 4 — Body and nutrition**
Measurements entry and trends. Nutrition day/week views, food shortcuts.

**Phase 5 — Progress and dashboard**
Per-exercise charts, PR board, all dashboard charts, progression suggestions.

**Phase 6 — Telegram**
Bot setup, webhook, inbound commands, cron endpoints with the hourly-check DST pattern, all four outbound messages.

**Phase 7 — Polish**
Data export. Program editor. Empty states with real direction. Reduced-motion support. Lighthouse pass.

---

## 13. Acceptance criteria

- [ ] Installs to iPhone home screen, opens standalone with no Safari chrome.
- [ ] A full Push A session can be logged in under 4 minutes of screen interaction, one-handed, without the keyboard ever appearing.
- [ ] Airplane mode: full session logs successfully and syncs on reconnect, with no duplicates.
- [ ] Round 1 progression suggestion appears correctly after two sessions at `repMax`.
- [ ] Unilateral exercises require both sides before a rung completes.
- [ ] Telegram morning ping fires at 06:00 Sydney time, both before and after 4 Oct DST change.
- [ ] `/cals 650 lunch` from Telegram appears in the app's nutrition day view.
- [ ] Bodyweight vs calories chart renders legibly at 390px width.
- [ ] Full JSON export downloads and contains every table.
- [ ] Cold start to logging the first set: under 5 seconds on 4G.
- [ ] Screens match `02-ui-reference.html` — ladder taper, superscript units, glass surfaces, no borders.
- [ ] Gym mode darkens the active-session screen only, and nothing else.
