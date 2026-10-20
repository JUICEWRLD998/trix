import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cachedGet, fileCache, requestKey } from "./cache";
import type { UwResponse } from "./client";

const res = (status: number, body: unknown = { data: [] }): UwResponse => ({ url: "u", status, ms: 1, headers: {}, body });

describe("requestKey", () => {
  it("ignores param order", () => {
    expect(requestKey("/a", { x: 1, y: 2 })).toBe(requestKey("/a", { y: 2, x: 1 }));
  });
  it("differs when a param differs (planted control)", () => {
    expect(requestKey("/a", { x: 1 })).not.toBe(requestKey("/a", { x: 2 }));
  });
});

describe("cachedGet", () => {
  it("replays offline after one fetch, and a miss offline throws", async () => {
    const cache = fileCache(mkdtempSync(join(tmpdir(), "uwc-")));
    let calls = 0;
    const fetcher = async () => (calls++, res(200));
    await cachedGet(cache, fetcher, "/p", { a: 1 });
    await cachedGet(cache, fetcher, "/p", { a: 1 }, { offline: true });
    expect(calls).toBe(1);
    await expect(cachedGet(cache, fetcher, "/p", { a: 2 }, { offline: true })).rejects.toThrow(/miss/);
  });
  it("does not cache errors", async () => {
    const cache = fileCache(mkdtempSync(join(tmpdir(), "uwc-")));
    await cachedGet(cache, async () => res(429), "/p");
    expect(await cache.get("/p")).toBeUndefined();
  });
});
