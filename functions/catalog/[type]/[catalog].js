import { fetchJson, buildCatalogUrl, normalizeType, readQuery, parseTtl } from "../../_lib/upstream.js";

export function onRequestGet(context) {
  const { params, request, env } = context;
  const query = readQuery(request);

  const type = normalizeType(params.type);
  const catalog = params.catalog || "top";
  const url = buildCatalogUrl(type, catalog, {
    genre: query.genre,
    skip: query.skip,
    search: query.search,
  });

  return fetchJson(context, url, { ttl: parseTtl(env, 21600) });
}
