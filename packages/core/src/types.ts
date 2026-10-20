// Field names below are VERIFIED against openapi.yaml (fetched 2026-10-20) for /api/option-trades/flow-alerts.
// Value types and units are UNVERIFIED until the P0 spike: UW returns many numbers as strings.

/** One flow alert row as UW sends it. Numeric fields may arrive as strings; normalise with toAlert(). */
export interface RawFlowAlert {
  alert_rule: string;
  all_opening_trades: boolean;
  created_at: string; // UTC timestamp
  expiry: string; // ISO date
  option_chain: string; // option symbol, the key for /option-contract/{id}/...
  strike: string | number;
  type: "call" | "put";
  ticker: string;
  total_premium: string | number;
  total_ask_side_prem: string | number;
  total_bid_side_prem: string | number;
  total_size: string | number;
  trade_count: string | number;
  volume: string | number;
  open_interest: string | number;
  underlying_price: string | number;
  price: string | number;
  volume_oi_ratio: string | number;
  has_sweep: boolean;
  has_floor: boolean;
  has_multileg: boolean;
}

/** Normalised alert, the only shape score.ts accepts. Premiums in USD, times in epoch ms. */
export interface Alert {
  contract: string;
  ticker: string;
  at: number;
  type: "call" | "put";
  strike: number;
  expiry: string;
  premium: number;
  askPremium: number;
  bidPremium: number;
  size: number;
  volume: number;
  openInterest: number;
  underlying: number;
  allOpening: boolean;
}

export type Direction = 1 | -1;

export interface ScoredPrint {
  alert: Alert;
  signedPremium: number; // + bullish, - bearish
  weight: number;
  contribution: number;
}

export interface Footprint {
  value: number; // F(W), USD-weighted
  percentile: number; // 0..100 within the ticker's own baseline
  zScore: number | null;
  baselineN: number;
  top: ScoredPrint[]; // up to 6
}
