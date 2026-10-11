import { tmdb, fail, readQuery, parseTtl } from "./_lib/tmdb.js";

const TYPES = new Set(["movie", "tv"]);

export function onRequestGet(context) {
  const { request, env } = context;
  const query = readQuery(request);

  const type = TYPES.has(query.type) ? query.type : "movie";
  const { type: _type, ...rest } = query;

  return tmdb(context, `/discover/${type}`, rest, { ttl: parseTtl(env, 3600) });
}
