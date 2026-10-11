# StreamX API — full reference

Base URL: `https://api.streamx.qzz.io` (fallback `https://streamx-api.pages.dev`).

- **Keyless.** No auth. CORS `*`. `GET`/`HEAD` only; `OPTIONS` → `204`.
- `:type` = `movie` | `series`. Aliases `tv`, `show`, `tvshow`, `shows` normalise to `series`.
- `:id` = IMDb id (`tt0133093`). Person ids = `nm…` or Wikidata `Q…`.
- JSON responses are edge-cached; image routes return image bytes.
- Optional env on a self-hosted copy: `CACHE_TTL` (seconds; default per route).

## Errors

Any failure returns JSON with `ok:false` and HTTP status:

```json
{ "ok": false, "error": "Provide an IMDb id, e.g. /scores/movie/tt0133093.", "detail": null }
```

Upstream enrichment (scores, streaming, TV, anime, credits, Wikipedia) is
**fail-soft**: if a source is unavailable the field is `null` / omitted, not an error.

---

## Discovery

### `GET /catalog/:type/:catalog`
Catalogue listing. `:catalog` defaults to `top`. Query: `genre`, `skip`, `search`.
Response: `{ ok, type, catalog, query, count, metas: [...] }`.

### `GET /catalog/:type/:catalog/:genre`
Genre shorthand for the same listing.

### `GET /search?q=<term>&type=movie|series&skip=`
Title search. Response: `{ ok, query, type, count, metas: [...] }`.

### `GET /imdb/search?q=<term>`
IMDb suggestion API (posters, year, top cast). Response: `{ ok, query, count, results: [...] }`.

### `GET /anime/search?q=<term>`
AniList anime search. Response: `{ ok, query, count, results: [...] }`.

## Details

### `GET /meta/:type/:id?enrich=0`
Full title details. `enrich=0` skips Wikidata/Wikipedia for speed.

`meta` fields: everything Cinemeta returns (`name`, `description`, `year`/`releaseInfo`,
`genres`, `imdbRating`, `runtime`, `cast`, `director`, `videos`, `seasons`, …) plus:

- `images` — `{ poster, background, logo, still? }` manifest.
- `externalIds` — `{ imdb, tmdb, rottenTomatoes, metacritic, … }` from Wikidata.
- `facts` — budget, box office, MPA rating, production companies, etc.
- `wiki` — `{ title, extract, url }` from Wikipedia.
- `seasons[]` and `videos[]` — episodes/videos carry a `still` image URL.

## Scores & ratings

### `GET /scores/:type/:id`
```json
{
  "ok": true, "type": "movie", "id": "tt0133093", "title": "The Matrix", "year": 1999,
  "imdb": { "rating": 8.7, "url": "https://www.imdb.com/title/tt0133093/" },
  "rottenTomatoes": {
    "url": "https://www.rottentomatoes.com/m/matrix",
    "critics": { "title": "Tomatometer", "score": 83, "averageRating": 7.9, "reviewCount": 209, "sentiment": "POSITIVE", "certified": true },
    "audience": { "title": "Popcornmeter", "score": 85, "averageRating": 3.6, "reviewCount": 1307885, "sentiment": "POSITIVE" }
  },
  "metacritic": { "url": "https://www.metacritic.com/movie/the-matrix/", "critics": { "title": "Metascore", "score": 73, "reviewCount": 36, "bestRating": 100 }, "contentRating": "R" },
  "sources": { "imdb": true, "rottenTomatoes": true, "metacritic": true },
  "generatedAt": "2026-01-01T00:00:00.000Z"
}
```
Any of `imdb`, `rottenTomatoes`, `metacritic` may be `null`.

## People

### `GET /credits/:type/:id`
```json
{
  "ok": true, "id": "tt0133093", "type": "movie",
  "cast": [{ "id": "nm0000206", "wikidataId": "Q43416", "name": "Keanu Reeves", "role": "cast", "image": "https://commons.wikimedia.org/...", "description": "Canadian actor" }],
  "crew": [{ "id": "nm0905154", "wikidataId": "Q26720231", "name": "Lana Wachowski", "role": "director", "image": null }],
  "directors": [{ "..." : "same shape, role=director" }],
  "source": "wikidata"
}
```
`role` is one of `cast`, `director`, `writer`, `composer`, `producer`.

