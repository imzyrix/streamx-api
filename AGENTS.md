/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

# AGENTS.md — working in the StreamX API repository

This repo is a **keyless** movie & TV metadata API. Read this before changing code.

## Non-negotiables

1. **No API keys.** Never add a data source that requires an API key or secret.
   Everything must run with zero credentials. (TMDb, OMDb, Watchmode etc. are out.)
2. **Never delete code.** If a change removes behaviour, keep the original as a
   commented block marked `// ORIGINAL (preserved, not deleted — disabled by comment):`
   (or the language's equivalent). Preserved modules live in `_preserved/`.
3. **No code comments** unless they explain a genuinely non-obvious workaround.
4. Enrichment must be **fail-soft**: a slow/missing upstream returns `null`/omits a
   field, never a 500.

## Layout

```
functions/            Cloudflare Pages Functions (one file per route)
  _lib/               shared logic, runtime-agnostic (works in Workers AND Node)
    upstream.js       Cinemeta + MetaHub layer, json()/fail()/parseTtl()/normalizeType(), CORS
    scrape.js         cachedValue(), fetchHtml()/fetchJsonGet()/fetchJsonPost(), BROWSER_UA
    enrich.js         wikidataFacts(), wikipediaSummary(), imdbSearch()
    people.js         credits(), person(), similar()  (Wikidata SPARQL)
    scores.js         rottenTomatoes(), metacritic()
    watch.js          justWatchOffers()
    tvmaze.js         tvmazeShow(), anilistSearch()
    images.js         artwork/still URL builders + manifest
  <route>/...         route handlers exporting onRequestGet
server/               portable Node dispatcher + http server (Docker/Railway/Render/Fly)
api/index.js          Vercel serverless entry (reuses server/app.js)
skill/                agent skill (SKILL.md + reference.md) — keep in sync with routes
mcp/                  zero-dependency MCP server exposing the API as tools
llms.txt / llms-full.txt   AI discovery docs
docs/SELF-HOST.md     fork & self-host guide
LICENSE               MIT (source code only — keep the notice when forking)
LICENSE-DOCS          CC BY 4.0 (documentation & written content)
```

Made by [@imzyrix](https://github.com/imzyrix), part of
[@zyrixdevs](https://github.com/zyrixdevs).

`server/app.js` maps every URL to the same `functions/**` handlers, so a new route
must be added in **both** `functions/...` and the `ROUTES` table in `server/app.js`.

## Runtime facts that bite

- Cache keys are **not** absolute URLs; `cachedValue()` must only touch `caches`
  when one exists (see the preserved comment in `_lib/scrape.js`).
- `caches` is `undefined` on Node/Vercel — the code must no-op cleanly.
- Wikidata SPARQL can cold-start slowly: keep the timeout `>= 12000ms` and cache a week.
- IMDb **pages** are bot-blocked (HTTP 202, empty). Only the suggestion endpoint works.
- `node --check <file>` validates a file (the package is `"type": "module"`).

## Run it

```bash
# Cloudflare (Pages Functions)
npm run dev                       # wrangler pages dev

# Portable Node server (same routes)
node server/index.js              # PORT env optional, default 8788

# Docker
docker build -t streamx-api . && docker run -p 8788:8788 streamx-api
```

## Test

There is no test suite yet; verify handlers directly, e.g.:

```bash
node --check "functions/credits/[type]/[id].js"
curl -s http://localhost:8788/health
curl -s "http://localhost:8788/scores/movie/tt0133093"
```

For the browser UI, the companion repo is `imzyrix/streamx-web`.

## When you add an endpoint

1. Add `functions/<path>.js` exporting `onRequestGet`.
2. Register it in `server/app.js` `ROUTES`.
3. Add it to `functions/health.js` `endpoints`.
4. Document it in `README.md`, `skill/SKILL.md`, `skill/reference.md`,
   `llms.txt`/`llms-full.txt`, and the MCP tools list in `mcp/server.mjs`.
5. Bump the version in `functions/health.js`, `package.json`, `server/package.json`.

## Deploy targets

Cloudflare Pages (primary), Vercel, Railway, Render, Fly, any Docker host. Config
files: `wrangler.toml`, `vercel.json`, `railway.json`, `render.yaml`, `fly.toml`,
`Dockerfile`. See `docs/SELF-HOST.md`.
