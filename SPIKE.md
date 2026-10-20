# SPIKE.md: P0 access spike

Status: **spec half done, live half blocked on `UW_API_KEY`.** Run `UW_API_KEY=... pnpm spike UNH`
(`apps/worker/src/spike.ts`). It saves every raw response to `spike/raw/` (gitignored) and prints the numbers for
sections 1-5 below. Paste them in, redact nothing that is market data, include no header values that carry a key.

## 0. Network (checked 2026-10-20, from the cloud session)
| Host | Result |
|---|---|
| `https://api.unusualwhales.com/` | reachable (HTTP 301 on the bare root, no key sent) |
| `https://api.telegram.org/` | reachable (HTTP 302 on the bare root) |
| `https://api.unusualwhales.com/api/openapi` | HTTP 200, no key needed, 1.26 MB YAML |

Both hosts are reachable. Authenticated behaviour is UNVERIFIED until the key exists.

## 0.1 Endpoint table vs openapi.yaml (fetched 2026-10-20). VERIFIED (spec)
All 12 endpoints in `implementation.md` section 0 exist. Parameters match the plan, including `newer_than` and
`older_than` on `/api/option-trades/flow-alerts`.

| Endpoint | Params in spec |
|---|---|
| `/api/option-trades/flow-alerts` | `ticker_symbol`, `newer_than`, `older_than`, `limit`, `is_call`, `is_put`, `is_ask_side`, `is_bid_side`, `all_opening`, `is_otm`, `min_premium`, `min_dte`, `max_dte`, `vol_greater_oi`, `size_greater_oi`, `rule_name[]`, ... (50+) |
| `/api/stock/{ticker}/flow-alerts` | `limit`, `is_ask_side`, `is_bid_side` (no time window) |
| `/api/option-contract/{id}/flow` | `date`, `side`, `min_premium`, `limit` |
| `/api/option-contract/{id}/historic` | `limit` |
| `/api/stock/{ticker}/oi-change` | `date`, `limit`, `page`, `order` |
| `/api/stock/{ticker}/ohlc/{candle_size}` | `timeframe`, `date`, `end_date`, `limit` |
| `/api/news/headlines` | `ticker`, `major_only`, `sources`, `search_term`, `limit`, `page` |
| `/api/potus/posts` | `limit`, `page`, `search_term` |
| `/api/market/movers` | none; returns `data.{most_active,top_gainers,top_losers}[]` of `{ticker, price, change, change_percent, volume}` and `last_updated` |
| `/api/market/fda-calendar` | `ticker`, `drug`, `announced_date_min/max`, `target_date_min/max`, `limit` |
| `/api/congress/late-reports` | `limit`, `date`, `ticker` |
| `/api/stock/{ticker}/unusualness` | `ticker` |

### Findings that change the build (VERIFIED from the spec, behaviour still UNVERIFIED)
1. **A flow alert has no single "side" field.** It has `total_ask_side_prem` and `total_bid_side_prem`. The score's
   sign must come from those two numbers (ask-dominant vs bid-dominant), not from a per-row `side`. Rule to decide
   in P1: side = ask if `ask_prem > bid_prem`, bid if the reverse, else 0 (mid/unknown).
2. **No DTE or OTM field in the response.** Compute DTE from `expiry` and `created_at`, and OTM from `strike`,
   `type` and `underlying_price`.
3. **The contract id is `option_chain`** (alert) and `option_chain_id` (per-trade flow). VERIFIED field names.
4. **Opening** = `all_opening_trades` (alert) or `volume > open_interest`. Both fields exist.
5. `news/headlines` rows have `created_at`, `headline`, `is_major`, `tickers[]`, `tags[]`, `sentiment`, `source`.
   Whether `created_at` is minute-precise is UNVERIFIED (spike Q4).
6. `skill.md` lists a shorter param set for flow-alerts than the spec. The spec is the longer, authoritative list.
   `skill.md` itself says flow-alerts is the right endpoint and `/api/stock/{ticker}/flow` is a hallucination; the
   plan's `/api/stock/{ticker}/flow-alerts` is in the spec, so it stands.

## 1-5. Live answers (UNVERIFIED until run)
| # | Question | Answer |
|---|---|---|
| 1 | Does flow-alerts return alerts from a past window? How far back (7/30/90/365d)? Max `limit`? Paging? | _pending key_ |
| 2 | Alert fields mapped to score inputs | _pending key_ |
| 3 | Does `/historic` give a daily mark for an expired contract? | _pending key_ |
| 4 | Do headlines carry tickers and a minute-precise timestamp? | _pending key_ |
| 5 | Response time and rate-limit headers | _pending key_ |

**Branch (decide after Q1):** _pending_.