### `GET /person/:id`
`id` = `nm…` or `Q…`.
```json
{
  "ok": true, "id": "nm0000206", "wikidataId": "Q43416", "name": "Keanu Reeves",
  "description": "Canadian actor (born 1964)", "image": "https://commons.wikimedia.org/...",
  "born": "1964-09-02", "died": null,
  "externalIds": { "imdb": "nm0000206", "tmdb": "6384", "twitter": "...", "instagram": "..." },
  "officialSite": null,
  "wiki": { "title": "Keanu Reeves", "extract": "...", "url": "https://en.wikipedia.org/wiki/Keanu_Reeves" },
  "source": "wikidata"
}
```

### `GET /similar/:type/:id`
Titles that share a series (sequels) or a director with the given title.
Response: `{ ok, id, type, count, metas: [...], source }` — same meta shape as a catalogue.

## Trending

### `GET /trending/:type?limit=`
Popularity-ordered titles from Cinemeta's top catalogue.
Response: `{ ok, type, count, metas: [...], notes }`.

## Where to watch

### `GET /streaming/:type/:id?country=US`
JustWatch offers. Response:
```json
{
  "ok": true, "id": "tt0133093", "type": "movie", "country": "US",
  "providers": [{ "name": "Netflix", "types": ["subscription"], "quality": ["HD"], "webUrl": "https://..." }],
  "justWatchUrl": "https://www.justwatch.com/us/movie/the-matrix"
}
```
`types` values: `subscription`, `free`, `ads`, `rent`, `buy`. `country` is an
ISO-3166 alpha-2 code (default `US`).

## TV & anime

### `GET /tv/:id`
TVmaze show details by IMDb id (`tt…`) or numeric TVmaze id.
Response: `{ ok, id, show: { name, network, status, schedule, rating, image, ... } }`.

### `GET /anime/search?q=<term>`
AniList search. `results[]` include `id`, `title`, `averageScore`, `popularity`,
`coverImage`, `episodes`, `format`, `seasonYear`.

## Images & stills

### `GET /images/:type/:id?direct=1`
Full artwork manifest: every kind × size. `direct=1` returns raw upstream URLs
instead of proxy URLs.

### `GET /img/:kind/:size/:id/img`
`kind` = `poster` | `background` | `logo`. `size` = `small` | `medium` | `large` | `original`.
Example: `/img/background/large/tt0133093/img`.

### `GET /img/still/:id/:season/:episode/:size`
Episode still. `size` = `w92` | `w154` | `w185` | `w300` | `w342` | `w500` | `w780` |
`original` (aliases `small→w185`, `medium→w500`, `large→w780`, `xlarge→original`).

## Raw passthrough

### `GET /cinemeta/<path>`
Raw Cinemeta response, edge-cached. Example: `/cinemeta/catalog/movie/top.json`.

## Health

### `GET /health`
`{ ok, service, version, requiresApiKey:false, upstreams:[...], endpoints:{...}, imageKinds, imageSizes, stillSizes }`.

---

## Metadata source map

| Data | Source | Key? |
| --- | --- | --- |
| Catalogue, search, details, images base | Cinemeta + MetaHub | no |
| Budget, box office, external ids, ratings (Rotten Tomatoes/Metacritic slugs) | Wikidata SPARQL | no |
| Bio summary | Wikipedia REST | no |
| IMDb suggestions | IMDb suggestion endpoint | no |
| Tomatometer / Popcornmeter | Rotten Tomatoes (page) | no |
| Metascore | Metacritic (page) | no |
| Streaming offers | JustWatch GraphQL | no |
| TV show data | TVmaze | no |
| Anime | AniList GraphQL | no |

## Self-hosting

The same code runs on Cloudflare Pages Functions, a plain Node server
(Docker/Railway/Render/Fly), or Vercel. See `docs/SELF-HOST.md` and the deploy
buttons in `README.md`.
