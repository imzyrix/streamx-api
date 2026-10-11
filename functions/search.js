import { fetchJson, buildCatalogUrl, normalizeType, readQuery, fail } from "./_lib/upstream.js";

export function onRequestGet(context) {
  const query = readQuery(context.request);
  const term = query.q || query.query || query.search;
  if (!term) return fail("Missing search term. Add ?q=<query>.", 400);

  const type = normalizeType(query.type || "movie");
  const catalog = query.catalog || "top";
  const url = buildCatalogUrl(type, catalog, { search: term, skip: query.skip });

  return fetchJson(context, url, { ttl: 21600 });
}
