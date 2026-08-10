# PokéDeals — Vinted Pokémon card deal finder

Finds potentially undervalued Pokémon card listings, matches them against
PriceCharting market values, and estimates resale profit after fees.

## Before you run this: the Vinted constraint

**There is no approved API for searching or monitoring other people's
Vinted listings.** Vinted's only official developer surface —
**Vinted Pro Integrations** — is allowlisted to Pro business accounts and
built for sellers syncing *their own* inventory, not for searching the
marketplace. Automating access to Vinted's internal endpoints would mean
bypassing anti-bot and rate-limit protections, which this project
deliberately does not do.

So listings get in one of two ways, both on the **`/connect`** page:

1. **Capture bookmarklet** — drag a button to your bookmarks bar. While
   you're browsing Vinted normally and viewing a listing, click it. It
   reads the title/price/photo out of the page you're already looking at
   (a single manual action in your own logged-in session) and POSTs it to
   `/api/capture`.
2. **Manual/bulk import** — paste a JSON array of listings you've gathered
   by hand into `/api/import`.

Every listing, however it arrives, goes through the same identification →
pricing → confidence pipeline. If you later get access to Vinted Pro
Integrations or another approved feed, implement
`VintedListingSource` in `lib/adapters/vinted/types.ts` and swap it in —
nothing else in the app needs to change.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in what you have; all optional (see below)
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard`. It'll be empty
at first; click **"Load demo data"** (or `POST /api/seed-demo`) to see the
UI populated with sample listings, or go to `/connect` to capture a real
one.

### Environment variables (all optional, app runs without them)

| Variable | What it enables | Without it |
|---|---|---|
| `PRICECHARTING_API_TOKEN` | Real market prices from PriceCharting's official API (requires a purchased price-guide subscription) | Listings are marked "Needs Review" — no price, no profit alert |
| `ANTHROPIC_API_KEY` | Photo-based card identification (Claude reads the listing image) | Identification relies on title/description text only, lowering the confidence ceiling |
| `POKEMONTCG_API_KEY` | Higher rate limit on pokemontcg.io card-database lookups | Free tier still works at low volume |

Discord/Telegram notification targets are configured in-app on
`/settings`, not via env vars, since they're per-deployment preferences.

## How a listing becomes a deal

```
Capture (bookmarklet or import)
  -> identify card (text heuristics + optional photo analysis)
  -> verify against pokemontcg.io
  -> confidence check (below threshold -> "Needs Review", pipeline stops)
  -> match PriceCharting product
  -> calculate profit (configurable fees)
  -> tier + threshold check
  -> create Deal (+ notify) if it qualifies
```

Nothing here reports a "confirmed" deal on a single weak signal —
confidence is built additively from independent evidence (name match,
image analysis, database verification, exact card-number match), and a
missing PriceCharting match or low-confidence identification always routes
to "Needs Review" instead of a false-positive profit alert.

## Architecture

- **`lib/types.ts`** — shared domain types.
- **`lib/adapters/vinted/`** — swappable listing source. `types.ts` is the
  interface; `mockAdapter.ts` is demo-only fixture data (`source: "mock"`).
- **`lib/adapters/cardIdentification/`** — `textHeuristics.ts` (regex/keyword
  parsing), `visionIdentifier.ts` (optional Claude vision call),
  `pokemonTcgApi.ts` (database verification), `identify.ts` (orchestrator +
  confidence scoring).
- **`lib/adapters/pricecharting/`** — PriceCharting API client + product
  match scoring (name/set/number/language/holo, not name alone).
- **`lib/profit.ts`** — pure profit calculation, fully driven by
  `FeeConfig` (nothing hard-coded).
- **`lib/pipeline.ts`** — orchestrates the flow above; skips reprocessing
  unchanged listings via content hashing.
- **`lib/repo/`** — SQLite (via `better-sqlite3`) data access for
  listings, deals, notifications.
- **`lib/notify.ts`** — fans a qualifying deal out to browser
  notifications (via DB row + client polling) and optional Discord/Telegram
  webhooks, behind one interface so email can be added later.
- **`app/`** — Next.js App Router pages (`/dashboard`, `/deals`,
  `/deal/[id]`, `/history`, `/settings`, `/connect`) and API routes.

## If `npm install` fails on `better-sqlite3`

It ships prebuilt binaries for common platforms, which is the normal path.
If your platform doesn't have a prebuilt binary available, npm falls back
to compiling it from source via `node-gyp`, which needs Python 3 and a C++
toolchain (`build-essential` on Debian/Ubuntu, Xcode Command Line Tools on
macOS) available on your machine.

## Data & security notes

- SQLite database lives at `data/pokedeals.db` (gitignored). Back it up if
  you care about deal history.
- API keys are read from environment variables on the server only; nothing
  is exposed to the browser.
- This is built for local/self-hosted single-user use. If you deploy it
  somewhere reachable by others, add authentication in front of
  `/api/capture` and `/api/import` before doing so.
- All money is stored in minor units (pence) as integers to avoid float
  rounding errors.

## What "Estimated Profit" means

It's exactly that — estimated. It assumes the card sells at PriceCharting's
tracked value for the identified condition, and the fee breakdown behind
every number is shown on `/deal/[id]` along with the identification
confidence and the exact PriceCharting product that was matched, so you
can verify before you buy rather than trust a bare number.
