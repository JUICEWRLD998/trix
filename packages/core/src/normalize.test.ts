import { describe, expect, it } from "vitest";
import { toAlert } from "./normalize";
import type { RawFlowAlert } from "./types";

// Unit input shaped by the openapi field names. Not UW data and never displayed.
const raw = (over: Partial<Record<keyof RawFlowAlert, unknown>> = {}) =>
  ({
    alert_rule: "RepeatedHits", all_opening_trades: true, created_at: "2026-01-12 15:30:00.5+00",
    expiry: "2026-01-16", option_chain: "UNH260116C00300000", strike: "300", type: "call", ticker: "UNH",
    total_premium: "150000.50", total_ask_side_prem: "140000", total_bid_side_prem: "10000.5", total_size: "300",
    trade_count: "4", volume: "900", open_interest: "120", underlying_price: "295.1", price: "5.0",
    volume_oi_ratio: "7.5", has_sweep: true, has_floor: false, has_multileg: false, ...over,
  }) as RawFlowAlert;

describe("toAlert", () => {
  it("parses string numerics and the timestamp", () => {
    const a = toAlert(raw());
    expect(a.premium).toBe(150000.5);
    expect(a.strike).toBe(300);
    expect(a.at).toBe(Date.parse("2026-01-12T15:30:00.5Z"));
  });
  it("accepts numbers as well as strings", () => expect(toAlert(raw({ total_size: 300 })).size).toBe(300));
  it("throws on a bad numeric field instead of guessing (planted control)", () => {
    expect(() => toAlert(raw({ total_premium: "n/a" }))).toThrow(/total_premium/);
    expect(() => toAlert(raw({ open_interest: null }))).toThrow(/open_interest/);
  });
  it("throws on a bad timestamp", () => expect(() => toAlert(raw({ created_at: "soon" }))).toThrow(/created_at/));
});
