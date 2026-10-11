import { fetchJson, normalizeType, parseTtl, json, fail, CINEMETA } from "../../_lib/upstream.js";
import { similar } from "../../_lib/people.js";

export async function onRequestGet(context) {
  const { params, env } = context;
  const id = String(params.id || "");
  if (!/^tt\d+$/i.test(id)) {
    return fail("Provide an IMDb id, e.g. /similar/movie/tt0133093.", 400);
  }

  const type = normalizeType(params.type);
  const ttl = parseTtl(env, 604800);
  const data = await similar(context, type, id, { ttl });

  if (!data) {
    return fail("No similar titles found for that id.", 404);
  }

  const enriched = await Promise.all(
    data.metas.map(async (item) => {
      try {
        const result = await fetchJson(context, `${CINEMETA}/meta/${type}/${item.id}.json`, { ttl });
        if (!result.ok) return item;
        const meta = (await result.json()).meta || {};
        const release = meta.year || meta.releaseInfo;
        return {
          ...item,
          name: meta.name || item.name,
          releaseInfo: release ? String(release).slice(0, 4) : item.releaseInfo,
        };
      } catch {
        return item;
      }
    }),
  );

  return json({ ok: true, id, type, count: enriched.length, metas: enriched, source: "wikidata", generatedAt: new Date().toISOString() }, { ttl });
}
