# CLAIMS.md

Every number or factual claim Trix shows, with the query that produces it and its status. A claim without a row
here does not ship. Status: `proven` (computed by code from a stored UW response) or `pending`.

| # | Claim | Query / code path | Status |
|---|---|---|---|
| 1 | Base-rate share: of the N largest news-anchored moves in the last 90 days, the share with Footprint at or above the 90th percentile. Null expectation is 10% by construction. | `apps/worker/src/study.ts` (P6) | pending |
| 2 | Per-case Footprint percentile, top prints, "+$X since" | `packages/core` score/pnl on stored `uw_raw` (P1-P2) | pending |
