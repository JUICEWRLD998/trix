// P0 access spike. Run: UW_API_KEY=... pnpm spike [TICKER]
// Writes every raw response to spike/raw/ (gitignored) and prints a summary to paste into SPIKE.md.
import { mkdirSync, writeFileSync } from "node:fs";
import { uwGet, type Params } from "@trix/uw";

const TICKER = (process.argv[2] ?? "UNH").toUpperCase();
const OUT = new URL("../../../spike/raw/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const day = 86_400_000;
const unix = (ms: number) => Math.floor(ms / 1000);
const rows = (b: unknown): any[] => (b && typeof b === "object" && Array.isArray((b as any).data) ? (b as any).data : []);

let n = 0;
async function call(label: string, path: string, params: Params = {}) {
  const r = await uwGet(path, params);
  const file = `${String(++n).padStart(2, "0")}-${label}.json`;
  writeFileSync(OUT + file, JSON.stringify({ request: r.url, status: r.status, ms: r.ms, headers: r.headers, body: r.body }, null, 2));
  const d = rows(r.body);
  console.log(`${label.padEnd(34)} ${r.status} ${String(r.ms).padStart(5)}ms rows=${d.length} -> spike/raw/${file}`);
  return { ...r, rows: d };
}

// Q1: how far back does flow-alerts reach? 2-day windows ending N days ago.
const now = Date.now();
const reach: Record<number, number> = {};
for (const back of [2, 7, 30, 90, 365]) {
  const r = await call(`alerts-${TICKER}-${back}d-ago`, "/api/option-trades/flow-alerts", {
    ticker_symbol: TICKER, newer_than: unix(now - (back + 2) * day), older_than: unix(now - back * day), limit: 200,
  });
  reach[back] = r.rows.length;
  if (r.rows[0]) console.log("   first/last created_at:", r.rows[0].created_at, r.rows.at(-1)?.created_at);
}
console.log("Q1 rows by window:", reach);

// Q1b: max limit and paging. Try limit=1000, then look for a cursor/page field in the envelope.
const big = await call(`alerts-${TICKER}-limit1000`, "/api/option-trades/flow-alerts", { ticker_symbol: TICKER, limit: 1000 });
console.log("   envelope keys:", Object.keys((big.body as object) ?? {}));

// Q2: field map from one alert.
const sample = big.rows[0];
console.log("Q2 alert fields:", sample ? Object.keys(sample) : "NO ROWS");

// Q3: historic marks for an expired contract (oldest alert whose expiry is in the past).
const expired = (await call(`alerts-${TICKER}-30d-ago-expired`, "/api/option-trades/flow-alerts", {
  ticker_symbol: TICKER, newer_than: unix(now - 60 * day), older_than: unix(now - 30 * day), limit: 200,
})).rows.find((a: any) => a.expiry && Date.parse(a.expiry) < now);
const live = big.rows[0];
for (const [tag, a] of [["expired", expired], ["recent", live]] as const) {
  if (!a?.option_chain) { console.log(`Q3 ${tag}: no contract to test`); continue; }
  await call(`historic-${tag}`, `/api/option-contract/${a.option_chain}/historic`, {});
  await call(`contract-flow-${tag}`, `/api/option-contract/${a.option_chain}/flow`, { date: String(a.created_at).slice(0, 10), limit: 50 });
}

// Q4: headlines, minute precision, tickers.
const news = await call(`news-${TICKER}-major`, "/api/news/headlines", { ticker: TICKER, major_only: true, limit: 20 });
console.log("Q4 sample headline:", news.rows[0] ?? "NO ROWS");

// Remaining rows of the endpoint table.
await call(`stock-flow-alerts-${TICKER}`, `/api/stock/${TICKER}/flow-alerts`, { limit: 20 });
await call(`oi-change-${TICKER}`, `/api/stock/${TICKER}/oi-change`, { limit: 20 });
await call(`ohlc-${TICKER}-1m`, `/api/stock/${TICKER}/ohlc/1m`, { limit: 20 });
await call(`unusualness-${TICKER}`, `/api/stock/${TICKER}/unusualness`);
await call("potus-posts", "/api/potus/posts", { limit: 10 });
await call("market-movers", "/api/market/movers");
await call("fda-calendar", "/api/market/fda-calendar", { limit: 10 });
await call("congress-late-reports", "/api/congress/late-reports", { limit: 10 });

// Q5: rate-limit headers are in the saved files' "headers"; print any that look relevant.
const probe = await uwGet("/api/market/market-tide");
console.log("Q5 status", probe.status, probe.ms + "ms", Object.entries(probe.headers).filter(([k]) => /rate|limit|remaining|retry|usage|quota/i.test(k)));
