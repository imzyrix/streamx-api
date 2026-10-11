import { parseTtl, json, fail } from "../_lib/upstream.js";
import { anilistSearch } from "../_lib/tvmaze.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const query = new URL(request.url).searchParams.get("q") || "";
  if (!query.trim()) return fail("Missing search term. Add ?q=<anime title>.", 400);

  const results = await anilistSearch(context, query);
  return json(
    {
      ok: true,
      source: "anilist",
      requiresApiKey: false,
      query,
      count: results ? results.length : 0,
      results: results || [],
    },
    { ttl: parseTtl(env, 86400) },
  );
}
