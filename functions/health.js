/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

import { json } from "./_lib/upstream.js";

const VERSION = "1.3.0";

export function onRequestGet() {
  return json(
    {
      ok: true,
      service: "streamx-api",
      version: VERSION,
      requiresApiKey: false,
      upstreams: [
        "cinemeta",
        "metahub",
        "wikidata",
        "wikipedia",
        "imdb-suggestion",
        "rottentomatoes",
        "metacritic",
        "justwatch",
        "tvmaze",
        "anilist",
      ],
      endpoints: {
        catalog: "/catalog/:type/:catalog?genre=&skip=&search=",
        search: "/search?q=&type=movie|series&skip=",
        imdbSearch: "/imdb/search?q=",
        meta: "/meta/:type/:id?enrich=0",
        scores: "/scores/:type/:id",
        credits: "/credits/:type/:id",
        person: "/person/:id",
        similar: "/similar/:type/:id",
        trending: "/trending/:type?limit=",
        streaming: "/streaming/:type/:id?country=US",
        tv: "/tv/:id",
        anime: "/anime/search?q=",
        images: "/images/:type/:id?direct=1",
        image: "/img/:kind/:size/:id/img",
        still: "/img/still/:id/:season/:episode/:size",
        raw: "/cinemeta/<path>",
      },
      imageKinds: ["poster", "background", "logo"],
      imageSizes: ["small", "medium", "large", "original"],
      stillSizes: ["w92", "w154", "w185", "w300", "w342", "w500", "w780", "original"],
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
