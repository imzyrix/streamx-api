import { tmdb, readQuery, parseTtl, fail } from "../_lib/tmdb.js";

const DEFAULT_APPEND =
  "credits,videos,recommendations,similar,images,keywords,external_ids,release_dates";

export function onRequestGet(context) {
  const { params, request, env } = context;
  if (!params.id) return fail("Missing movie id.", 400);

  const query = readQuery(request);
  return tmdb(
    context,
    `/movie/${params.id}`,
    {
      append_to_response: query.append || DEFAULT_APPEND,
      language: query.language,
      region: query.region,
      include_image_language: query.include_image_language || "en,null",
    },
    { ttl: parseTtl(env) },
  );
}
