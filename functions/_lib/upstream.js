/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

export const CINEMETA = "https://v3-cinemeta.strem.io";
export const METAHUB = "https://images.metahub.space";

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

export function normalizeType(value) {
  const type = String(value || "movie").toLowerCase();
  if (["series", "serie", "tv", "show", "shows", "tvshow", "tvshows"].includes(type)) return "series";
  return "movie";
}

export function readQuery(request) {
  const incoming = new URL(request.url);
  const params = {};
  for (const [key, value] of incoming.searchParams.entries()) params[key] = value;
  return params;
}

export function buildCatalogUrl(type, catalog, extras = {}) {
  const { genre, skip, search } = extras;
  const parts = [];
  if (search) parts.push(`search=${encodeURIComponent(search)}`);
  if (genre) parts.push(`genre=${encodeURIComponent(genre)}`);
  if (skip !== undefined && skip !== null && skip !== "" && Number(skip) > 0) parts.push(`skip=${Number(skip)}`);
  const extra = parts.length ? `/${parts.join("&")}` : "";
  return `${CINEMETA}/catalog/${normalizeType(type)}/${catalog || "top"}${extra}.json`;
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

function message(err) {
  return err instanceof Error ? err.message : String(err);
}

export async function fetchJson(context, targetUrl, options = {}) {
  const { env, waitUntil } = context;
  const ttl = options.ttl ?? parseTtl(env);
  const cache = cacheStore();
  const cacheKey = new Request(targetUrl, { method: "GET", headers: { accept: "application/json" } });

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const body = await hit.text();
      return json(safeParse(body), { ttl, headers: { "x-cache": "HIT" } });
    }
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      headers: { accept: "application/json" },
      redirect: "follow",
      cf: { cacheTtl: ttl, cacheEverything: true },
    });
  } catch (err) {
    return fail("Failed to reach the metadata upstream.", 502, message(err));
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    return fail(`Upstream responded with ${upstream.status}.`, upstream.status === 404 ? 404 : 502, safeParse(text));
  }

  if (cache && waitUntil) {
    waitUntil(
      cache.put(
        cacheKey,
        new Response(text, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": `public, max-age=${ttl}`,
          },
        }),
      ),
    );
  }

  return json(safeParse(text), { ttl, headers: { "x-cache": "MISS" } });
}

export async function fetchImage(context, targetUrl, options = {}) {
  const { waitUntil } = context;
  const ttl = options.ttl ?? 2592000;
  const cache = cacheStore();
  const cacheKey = new Request(targetUrl, { method: "GET" });

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set("x-cache", "HIT");
      headers.set("access-control-allow-origin", "*");
      return new Response(hit.body, { status: 200, headers });
    }
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, { cf: { cacheTtl: ttl, cacheEverything: true } });
  } catch (err) {
    return fail("Failed to reach the image upstream.", 502, message(err));
  }

  if (!upstream.ok) {
    return fail(`Image not found (upstream ${upstream.status}).`, upstream.status === 404 ? 404 : 502);
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  const buffer = await upstream.arrayBuffer();

  if (cache && waitUntil) {
    waitUntil(
      cache.put(
        cacheKey,
        new Response(buffer, {
          headers: { "content-type": contentType, "cache-control": `public, max-age=${ttl}` },
        }),
      ),
    );
  }

  return new Response(buffer, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": `public, max-age=${ttl}, s-maxage=${ttl}, immutable`,
      "access-control-allow-origin": "*",
      "x-cache": "MISS",
    },
  });
}
