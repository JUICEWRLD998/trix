// Minimal Unusual Whales client. All endpoints are GET. Auth is the Bearer header only (never a query param).
// VERIFIED: skill.md rules 1 (base URL, Bearer, UW-CLIENT-API-ID: 100001, GET only).

export const UW_BASE = "https://api.unusualwhales.com";

export type Params = Record<string, string | number | boolean | readonly (string | number)[] | undefined>;

export interface UwResponse {
  url: string; // key-free by construction: the key only travels in a header
  status: number;
  ms: number;
  headers: Record<string, string>; // response headers, set-cookie dropped
  body: unknown;
}

export function buildUrl(path: string, params: Params = {}): string {
  const u = new URL(path, UW_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    // List params use repeated bracket notation: rule_name[]=a&rule_name[]=b (skill.md).
    if (Array.isArray(v)) for (const item of v) u.searchParams.append(k.endsWith("[]") ? k : `${k}[]`, String(item));
    else u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export async function uwGet(path: string, params: Params = {}, apiKey = process.env.UW_API_KEY): Promise<UwResponse> {
  if (!apiKey) throw new Error("UW_API_KEY is not set in the environment");
  const url = buildUrl(path, params);
  const t0 = performance.now();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, "UW-CLIENT-API-ID": "100001", Accept: "application/json" } });
  const text = await res.text();
  const ms = Math.round(performance.now() - t0);
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { if (k !== "set-cookie") headers[k] = v; });
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text, e.g. an error page */ }
  return { url, status: res.status, ms, headers, body };
}
