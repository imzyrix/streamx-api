import { fetchJson, buildCatalogUrl, normalizeType, readQuery, parseTtl, json } from "../../_lib/upstream.js";

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const query = readQuery(request);
  const ttl = parseTtl(env, 21600);

  const type = normalizeType(params.type);
  const catalog = params.catalog || "top";
  const skip = Number(query.skip) || 0;

  const url = buildCatalogUrl(type, catalog, {
    genre: query.genre,
    skip: query.skip,
    search: query.search,
  });

  const response = await fetchJson(context, url, { ttl });
  if (!response.ok) return response;

  let payload;
  try {
    payload = await response.json();
  } catch {
    return response;
  }

  const metas = Array.isArray(payload.metas) ? payload.metas : [];
  return json(
    {
      ...payload,
      query: { type, catalog, genre: query.genre ?? null, search: query.search ?? null, skip },
      count: metas.length,
    },
    { ttl },
  );
}
