import { json } from "./_lib/upstream.js";

const VERSION = "1.1.0";

export function onRequestGet() {
  return json(
    {
      ok: true,
      service: "streamx-api",
      version: VERSION,
      requiresApiKey: false,
      upstreams: ["cinemeta", "metahub", "wikidata", "wikipedia", "imdb-suggestion"],
      endpoints: {
        catalog: "/catalog/:type/:catalog?genre=&skip=&search=",
        search: "/search?q=&type=movie|series&skip=",
        imdbSearch: "/imdb/search?q=",
        meta: "/meta/:type/:id?enrich=0",
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
