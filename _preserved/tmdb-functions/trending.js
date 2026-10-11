import { tmdb, json, fail, readQuery, parseTtl } from "./_lib/tmdb.js";

const TYPES = new Set(["movie", "tv", "all"]);
const WINDOWS = new Set(["day", "week"]);

export function onRequestGet(context) {
  const { request, env } = context;
  const query = readQuery(request);

  const type = TYPES.has(query.type) ? query.type : "movie";
  const window = WINDOWS.has(query.window) ? query.window : "week";

  return tmdb(
    context,
    `/trending/${type}/${window}`,
    { page: query.page, language: query.language, region: query.region },
    { ttl: parseTtl(env, 3600) },
  );
}
