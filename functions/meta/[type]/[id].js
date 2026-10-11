import { fetchJson, normalizeType, parseTtl, CINEMETA, fail } from "../../_lib/upstream.js";

export function onRequestGet(context) {
  const { params, env } = context;
  if (!params.id) return fail("Missing id. Use /meta/movie/tt0133093 or /meta/series/tt0944947.", 400);

  const type = normalizeType(params.type);
  const url = `${CINEMETA}/meta/${type}/${encodeURIComponent(params.id)}.json`;

  return fetchJson(context, url, { ttl: parseTtl(env, 86400) });
}
