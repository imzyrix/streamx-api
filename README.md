# StreamX API

A self-hostable movie & TV metadata + poster API built for **Cloudflare Pages Functions**.
It proxies [TMDB](https://www.themoviedb.org/) and caches every response at the Cloudflare
edge, so your site gets fast, stable JSON and images from a single URL you control.

- One free TMDB key, then everything is served from your own endpoint
- Edge caching (data + images) with configurable TTL
- CORS enabled, safe to call from any origin
- Clean JSON routes plus a full raw TMDB passthrough (`/v3/*`)
- Image proxy so posters/backdrops use the same base URL as the data

---

## Quick start (local)

```bash
cd api
cp .dev.vars.example .dev.vars      # then paste your TMDB key inside
npm install
npm run dev                          # http://localhost:8788
```

Open `http://localhost:8788/health` — you should see `"credentialsConfigured": true`.

## Deploy to Cloudflare Pages

### Option A — Wrangler CLI (fastest)

```bash
cd api
npm install
npx wrangler login
npx wrangler pages deploy
```

Wrangler creates the project on first deploy and prints your URL:
`https://<project-name>.pages.dev`.

Then add the secret:

```bash
npx wrangler pages secret put TMDB_API_KEY
```

Or set it in the dashboard: **Pages → your project → Settings → Environment variables**
(add `TMDB_API_KEY` for both Production and Preview).

### Option B — Git integration

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Set **Root directory** to `api`, **Build output directory** to `public`, leave the build command empty.
4. Add the `TMDB_API_KEY` environment variable, then Deploy.

### Option C — Direct upload

```bash
cd api
npx wrangler pages deploy public
```

---

## Configuration

Set these in **Settings → Environment variables** (or `.dev.vars` locally):

| Variable            | Required | Description                                                     |
| ------------------- | -------- | --------------------------------------------------------------- |
| `TMDB_API_KEY`      | one of   | TMDB **v3** API key (simplest)                                  |
| `TMDB_ACCESS_TOKEN` | one of   | TMDB **v4** read access token (used as Bearer if present)       |
| `CACHE_TTL`         | no       | Default edge-cache TTL in seconds (default `86400`)             |

Get a free key at <https://www.themoviedb.org/settings/api>.

---

## Endpoints

Base URL: `https://<your-project>.pages.dev`

### Discovery

| Route | Notes |
| --- | --- |
| `GET /trending?type=movie\|tv\|all&window=day\|week&page=1` | Trending |
| `GET /search?q=<term>&type=multi\|movie\|tv\|person&page=1` | Search |
| `GET /discover?type=movie\|tv&<tmdb discover params>` | Browse / filter |
| `GET /genres?type=movie\|tv` | Genre list |
| `GET /configuration` | Image size config |

### Details

| Route | Notes |
| --- | --- |
| `GET /movie/:id?append=credits,videos,images` | Full movie details |
| `GET /tv/:id?append=credits,videos,images` | Full TV details |
| `GET /tv/:id/season/:season` | Season with episodes |
| `GET /person/:id` | Person + combined credits |
| `GET /collection/:id` | Collection |

`append` accepts any TMDB `append_to_response` value, comma-separated.
Sensible defaults are applied if you omit it.

### Raw passthrough

```
GET /v3/<any-tmdb-path>
```

Example: `/v3/movie/603`, `/v3/search/multi?query=matrix`, `/v3/tv/1399/season/1`.
Everything supported by `api.themoviedb.org/3` works here.

### Images

```
GET /img/<size>/<file>
```

Example: `/img/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg`.
Sizes: `w92 w154 w185 w342 w500 w780 w1280 original` (and `w300 w45` for stills/profiles).
The file value is the `poster_path` / `backdrop_path` / `profile_path` from any response.

---

## Examples

```bash
BASE=https://streamx-api.pages.dev

curl "$BASE/trending?type=movie&window=week&page=1"
curl "$BASE/search?q=dune&type=multi"
curl "$BASE/discover?type=movie&with_genres=878&sort_by=popularity.desc"
curl "$BASE/movie/603"
curl "$BASE/tv/1399/season/1"

# Build a poster URL from any response
# poster_path -> BASE/img/w500<poster_path>
```

## Response headers

| Header | Meaning |
| --- | --- |
| `x-source` | Always `streamx-api` |
| `x-cache` | `HIT` (served from edge cache) or `MISS` (freshly fetched) |
| `cache-control` | Cache policy for the response |

## Notes

- If a route returns `"credentialsConfigured": false` at `/health` or a
  `TMDB credentials are not configured` error, the key is missing from that
  environment (Production and Preview are configured separately).
- Edge caching uses Cloudflare's cache API; locally it may report `MISS` every time.
- This product uses the TMDB API but is not endorsed or certified by TMDB.
