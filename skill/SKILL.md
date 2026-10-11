---
name: streamx-api
description: Use the StreamX API to fetch movie and TV metadata, search titles, get posters/backdrops/logos and episode stills, critic scores (IMDb, Rotten Tomatoes, Metacritic), cast and crew, similar titles, person bios, and where-to-watch streaming providers. Trigger this skill whenever a task needs film/show data, artwork, ratings, credits or streaming availability without registering for an API key. No API key is ever required.
license: MIT
---

# StreamX API

A **keyless**, self-hostable movie & TV metadata API. One base URL gives you
discovery (catalogue + search), details, artwork at every size, critic scores,
cast & crew, similar titles, person bios, TV/anime data and where-to-watch.

- **Hosted base URL:** `https://api.streamx.qzz.io` (fallback `https://streamx-api.pages.dev`)
- **No API key. No signup. No rate-limit headers to manage.**
- All responses are JSON (image routes return image bytes).
- Every route is `GET` (also `HEAD`); `OPTIONS` returns `204`; CORS is `*`.

## How to use this skill

1. Pick the base URL. Prefer `https://api.streamx.qzz.io`. If it fails, use
   `https://streamx-api.pages.dev`. If the user runs their own, use theirs.
2. Call the endpoint you need with a normal HTTP GET (use `curl`, `fetch`,
   `requests`, or the bundled MCP server — see "MCP server" below).
3. Read `id` fields (`tt…` IMDb ids) to chain calls: search → `id` → meta/scores/streaming.

> If the environment where you run can self-host, the user can also run their own
> copy of this API and point `STREAMX_API_BASE` at it. See `docs/SELF-HOST.md`.

## Endpoint cheat-sheet

| Need | Endpoint |
| --- | --- |
| Service status / version | `GET /health` |
| Browse a catalogue | `GET /catalog/:type/:catalog?genre=&skip=&search=` |
| Search titles | `GET /search?q=&type=movie\|series&skip=` |
| Search IMDb suggestions | `GET /imdb/search?q=` |
| Search anime (AniList) | `GET /anime/search?q=` |
| Full title details | `GET /meta/:type/:id?enrich=0` |
| Critic scores | `GET /scores/:type/:id` |
| Cast & crew | `GET /credits/:type/:id` |
| Person bio | `GET /person/:id` |
| Similar titles | `GET /similar/:type/:id` |
| Trending | `GET /trending/:type?limit=` |
| Where to watch | `GET /streaming/:type/:id?country=US` |
| TV show info (TVmaze) | `GET /tv/:id` |
| Artwork manifest | `GET /images/:type/:id?direct=1` |
| Poster/backdrop/logo file | `GET /img/:kind/:size/:id/img` |
| Episode still | `GET /img/still/:id/:season/:episode/:size` |
| Raw Cinemeta passthrough | `GET /cinemeta/<path>` |

`:type` is `movie` or `series` (`tv`, `show`, `tvshow`, … normalise to `series`).
`:id` is an IMDb id (`tt0133093`). Person ids are `nm…` (IMDb) or `Q…` (Wikidata).

## Copy-paste examples

```bash
# Search and take the first result's id
curl -s "https://api.streamx.qzz.io/search?q=dune&type=movie"
curl -s "https://api.streamx.qzz.io/catalog/movie/top?genre=Sci-Fi"

# Details, scores, streaming, credits in parallel
curl -s "https://api.streamx.qzz.io/meta/movie/tt0133093"
curl -s "https://api.streamx.qzz.io/scores/movie/tt0133093"
curl -s "https://api.streamx.qzz.io/streaming/movie/tt0133093?country=US"
curl -s "https://api.streamx.qzz.io/credits/movie/tt0133093"
curl -s "https://api.streamx.qzz.io/similar/movie/tt0133093"

# Series + a person
curl -s "https://api.streamx.qzz.io/meta/series/tt0944947"
curl -s "https://api.streamx.qzz.io/person/nm0000206"

# Artwork (direct file URLs you can put straight into an <img>)
https://api.streamx.qzz.io/img/poster/medium/tt0133093/img
https://api.streamx.qzz.io/img/background/large/tt0133093/img
https://api.streamx.qzz.io/img/still/tt0944947/1/1/w780
```

```js
const BASE = "https://api.streamx.qzz.io";
const res = await fetch(`${BASE}/search?q=dune&type=movie`);
const { metas } = await res.json();
const movie = metas[0];                    // { id: "tt1160419", name, poster, ... }
const scores = await (await fetch(`${BASE}/scores/movie/${movie.id}`)).json();
const watch = await (await fetch(`${BASE}/streaming/movie/${movie.id}?country=US`)).json();
```

```python
import requests
BASE = "https://api.streamx.qzz.io"
movie = requests.get(f"{BASE}/search", params={"q": "dune", "type": "movie"}).json()["metas"][0]
credits = requests.get(f"{BASE}/credits/movie/{movie['id']}").json()
top_cast = [p["name"] for p in credits["cast"][:5]]
```

## Key response shapes

**Catalogue / search / trending** return `{ ok, type, count, metas: [...] }`. Each
meta has `id`, `type`, `name`, `poster`, `background` (and often `releaseInfo`,
`imdbRating`, `genres`).

**`/meta/:type/:id`** returns `{ ok, meta: {...} }` where `meta` includes Cinemeta
fields plus `images`, `externalIds`, `facts` (Wikidata), `wiki`, `seasons`, `videos`
(with `still`) and `still` on episodes.

**`/scores/:type/:id`** returns `{ ok, imdb: {rating,url}, rottenTomatoes: {critics,audience}, metacritic: {critics,contentRating}, sources }`.

**`/credits/:type/:id`** returns `{ ok, cast: [{ id, wikidataId, name, role, image }], crew: [...], directors: [...] }`.

**`/person/:id`** returns `{ ok, name, description, image, born, died, externalIds, wiki }`.

**`/similar/:type/:id`** returns `{ ok, metas: [...] }` (same shape as a catalogue).

**`/streaming/:type/:id?country=`** returns `{ ok, providers: [{ name, types, quality, webUrl }], justWatchUrl }`.

## MCP server (optional, for MCP-capable agents)

The repo ships a zero-dependency MCP server in `mcp/` that exposes these routes as
tools (`streamx_search`, `streamx_meta`, `streamx_scores`, `streamx_streaming`,
`streamx_credits`, `streamx_similar`, `streamx_person`, `streamx_trending`,
`streamx_images`). Run it with:

```bash
STREAMX_API_BASE=https://api.streamx.qzz.io node mcp/server.mjs
```

Point any MCP client's stdio transport at that command.

## Etiquette & limits

- Responses are edge-cached; repeated calls are cheap. Be reasonable on cold calls.
- Upstream-backed fields are **fail-soft**: a missing score/provider returns `null`
  rather than an error. Always null-check optional fields.
- Do not scrape IMDb directly (its pages are bot-blocked for agents); this API already
  handles it server-side.
- See `skill/reference.md` for the complete field-by-field reference and
  `README.md` for architecture, deploy and self-hosting.
