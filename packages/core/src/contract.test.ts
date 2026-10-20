import { describe, expect, it } from "vitest";
import { dte, isOtm } from "./contract";

const at = Date.parse("2026-01-12T15:30:00Z"); // unit input

describe("dte", () => {
  it("counts calendar days to expiry", () => expect(dte("2026-01-16", at)).toBe(4));
  it("is 0 on expiry day and never negative after it", () => {
    expect(dte("2026-01-12", at)).toBe(0);
    expect(dte("2026-01-05", at)).toBe(0);
  });
});

describe("isOtm", () => {
  it("call above spot is OTM, below is not", () => {
    expect(isOtm("call", 110, 100)).toBe(true);
    expect(isOtm("call", 90, 100)).toBe(false);
  });
  it("put below spot is OTM, above is not", () => {
    expect(isOtm("put", 90, 100)).toBe(true);
    expect(isOtm("put", 110, 100)).toBe(false);
  });
  it("at the money is not OTM", () => expect(isOtm("call", 100, 100)).toBe(false));
});
