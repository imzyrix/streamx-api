import { tmdb, readQuery, parseTtl, fail } from "../../../../_lib/tmdb.js";

export function onRequestGet(context) {
  const { params, request, env } = context;
  if (!params.id || !params.season) return fail("Missing tv show id or season number.", 400);

  const query = readQuery(request);
  return tmdb(
    context,
    `/tv/${params.id}/season/${params.season}`,
    {
      append_to_response: query.append || "credits,videos,images",
      language: query.language,
      include_image_language: query.include_image_language || "en,null",
    },
    { ttl: parseTtl(env) },
  );
}
