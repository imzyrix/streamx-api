/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

import { parseTtl, json, fail } from "../_lib/upstream.js";
import { person } from "../_lib/people.js";
import { wikipediaSummary } from "../_lib/enrich.js";

export async function onRequestGet(context) {
  const { params, env } = context;
  const id = String(params.id || "");
  if (!/^(nm\d+|Q\d+)$/i.test(id)) {
    return fail("Provide an IMDb (nm...) or Wikidata (Q...) person id, e.g. /person/nm0000206.", 400);
  }

  const ttl = parseTtl(env, 604800);
  const data = await person(context, id, { ttl });

  if (!data) {
    return fail("No person found for that id.", 404);
  }

  let wiki = null;
  if (data.name) {
    wiki = await wikipediaSummary(context, data.name).catch(() => null);
  }

  return json({ ok: true, ...data, wiki, generatedAt: new Date().toISOString() }, { ttl });
}
