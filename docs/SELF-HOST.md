# Self-hosting & forks

You have two ways to use StreamX:

1. **Use the hosted API** — `https://api.streamx.qzz.io` (fallback
   `https://streamx-api.pages.dev`). Nothing to install.
2. **Run your own copy** — fork this repo, deploy it anywhere below, and point your
   app (and agents) at your URL. It stays 100% keyless.

This guide covers both, plus how to make the API *yours*.

---

## 1. Local run

The same code runs on Cloudflare Pages Functions **and** as a plain Node server.

```bash
git clone https://github.com/imzyrix/streamx-api.git
cd streamx-api

# Option A — Cloudflare Pages Functions (wrangler)
npm install
npm run dev                 # http://localhost:8788

# Option B — plain Node (no dependencies)
node server/index.js        # http://localhost:8788  (PORT env optional)

# Option C — Docker
docker build -t streamx-api .
docker run -p 8788:8788 streamx-api
```

Check it:

```bash
curl http://localhost:8788/health
curl "http://localhost:8788/scores/movie/tt0133093"
```

---

## 2. Deploy

### Cloudflare Pages (primary, 100% of the upstream caching works here)

**Wrangler CLI**

```bash
npm install
npx wrangler pages deploy public --project-name streamx-api
```

Wrangler will upload `functions/` as Pages Functions automatically when deploying the
project root. Recommended settings: build command **empty**, output directory
`public`, compatibility flag `nodejs_compat`.

**Git integration** — in the Cloudflare dashboard create a Pages project from your
fork, set build command to *none*, output directory `public`, and (optionally) add a
`CACHE_TTL` environment variable.

### Vercel

`vercel.json` rewrites all traffic to `api/index.js`, which reuses the same
dispatcher (`server/app.js`). Just import the repo:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/imzyrix/streamx-api)

No build command is required. Optional env: `CACHE_TTL`.

### Railway

`railway.json` runs `node server/index.js`.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/imzyrix/streamx-api)

### Render

`render.yaml` (Blueprint) runs the Node server with a `/health` check.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/imzyrix/streamx-api)

### Fly.io

```bash
fly launch --no-deploy      # reuses fly.toml
fly deploy
```

### Any Docker host (VPS, Coolify, Northflank, …)

```bash
docker build -t streamx-api .
docker run -d -p 8788:8788 --name streamx-api streamx-api
```

Note: on non-Cloudflare hosts the `caches` API is unavailable, so the built-in edge
cache no-ops and every request hits the upstreams live. That is fine for personal use;
put a CDN or reverse-proxy cache in front for heavier traffic.

---

## 3. Make it yours

Everything is data-driven and environment-based — no rebuild required for the common
changes.

### Change the cache TTL

Set `CACHE_TTL` (seconds) in your host's environment. Defaults are per route (a day
for details/scores, six hours for catalogues/trending).

### Rename / rebrand

- The service name is in `functions/health.js` (`service`), `package.json` and
  `server/package.json`.
- Base URL shown in docs lives in `README.md`, `skill/`, `llms*.txt`.
- The landing page is `public/index.html`.

### Point your app at your API

In the companion web app (`imzyrix/streamx-web`) edit `Web/config.js`:

```js
export const API_BASE = "https://your-deployment.example.com";
export const API_FALLBACK = "https://your-fallback.example.com";
```

### Point AI agents at your API

- MCP: `STREAMX_API_BASE=https://your-deployment.example.com node mcp/server.mjs`
- Skill: tell the agent to use your base URL (or edit the URL in `skill/SKILL.md`).

### Add or swap a data source

All upstreams live in `functions/_lib/`. To add one:

1. Create `functions/_lib/<source>.js` exporting an async function that takes
   `(context, args)` and returns plain data (use `cachedValue()` from `scrape.js`
   for caching). It must be keyless.
2. Consume it from a route in `functions/<route>.js`.
3. Register the route in `server/app.js` `ROUTES` (and `functions/health.js`).

See `AGENTS.md` for the rules (no API keys, never delete code, fail-soft enrichment).

---

## 4. Fork checklist

- [ ] Fork `imzyrix/streamx-api`.
- [ ] Deploy to your platform of choice (section 2).
- [ ] Set `CACHE_TTL` if you want non-default caching.
- [ ] Rebrand `service`/`package.json`/landing page.
- [ ] Update the base URL in your app's `Web/config.js` and in agent configs.
- [ ] (Optional) star the original repo and link back — appreciated, not required.

Licensed MIT — fork it, rename it, ship it.
