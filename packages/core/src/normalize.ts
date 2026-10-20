import type { Alert, RawFlowAlert } from "./types";

function num(v: unknown, field: string): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n)) throw new Error(`flow alert field ${field} is not a finite number: ${JSON.stringify(v)}`);
  return n;
}

/** Raw UW flow alert -> Alert. Throws on a malformed numeric field rather than scoring a guess. */
export function toAlert(r: RawFlowAlert): Alert {
  const at = Date.parse(r.created_at);
  if (!Number.isFinite(at)) throw new Error(`flow alert created_at is not a timestamp: ${JSON.stringify(r.created_at)}`);
  return {
    contract: r.option_chain,
    ticker: r.ticker,
    at,
    type: r.type,
    strike: num(r.strike, "strike"),
    expiry: r.expiry,
    premium: num(r.total_premium, "total_premium"),
    askPremium: num(r.total_ask_side_prem, "total_ask_side_prem"),
    bidPremium: num(r.total_bid_side_prem, "total_bid_side_prem"),
    size: num(r.total_size, "total_size"),
    volume: num(r.volume, "volume"),
    openInterest: num(r.open_interest, "open_interest"),
    underlying: num(r.underlying_price, "underlying_price"),
    allOpening: r.all_opening_trades,
  };
}
