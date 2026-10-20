# Trix: implementation plan

**Mustapha Fadhlullah — independent security researcher** · 2026 Unusual Whales Hackathon ("Hackathon1") · plan written 2026-10-20

A stock jumps on news. Within minutes Trix shows the options trades that were placed before the news broke,
how unusual they were for that ticker, and what they have made since. The result arrives as a Telegram card and
opens a web case file.

> Tagline: Someone was early. Here's the receipt.

Read `CLAUDE.md` first (house rules, design rules, verification rules). This file is the build order. Write each
phase's result into `DECISIONS.md` as you go. Tag every claim about the UW API VERIFIED (openapi line, doc URL
or live response) or UNVERIFIED. Never invent an endpoint or parameter. The spec is
`https://api.unusualwhales.com/api/openapi`; the anti-hallucination skill is `https://unusualwhales.com/skill.md`.

---

## 0. Facts that fix the build

| Fact | Value | Source |
|---|---|---|
| Brief | "Build anything on the Unusual Whales API. You've got 1 month." "dashboard, alert, backtest, bot, whatever." | unusualwhales.com/information/2026-unusual-whales-hackathon |
| Prizes | 1st 1,000 USDC; 2nd 600 UW API credits; 3rd 400. "Choice to have your product featured" | same |
| Who can enter | "Anyone with UW API access, including API trial keys" | same |
| Submit | GitHub repo + a thread in UW Discord `vibe-and-api-projects` titled `Hackathon1: Trix`. Required: demo video or images, what it does (1-3 sentences), UW endpoints used, MCP/agent used, run-locally steps, `.env.example`, no keys | same |
| Rubric, judges | Not published. Assume UW staff, judging from the Discord thread and its video | same |
| Deadline | "1 month" from an unstated posting date. **UNVERIFIED**: read the pinned post in `vibe-and-api-projects` | same |
| API auth | `Authorization: Bearer <token>` and `UW-CLIENT-API-ID: 100001` on every request. All endpoints are GET. No `/api/v1/`; no `api_key=` query param | unusualwhales.com/skill.md |
| API plan | Basic $150/mo, 7-day free trial (card required), "2 Year Historical Lookback", "Unlimited requests per day", MCP, websocket of option trades | unusualwhales.com/public-api |
| Rate limits | Exist; see `https://unusualwhales.com/skills/uw-api-usage-monitor-skill.md` before any backfill | skill.md |
| Sponsor overlap | UW ships a free Telegram bot (ex-OpenBB: chart, darkpool, flow day, op gamma, news, ta ...) and a premium Discord flow bot. **Trix must not duplicate any of those commands.** | unusualwhales.com/openbb-announcement |

### Endpoints Trix uses (all VERIFIED present in openapi.yaml on 2026-10-20; behaviour UNVERIFIED until P0)

| Job | Endpoint | Params that matter |
|---|---|---|
| Look-back (load-bearing) | `/api/option-trades/flow-alerts` | `ticker_symbol`, `newer_than`, `older_than`, `is_call`, `is_put`, `is_ask_side`, `is_bid_side`, `all_opening`, `is_otm`, `min_premium`, `max_dte`, `vol_greater_oi`, `limit` |
| Ticker alerts (recent only?) | `/api/stock/{ticker}/flow-alerts` | `limit`, `is_ask_side`, `is_bid_side` (no time window) |
| Prints of one contract on a day | `/api/option-contract/{id}/flow` | `date`, `side`, `min_premium`, `limit` |
| Contract history (marks, OI) | `/api/option-contract/{id}/historic` | `limit` |
| Positions opened? | `/api/stock/{ticker}/oi-change` | `date`, `limit`, `order` |
| Price around the event | `/api/stock/{ticker}/ohlc/{candle_size}` | `date`, `end_date`, `timeframe`, `limit` |
| Anchor: headlines | `/api/news/headlines` | `ticker`, `major_only`, `sources`, `search_term`, `limit`, `page` |
| Anchor: presidential posts | `/api/potus/posts` | `limit`, `page`, `search_term` |
| Anchor: big movers | `/api/market/movers` | (read in P0) |
| Anchor (stretch): FDA dates | `/api/market/fda-calendar` | (read in P0) |
| Anchor (stretch): late Congress reports | `/api/congress/late-reports` | `limit`, `date`, `ticker` |
| Baseline sanity | `/api/stock/{ticker}/unusualness` | `ticker` |
| Caption (optional) | UW MCP `https://api.unusualwhales.com/api/mcp` | an LLM writes 2 sentences from scored facts, never a number |

