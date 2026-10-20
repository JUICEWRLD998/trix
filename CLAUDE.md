# Trix: working rules for Claude sessions

Owner: Mustapha Fadhlullah. Byline on anything a stranger reads: `Mustapha Fadhlullah — independent security
researcher`. First person singular in his voice; impersonal in report prose.

**Start here:** `implementation.md` is the build order (phases P0-P9, each with an exit check). Read it fully, then
continue from the first phase whose exit check has not passed. Record progress in `DECISIONS.md`.

## Standing rules (from him; not negotiable)
- **No subagents** unless he says "fan out" in that session. Do the work inline, in sequence.
- **He presses submit.** Never post in the UW Discord, on X, or in any Telegram channel other than our own test
  channel. Draft it (`SUBMISSION.md`) and hand it over.
- **No fake anything.** No mocked core path, no hardcoded number posing as live, no invented trades or events.
  Every number shown comes from code run on a stored UW response (`uw_raw`), and is listed in `CLAIMS.md`.
- **The model never owns a number.** Scores and P&L come from `packages/core`, which is deterministic. An LLM may
  only write a caption from facts it is given.
- **Days left never shrinks the product.** Scope is cut only by the MVP / stretch / NOT BUILDING list.
- **Tag every UW API claim** VERIFIED (openapi.yaml line, doc URL or live response) or UNVERIFIED. Never invent an
  endpoint, field or parameter. Sources: `https://api.unusualwhales.com/api/openapi`,
  `https://unusualwhales.com/skill.md` (its hallucination blacklist is real: no `/api/v1/`, no `api_key=`, no
  `/api/options/flow`).
- **Wording:** "early", "unusually timed". Never "insider", never a named person accused of anything.
- **Secrets** (`UW_API_KEY`, `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`) live in the environment only, never in the repo,
  fixtures, screenshots, logs or the client bundle. Grep before every push.
- Strategy and win-odds notes are not in this repo and never go in it.
- When a claim turns out wrong, correct it in place and mark the correction. Never quietly rewrite it.

## Skills
The skills for this build are in `.claude/skills/`. When a skill says `~/.claude/skills/<name>/...`, read
`.claude/skills/<name>/...` in this repo instead. Skills that call Windows paths (`C:\Users\fadhm\...`) or
Windows-only tools need a Linux equivalent here; say so instead of skipping silently.
- Build spine: `hackathon-strategy` → `references/build-and-ship.md` (Stage B) and
  `references/repo-anatomy-and-idea-engine.md` (README skeleton, submission checklist).
- Plans and tests: `plan`, `test-driven-development`, `systematic-debugging`, `diagnosing-bugs`.
- UI: `ui-studio` (the pipeline; its `references/toolbox.md` maps `frontend-design`, `prototype`, `variant`,
  `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`,
  `apple-design`, `break`, `better-interface` and the six `better-*`, `interface-review`, `pick-ui-library`,
  `explain-interface`). `architecture-diagram` for the README diagram.
- Product: `product-hardening` (demo-seam audit), `attacker` (one pass on the finished product).
- Packaging: `demo-video` (the video from the deployed link; run `npm ci` in its `scripts/` first), `humanizer`
  (all public copy).
- Not copied, use if the session has them: `dataviz` (built in), and the ECC plugin (`ecc:browser-qa`,
  `ecc:verification-loop`, `ecc:e2e-testing`) through `.claude/settings.json`. If not, use Playwright directly.

**Lessons go back into the skills.** When a pass teaches something durable (a trap, a wrong assumption, a probe that
lied), write it into the governing skill file under `.claude/skills/`, in that skill's Pitfalls, replacing the
wording it supersedes, and say so in the commit message. He syncs these back to his machine.

## Stack
- pnpm workspaces, TypeScript strict, Vitest. `packages/core` (pure), `packages/uw` (client + cache),
  `apps/worker` (pollers, case builder, grammY Telegram bot), `apps/web` (Next.js).
- Postgres (Neon by default) for `uw_raw`, events, cases.
- Frontend: **CSS Modules + design tokens**. **No Tailwind** (remove it if a scaffold adds it). **`motion`** is the
  only animation library, imported from `motion/react`.

## His design taste (it bites if ignored)
- This is his own product, so it uses **"SIGNAL DECK"**: flat deep blue-black surfaces, ONE mint-teal accent (hue
  ~168) for the CTA, no glass, no violet. Measured OKLCH palette with 2-3 support hues (call, put, headline) and
  tinted surfaces. Never a monochrome app.
- **Trading UIs default to "terminal / CRT / neon / Bloomberg clone".** That is the trap. Derive the vocabulary
  from the subject instead: a case file, a timeline, a receipt.
- He wants clean, top-tier polish and rejects anything that looks AI-generated. **One choreographed signature
  moment** (the headline landing and the early trades lighting up behind it), real imagery from the product's own
  output, feedback motion on every state change. Scattered fades are slop.
- **Do not clone a reference's grammar.** Learn why a reference reads well; never copy its look.
- **Every screen width**, never mobile-only: screenshots at 320, 375, 414, 768, 1024, 1280, 1440 and 1920 px, each
  band composed. No sample or filler text: show real data, or say plainly there is none.

## Verification rules (each one cost him real time)
- **Drive a browser; never infer the rendered state.** Grepping built HTML and reading build exit codes "verified"
  an invisible primary button three times. Use Playwright (`npx playwright install chromium`) to click, then
  screenshot and look at the result. If you cannot see it, say so.
- **Contrast is measured, never eyeballed.** Write the WCAG ratio for every foreground/background pair.
- **Match the metric to the question.** "Are these two colours different?" needs CIE Lab ΔE, not the contrast
  ratio. "Which element is quietest?" needs chroma, not luminance.
- **Every probe gets a planted positive control** that must fail on purpose before a pass is trusted, including
  data checks: an empty API result and a broken query look the same from inside.
- **Kill CSS transitions before a synchronous `getComputedStyle` read** (`transition: none !important`, read,
  restore), or you read the previous frame.
- **A stale server serving dead asset hashes looks like broken CSS.** Diff the asset hashes in the served HTML
  against what is on disk before debugging styles. Kill the old process or use a fresh port.
- **CSS Modules hash class names**: select with `[class*="name"]`, never `.name`.
- **Headless Chrome defaults to `prefers-color-scheme: dark`.** Set the scheme explicitly in light-mode checks.
- **A probe asserts a mechanism; when the mechanism changes, it lies instead of failing.** When a check fails, ask
  first: is this the app, or my check?
- A green typecheck is not a demo. Run the judge's path (`/trix TICKER` on Telegram, then the case file) live.

## Commits
Real, small commits with descriptive messages. Never skip hooks. Never force-push `main`.
