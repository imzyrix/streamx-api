/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

import { json, fail } from "../../_lib/upstream.js";
import { imageManifest } from "../../_lib/images.js";

export async function onRequestGet(context) {
  const { params, request } = context;
  const id = String(params.id || "");
  if (!/^tt\d+$/i.test(id)) return fail("Missing or invalid IMDb id. Use /images/movie/tt0133093.", 400);

  const origin = new URL(request.url).origin;
  const direct = new URL(request.url).searchParams.get("direct") === "1";

  return json(
    {
      ok: true,
      type: params.type || null,
      ...imageManifest(id, origin, { direct }),
    },
    { ttl: 2592000 },
  );
}
