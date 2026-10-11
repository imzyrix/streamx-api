# StreamX API

> Keyless, self-hostable **movie & TV metadata, artwork, scores, credits and where-to-watch** API — runs on **Cloudflare Pages Functions, Vercel, Railway, Render or any Docker host**. Catalogues, search, full poster/backdrop/logo sets, episode stills, critic & audience ratings, cast & crew, person bios, similar titles, streaming availability and rich facts from Wikidata, Wikipedia, Rotten Tomatoes, Metacritic, JustWatch, TVmaze and AniList.

```
https://api.streamx.qzz.io
```

**No API keys. No sign-up. No secrets.** Everything is read from public endpoints and cached at the edge. Version **1.3.0**.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/imzyrix/streamx-api)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/imzyrix/streamx-api)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/imzyrix/streamx-api)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/imzyrix/streamx-api)

**Use it hosted — or fork it and run your own.** → [Self-hosting & forks](#self-hosting--forks) · **Using an AI agent?** → [For AI agents](#for-ai-agents)

Made by **[@imzyrix](https://github.com/imzyrix)** · part of **[@zyrixdevs](https://github.com/zyrixdevs)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docs: CC BY 4.0](https://img.shields.io/badge/Docs-CC--BY--4.0-lightgrey.svg)](LICENSE-DOCS)

---

## Table of contents

- [Why StreamX API](#why-streamx-api)
- [Feature overview](#feature-overview)
- [Data sources](#data-sources)
- [Architecture & project layout](#architecture--project-layout)
- [Quick start (local)](#quick-start-local)
- [Deploy](#deploy)
  - [Cloudflare Pages (primary)](#cloudflare-pages-primary)
  - [Vercel](#vercel)
  - [Railway](#railway)
  - [Render / Fly / Docker](#render--fly--docker)
- [For AI agents](#for-ai-agents)
- [Self-hosting & forks](#self-hosting--forks)
- [Configuration](#configuration)
- [API reference](#api-reference)
  - [Discovery](#discovery)
  - [Details](#details)
  - [Scores & ratings](#scores--ratings)
  - [People (credits, bios, similar)](#people-credits-bios-similar)
  - [Trending](#trending)
  - [Where to watch](#where-to-watch)
  - [TV & anime](#tv--anime)
  - [Images & stills](#images--stills)
  - [Raw passthrough](#raw-passthrough)
  - [Health](#health)
- [The image system](#the-image-system)
- [The enrichment layers](#the-enrichment-layers)
- [Response field reference](#response-field-reference)
- [Caching, headers & errors](#caching-headers--errors)
- [Usage recipes](#usage-recipes)
- [Limitations](#limitations)
- [Comparison with alternatives](#comparison-with-alternatives)
- [Gap analysis — what StreamX is missing](#gap-analysis--what-streamx-is-missing)
- [Roadmap to #1](#roadmap-to-1)
- [Extending the API](#extending-the-api)
- [Attribution & licensing](#attribution--licensing)

---

## Why StreamX API

Most movie/TV APIs make you register, hand over an email, manage an API key, throttle
your requests, and pay once you go commercial. StreamX API takes the opposite
approach:

- **Zero credentials** — clone, deploy, call. Nothing to configure.
- **One endpoint, many sources** — a single `/meta` call returns the title, cast,
  episodes, artwork, budget/box office, Wikipedia plot and external IDs. A single
  `/scores` call returns IMDb, Rotten Tomatoes and Metacritic side by side.
- **Self-hosted and private** — it runs in *your* Cloudflare account; no third-party
  gateway sees your traffic.
- **Edge-cached and free** — JSON is cached for hours/days, images for 30 days, so
  upstream is hit rarely and the free tier is plenty.

StreamX API is the data layer behind the [StreamX web app](https://streamx.qzz.io) and
is designed to be embedded in anything: web, mobile, TV, bots or CLIs.

---

## Feature overview

### Discovery
- Top **movies** and **series**, with **genre** filters and `skip` pagination.
- **Title search** across movies and series.
- **IMDb search** with high-resolution posters, year, type and top cast.
- **Anime search** via AniList with scores, genres and artwork.

### Details
- Full metadata: name, description, cast, director, writer, genres, year, release,
  runtime, IMDb rating, awards, country, trailers, and **episode lists** for series.
- **Wikidata**: budget, box office, runtime, MPA certification, official website,
  production companies, countries, languages, directors, composers, series, and
  external IDs (TMDb, TVDB, Rotten Tomatoes, Metacritic).
- **Wikipedia** synopsis.
- `?enrich=0` fast path to skip the enrichment network calls.

### Scores & ratings
- **IMDb** rating (via Cinemeta) with the canonical IMDb URL.
- **Rotten Tomatoes** **Tomatometer** and **Popcornmeter**: score, average rating,
  review count, sentiment and certified-fresh flag.
- **Metacritic** **Metascore**, review count and content rating.
- All returned together, with per-source availability flags.

### People & more
- **Cast & crew** with roles, photos and Wikidata/IMDb ids (`/credits`).
- **Person bios** with image, birth/death, social ids and a Wikipedia summary (`/person`).
- **Similar titles** — sequels and other works by the same director (`/similar`).
- **Trending** titles (`/trending`).

### Where to watch
- **JustWatch** streaming availability by country: subscription, free, rent and buy.
- Per-provider deep links and a canonical JustWatch URL.

### Artwork
- **Poster, backdrop and logo**, each in **four sizes** (`small`, `medium`, `large`,
  `original`).
- **Episode stills** at every width bucket (`w92`…`original`) plus friendly aliases.
- One **manifest** endpoint returning the whole artwork set, proxied or direct.

### TV & anime
- **TVmaze** show info: network, country, status, schedule dates, rating, genres,
  official site, imagery and external IDs.
- **AniList** anime search with average score, popularity, format and cover art.

### Platform
- Keyless, CORS-open, edge-cached, self-hostable, fail-soft, no build step.

---

## Data sources

| Service | Used for | Auth | Notes |
| --- | --- | --- | --- |
| **Cinemeta** (`v3-cinemeta.strem.io`) | Catalogues, search, titles, cast, ratings, episodes | none | Community Stremio metadata addon |
| **MetaHub** (`images.metahub.space`) | Posters, backdrops, logos | none | One artwork per kind per title |
| **MetaHub episodes** (`episodes.metahub.space`) | Episode stills | none | Resolves to `image.tmdb.org` |
| **Wikidata** (`query.wikidata.org`) | Budget, box office, companies, external IDs | none | SPARQL |
| **Wikipedia** (`*.wikipedia.org/api/rest_v1`) | Synopsis | none | REST summary |
| **IMDb suggestion** (`v2.sg.media-imdb.com`) | Search suggestions, Amazon posters, top cast | none | Public suggestion endpoint |
| **Rotten Tomatoes** (`rottentomatoes.com`) | Tomatometer & Popcornmeter | none | Public page data |
| **Metacritic** (`metacritic.com`) | Metascore | none | JSON-LD on the page |
| **JustWatch** (`apis.justwatch.com`) | Streaming availability | none | Public GraphQL |
| **TVmaze** (`api.tvmaze.com`) | TV show info | none | Official keyless API |
| **AniList** (`graphql.anilist.co`) | Anime search & scores | none | Public GraphQL |

> The original key-based TMDb implementation is preserved (unrouted) under
> `_preserved/tmdb-functions/` and is **not** deployed.

---

## Architecture & project layout

Cloudflare **Pages Functions** with file-based routing. `functions/` is the API,
`public/` is the static site, and there is **no build step**.

```
api/
├── functions/
│   ├── _lib/
│   │   ├── upstream.js      # Cinemeta/MetaHub fetch + edge cache + json()/fail()/CORS
│   │   ├── images.js        # artwork kinds/sizes, still sizes, manifest & URL builders
│   │   ├── enrich.js        # Wikidata SPARQL, Wikipedia summary, IMDb suggestion
│   │   ├── scrape.js        # cached fetch helpers, browser UA, HTML stripping
│   │   ├── people.js        # cast/crew, person bio, similar titles (Wikidata)
│   │   ├── scores.js        # Rotten Tomatoes + Metacritic parsing
│   │   ├── watch.js         # JustWatch offers (GraphQL)
│   │   └── tvmaze.js        # TVmaze show lookup + AniList search
│   ├── _middleware.js       # CORS, OPTIONS, method guard, error handling
│   ├── health.js            # /health
│   ├── search.js            # /search
│   ├── imdb/search.js       # /imdb/search
│   ├── anime/search.js      # /anime/search
│   ├── catalog/[type]/[catalog].js   # /catalog/:type/:catalog
│   ├── meta/[type]/[id].js            # /meta/:type/:id
│   ├── scores/[type]/[id].js          # /scores/:type/:id
│   ├── credits/[type]/[id].js         # /credits/:type/:id
│   ├── person/[id].js                 # /person/:id
│   ├── similar/[type]/[id].js         # /similar/:type/:id
│   ├── trending/[type].js             # /trending/:type
│   ├── streaming/[type]/[id].js       # /streaming/:type/:id
│   ├── tv/[id].js                     # /tv/:id
│   ├── images/[type]/[id].js          # /images/:type/:id
│   ├── img/[[path]].js                # /img/... artwork + stills proxy
│   └── cinemeta/[[path]].js           # /cinemeta/... raw passthrough
├── server/                     # portable Node server (Docker / Railway / Render / Fly)
│   ├── app.js                  # URL → handler dispatcher, shared by every runtime
│   └── index.js                # plain node:http server
├── api/index.js                # Vercel serverless entry (reuses server/app.js)
├── skill/                      # AI agent skill (SKILL.md + reference.md)
├── mcp/                        # zero-dependency MCP server exposing the API as tools
├── docs/SELF-HOST.md           # fork & self-host guide
├── llms.txt · llms-full.txt    # AI discovery docs
├── public/                     # landing / quick reference page
├── _preserved/tmdb-functions/  # old key-based implementation (not deployed)
├── Dockerfile · vercel.json · railway.json · render.yaml · fly.toml · wrangler.toml
├── LICENSE · LICENSE-DOCS      # MIT (code) · CC BY 4.0 (docs)
└── package.json
```

The same route handlers power **Cloudflare Pages Functions** and the **portable Node
server** — `server/app.js` maps every URL to the matching `functions/**` handler.

Underscore-prefixed files/folders (`_lib`, `_middleware.js`) are **not** routed.

---

## Quick start (local)

```bash
cd api
npm install
npm run dev            # http://localhost:8788
```

```bash
curl http://localhost:8788/health
curl http://localhost:8788/catalog/movie/top
curl http://localhost:8788/meta/movie/tt0133093
curl http://localhost:8788/scores/movie/tt0133093
```

> Under `wrangler pages dev` the edge cache reports `MISS` every time; that is expected
> locally.

---

## Deploy

One-click buttons (also at the top of this README):

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/imzyrix/streamx-api)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/imzyrix/streamx-api)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/imzyrix/streamx-api)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/imzyrix/streamx-api)

### Cloudflare Pages (primary)

**Wrangler CLI**

```bash
cd api
npm install
npx wrangler login
npx wrangler pages deploy
```

Wrangler creates the project and prints `https://<project>.pages.dev`.

**Git integration** — Cloudflare dashboard → **Workers & Pages → Create → Pages →
Connect to Git**. Root directory `/`, build command *(empty)*, build output `public`.
No environment variables required.

**Direct upload** — `npx wrangler pages deploy public`.

**Custom domain** — Pages project → **Custom domains**. Use a **proxied CNAME** to
`<project>.pages.dev`; stray `A` records cause `522`/`523`.

> Cloudflare is the only target with the full edge cache. It is the recommended host.

### Vercel

`vercel.json` rewrites all traffic to `api/index.js`, which reuses the same
`server/app.js` dispatcher. Import the repo, no build command needed, optional
`CACHE_TTL` env var.

### Railway

`railway.json` runs `node server/index.js`. Deploy from the repo; Railway uses Nixpacks
and needs no configuration.

### Render / Fly / Docker

- **Render:** Blueprint from `render.yaml` (health check `/health`).
- **Fly.io:** `fly launch --no-deploy` (reuses `fly.toml`) then `fly deploy`.
- **Any Docker host:**
  ```bash
  docker build -t streamx-api . && docker run -d -p 8788:8788 streamx-api
  ```

On non-Cloudflare hosts the `caches` API is absent, so the edge cache no-ops and each
request hits upstreams live — ideal to put a CDN/reverse-proxy cache in front.

---

## For AI agents

StreamX ships first-class, downloadable agent assets so **Claude, Codex, Cursor, or any
other agent** can use the API without hand-holding:

| Asset | What it is |
| --- | --- |
| [`skill/SKILL.md`](./skill/SKILL.md) | A drop-in **AgentSkill** (front-matter `name`/`description` + full instructions). Clone the repo or copy this file into your agent's skills directory. |
| [`skill/reference.md`](./skill/reference.md) | Complete endpoint/param/field reference for agents. |
| [`llms.txt`](./llms.txt) · [`llms-full.txt`](./llms-full.txt) | The [`llms.txt`](https://llmstxt.org) discovery standard — point any LLM tooling here. |
| [`AGENTS.md`](./AGENTS.md) | Repo conventions for coding agents working *on* the API. |
| [`mcp/server.mjs`](./mcp/README.md) | A **zero-dependency MCP server** exposing the API as tools over stdio. |

**Use the hosted API from an agent** — just give it the base URL:

> "Use the keyless StreamX API at `https://api.streamx.qzz.io`. Search with
> `/search?q=…`, then call `/meta`, `/scores`, `/credits`, `/streaming`, `/similar` by
> IMDb id. Read `skill/SKILL.md` for the full reference."

**Or run the MCP server:**

```bash
STREAMX_API_BASE=https://api.streamx.qzz.io node mcp/server.mjs
```

Tools exposed: `streamx_search`, `streamx_meta`, `streamx_scores`,
`streamx_streaming`, `streamx_credits`, `streamx_similar`, `streamx_person`,
`streamx_trending`, `streamx_images`, `streamx_catalog`.

---

## Self-hosting & forks

Prefer your own URL? Fork the repo and deploy anywhere (see [Deploy](#deploy)). The code
is **completely runtime-portable** and stays keyless:

- **Same handlers everywhere** — `functions/**` run on Cloudflare *and* drive the Node
  server (`server/`), Vercel (`api/index.js`) and Docker.
- **Make it yours** — rename the `service` in `functions/health.js`, rebrand
  `public/index.html`, and set `CACHE_TTL`. No rebuild needed.
- **Point apps/agents at your URL** — set `API_BASE` in the web app's
  `Web/config.js`, and `STREAMX_API_BASE` for the MCP server.
- **Swap data sources** — every upstream is one file in `functions/_lib/`; add a
  keyless source and wire it into a route (see [`AGENTS.md`](./AGENTS.md)).

Full walkthrough, fork checklist and per-platform steps: **[`docs/SELF-HOST.md`](./docs/SELF-HOST.md)**.

---

## Configuration

Everything is optional:

| Variable | Default | Description |
| --- | --- | --- |
| `CACHE_TTL` | `86400` | Default JSON edge-cache TTL, in seconds |

Set values in `wrangler.toml` under `[vars]`, or locally in `.dev.vars`
(see `.dev.vars.example`). No secrets are required.

---

## API reference

Base URL: `https://api.streamx.qzz.io` (or your own `*.pages.dev`).

All routes accept `GET` and `HEAD`; `OPTIONS` returns `204`. Responses are JSON unless
noted. `:type` is `movie` or `series` (aliases `tv`, `show`, `tvshow`, … normalise to
`series`).

### Discovery

| Route | Description |
| --- | --- |
| `GET /catalog/:type/:catalog?genre=&skip=&search=` | Catalogue listing (`:catalog` defaults to `top`). |
| `GET /search?q=<term>&type=movie\|series&skip=` | Title search. |
| `GET /imdb/search?q=<term>` | IMDb suggestions (posters, year, top cast). |
| `GET /anime/search?q=<term>` | AniList anime search. |

`/catalog` and `/search` add `query` and `count` to the upstream payload.

```bash
curl "https://api.streamx.qzz.io/catalog/movie/top?genre=Action&skip=0"
curl "https://api.streamx.qzz.io/catalog/series/top?genre=Drama"
curl "https://api.streamx.qzz.io/search?q=dune&type=movie"
curl "https://api.streamx.qzz.io/imdb/search?q=dune"
curl "https://api.streamx.qzz.io/anime/search?q=frieren"
```

### Details

| Route | Description |
| --- | --- |
| `GET /meta/movie/<imdb_id>?enrich=0` | Movie details + images + enrichment. |
| `GET /meta/series/<imdb_id>?enrich=0` | Series details + episodes + enrichment. |

```bash
curl "https://api.streamx.qzz.io/meta/movie/tt0133093"
curl "https://api.streamx.qzz.io/meta/series/tt0944947"
curl "https://api.streamx.qzz.io/meta/movie/tt0133093?enrich=0"
```

### Scores & ratings

| Route | Description |
| --- | --- |
| `GET /scores/:type/:id` | IMDb + Rotten Tomatoes + Metacritic in one response. |

```bash
curl "https://api.streamx.qzz.io/scores/movie/tt0133093"
curl "https://api.streamx.qzz.io/scores/series/tt0944947"
```

```json
{
  "ok": true,
  "type": "movie",
  "id": "tt0133093",
  "title": "The Matrix",
  "year": 1999,
  "imdb": { "rating": 8.7, "url": "https://www.imdb.com/title/tt0133093/" },
  "rottenTomatoes": {
    "url": "https://www.rottentomatoes.com/m/matrix",
    "critics": { "title": "Tomatometer", "score": 83, "averageRating": 7.9, "reviewCount": 209, "sentiment": "POSITIVE", "certified": true },
    "audience": { "title": "Popcornmeter", "score": 85, "averageRating": 3.6, "reviewCount": 1307885, "sentiment": "POSITIVE" }
  },
  "metacritic": {
    "url": "https://www.metacritic.com/movie/the-matrix/",
    "critics": { "title": "Metascore", "score": 73, "reviewCount": 36, "bestRating": 100 },
    "contentRating": "R"
  },
  "sources": { "imdb": true, "rottenTomatoes": true, "metacritic": true },
  "generatedAt": "2026-01-01T00:00:00.000Z"
}
```

### People (credits, bios, similar)

| Route | Description |
| --- | --- |
| `GET /credits/:type/:id` | Cast & crew for a title (Wikidata). |
| `GET /person/:id` | Person bio by IMDb `nm…` or Wikidata `Q…` id. |
| `GET /similar/:type/:id` | Sequels / same-director titles. |

```bash
curl "https://api.streamx.qzz.io/credits/movie/tt0133093"
curl "https://api.streamx.qzz.io/person/nm0000206"
curl "https://api.streamx.qzz.io/similar/movie/tt0133093"
```

`/credits` returns `cast[]`, `crew[]` and `directors[]`; each person carries `id`
(IMDb `nm…` or Wikidata `Q…`), `name`, `role` (`cast` | `director` | `writer` |
`composer` | `producer`), `image` and `description`:

```json
{
  "ok": true,
  "id": "tt0133093",
  "type": "movie",
  "cast": [
    { "id": "nm0000206", "wikidataId": "Q43416", "name": "Keanu Reeves", "role": "cast", "image": "https://commons.wikimedia.org/...", "description": "Canadian actor" }
  ],
  "crew": [ { "id": "nm0905154", "wikidataId": "Q26720231", "name": "Lana Wachowski", "role": "director", "image": null } ],
  "directors": [ { "name": "Lana Wachowski", "role": "director" } ],
  "source": "wikidata"
}
```

`/person` returns `name`, `description`, `image`, `born`, `died`, `externalIds`
(`imdb`, `tmdb`, `twitter`, `instagram`) and a Wikipedia `wiki` summary.
`/similar` returns the same `metas[]` shape as a catalogue.

### Trending

| Route | Description |
| --- | --- |
| `GET /trending/:type?limit=` | Popularity-ordered titles (Cinemeta top catalogue). |

```bash
curl "https://api.streamx.qzz.io/trending/movie?limit=20"
```

### Where to watch

| Route | Description |
| --- | --- |
| `GET /streaming/:type/:id?country=US` | Streaming/rent/buy providers via JustWatch. |

```bash
curl "https://api.streamx.qzz.io/streaming/movie/tt0133093?country=US"
curl "https://api.streamx.qzz.io/streaming/series/tt0944947?country=GB"
```

`providers[]` entries have `name`, `types` (`subscription`, `free`, `rent`, `buy`),
`quality` (`SD`, `HD`, `_4K`) and a `webUrl` deep link. A `justWatchUrl` is included.

### TV & anime

| Route | Description |
| --- | --- |
| `GET /tv/:id` | TVmaze show details by IMDb id (`tt…`) or TVmaze id. |
| `GET /anime/search?q=<term>` | AniList anime search. |

```bash
curl "https://api.streamx.qzz.io/tv/tt0944947"
curl "https://api.streamx.qzz.io/anime/search?q=attack%20on%20titan"
```

### Images & stills

| Route | Description |
| --- | --- |
| `GET /images/:type/:id?direct=1` | Full artwork manifest (all kinds × sizes). |
| `GET /img/poster/<size>/<imdb_id>/img` | Poster. |
| `GET /img/background/<size>/<imdb_id>/img` | Backdrop. |
| `GET /img/logo/<size>/<imdb_id>/img` | Logo. |
| `GET /img/still/<imdb_id>/<season>/<episode>/<size>` | Episode still. |

```bash
curl "https://api.streamx.qzz.io/images/movie/tt0133093"
curl "https://api.streamx.qzz.io/img/poster/medium/tt0133093/img"
curl "https://api.streamx.qzz.io/img/still/tt0944947/1/1/w780"
```

### Raw passthrough

| Route | Description |
| --- | --- |
| `GET /cinemeta/<path>` | Raw Cinemeta response, edge-cached. |

```bash
curl "https://api.streamx.qzz.io/cinemeta/catalog/movie/top.json"
```

### Health

| Route | Description |
| --- | --- |
| `GET /health` | Status, version, upstreams, endpoints and valid image sizes. |

```json
{
  "ok": true,
  "service": "streamx-api",
  "version": "1.3.0",
  "requiresApiKey": false,
  "upstreams": ["cinemeta","metahub","wikidata","wikipedia","imdb-suggestion","rottentomatoes","metacritic","justwatch","tvmaze","anilist"],
  "imageKinds": ["poster","background","logo"],
  "imageSizes": ["small","medium","large","original"],
  "stillSizes": ["w92","w154","w185","w300","w342","w500","w780","original"]
}
```

---

## The image system

Artwork comes from MetaHub, which serves **one** artwork per kind per title, keyed by
the IMDb id.

- **Kinds** — `poster`, `background` (backdrop), `logo`.
- **Sizes** — `small`, `medium`, `large`, `original`.
- **Episode still sizes** — `w92`, `w154`, `w185`, `w300`, `w342`, `w500`, `w780`,
  `original`, with aliases `small→w185`, `medium→w500`, `large→w780`,
  `xlarge→original`, and unknown values falling back to `w780`.

**Proxied vs direct** — by default images are served through `/img/...` (uniform CORS,
edge-cached). Add `?direct=1` on the manifest to receive raw
`https://images.metahub.space/...` URLs instead.

---

## The enrichment layers

All enrichment runs in parallel, is edge-cached (a week), and **fails soft** — a missing
source simply omits its fields.

### Wikidata (SPARQL)

| Output field | Property |
| --- | --- |
| `budget` | `P2130` |
| `boxOffice` | `P2142` |
| `runtimeMinutes` | `P2047` |
| `certification` | `P1657` |
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
| `externalIds.tmdb` | `P4947` / `P4983` |

### Rotten Tomatoes & Metacritic

Resolved by the Wikidata RT/MC id when present, otherwise by searching the site, then
read from the public page (RT `media-scorecard-json`; Metacritic JSON-LD).

### IMDb answer-thin

IMDb's public GraphQL endpoint returns `403`; only the keyless suggestion endpoint is
used (search results + top cast). The IMDb **rating** on `/scores` comes from Cinemeta.

### TVmaze & AniList

TVmaze `lookup/shows?imdb=` and `shows/:id`, plus AniList's public GraphQL search.

---

## Response field reference

Fields added to `meta` on `/meta`:

| Field | Type | Description |
| --- | --- | --- |
| `images` | object | `poster`/`background`/`logo` × `small`/`medium`/`large`/`original`. |
| `externalIds` | object | `imdb`, `tmdb`, `tvdb`, `rottenTomatoes`, `metacritic`. |
| `seasons` | number[] | Sorted season numbers (series). |
| `still` | object | `{ sizes, template }` for episode stills (series). |
| `videos[].still` | string | Per-episode still URL (series). |
| `facts` | object | Wikidata fields (budget, boxOffice, runtimeMinutes, certification, officialWebsite, countries, languages, productionCompanies, genres, directors, composers, partOfSeries, externalIds). |
| `wiki` | object | `{ title, description, extract, url, thumbnail }`. |

---

## Caching, headers & errors

| Header | Meaning |
| --- | --- |
| `x-source` | Always `streamx-api`. |
| `x-cache` | `HIT` (edge cache) or `MISS` (freshly fetched). |
| `cache-control` | Per endpoint; images `immutable` for 30 days. |
| `access-control-allow-origin` | `*` |

| Endpoint | TTL |
| --- | --- |
| `/catalog`, `/search` | 6 h |
| `/meta`, `/scores`, `/tv`, `/anime/search` | 24 h (`CACHE_TTL` override) |
| `/streaming` | 12 h |
| `/images`, `/img`, `/img/still` | 30 d (images immutable) |
| Wikidata / Wikipedia / RT / MC / JustWatch / TVmaze / AniList | 24 h – 7 d |

Errors are JSON with `ok: false`:

```json
{ "ok": false, "error": "Missing search term. Add ?q=<query>.", "detail": null }
```

| Status | When |
| --- | --- |
| `400` | Missing/invalid parameters. |
| `404` | No such title/image. |
| `405` | Method other than GET/HEAD/OPTIONS. |
| `502` | Upstream unreachable or malformed. |
| `500` | Unexpected internal error. |

---

## Usage recipes

### Detail page with scores and where-to-watch

```js
const BASE = "https://api.streamx.qzz.io";
const id = "tt0133093";

const [{ meta }, scores, streaming] = await Promise.all([
  fetch(`${BASE}/meta/movie/${id}`).then(r => r.json()),
  fetch(`${BASE}/scores/movie/${id}`).then(r => r.json()),
  fetch(`${BASE}/streaming/movie/${id}?country=US`).then(r => r.json()),
]);

console.log(meta.images.poster.large);
console.log(scores.rottenTomatoes?.critics.score, scores.metacritic?.critics.score);
console.log(streaming.providers.map(p => p.name));
```

### Poster wall from a catalogue

```js
const { metas } = await fetch(`${BASE}/catalog/movie/top?genre=Sci-Fi`).then(r => r.json());
const posters = metas.map(m => m.poster);
```

### Series episodes with stills

```js
const { meta } = await fetch(`${BASE}/meta/series/tt0944947`).then(r => r.json());
for (const ep of meta.videos.slice(0, 5)) {
  console.log(`S${ep.season}E${ep.number}`, ep.name, ep.still);
}
```

---

## Limitations

- **One artwork per kind.** Cinemeta/MetaHub expose a single poster, backdrop and logo
  per title; the "sizes" are renditions. Alternate poster *designs* require TMDb's
  `/images` endpoint (key).
- **IMDb detail is not publicly available.** Only suggestions (search) are keyless;
  IMDb ratings arrive via Cinemeta.
- **Rotten Tomatoes & Metacritic are read from public pages.** They are keyless and
  cached, but are not official APIs and may change; requests fail soft to `null`.
- **Community upstreams** (Cinemeta, MetaHub, JustWatch) have no uptime SLA.
- **English-centric.** Metadata and enrichment are English-first.

---

## Comparison with alternatives

How StreamX compares to the established options (2026):

| Capability | **StreamX API** | TMDb | OMDb | TVmaze | Watchmode | Trakt |
| --- | --- | --- | --- | --- | --- | --- |
| **API key required** | **No** | Yes | Yes | No | Yes | Yes |
| **Free for commercial use** | **Yes (self-hosted)** | No (`$149/mo` < \$1M ARR) | No (CC BY-NC) | Yes | Metered | Limited |
| Free-tier limit | Edge cache (effectively unbounded) | ~40 req/10s | 1,000/day | 20 req/10s | 1,000/mo | 1,000/day |
| Movies **and** TV | **Yes** | Yes | Movies-first | TV-only | Yes | Yes |
| Catalogues + search | Yes | Yes | Search only | TV only | Yes | Search/lists |
| Multiple artwork sizes | 4 / kind | Many | Poster | TV images | Yes | No images |
| Episode stills | **Yes** | Yes | — | Yes | Yes | — |
| Aggregated ratings (IMDb/RT/MC) | **Yes, 1 call** | Partial | Yes | TV rating | Partial | User ratings |
| Critic + audience scores | **Yes (RT + MC)** | — | RT/MC only | — | Critic scores | — |
| Where-to-watch | **Yes (JustWatch)** | Yes (JustWatch) | — | — | Yes (core) | — |
| Budget / box office | **Yes (Wikidata)** | Revenue only | — | — | — | — |
| Wikipedia plot | **Yes** | Overview | Plot | Summary | — | — |
| CORS-open, no gateway | **Yes** | Yes | Yes | Yes | Yes | Yes |
| Self-hostable | **Yes** | No | No | No | No | No |
| OpenAPI / SDKs | No | Yes (v3.1) | Partial | Partial | Yes | Partial |

**Where StreamX already wins:** it is the only option that is simultaneously
**keyless**, **self-hostable**, **movie + TV**, and returns **metadata, artwork,
critic scores, where-to-watch and Wikipedia plot** from **one deployment** — ideal for
prototypes, side projects, bots, and privacy-conscious apps that cannot register for
keys.

**Where the competition still leads:** TMDb's **breadth** (people, credits, trending,
recommendations, collections, keywords, translations, multiple images, ~150 endpoints),
OMDb's **simple IMDb-id lookup**, Watchmode's **availability depth** (200+ services,
50+ countries, episode-level), and everyone's **documentation, SDKs and SLAs**.

---

## Gap analysis — what StreamX is missing

Ranked by impact toward being #1:

**Data breadth**
1. **People & credits** — no `/person` endpoint, no full cast/crew with roles and
   characters, no filmography. *(TMDb has this.)*
2. **Recommendations / similar / collections** — no related-title or boxset graph.
3. **Trending & time-boxed lists** — no `trending/day|week`, `now_playing`, `upcoming`.
4. **Multiple images** — only one poster/backdrop/logo per title; no gallery.
5. **Localisation** — English-only; no translations or `language=` parameter.
6. **Keywords / tags, alternative titles, certifications per country, release dates
   per country.**

**Search depth**
7. **Advanced search** — no filters for year, genre, person, rating range, or sort.
8. **People/anime/company search**; **anime↔IMDb mapping** (search only today).

**Reliability & trust**
9. **No SLA, status page, or uptime monitoring.**
10. **Scraped sources** (Rotten Tomatoes, Metacritic) can change and carry ToS/legal
    ambiguity; no licensing clarity for artwork.
11. **No tests in CI** guarding the aggregators against upstream drift.

**Developer experience**
12. **No OpenAPI/Swagger spec**, no GraphQL option, no typed SDKs or Postman
    collection.
13. **Pagination is `skip`-only** — no cursors, `total`, or "has more" flags.
14. **No conditional requests** (`ETag`/`If-None-Match`) or webhooks.

**Depth of watch data**
15. **Streaming is single-country per request** with no provider icons or bulk catalog;
    no episode-level availability.

---

## Roadmap to #1

A concrete plan to become the default keyless entertainment API.

**Phase 1 — Close the breadth gap (0–1 mo)**
- [x] `/person/:id` — bio, image, birth/death, external ids, Wikipedia summary. *(v1.3)*
- [x] `/credits/:type/:id` — cast, crew and directors with roles & photos. *(v1.3)*
- [x] `/similar/:type/:id` — sequels and same-director titles. *(v1.3)*
- [x] `/trending/:type` — popularity-ordered titles. *(v1.3)*
- [ ] `/recommendations/:type/:id`, `/collection/:id`.
- [ ] `/now-playing`, `/upcoming`; a `window=day|week` option on trending.
- [ ] Multi-image gallery + `language=` on `/meta`.

**Phase 2 — Search & anime (1–2 mo)**
- `/discover` with year/genre/person/rating filters and sorting.
- `/anime/:id` (episodes, characters) and a title↔AniList/IMDb resolver.

**Phase 3 — Developer experience (2–3 mo)**
- **OpenAPI 3.1 spec** + generated clients (JS/TS, Python, Go).
- Postman collection, a docs site, and copy-paste recipes for React/Next/Expo.
- Cursor pagination with `total` and `hasMore`; `ETag` caching.

**Phase 4 — Trust & scale (3–4 mo)**
- Status page + uptime history; automated canary tests for every upstream in CI.
- Multi-provider fallback for ratings (e.g. a second keyless source) so a single
  scraper drift cannot break `/scores`.
- Published rate-limit & release policy; versioned responses.

**Phase 5 — Distribution (ongoing)**
- README badges, a public benchmark (p50/p95 latency, cache hit-ratio).
- Listings in awesome-lists and API directories; an official "keyless by design"
  position; integrations (StreamX web app, Stremio addon, bots).

**North star:** the only API a developer needs for movies & TV — **zero keys, one
call, everything**, with the breadth of TMDb and the openness of TVmaze.

---

## Extending the API

- Swap/add a data source in **`functions/_lib/upstream.js`**.
- Tune the artwork matrix in **`functions/_lib/images.js`**.
- Add enrichment in **`functions/_lib/enrich.js`** and people data in
  **`functions/_lib/people.js`**; scrapers/GraphQL in **`scrape.js`**, **`scores.js`**,
  **`watch.js`**, **`tvmaze.js`**.
- Add a route by creating a file under **`functions/`**
  (e.g. `functions/person/[id].js` → `/person/:id`). Underscore-prefixed files are
  not routed. Then register it in **`server/app.js`** so the portable Node/Vercel
  server serves it too, and add it to **`functions/health.js`**.

---

## Attribution & licensing

**Project.** StreamX API is made by **[@imzyrix](https://github.com/imzyrix)** and is
part of **[@zyrixdevs](https://github.com/zyrixdevs)**. It is released under **two
licenses**, one for each kind of material:

| Material | License | File |
| --- | --- | --- |
| Source code (`functions/`, `server/`, `api/`, `mcp/`, configs, `Dockerfile`, …) | **MIT** | [`LICENSE`](LICENSE) |
| Documentation & written content (`README.md`, `docs/`, `skill/`, `llms*.txt`, …) | **CC BY 4.0** | [`LICENSE-DOCS`](LICENSE-DOCS) |

In short: **use, fork, rebrand and self-host the code freely** (keep the copyright
notice); **reuse the docs freely** with attribution to StreamX API / @imzyrix / @zyrixdevs.

**Upstream data.** Metadata and artwork are read from public sources: **Cinemeta**, **MetaHub**,
**Wikidata**, **Wikipedia**, **IMDb** (suggestions), **Rotten Tomatoes**,
**Metacritic**, **JustWatch**, **TVmaze** and **AniList**. StreamX API only proxies and
caches them and is not affiliated with any of them.

Posters and imagery remain the property of their respective rights holders — review the
terms of each upstream before commercial use. For guaranteed, licensed, commercial-grade
data, replace the layer in `functions/_lib/upstream.js` with a paid provider.
