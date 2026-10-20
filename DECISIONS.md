# DECISIONS.md

Newest last. A claim that turned out wrong is corrected in place and marked `CORRECTED <date>`.

## 2026-10-20: session 1
- **P0 spec half done; live half blocked.** No `UW_API_KEY` in the environment. See `SPIKE.md`. Nothing in P1 that
  depends on real responses (fixtures, thresholds) is built yet. No fake fixtures were written.
- **Workspace:** pnpm 10 workspaces, TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`),
  Vitest at the root. Packages: `@trix/core` (pure), `@trix/uw` (client), `@trix/worker`. `apps/web` waits for P5.
- **Raw-response cache:** the Postgres `uw_raw` table is specified in `implementation.md`. Until `DATABASE_URL`
  exists, the spike writes raw responses to `spike/raw/` (gitignored). Curated, redacted copies go to
  `packages/core/fixtures/`.
- **Side rule (from spec finding 1):** a flow alert has ask-side and bid-side premium totals, no `side`. Plan's
  "ask-side call = +1, bid-side call = -1" is implemented from those two totals. To confirm against live data.
- **Hosting:** undecided (needs his accounts). Default stays Vercel (web), Railway or Fly (worker), Neon (Postgres).
