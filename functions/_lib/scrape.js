export const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function cacheStore() {
  try {
    return typeof caches !== "undefined" && caches.default ? caches.default : null;
  } catch {
    return null;
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// ORIGINAL (preserved, not deleted — disabled by comment): the Cloudflare-only
// version built a Request unconditionally, which throws on Node/Vercel where the
// cache key is not an absolute URL. The rewrite below only touches the cache when
// both a cache and a valid cache key exist, so the same code runs everywhere.
/*
export async function cachedValue(context, key, ttl, producer, timeoutMs = 6000) {
  const cache = cacheStore();
  const request = new Request(key, { method: "GET" });

  if (cache) {
    const hit = await cache.match(request);
    if (hit) {
      try {
        return await hit.json();
      } catch {
        // recompute
      }
    }
  }

  let data = null;
  try {
    data = await withTimeout(producer(), timeoutMs);
  } catch {
    return null;
  }

  if (data && cache && context && context.waitUntil) {
    context.waitUntil(
      cache.put(
        request,
        new Response(JSON.stringify(data), {
          headers: { "content-type": "application/json", "cache-control": `public, max-age=${ttl}` },
        }),
      ),
    );
  }

  return data;
}
*/

// ORIGINAL (preserved, not deleted — disabled by comment): built a Request from the
// raw key and called cache.match/cache.put unguarded. Bare keys such as
// "people:credits:tt0133093" are accepted by new Request() but rejected by the
// Cache API with "Cache API keys must be fully-qualified, valid URLs", which
// 500'd /credits, /similar and /person.
/*
export async function cachedValue(context, key, ttl, producer, timeoutMs = 6000) {
  const cache = cacheStore();
  let cacheRequest = null;
  if (cache) {
    try {
      cacheRequest = new Request(key, { method: "GET" });
    } catch {
      cacheRequest = null;
    }
    if (cacheRequest) {
      const hit = await cache.match(cacheRequest);
      if (hit) {
        try {
          return await hit.json();
        } catch {
          // recompute
        }
      }
    }
  }

  let data = null;
  try {
    data = await withTimeout(producer(), timeoutMs);
  } catch {
    return null;
  }

  if (data && cache && cacheRequest && context && context.waitUntil) {
    context.waitUntil(
      cache.put(
        cacheRequest,
        new Response(JSON.stringify(data), {
          headers: { "content-type": "application/json", "cache-control": `public, max-age=${ttl}` },
        }),
      ),
    );
  }

  return data;
}
*/

function cacheKeyRequest(key) {
  const raw = String(key ?? "");
  const absolute = /^https?:\/\//i.test(raw)
    ? raw
    : `https://streamx.internal/cache/${encodeURIComponent(raw)}`;
  try {
    return new Request(absolute, { method: "GET" });
  } catch {
    return null;
  }
}

export async function cachedValue(context, key, ttl, producer, timeoutMs = 6000) {
  const cache = cacheStore();
  const cacheRequest = cache ? cacheKeyRequest(key) : null;

  if (cache && cacheRequest) {
    try {
      const hit = await cache.match(cacheRequest);
      if (hit) {
        try {
          return await hit.json();
        } catch {
          /* recompute */
        }
      }
    } catch {
      /* cache read failed — fall through to the producer */
    }
  }

  let data = null;
  try {
    data = await withTimeout(producer(), timeoutMs);
  } catch {
    return null;
  }

  if (data && cache && cacheRequest && context && context.waitUntil) {
    context.waitUntil(
      cache
        .put(
          cacheRequest,
          new Response(JSON.stringify(data), {
            headers: { "content-type": "application/json", "cache-control": `public, max-age=${ttl}` },
          }),
        )
        .catch(() => {}),
    );
  }

  return data;
}

async function request(url, options = {}) {
  const { headers = {}, timeoutMs = 9000, method = "GET", body } = options;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, {
      method,
      headers: { "user-agent": BROWSER_UA, accept: "*/*", "accept-language": "en-US,en;q=0.9", ...headers },
      body,
      redirect: "follow",
      signal: controller ? controller.signal : undefined,
    });
    if (!response.ok) return null;
    return response;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchHtml(url, options = {}) {
  const response = await request(url, {
    ...options,
    headers: { accept: "text/html,application/xhtml+xml", ...(options.headers || {}) },
  });
  if (!response) return null;
  try {
    return await response.text();
  } catch {
    return null;
  }
}

export async function fetchJsonPost(url, payload, options = {}) {
  const response = await request(url, {
    ...options,
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", ...(options.headers || {}) },
    body: JSON.stringify(payload),
  });
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchJsonGet(url, options = {}) {
  const response = await request(url, {
    ...options,
    headers: { accept: "application/json", ...(options.headers || {}) },
  });
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function stripHtml(value) {
  if (value == null) return null;
  return String(value)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
