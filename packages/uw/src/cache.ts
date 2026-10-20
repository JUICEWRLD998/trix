import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildUrl, type Params, type UwResponse } from "./client";

/** Canonical hash of a request: same endpoint and params in any order give the same key. */
export function requestKey(path: string, params: Params = {}): string {
  const u = new URL(buildUrl(path, params));
  u.searchParams.sort();
  return createHash("sha256").update(u.pathname + "?" + u.searchParams.toString()).digest("hex").slice(0, 32);
}

export interface RawCache {
  get(path: string, params?: Params): Promise<UwResponse | undefined>;
  put(path: string, params: Params | undefined, res: UwResponse): Promise<void>;
}

/** File-backed cache for use before DATABASE_URL exists. Stores status, url, body; no request headers. */
export function fileCache(dir: string): RawCache {
  mkdirSync(dir, { recursive: true });
  const file = (path: string, params?: Params) => join(dir, requestKey(path, params) + ".json");
  return {
    async get(path, params) {
      const f = file(path, params);
      return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as UwResponse) : undefined;
    },
    async put(path, params, res) {
      writeFileSync(file(path, params), JSON.stringify(res, null, 2));
    },
  };
}

/** Read-through: replay from cache when present, otherwise fetch and store successful responses only. */
export async function cachedGet(
  cache: RawCache,
  fetcher: (path: string, params?: Params) => Promise<UwResponse>,
  path: string,
  params?: Params,
  opts: { offline?: boolean } = {},
): Promise<UwResponse> {
  const hit = await cache.get(path, params);
  if (hit) return hit;
  if (opts.offline) throw new Error(`offline replay miss: ${path}`);
  const res = await fetcher(path, params);
  if (res.status === 200) await cache.put(path, params, res);
  return res;
}