## 1. Inputs he provides (blocking)

1. **The UW API key.** He starts the 7-day trial on build day 1 (not before) and puts the key in the session
   environment as `UW_API_KEY`. The trial is 7 days, so P0-P2 must cache every response (see the cache below).
2. **A Telegram bot token** from @BotFather (`TELEGRAM_BOT_TOKEN`), a public channel for pushes
   (`TELEGRAM_CHANNEL_ID`, bot added as admin), and his own chat id for tests.
3. **Hosting accounts** chosen in P0 (default: Vercel for the web, Railway or Fly for the worker, Neon Postgres).
4. **The deadline** from the Discord pinned post, and whether posting in `vibe-and-api-projects` needs a role.
5. **Cloud session network:** the environment must reach `api.unusualwhales.com` and `api.telegram.org`. If the
   session's network policy blocks them, he changes the environment's network access. UNVERIFIED until P0.

## 2. Architecture

```
anchor pollers (worker, every 60 s in market hours)
  news/headlines(major_only) · potus/posts · market/movers · ohlc gap check
        |  new event E = {ticker, T, kind, headline, direction}
        v
look-back  flow-alerts(ticker_symbol, newer_than=T-2 trading days, older_than=T)
           + option-contract/{id}/flow(date) + oi-change(date)
        v
core.score(E, prints, baseline)   PURE, deterministic, unit-tested
        v
core.pnl(prints, contract historic marks)
        v
Case row (Postgres) -> Telegram push (image card) -> web case file /case/[id]
```

- Monorepo, pnpm workspaces: `packages/core` (pure TypeScript: types, scoring, P&L, no I/O), `packages/uw`
  (typed client + response cache), `apps/worker` (pollers, case builder, Telegram bot), `apps/web` (Next.js
  case files and stats page).
- **Response cache:** every UW response is stored as `{endpoint, params_hash, fetched_at, body}` in Postgres
  table `uw_raw`. Tests and the demo replay from it. This survives the end of the trial. Recorded fixtures for
  tests live in `packages/core/fixtures/` (UW market data only, never keys or headers).
- Telegram library: grammY. Long polling in the worker (no webhook needed). Card image: Satori + resvg to PNG.
- The web reads Postgres only; it never calls UW from the browser and never ships the key.

### The Footprint score (the core; write it test-first)

For event E on ticker X at time T, with direction d = sign of the price move (+1 up, -1 down):

1. Window W = the 2 trading days before T (exclusive of T).
2. For each flow alert in W, its signed premium s = premium × side, where ask-side call = +1, ask-side put = -1,
   bid-side call = -1, bid-side put = +1, mid/unknown = 0.
3. Aligned weight a = 1 if sign(s) = d, else 0. Extra weights (constants in one file, tuned only on the
   training half of the event set): opening (volume > OI or `all_opening`) ×1.5, OTM ×1.3, DTE ≤ 14 ×1.3.
4. F(W) = sum over alerts of |s| × a × weights.
5. Baseline: compute F for the same ticker over its previous 60 two-day windows that contain no anchor event.
6. **Footprint = percentile of F(W) in the baseline** (within-subject; never a pooled threshold across tickers).
   Also store the z-score and the top 6 contributing prints.

P&L since: for each top print, (latest mark − fill price) × size × 100, from `option-contract/{id}/historic`.
Shown as "+$X since" with the timestamp of the mark. If a mark is missing, show "no mark", never an estimate.

### The base-rate number (the hook; P6)

Take the N largest news-anchored moves (|move| ≥ 5% within 1 day of a major headline) over the last 90 days on
optionable tickers with enough flow. Report the share with Footprint ≥ 90th percentile. Under the null (no one
early) that share is 10% by construction, because the baseline defines the percentile. Report the share, N, the
date range and the query in `/stats` and the README. If it is close to 10%, say so plainly.

## 3. Phases

Each phase ends with an exit check. Do not start a phase until the previous exit check passes.

