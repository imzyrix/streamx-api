import { fetchJson, normalizeType, parseTtl, json, CINEMETA } from "../_lib/upstream.js";

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const type = normalizeType(params.type);
  const ttl = parseTtl(env, 21600);
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 40, 1), 100);

  const result = await fetchJson(context, `${CINEMETA}/catalog/${type}/top.json`, { ttl });
  if (!result.ok) {
    const body = result.status === 429
      ? { error: "Rate limited by upstream. Retry shortly." }
      : { error: "Could not load trending titles." };
    return json({ ok: false, ...body }, { status: result.status || 502 });
  }

  const data = await result.json();
  const metas = (data.metas || []).slice(0, limit);

  return json(
    {
      ok: true,
      type,
      count: metas.length,
      metas,
      notes: "Trending is based on Cinemeta's popularity-ordered top catalog (no personal data, no key).",
      generatedAt: new Date().toISOString(),
    },
    { ttl },
  );
}
