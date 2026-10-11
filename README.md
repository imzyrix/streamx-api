# StreamX API

A self-hostable **movie & TV metadata + artwork** API built for **Cloudflare Pages
Functions**. It needs **no API keys, no accounts, and no secrets** — it reads the open
[Cinemeta](https://github.com/Stremio/stremio-addon-sdk) catalog (the Stremio metadata
addon), the **MetaHub** image CDN, **Wikidata**, **Wikipedia**, and IMDb's public
suggestion endpoint, then caches everything at the Cloudflare edge.

```
https://api.streamx.qzz.io
```

---

## Table of contents

- [What it is](#what-it-is)
- [Features](#features)
- [Data sources](#data-sources)
- [Project layout](#project-layout)
- [Quick start (local)](#quick-start-local)
- [Deploy to Cloudflare Pages](#deploy-to-cloudflare-pages)
- [Configuration](#configuration)
- [API reference](#api-reference)
  - [Discovery](#discovery)
  - [Details](#details)
  - [Images & stills](#images--stills)
  - [Raw passthrough](#raw-passthrough)
  - [Health](#health)
- [The image system](#the-image-system)
- [The enrichment layer](#the-enrichment-layer)
- [Response fields reference](#response-fields-reference)
- [Caching, headers & errors](#caching-headers--errors)
- [Examples](#examples)
- [Limitations](#limitations)
- [Extending the API](#extending-the-api)
- [Attribution](#attribution)

---

## What it is

StreamX API is a thin, cached, keyless façade over a handful of public media services.
It exists so that the [StreamX](https://streamx.qzz.io) web app — and anything else you
self-host — can render catalogues, detail pages, episodes, full artwork sets and
rich facts without ever registering for an API key.

It is a **Cloudflare Pages Functions** project: the `functions/` directory is
file-based routing, `public/` is the static output, and there is no build step.

---

## Features

### Catalog & discovery
- **Top movies and top series** via `/catalog/:type/:catalog`.
- **Genre filtering** (`genre=Action`, `Drama`, `Comedy`, `Sci-Fi`, `Animation`, …).
- **Pagination** with `skip` (the upstream serves pages of ~100).
- **Text search** across movies and series via `/search?q=`.
- **IMDb search** via `/imdb/search?q=` returning posters, year, type and top cast.
- Every catalog/search response echoes the parsed `query` and adds a `count`.

### Details & enrichment
- Full Cinemeta `meta` object: name, description, cast, director, writer, genres,
  year, released, runtime, IMDb rating, awards, country, trailers, and **episode lists**
  for series.
- **Wikidata enrichment** (keyless SPARQL): budget, box office, runtime, MPA
  certification, official website, production companies, countries, languages,
  directors, composers, "part of series", and external IDs.
- **Wikipedia synopsis** for every title.
- **External identifiers**: IMDb, TMDb, TVDB, Rotten Tomatoes and Metacritic.
- **Season numbers** derived from the episode list.
- `?enrich=0` fast path that skips Wikidata/Wikipedia entirely.

### Artwork & stills
- **Poster, backdrop (background) and logo** — each in **four sizes**:
  `small`, `medium`, `large`, `original`.
- **Episode stills** at every TMDB width bucket: `w92`, `w154`, `w185`, `w300`,
  `w342`, `w500`, `w780`, `original`, plus human aliases (`small`, `medium`,
  `large`, `xlarge`).
- A single **image manifest** endpoint (`/images/:type/:id`) that returns every
  artwork URL at once, either proxied through this API or as raw MetaHub URLs
  (`?direct=1`).
- A per-episode `still` URL is attached to every entry in `meta.videos`.

### Keyless & self-hosted
- **Zero API keys.** Nothing to sign up for, no secrets to configure.
- Runs entirely on Cloudflare's free tier.
- **Edge-cached** JSON (per-endpoint TTLs) and images (30-day immutable cache).
- **CORS enabled** — call it from any origin, browser or server.
- Graceful degradation: if Wikidata/Wikipedia is slow or down, the metadata is
  still returned.

---

## Data sources

| Service | Used for | Auth |
| --- | --- | --- |
| **Cinemeta** (`v3-cinemeta.strem.io`) | Catalogue, search, titles, cast, ratings, episodes | none |
| **MetaHub** (`images.metahub.space`) | Posters, backdrops, logos | none |
| **MetaHub episodes** (`episodes.metahub.space`) | Episode stills (resolves to `image.tmdb.org`) | none |
| **Wikidata** (`query.wikidata.org`) | Budget, box office, companies, external IDs | none |
| **Wikipedia** (`*.wikipedia.org/api/rest_v1`) | Synopsis | none |
| **IMDb suggestion** (`v2.sg.media-imdb.com`) | Search suggestions, Amazon posters, top cast | none |

> The original key-based TMDB implementation is preserved (unrouted) under
> `_preserved/tmdb-functions/` and is **not** deployed.

---

## Project layout

```
api/
├── functions/                     # Cloudflare Pages Functions (file-based routes)
│   ├── _lib/
│   │   ├── upstream.js            # Cinemeta/MetaHub fetch + edge cache + json()/fail() helpers
│   │   ├── images.js              # artwork kinds/sizes, still sizes, URL + manifest builders
│   │   └── enrich.js              # Wikidata SPARQL, Wikipedia summary, IMDb suggestion
│   ├── _middleware.js             # CORS, OPTIONS, method guard, error handling
│   ├── health.js                  # /health
│   ├── search.js                  # /search
│   ├── imdb/search.js             # /imdb/search
│   ├── catalog/[type]/[catalog].js# /catalog/:type/:catalog
│   ├── meta/[type]/[id].js        # /meta/:type/:id   (Cinemeta + images + enrichment)
│   ├── images/[type]/[id].js      # /images/:type/:id
│   ├── img/[[path]].js            # /img/... artwork + episode stills proxy
│   └── cinemeta/[[path]].js       # /cinemeta/... raw upstream passthrough
├── public/
│   ├── index.html                 # landing / docs page
│   └── _routes.json               # route include/exclude config
├── _preserved/tmdb-functions/     # old key-based implementation (not deployed)
├── wrangler.toml                  # Pages project config
└── package.json
```

Underscore-prefixed files and folders (`_lib`, `_middleware.js`) are **not** routed.

---

## Quick start (local)

```bash
cd api
npm install
npm run dev            # http://localhost:8788
```

Then open or curl:

```bash
curl http://localhost:8788/health
curl http://localhost:8788/catalog/movie/top
curl http://localhost:8788/meta/movie/tt0133093
```

> `npm run dev` runs `wrangler pages dev`. Locally the edge cache may report `MISS`
> every time; that is expected.

---

## Deploy to Cloudflare Pages

### Option A — Wrangler CLI

```bash
cd api
npm install
npx wrangler login
npx wrangler pages deploy
```

Wrangler creates the project and prints your URL: `https://<project>.pages.dev`.

### Option B — Git integration

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. **Root directory:** `/` · **Build command:** *(empty)* · **Build output directory:** `public`.
4. Deploy. No environment variables are required.

### Option C — Direct upload

```bash
cd api
npx wrangler pages deploy public
```

### Custom domain

Pages project → **Custom domains → Set up a custom domain** (e.g. `api.example.com`).
The record must be a **proxied CNAME** to `<project>.pages.dev`; stray `A` records
produce `522`/`523` edge errors.

---

## Configuration

All optional:

| Variable | Default | Description |
| --- | --- | --- |
| `CACHE_TTL` | `86400` | Default JSON edge-cache TTL, in seconds |

No secrets are required. Set variables in `wrangler.toml` under `[vars]` or in
`.dev.vars` locally (see `.dev.vars.example`).

---

## API reference

Base URL: `https://api.streamx.qzz.io` (or your own `*.pages.dev`).

All routes accept `GET` (and `HEAD`); `OPTIONS` returns `204` for CORS preflight.
All responses are JSON unless noted. `:type` is `movie` or `series` (aliases such as
`tv`, `show`, `tvshow` are normalised to `series`).

### Discovery

| Route | Description |
| --- | --- |
| `GET /catalog/:type/:catalog?genre=&skip=&search=` | Catalogue listing (`:catalog` defaults to `top`). |
| `GET /search?q=<term>&type=movie\|series&skip=` | Title search. |
| `GET /imdb/search?q=<term>` | IMDb suggestions (poster, year, top cast). |

**`/catalog`** and **`/search`** add `query` (echo) and `count` to the upstream payload.

```bash
curl "https://api.streamx.qzz.io/catalog/movie/top?genre=Action&skip=0"
curl "https://api.streamx.qzz.io/search?q=dune&type=movie"
curl "https://api.streamx.qzz.io/imdb/search?q=dune"
```

`/imdb/search` returns:

```json
{
  "ok": true,
  "source": "imdb-suggestion",
  "requiresApiKey": false,
  "query": "dune",
  "count": 7,
  "results": [
    {
      "id": "tt1160419",
      "title": "Dune",
      "type": "movie",
      "kind": "feature",
      "year": 2021,
      "rank": 316,
      "stars": ["Timothée Chalamet", "Rebecca Ferguson"],
      "poster": "https://m.media-amazon.com/images/M/MV5B...jpg",
      "posterWidth": 1728,
      "posterHeight": 2552
    }
  ]
}
```

### Details

| Route | Description |
| --- | --- |
| `GET /meta/movie/<imdb_id>` | Movie details + images + enrichment. |
| `GET /meta/series/<imdb_id>` | Series details + episodes + images + enrichment. |

Options: `?enrich=0` skips Wikidata/Wikipedia (fast path).

The `/meta` response keeps the upstream `meta` object and **adds** `images`,
`externalIds`, `seasons`, `still`, `videos[].still`, `facts` and `wiki`
(see [Response fields reference](#response-fields-reference)).

```bash
curl "https://api.streamx.qzz.io/meta/movie/tt0133093"
curl "https://api.streamx.qzz.io/meta/series/tt0944947"
curl "https://api.streamx.qzz.io/meta/movie/tt0133093?enrich=0"
```

### Images & stills

| Route | Description |
| --- | --- |
| `GET /images/:type/:id` | Full artwork manifest (all kinds × all sizes). `?direct=1` returns raw MetaHub URLs. |
| `GET /img/poster/<size>/<imdb_id>/img` | Poster. |
| `GET /img/background/<size>/<imdb_id>/img` | Backdrop. |
| `GET /img/logo/<size>/<imdb_id>/img` | Logo. |
| `GET /img/still/<imdb_id>/<season>/<episode>/<size>` | Episode still. |

```bash
curl "https://api.streamx.qzz.io/images/movie/tt0133093"
curl "https://api.streamx.qzz.io/images/movie/tt0133093?direct=1"
curl "https://api.streamx.qzz.io/img/poster/medium/tt0133093/img"
curl "https://api.streamx.qzz.io/img/background/original/tt0133093/img"
curl "https://api.streamx.qzz.io/img/still/tt0944947/1/1/w780"
```

### Raw passthrough

| Route | Description |
| --- | --- |
| `GET /cinemeta/<path>` | Raw Cinemeta response, still edge-cached. |

```bash
curl "https://api.streamx.qzz.io/cinemeta/catalog/movie/top.json"
curl "https://api.streamx.qzz.io/cinemeta/meta/series/tt0944947.json"
```

### Health

| Route | Description |
| --- | --- |
| `GET /health` | Service status, version, upstreams, endpoint map, valid image sizes. |

```json
{
  "ok": true,
  "service": "streamx-api",
  "version": "1.1.0",
  "requiresApiKey": false,
  "upstreams": ["cinemeta", "metahub", "wikidata", "wikipedia", "imdb-suggestion"],
  "imageKinds": ["poster", "background", "logo"],
  "imageSizes": ["small", "medium", "large", "original"],
  "stillSizes": ["w92", "w154", "w185", "w300", "w342", "w500", "w780", "original"]
}
```

---

## The image system

Artwork comes from MetaHub, which serves **one** artwork per kind per title, generated
from the title's IMDb id.

**Kinds** — `poster`, `background` (backdrop), `logo`.

**Sizes** — `small`, `medium`, `large`, `original`.
MetaHub returns WebP for small/medium posters and JPEG/PNG for large/original.

**Episode still sizes** — `w92`, `w154`, `w185`, `w300`, `w342`, `w500`, `w780`,
`original`, with aliases:

| Alias | Resolves to |
| --- | --- |
| `small` | `w185` |
| `medium` | `w500` |
| `large` | `w780` |
| `xlarge` | `original` |
| *unknown* | falls back to `w780` |

**Two ways to address images**

- **Proxied** (default): `…/img/poster/medium/tt0133093/img` — served from this API,
  edge-cached, uniform CORS.
- **Direct**: `https://images.metahub.space/poster/medium/tt0133093/img` — the raw
  upstream URL, returned by `/images/:type/:id?direct=1`.

**Manifest**

```json
{
  "ok": true,
  "type": "movie",
  "id": "tt0133093",
  "source": "streamx",
  "direct": false,
  "kinds": ["poster", "background", "logo"],
  "sizes": ["small", "medium", "large", "original"],
  "poster": {
    "small": "https://api.streamx.qzz.io/img/poster/small/tt0133093/img",
    "medium": "https://api.streamx.qzz.io/img/poster/medium/tt0133093/img",
    "large": "https://api.streamx.qzz.io/img/poster/large/tt0133093/img",
    "original": "https://api.streamx.qzz.io/img/poster/original/tt0133093/img"
  },
  "background": { "...": "..." },
  "logo": { "...": "..." }
}
```

---

## The enrichment layer

Enrichment runs **in parallel** with the Cinemeta fetch, is edge-cached for a week, and
fails soft (a missing source simply omits its fields).

### Wikidata (SPARQL, keyless)

Resolved from the title's IMDb id (`P345`). Properties used:

| Output field | Wikidata property |
| --- | --- |
| `budget` | `P2130` (capital cost) |
| `boxOffice` | `P2142` |
| `runtimeMinutes` | `P2047` |
| `certification` | `P1657` (MPA rating) |
| `officialWebsite` | `P856` |
| `countries` | `P495` |
| `languages` | `P364` |
| `productionCompanies` | `P272` |
| `genres` | `P136` |
| `directors` | `P57` |
| `composers` | `P86` |
| `partOfSeries` | `P179` |
| `externalIds.rottenTomatoes` | `P1258` |
| `externalIds.metacritic` | `P1712` |
| `externalIds.tmdb` | `P4947` (movie) / `P4983` (TV) |

### Wikipedia (REST, keyless)

`…/api/rest_v1/page/summary/<title>` returns a short description plus the article
extract, used as `wiki`.

### IMDb suggestion (keyless)

`v2.sg.media-imdb.com/suggestion/<bucket>/<q>.json` powers `/imdb/search`. The bucket is
the first alphanumeric character of the query. Non-title rows (people, franchises) are
filtered out; only `tt…` ids are returned.

---

## Response fields reference

The object inside `meta` (for `/meta`):

| Field | Type | Description |
| --- | --- | --- |
| `imdb_id`, `name`, `type`, `description` | string | Core identity and synopsis. |
| `poster`, `background`, `logo` | string | Upstream single artwork URLs (kept for compatibility). |
| `cast`, `director`, `writer` | string[] | People. |
| `genres`, `genre` | string[] / string | Genres. |
| `year`, `released`, `runtime`, `country` | – | Release facts. |
| `imdbRating`, `awards`, `popularity` | – | Ratings and awards. |
| `trailers`, `trailerStreams` | object[] | YouTube trailers. |
| `videos` | object[] | Episodes (series): `season`, `number`, `name`, `overview`, `thumbnail`, `firstAired`, `still`. |
| **`images`** | object | `poster` / `background` / `logo`, each with `small`/`medium`/`large`/`original`. |
| **`externalIds`** | object | `imdb`, `tmdb`, `tvdb`, `rottenTomatoes`, `metacritic`. |
| **`seasons`** | number[] | Sorted season numbers (series). |
| **`still`** | object | `{ sizes, template }` for episode stills (series). |
| **`facts`** | object | Wikidata fields (budget, boxOffice, runtimeMinutes, certification, officialWebsite, countries, languages, productionCompanies, genres, directors, composers, partOfSeries, `externalIds`). |
| **`wiki`** | object | `{ title, description, extract, url, thumbnail }`. |

---

## Caching, headers & errors

| Header | Meaning |
| --- | --- |
| `x-source` | Always `streamx-api`. |
| `x-cache` | `HIT` (edge cache) or `MISS` (freshly fetched). |
| `cache-control` | Per endpoint; images are `immutable` for 30 days. |
| `access-control-allow-origin` | `*` |

Per-endpoint JSON TTLs:

| Endpoint | TTL |
| --- | --- |
| `/catalog`, `/search` | 6 h |
| `/meta` | 24 h (`CACHE_TTL` override) |
| `/imdb/search` | 24 h |
| `/images` | 30 d |
| `/img`, `/img/still` | 30 d (immutable) |
| Wikidata / Wikipedia | 7 d |

Errors are JSON with `ok: false`:

```json
{ "ok": false, "error": "Missing search term. Add ?q=<query>.", "detail": null }
```

| Status | When |
| --- | --- |
| `400` | Missing/invalid parameters. |
| `404` | Upstream has no such title/image. |
| `405` | Method other than GET/HEAD/OPTIONS. |
| `502` | Upstream unreachable or malformed. |
| `500` | Unexpected internal error. |

---

## Examples

### cURL

```bash
BASE=https://api.streamx.qzz.io

curl "$BASE/health"
curl "$BASE/catalog/movie/top?genre=Sci-Fi&skip=0"
curl "$BASE/catalog/series/top?genre=Drama"
curl "$BASE/search?q=matrix&type=movie"
curl "$BASE/imdb/search?q=breaking%20bad"
curl "$BASE/meta/movie/tt0133093"
curl "$BASE/meta/series/tt0944947"
curl "$BASE/meta/movie/tt0133093?enrich=0"
curl "$BASE/images/movie/tt0133093"
# Poster, backdrop, logo, episode still:
# $BASE/img/poster/medium/tt0133093/img
# $BASE/img/background/original/tt0133093/img
# $BASE/img/logo/large/tt0133093/img
# $BASE/img/still/tt0944947/1/1/w780
```

### JavaScript

```js
const BASE = "https://api.streamx.qzz.io";

// Catalogue
const { metas } = await fetch(`${BASE}/catalog/movie/top?genre=Action`).then(r => r.json());

// Detail with images + facts + plot
const { meta } = await fetch(`${BASE}/meta/movie/tt0133093`).then(r => r.json());
const poster = meta.images.poster.large;
const facts = meta.facts;      // { budget, boxOffice, productionCompanies, ... }
const plot  = meta.wiki?.extract;

// Full artwork set for a series
const art = await fetch(`${BASE}/images/series/tt0944947`).then(r => r.json());

// Episode still via size alias
const still = `${BASE}/img/still/tt0944947/1/1/large`;
```

---

## Limitations

- **One distinct artwork per title.** Cinemeta/MetaHub expose a single poster, backdrop
  and logo per title; the "multiple images" are the four size renditions. Alternate
  poster *designs* live on TMDb's `/images` endpoint, which needs a key.
- **IMDb is search-only.** IMDb's public GraphQL endpoint returns `403`; only the
  suggestion endpoint is usable keyless, so IMDb contributes search results, not detail.
- **Community upstreams.** Cinemeta/MetaHub are community-run and have no uptime SLA.
- **SPARQL latency.** Wikidata is queried with a short timeout and fails soft; use
  `?enrich=0` if you want the fastest possible `/meta`.

---

## Extending the API

- Swap or add a data source in **`functions/_lib/upstream.js`** (Cinemeta/MetaHub base
  URLs and the fetch/cache helpers live here).
- Tune the artwork matrix in **`functions/_lib/images.js`**.
- Add or change enrichment providers in **`functions/_lib/enrich.js`**.
- Add a route by creating a file under **`functions/`** (e.g. `functions/person/[id].js`
  → `/person/:id`). Underscore-prefixed files are not routed.

---

## Attribution

Metadata and artwork originate from **Cinemeta**, **MetaHub**, **Wikidata**,
**Wikipedia** and **IMDb**. This project only proxies and caches them. If you need
guaranteed commercial-grade uptime or richer fields, replace the data layer in
`functions/_lib/upstream.js`.
