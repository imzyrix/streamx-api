/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

import { fetchJson, normalizeType, parseTtl, json, fail, CINEMETA } from "../../_lib/upstream.js";
import { wikidataFacts } from "../../_lib/enrich.js";
import { rottenTomatoes, metacritic } from "../../_lib/scores.js";

export async function onRequestGet(context) {
  const { params, env } = context;
  const id = String(params.id || "");
  if (!/^tt\d+$/i.test(id)) {
    return fail("Provide an IMDb id, e.g. /scores/movie/tt0133093 or /scores/series/tt0944947.", 400);
  }

  const type = normalizeType(params.type);
  const ttl = parseTtl(env, 86400);

  const [base, facts] = await Promise.all([
    fetchJson(context, `${CINEMETA}/meta/${type}/${id}.json`, { ttl }),
    wikidataFacts(context, id),
  ]);

  let title = null;
  let year = null;
  let imdb = null;
  if (base.ok) {
    try {
      const meta = (await base.json()).meta || {};
      title = meta.name || null;
      const release = meta.year || meta.releaseInfo;
      year = release ? Number(String(release).slice(0, 4)) : null;
      if (meta.imdbRating != null) {
        imdb = { rating: Number(meta.imdbRating), url: `https://www.imdb.com/title/${id}/` };
      }
    } catch {
      /* keep nulls */
    }
  }

  const [rt, mc] = await Promise.all([
    title
      ? rottenTomatoes(context, { type, title, rtId: facts?.externalIds?.rottenTomatoes })
      : Promise.resolve(null),
    title
      ? metacritic(context, { type, title, mcId: facts?.externalIds?.metacritic })
      : Promise.resolve(null),
  ]);

  return json(
    {
      ok: true,
      type,
      id,
      title,
      year: Number.isFinite(year) ? year : null,
      imdb,
      rottenTomatoes: rt,
      metacritic: mc,
      sources: { imdb: !!imdb, rottenTomatoes: !!rt, metacritic: !!mc },
      notes:
        "IMDb ratings come from Cinemeta; Rotten Tomatoes and Metacritic are read from their public pages (no API key).",
      generatedAt: new Date().toISOString(),
    },
    { ttl },
  );
}
