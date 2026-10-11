/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

import { onRequestGet as health } from "../functions/health.js";
import { onRequestGet as search } from "../functions/search.js";
import { onRequestGet as imdbSearch } from "../functions/imdb/search.js";
import { onRequestGet as animeSearch } from "../functions/anime/search.js";
import { onRequestGet as catalog } from "../functions/catalog/[type]/[catalog].js";
import { onRequestGet as meta } from "../functions/meta/[type]/[id].js";
import { onRequestGet as scores } from "../functions/scores/[type]/[id].js";
import { onRequestGet as credits } from "../functions/credits/[type]/[id].js";
import { onRequestGet as person } from "../functions/person/[id].js";
import { onRequestGet as similar } from "../functions/similar/[type]/[id].js";
import { onRequestGet as trending } from "../functions/trending/[type].js";
import { onRequestGet as streaming } from "../functions/streaming/[type]/[id].js";
import { onRequestGet as tv } from "../functions/tv/[id].js";
import { onRequestGet as images } from "../functions/images/[type]/[id].js";
import { onRequestGet as img } from "../functions/img/[[path]].js";
import { onRequestGet as cinemeta } from "../functions/cinemeta/[[path]].js";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,HEAD,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
  "access-control-max-age": "86400",
};

const ROUTES = [
  { re: /^\/$/, handler: () => welcome() },
  { re: /^\/health$/, handler: health },
  { re: /^\/search$/, handler: search },
  { re: /^\/imdb\/search$/, handler: imdbSearch },
  { re: /^\/anime\/search$/, handler: animeSearch },
  { re: /^\/catalog\/([^/]+)(?:\/([^/]+))?$/, handler: catalog, params: (m) => ({ type: m[1], catalog: m[2] || "top" }) },
  { re: /^\/meta\/([^/]+)\/([^/]+)$/, handler: meta, params: (m) => ({ type: m[1], id: m[2] }) },
  { re: /^\/scores\/([^/]+)\/([^/]+)$/, handler: scores, params: (m) => ({ type: m[1], id: m[2] }) },
  { re: /^\/credits\/([^/]+)\/([^/]+)$/, handler: credits, params: (m) => ({ type: m[1], id: m[2] }) },
  { re: /^\/person\/([^/]+)$/, handler: person, params: (m) => ({ id: m[1] }) },
  { re: /^\/similar\/([^/]+)\/([^/]+)$/, handler: similar, params: (m) => ({ type: m[1], id: m[2] }) },
  { re: /^\/trending\/([^/]+)$/, handler: trending, params: (m) => ({ type: m[1] }) },
  { re: /^\/streaming\/([^/]+)\/([^/]+)$/, handler: streaming, params: (m) => ({ type: m[1], id: m[2] }) },
  { re: /^\/tv\/([^/]+)$/, handler: tv, params: (m) => ({ id: m[1] }) },
  { re: /^\/images\/([^/]+)\/([^/]+)$/, handler: images, params: (m) => ({ type: m[1], id: m[2] }) },
  { re: /^\/img\/(.+)$/, handler: img, params: (m) => ({ path: m[1].split("/") }) },
  { re: /^\/cinemeta\/?(.*)$/, handler: cinemeta, params: (m) => ({ path: m[1] ? m[1].split("/") : [] }) },
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });
}

function welcome() {
  return jsonResponse({
    ok: true,
    service: "streamx-api",
    message: "Keyless movie & TV metadata, artwork, scores and where-to-watch API.",
    health: "/health",
    docs: "https://github.com/imzyrix/streamx-api",
  });
}

export async function handle(request) {
  const method = (request.method || "GET").toUpperCase();
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (method !== "GET" && method !== "HEAD") {
    return jsonResponse({ ok: false, error: "Method not allowed. Use GET." }, 405);
  }

  const url = new URL(request.url);
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;

  for (const route of ROUTES) {
    const match = route.re.exec(path);
    if (!match) continue;
    const params = route.params ? route.params(match) : {};
    const context = {
      request,
      params,
      env: typeof process !== "undefined" && process.env ? process.env : {},
      waitUntil: () => {},
      next: async () => new Response(null, { status: 404 }),
    };
    try {
      const response = await route.handler(context);
      if (response instanceof Response) {
        const headers = new Headers(response.headers);
        for (const [key, value] of Object.entries(CORS)) {
          if (!headers.has(key)) headers.set(key, value);
        }
        return new Response(response.body, { status: response.status, headers });
      }
      return response;
    } catch (error) {
      return jsonResponse({ ok: false, error: "Internal error", detail: String((error && error.message) || error) }, 500);
    }
  }

  return jsonResponse({ ok: false, error: "Not found", path }, 404);
}
