# Training Tracker — handoff package

A single-user training tracker. Next.js on Railway, installed to an iPhone home screen as a PWA, with Telegram notifications.

## What's in here

| File | What it is | Who reads it |
|---|---|---|
| `docs/01-build-spec.md` | The build spec. Stack, data model, screens, Telegram, Railway config, seed data, seven build phases, acceptance criteria. | Claude Code — this is the source of truth. |
| `docs/02-ui-reference.html` | Four screens at fidelity, plus a design token block. Open it in a browser. | Claude Code, before writing any UI. |
| `docs/03-training-plan.md` | The actual 12-week training program the app tracks. Already encoded as seed data in §11 of the spec. | Reference only — the human uses this at the gym. |

## Starting Claude Code

Drop this folder into the repo root and open with:

```
Read docs/01-build-spec.md in full, then open docs/02-ui-reference.html
and look at it before writing any UI code.

Build Phase 1 only, then stop and tell me what to deploy.
Do not start Phase 2 until I've confirmed Phase 1 works on my phone.
```

The phases exist because this app has three genuinely fiddly parts — the offline queue, the drop-set logging UX, and the DST-aware cron — and each one is easier to get right in isolation. Resist letting it build the whole thing in one pass.

## Order of operations

1. **Phase 1 first, and deploy it.** Getting Railway, Postgres, migrations and the PWA install working end-to-end is most of the risk. An empty five-tab shell that installs to the home screen is a real milestone.
2. **Seed before anything else.** §11 has the full six-day program. Every downstream screen depends on that data existing.
3. **Set the Telegram webhook manually** once the Railway domain is live. It can't be done at build time.
4. **Test offline properly** — airplane mode, log a full session, reconnect. Do this on the actual phone, not a desktop devtools throttle.

## Things worth not changing

- **Steppers, never a keyboard**, for weight and reps.
- **Telegram, not Web Push.** iOS Web Push only works from an installed PWA and is unreliable. Telegram also gives inbound commands.
- **Hourly cron with an internal time check**, not fixed UTC crontabs. Sydney moves to AEDT on 4 October 2026, mid-program.
- **Client-generated UUIDs** on set logs, so offline retries can't duplicate.
- **One accent colour.** Jade means active or complete. Amber means a personal record. Nothing else gets colour.

## Environment variables

```
DATABASE_URL              from the Railway Postgres plugin
APP_PIN_HASH              bcrypt hash of the PIN
SESSION_SECRET            32+ random bytes
TELEGRAM_BOT_TOKEN        from BotFather
TELEGRAM_WEBHOOK_SECRET   any random string
CRON_SECRET               any random string
NEXT_PUBLIC_APP_URL       the Railway domain
TZ=Australia/Sydney
```
