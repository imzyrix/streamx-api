import { tmdb, parseTtl } from "./_lib/tmdb.js";

export function onRequestGet(context) {
  const { env } = context;
  return tmdb(context, "/configuration", {}, { ttl: parseTtl(env, 86400) });
}
