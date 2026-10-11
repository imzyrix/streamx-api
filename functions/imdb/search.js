import { json, fail, readQuery } from "../_lib/upstream.js";
import { imdbSearch } from "../_lib/enrich.js";

export async function onRequestGet(context) {
  const query = readQuery(context.request);
  const term = query.q || query.query || query.search;
  if (!term) return fail("Missing search term. Add ?q=<query>.", 400);

  const results = await imdbSearch(context, term);
  if (!results) return fail("IMDb suggestion service is unavailable right now.", 502);

  return json(
    {
      ok: true,
      source: "imdb-suggestion",
      requiresApiKey: false,
      query: term,
      count: results.length,
      results,
    },
    { ttl: 86400 },
  );
}
