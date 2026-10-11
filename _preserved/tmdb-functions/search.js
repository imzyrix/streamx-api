import { tmdb, fail, readQuery, parseTtl } from "./_lib/tmdb.js";

const TYPES = new Set(["movie", "tv", "person", "multi"]);

export function onRequestGet(context) {
  const { request, env } = context;
  const query = readQuery(request);

  const term = query.q || query.query || query.search;
  if (!term) return fail("Missing search term. Add ?q=<query>.", 400);

  const type = TYPES.has(query.type) ? query.type : "multi";

  return tmdb(
    context,
    `/search/${type}`,
    {
      query: term,
      page: query.page,
      language: query.language,
      region: query.region,
      include_adult: query.include_adult || "false",
      year: query.year,
      primary_release_year: query.primary_release_year,
      first_air_date_year: query.first_air_date_year,
    },
    { ttl: parseTtl(env, 3600) },
  );
}
