import { fetchJson, normalizeType, parseTtl, json, fail, CINEMETA } from "../../_lib/upstream.js";
import { imageManifest, stillTemplate, STILL_SIZES, proxyStillUrl } from "../../_lib/images.js";
import { wikidataFacts, wikipediaSummary } from "../../_lib/enrich.js";

export async function onRequestGet(context) {
  const { params, request, env } = context;
  if (!params.id) return fail("Missing id. Use /meta/movie/tt0133093 or /meta/series/tt0944947.", 400);

  const type = normalizeType(params.type);
  const id = String(params.id);
  const origin = new URL(request.url).origin;
  const query = new URL(request.url).searchParams;
  const enrich = query.get("enrich") !== "0";
  const ttl = parseTtl(env, 86400);

  const url = `${CINEMETA}/meta/${type}/${encodeURIComponent(id)}.json`;

  const [base, facts] = await Promise.all([
    fetchJson(context, url, { ttl }),
    enrich ? wikidataFacts(context, id) : Promise.resolve(null),
  ]);

  if (!base.ok) return base;

  let payload;
  try {
    payload = await base.json();
  } catch {
    return fail("Upstream returned malformed metadata.", 502);
  }

  const meta = payload && payload.meta ? payload.meta : null;
  if (!meta) return json(payload, { ttl });

  const imdbId = meta.imdb_id || (/^tt\d+$/i.test(id) ? id : null);

  // Full artwork set (poster/background/logo x small|medium|large|original)
  if (imdbId) meta.images = imageManifest(imdbId, origin);

  // External identifiers, merged from Cinemeta + Wikidata
  meta.externalIds = {
    imdb: imdbId,
    tmdb: meta.moviedb_id != null ? String(meta.moviedb_id) : (facts?.externalIds?.tmdb ?? null),
    tvdb: meta.tvdb_id != null ? String(meta.tvdb_id) : null,
    rottenTomatoes: facts?.externalIds?.rottenTomatoes ?? null,
    metacritic: facts?.externalIds?.metacritic ?? null,
  };

  // Episodes: add a streamed still URL + expose an on-demand still template
  if (Array.isArray(meta.videos) && meta.videos.length && imdbId) {
    for (const video of meta.videos) {
      if (video.season == null || video.number == null) continue;
      video.still = proxyStillUrl(origin, imdbId, video.season, video.number, "w780");
    }
    const seasons = [...new Set(meta.videos.map((v) => Number(v.season)).filter((n) => Number.isFinite(n)))];
    meta.seasons = seasons.sort((a, b) => a - b);
    meta.still = { sizes: STILL_SIZES, template: stillTemplate(imdbId, origin) };
  }

  // Keyless enrichment: Wikidata facts + Wikipedia plot
  if (enrich) {
    meta.facts = facts;
    if (meta.name) {
      const wiki = await wikipediaSummary(context, meta.name);
      if (wiki) meta.wiki = wiki;
    }
  }

  return json({ meta }, { ttl });
}
