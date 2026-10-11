import { json } from "./_lib/tmdb.js";

export function onRequestGet(context) {
  const { env } = context;
  const configured = Boolean((env && env.TMDB_API_KEY) || (env && env.TMDB_ACCESS_TOKEN));
  return json(
    {
      ok: true,
      service: "streamx-api",
      source: "tmdb",
      credentialsConfigured: configured,
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
