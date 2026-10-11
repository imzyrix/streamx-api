/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

import { fetchJson, parseTtl, json, CINEMETA } from "../_lib/upstream.js";

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
        "Raw Cinemeta passthrough. Use /cinemeta/<path>, e.g. /cinemeta/catalog/movie/top.json or /cinemeta/meta/series/tt0944947.json",
    });
  }

  let path = segments.join("/");
  if (!path.endsWith(".json")) path += ".json";

  const incoming = new URL(request.url);
  const url = `${CINEMETA}/${path}${incoming.search}`;

  return fetchJson(context, url, { ttl: parseTtl(env, 21600) });
}
