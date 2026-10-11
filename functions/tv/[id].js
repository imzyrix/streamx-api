import { parseTtl, json, fail } from "../_lib/upstream.js";
import { tvmazeShow } from "../_lib/tvmaze.js";

export async function onRequestGet(context) {
  const { params, env } = context;
  const show = await tvmazeShow(context, params.id);
  if (!show) return fail("No TVmaze match for that id. Use an IMDb id (tt…) or a TVmaze show id.", 404);
  return json(
    {
      ok: true,
      requiresApiKey: false,
      id: String(params.id),
      show,
      generatedAt: new Date().toISOString(),
    },
    { ttl: parseTtl(env, 86400) },
  );
}
