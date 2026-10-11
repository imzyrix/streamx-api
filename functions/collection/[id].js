import { tmdb, readQuery, parseTtl, fail } from "../_lib/tmdb.js";

export function onRequestGet(context) {
  const { params, request, env } = context;
  if (!params.id) return fail("Missing collection id.", 400);

  const query = readQuery(request);
  return tmdb(
    context,
    `/collection/${params.id}`,
    {
      append_to_response: query.append || "images",
      language: query.language,
      include_image_language: query.include_image_language || "en,null",
    },
    { ttl: parseTtl(env) },
  );
}
