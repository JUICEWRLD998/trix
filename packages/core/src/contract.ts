const DAY = 86_400_000;

/** Calendar days from the alert's timestamp to the contract's expiry date (UTC). Never negative. */
export function dte(expiry: string, atMs: number): number {
  const exp = Date.parse(expiry + "T00:00:00Z");
  const start = Date.UTC(new Date(atMs).getUTCFullYear(), new Date(atMs).getUTCMonth(), new Date(atMs).getUTCDate());
  return Math.max(0, Math.round((exp - start) / DAY));
}

/** Out of the money at the time of the trade: call strike above spot, put strike below. */
export function isOtm(type: "call" | "put", strike: number, underlying: number): boolean {
  return type === "call" ? strike > underlying : strike < underlying;
}
