# Changelog

All notable changes to StreamX API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- MCP CLI package metadata (`mcp/package.json`) for publishing to npm.

### Changed
- Repository branding assets and documentation polish.

## [1.3.0] - 2026-10-11

### Added
- People: `GET /credits/:type/:id` (cast, crew, directors with roles & photos)
- People: `GET /person/:id` (bio, image, birth/death, external IDs, Wikipedia summary)
- Discovery: `GET /similar/:type/:id` (sequels and same-director titles)
- Discovery: `GET /trending/:type` (popularity-ordered titles)
- Library: `functions/_lib/people.js` (Wikidata SPARQL integration)
- AI agent assets: `skill/`, `llms.txt`, `llms-full.txt`, `AGENTS.md`
- MCP server: `mcp/server.mjs` (zero-dependency, stdio, 10 tools)
- Portable runtime: `server/app.js`, `server/index.js`, `api/index.js` (Vercel)
- Deploy configs: `Dockerfile`, `vercel.json`, `railway.json`, `render.yaml`, `fly.toml`
- Docs: `docs/SELF-HOST.md`, expanded README (Deploy, For AI agents, Self-hosting & forks)
- Dual licensing: `LICENSE` (MIT), `LICENSE-DOCS` (CC BY 4.0)
- Author attribution across README, docs, skill, landing page

### Fixed
- `cachedValue()` portability: guard cache access to work on Node/Vercel (original preserved as comment)

## [1.2.0] - 2026-10-11

### Added
- Ratings: `GET /scores/:type/:id` (IMDb, Rotten Tomatoes, Metacritic)
- Streaming: `GET /streaming/:type/:id?country=` (JustWatch providers)
- TV: `GET /tv/:id` (TVmaze)
- Anime: `GET /anime/search?q=` (AniList)
- Libraries: `scrape.js`, `scores.js`, `watch.js`, `tvmaze.js`

## [1.1.0] - 2026-10-11

### Added
- Images: `GET /images/:type/:id`, episode stills, full artwork manifest
- Enrichment: Wikidata/Wikipedia facts + IMDb search suggestions
- `enrich.js`, `images.js` enrichment layers

[Unreleased]: https://github.com/imzyrix/streamx-api/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/imzyrix/streamx-api/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/imzyrix/streamx-api/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/imzyrix/streamx-api/releases/tag/v1.1.0