### P0: Environment and the access spike (nothing else starts until it passes)
- Confirm network reach: `curl -s -o /dev/null -w "%{http_code}" https://api.unusualwhales.com/api/market/market-tide`
  with both headers (expect 200), and Telegram `getMe`.
- One live call per row of the endpoint table. For each, write in `SPIKE.md`: the exact request (key redacted),
  status, response shape (field names), and one sample row. Answer these, each with a live response:
  1. Does `/api/option-trades/flow-alerts?ticker_symbol=UNH&newer_than=<T-30d>&older_than=<T-28d>` return alerts
     from that past window? How far back does it go (try 7, 30, 90, 365 days)? What is the max `limit`, and is
     there paging?
  2. Fields on a flow alert: is there a contract id (option symbol), side (ask/bid), premium, size, volume, OI,
     DTE, OTM, created_at? Map them to the score inputs.
  3. Does `/api/option-contract/{id}/historic` give a daily mark for an expired contract?
  4. Do `news/headlines` rows carry tickers and a timestamp precise to the minute?
  5. Response time and rate-limit headers.
- Decide hosting and write it into `DECISIONS.md`.
- **Exit:** `SPIKE.md` answers 1-5 with live responses, and the branch below is chosen.
- **Decisive branch:** if (1) is YES for 30+ days, build as written. If NO, anchor only on events younger than the
  available window, and rebuild the past via `option-contract/{id}/flow?date=` per day + `oi-change?date=`. Record
  the branch. If neither gives past prints at all, stop and tell him (the runner-up plan is in his private notes).

### P1: Day-one files and the scoring core (test first)
- `README.md` skeleton (see `.claude/skills/hackathon-strategy/references/repo-anatomy-and-idea-engine.md`),
  `CLAIMS.md` (every number we show, with its query), `DECISIONS.md`, `.env.example`.
- pnpm workspace, TypeScript strict, Vitest.
- `packages/core`: `types.ts`, `score.ts`, `pnl.ts`, `baseline.ts`. RED tests first, from fixtures recorded in P0.
  Cases: an aligned ask-side call sweep raises F; a bid-side call (sold) lowers alignment; a ticker with heavy
  normal flow gets a lower percentile for the same premium than a quiet ticker; a window with zero alerts scores
  0th percentile, not NaN; a missing mark gives "no mark".
- **Exit:** `pnpm test` green; a planted wrong fixture (side flipped) makes a test fail.

### P2: The thin path, one real event end to end
- Pick an event UW already wrote up so the answer is known: "Flow Review $UNH, January 2026: Did someone know
  about Medicare News?" (unusualwhales.com/information/, slug starts `flow-review-unh-january-2026`). Fallbacks:
  $GEV April 2026, $XOM/$CVX April 2026. Read the review for the date and the trades it names.
- `pnpm trix case UNH <ISO time>` (CLI in `apps/worker`) fetches, caches, scores and prints the top prints,
  Footprint, P&L since.
- **Exit:** the CLI finds the trades the UW review names (or the closest flow alerts), Footprint is high, and a
  second run replays fully from `uw_raw` with the network off.

### P3: Anchors and the worker
- Pollers for headlines (`major_only=true`), POTUS posts, movers, and a price-gap check on the movers. Market
  hours guard (US/Eastern). Dedupe by (ticker, kind, headline hash). Map POTUS posts to tickers only when the post
  names a company, ticker or sector ETF from a fixed list; otherwise store the post with no case.
- Case builder: event → look-back → score → P&L → `cases` row. Re-score P&L every 15 min for 3 trading days.
- **Exit:** over one live market session, the worker opens cases for real events with no duplicates, and logs
  every UW call with its status.

### P4: The Telegram bot
- Push to the channel when Footprint ≥ 90th percentile (threshold in config). Message = PNG card + 2 lines + link
  to the case file. Card shows: ticker, move, the anchor in a few words, Footprint percentile, top prints, "+$X
  since".
