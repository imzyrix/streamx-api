/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

import { fetchJson, normalizeType, parseTtl, json, fail, CINEMETA } from "../../_lib/upstream.js";
import { justWatchOffers } from "../../_lib/watch.js";

export async function onRequestGet(context) {
  const { params, env, request } = context;
  const id = String(params.id || "");
  if (!id) return fail("Provide a title id, e.g. /streaming/movie/tt0133093?country=US.", 400);

  const type = normalizeType(params.type);
  const country = new URL(request.url).searchParams.get("country") || "US";
  const ttl = parseTtl(env, 43200);

  const base = await fetchJson(context, `${CINEMETA}/meta/${type}/${encodeURIComponent(id)}.json`, { ttl });
  if (!base.ok) return base;

  let meta = {};
  try {
    meta = (await base.json()).meta || {};
  } catch {
    return fail("Upstream returned malformed metadata.", 502);
  }

  const watch = meta.name
    ? await justWatchOffers(context, { title: meta.name, year: meta.year, type, country })
    : null;

  return json(
    {
      ok: true,
      type,
      id,
      title: meta.name ?? null,
      country: String(country).toUpperCase(),
      justWatchUrl: watch?.justWatchUrl ?? null,
      providers: watch?.providers ?? [],
      matched: watch?.matched ?? null,
      source: "justwatch",
      generatedAt: new Date().toISOString(),
    },
    { ttl },
  );
}
