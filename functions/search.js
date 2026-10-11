/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

import { fetchJson, buildCatalogUrl, normalizeType, readQuery, fail, json } from "./_lib/upstream.js";

export async function onRequestGet(context) {
  const query = readQuery(context.request);
  const term = query.q || query.query || query.search;
  if (!term) return fail("Missing search term. Add ?q=<query>.", 400);

  const type = normalizeType(query.type || "movie");
  const catalog = query.catalog || "top";
  const skip = Number(query.skip) || 0;
  const ttl = 21600;

  const url = buildCatalogUrl(type, catalog, { search: term, skip: query.skip });

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
      query: { term, type, catalog, skip },
      count: metas.length,
    },
    { ttl },
  );
}
