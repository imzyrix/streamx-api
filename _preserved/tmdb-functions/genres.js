import { tmdb, readQuery, parseTtl } from "./_lib/tmdb.js";

const TYPES = new Set(["movie", "tv"]);

export function onRequestGet(context) {
  const { request, env } = context;
  const query = readQuery(request);
  const type = TYPES.has(query.type) ? query.type : "movie";
  return tmdb(context, `/genre/${type}/list`, { language: query.language }, { ttl: parseTtl(env, 86400) });
}
