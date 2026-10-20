import { describe, expect, it } from "vitest";
import { buildUrl } from "./client";

describe("buildUrl", () => {
  it("uses repeated bracket notation for list params", () => {
    const u = buildUrl("/api/option-trades/flow-alerts", { "rule_name[]": ["RepeatedHits", "FloorTradeLarge"] });
    expect(u).toContain("rule_name%5B%5D=RepeatedHits&rule_name%5B%5D=FloorTradeLarge");
  });
  it("drops undefined params and never emits a key param", () => {
    const u = buildUrl("/api/stock/UNH/oi-change", { limit: 5, date: undefined });
    expect(u).toBe("https://api.unusualwhales.com/api/stock/UNH/oi-change?limit=5");
    expect(u).not.toMatch(/api_?key/i);
  });
});
