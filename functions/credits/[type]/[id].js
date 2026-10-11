/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

import { normalizeType, parseTtl, json, fail } from "../../_lib/upstream.js";
import { credits } from "../../_lib/people.js";

export async function onRequestGet(context) {
  const { params, env } = context;
  const id = String(params.id || "");
  if (!/^tt\d+$/i.test(id)) {
    return fail("Provide an IMDb id, e.g. /credits/movie/tt0133093.", 400);
  }

  const type = normalizeType(params.type);
  const ttl = parseTtl(env, 604800);
  const data = await credits(context, type, id, { ttl });

  if (!data) {
    return fail("No credits found for that id.", 404);
  }

  return json({ ok: true, ...data, generatedAt: new Date().toISOString() }, { ttl });
}
