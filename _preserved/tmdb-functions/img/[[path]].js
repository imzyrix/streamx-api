import { TMDB_IMG, fail } from "../_lib/tmdb.js";

function cacheStore() {
  try {
    return typeof caches !== "undefined" && caches.default ? caches.default : null;
  } catch {
    return null;
  }
}

const IMAGE_TTL = 604800;

export async function onRequestGet(context) {
  const { params, waitUntil } = context;
  const segments = Array.isArray(params.path)
    ? params.path
    : params.path
      ? [params.path]
      : [];

  if (segments.length === 0) {
    return fail("No image path provided. Use /img/<size>/<file>, e.g. /img/w500/abc123.jpg", 400);
  }

  const target = `${TMDB_IMG}/${segments.join("/")}`;
  const cache = cacheStore();
  const cacheKey = new Request(target, { method: "GET" });

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
    upstream = await fetch(target, { cf: { cacheTtl: IMAGE_TTL, cacheEverything: true } });
  } catch (err) {
    return fail("Failed to reach the image upstream.", 502, err instanceof Error ? err.message : String(err));
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
          headers: {
            "content-type": contentType,
            "cache-control": `public, max-age=${IMAGE_TTL}`,
          },
        }),
      ),
    );
  }

  return new Response(buffer, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": `public, max-age=${IMAGE_TTL}, s-maxage=${IMAGE_TTL}, immutable`,
      "access-control-allow-origin": "*",
      "x-cache": "MISS",
    },
  });
}
