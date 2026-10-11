export const TMDB_API = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
};

export function json(data, options = {}) {
  const { status = 200, ttl, headers } = options;
  const h = new Headers(CORS);
  h.set("content-type", "application/json; charset=utf-8");
  h.set("x-source", "streamx-api");
  if (headers) {
    for (const [key, value] of Object.entries(headers)) h.set(key, value);
  }
  if (ttl) {
    h.set("cache-control", `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${ttl}`);
  } else if (!h.has("cache-control")) {
    h.set("cache-control", "public, max-age=60");
  }
  return new Response(JSON.stringify(data), { status, headers: h });
}

export function fail(message, status = 400, detail) {
  return json(
    { ok: false, error: message, detail: detail ?? null },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export function parseTtl(env, fallback = 86400) {
  const value = Number(env && env.CACHE_TTL);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function cacheStore() {
  try {
    return typeof caches !== "undefined" && caches.default ? caches.default : null;
  } catch {
    return null;
  }
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function buildSearchParams(params = {}) {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) out.set(key, value.join(","));
    else out.set(key, String(value));
  }
  return out;
}

export function readQuery(request) {
  const incoming = new URL(request.url);
  const params = {};
  for (const [key, value] of incoming.searchParams.entries()) {
    if (key === "api_key" || key === "access_token" || key === "envelope") continue;
    params[key] = value;
  }
  return params;
}

export async function tmdb(context, path, params = {}, options = {}) {
  const { env, waitUntil } = context;
  const { ttl = parseTtl(env), lang, query } = options;

  const hasV3 = Boolean(env && env.TMDB_API_KEY);
  const hasV4 = Boolean(env && env.TMDB_ACCESS_TOKEN);
  if (!hasV3 && !hasV4) {
    return fail(
      "TMDB credentials are not configured. Add TMDB_API_KEY (v3 key) or TMDB_ACCESS_TOKEN (v4 token) to this Cloudflare Pages project.",
      500,
    );
  }

  const url = new URL(TMDB_API + path);
  const search = buildSearchParams(params);
  search.forEach((value, key) => url.searchParams.set(key, value));
  if (query) {
    const extra = new URLSearchParams(query);
    extra.forEach((value, key) => url.searchParams.set(key, value));
  }
  if (lang && !url.searchParams.has("language")) url.searchParams.set("language", lang);

  const cacheKeyUrl = new URL(url.toString());
  const headers = { accept: "application/json" };
  if (hasV4) headers.Authorization = `Bearer ${env.TMDB_ACCESS_TOKEN}`;
  else url.searchParams.set("api_key", env.TMDB_API_KEY);

  const cache = cacheStore();
  let cacheKey = null;
  if (cache) {
    cacheKey = new Request(cacheKeyUrl.toString(), { method: "GET", headers: { accept: "application/json" } });
    const hit = await cache.match(cacheKey);
    if (hit) {
      const body = await hit.text();
      return json(safeParse(body), { ttl, headers: { "x-cache": "HIT" } });
    }
  }

  let upstream;
  try {
    upstream = await fetch(url.toString(), { headers, cf: { cacheTtl: ttl, cacheEverything: true } });
  } catch (err) {
    return fail("Failed to reach the TMDB upstream.", 502, err instanceof Error ? err.message : String(err));
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    const status = upstream.status === 404 ? 404 : upstream.status === 401 ? 502 : 502;
    return fail(`TMDB upstream responded with ${upstream.status}.`, status, safeParse(text));
  }

  if (cache && cacheKey && waitUntil) {
    const toCache = new Response(text, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=${ttl}`,
      },
    });
    waitUntil(cache.put(cacheKey, toCache));
  }

  return json(safeParse(text), { ttl, headers: { "x-cache": "MISS" } });
}