- Commands: `/trix TICKER` (reconstruct the latest big move on that ticker; the judge's own input path),
  `/case ID`, `/watch TICKER` (DM when that ticker gets a case), `/stats` (the base-rate number), `/about`.
  None of these duplicate the UW Telegram bot's command list.
- Every reply handles: unknown ticker, no recent move, no flow, UW error, rate limit. Each with a plain sentence.
- **Exit:** on his phone: a channel push for a real event, and `/trix` on three tickers he picks, including one
  with no recent move. Screenshots in `screenshots/`.

### P5: The web case file and the signature moment (`ui-studio`, all phases)
- Routes: `/` (latest cases, the base-rate number, how it works in 3 lines), `/case/[id]`, `/stats`.
- **The signature moment** (one, choreographed with Motion): the price line draws; the headline lands as a
  vertical rule at T; the view scrubs back across the window; each pre-news print lights up in time order as a dot
  sized by premium and coloured by side; the P&L counter rolls up. Under 2.5 s, interruptible, and
  `prefers-reduced-motion` shows the end state.
- Charts follow the `dataviz` skill (if the session has it) or the `ui-studio` dataviz guidance. SIGNAL DECK
  palette (this is his product): flat deep blue-black surfaces, one mint-teal accent for the CTA, 2-3 measured
  OKLCH support hues for call/put/headline. No glass, no violet, no "terminal/CRT" look.
- Imagery: the product's own output (the case chart, the Telegram card), never stock.
- **Exit:** `ui-studio` QUALITY BAR and `scripts/ui-score.mjs` (its planted controls must fire) on the rendered
  pages; screenshots at 320, 375, 414, 768, 1024, 1280, 1440, 1920.

### P6: The base-rate study
- Script `apps/worker/src/study.ts`: builds the event set from cached headlines and OHLC, scores each, writes
  `study/results.csv` and the summary into Postgres for `/stats`. Split the set in two by date: tune the weights
  on the first half only, report on the second half.
- **Exit:** the number, N, date range and the exact query are in `CLAIMS.md` and on `/stats`, with the null of 10%
  stated beside it.

### P7: Stretch, in this order
1. FDA calendar anchor (biotech binary events).
2. Late Congress report anchor: what the stock did during the hidden window, plus any flow before the trade date.
3. Forward watch: today's flow on a ticker compared with its own pre-event footprints; a DM, worded as
   "resembles", never as a prediction.

### P8: Verification and hardening
- `product-hardening` demo-seam audit: nothing in the judged path is mocked or hardcoded.
- Unscripted path first: `/trix` with a judge's ticker, a bad ticker, a ticker with no options.
- `attacker`, one pass on the finished product. Answer or accept its top three.
- Secrets grep before every push: no key in code, fixtures, screenshots or logs.
- **Exit:** the judge's path run live from a clean browser and a fresh Telegram account.

### P9: Packaging (he presses submit)
- README top third: the GIF of the signature moment, one line, the base-rate number, the live links (bot and
  web), how to run it locally, endpoints used, MCP used (yes/no and how).
- Demo video with `demo-video` from the deployed link: first 4 seconds = the Telegram card arriving.
- Draft the Discord thread in the exact template from the hackathon page into `SUBMISSION.md`, run `humanizer`
  on it. **He posts it.**

## 4. Milestones (no calendar)
Thin path (P2) → feature-complete (P5) → number (P6) → demo freeze (P8) → packaging (P9).

## 5. Scope
- MVP: P0-P6 with news, POTUS and gap anchors.
- Stretch: P7.
- NOT BUILDING: trade execution or "copy this trade"; a general live flow-alert feed (UW has it); any command
  the UW Telegram bot already has; user accounts on the web; payments.

## 6. Risks and fallbacks
1. Flow-alert history is shallow → P0 branch (per-contract flow by date, younger events only).
2. Trial ends mid-build → everything replays from `uw_raw`; he decides on paying for a month.
3. Wording implies a crime → copy says "early" and "unusually timed", never "insider" or a person's name.
4. POTUS post to ticker mapping is noisy → only explicit company, ticker or sector ETF mentions; otherwise no case.
5. Too few qualifying events in the demo window → `/trix TICKER` on demand still works; the case archive shows
   past events from the study.

## 7. Never
- Never invent a UW endpoint, field or parameter; check `openapi.yaml` and the live response.
- Never show a number the code did not compute from a stored UW response.
- Never put the UW key or bot token in the repo, a fixture, a screenshot or the client bundle.
- Never post to Discord, X or any Telegram channel other than our own without his go.
