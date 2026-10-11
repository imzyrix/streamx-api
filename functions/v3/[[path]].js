import { tmdb, readQuery, parseTtl, json } from "../_lib/tmdb.js";

export function onRequestGet(context) {
  const { params, request, env } = context;
  const segments = Array.isArray(params.path)
    ? params.path
    : params.path
      ? [params.path]
      : [];

  if (segments.length === 0) {
    return json({
      ok: true,
      message:
        "Raw TMDB passthrough. Use /v3/<tmdb-path>, e.g. /v3/movie/603, /v3/search/multi?query=matrix or /v3/tv/1399.",
    });
  }

  const path = "/" + segments.join("/");
  const query = readQuery(request);
  return tmdb(context, path, query, { ttl: parseTtl(env) });
}
