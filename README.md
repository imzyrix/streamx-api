# StreamX API

A self-hostable movie & TV metadata + poster API for **Cloudflare Pages Functions**.
No API keys, no accounts, no rate-limit headaches — it reads the open **Cinemeta**
catalog (the Stremio metadata addon) and poster CDN, and caches everything at the
Cloudflare edge.

- **Zero API keys.** Nothing to sign up for.
- Movies **and** series — including full episode lists.
- Posters, backdrops and logos included.
- Edge-cached data + images with configurable TTL.
- CORS enabled, call it from any origin.
- Clean REST routes plus a raw upstream passthrough.

> Data source: [Cinemeta](https://github.com/Stremio/stremio-addon-sdk) (`v3-cinemeta.strem.io`)
> and the MetaHub image CDN. Both are public and keyless. The TMDB-based
> implementation that needed a key is preserved under `_preserved/tmdb-functions/`
> and is not deployed.

---

## Quick start (local)

```bash
cd api
npm install
npm run dev            # http://localhost:8788
```

Open `http://localhost:8788/catalog/movie/top` — data with no key.

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

---

## Configuration

Optional only:

| Variable    | Default | Description                        |
| ----------- | ------- | ---------------------------------- |
| `CACHE_TTL` | `86400` | Default JSON edge-cache TTL (secs) |

No secrets are required.

---

## Endpoints

Base URL: `https://<your-project>.pages.dev`

### Discovery

| Route | Notes |
| --- | --- |
| `GET /catalog/movie/top?genre=&skip=&search=` | Top movies |
| `GET /catalog/series/top?genre=&skip=&search=` | Top series |
| `GET /search?q=<term>&type=movie\|series&skip=` | Search |

`genre` accepts values like `Action`, `Comedy`, `Drama`, `Sci-Fi`, `Animation`.
`skip` paginates (increments of ~100, supplied by the upstream response).

### Details

| Route | Notes |
| --- | --- |
| `GET /meta/movie/<imdb_id>` | Movie details |
| `GET /meta/series/<imdb_id>` | Series details + `videos` (episodes) |

IDs are IMDb ids (`tt...`). `meta` includes: name, description, poster, background,
logo, cast, director, writer, genre, year, released, runtime, IMDb rating, awards,
country, trailers, and (for series) the episode list.

### Images

| Route | Notes |
| --- | --- |
| `GET /img/poster/<size>/<imdb_id>/img` | Poster |
| `GET /img/background/<size>/<imdb_id>/img` | Backdrop |
| `GET /img/logo/<size>/<imdb_id>/img` | Logo |

`size`: `small` · `medium` · `large`.

### Raw passthrough

```
GET /cinemeta/<path>
```

Examples: `/cinemeta/catalog/movie/top.json`, `/cinemeta/meta/series/tt0944947.json`.

---

## Examples

```bash
BASE=https://streamx-api.pages.dev

curl "$BASE/catalog/movie/top"
curl "$BASE/catalog/series/top?genre=Drama&skip=100"
curl "$BASE/search?q=matrix&type=movie"
curl "$BASE/meta/movie/tt0133093"
curl "$BASE/meta/series/tt0944947"

# Poster URL straight from an id
# $BASE/img/poster/medium/tt0133093/img
```

## Response shape

The API returns the upstream shape unchanged, so it is a drop-in for Cinemeta:

```json
{ "metas": [ { "imdb_id": "tt0133093", "name": "The Matrix", "poster": "…", "…": "…" } ] }
```

```json
{ "meta": { "imdb_id": "tt0944947", "name": "Game of Thrones", "videos": [ … ], "…": "…" } }
```

## Response headers

| Header | Meaning |
| --- | --- |
| `x-source` | Always `streamx-api` |
| `x-cache` | `HIT` (edge cache) or `MISS` (freshly fetched) |

## Notes

- Edge caching uses Cloudflare's cache API; locally it may report `MISS` every time.
- Data and artwork come from public, community-run services. If you need
  guaranteed commercial-grade uptime or richer fields, swap the data layer in
  `functions/_lib/upstream.js`.
