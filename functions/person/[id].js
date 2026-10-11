import { tmdb, readQuery, parseTtl, fail } from "../_lib/tmdb.js";

export function onRequestGet(context) {
  const { params, request, env } = context;
  if (!params.id) return fail("Missing person id.", 400);

  const query = readQuery(request);
  return tmdb(
    context,
    `/person/${params.id}`,
    {
      append_to_response: query.append || "combined_credits,external_ids,images",
      language: query.language,
    },
    { ttl: parseTtl(env) },
  );
}
