# Contributing

Thanks for contributing to StreamX API!

## Rules
- No API keys. Everything must remain keyless.
- Never delete code — preserve original as a commented block if removing behavior.
- Keep changes minimal and fail-soft.
- When adding an endpoint: create `functions/<path>.js`, register in `server/app.js` ROUTES, update `functions/health.js`, document in README/skill/reference/llms/MCP.

## Local dev
```bash
npm install
npm run dev  # Cloudflare Pages Functions
node server/index.js  # Portable Node
```

## Pull requests
- Keep commits concise.
- Update docs/CHANGELOG if user-facing.
- Run `node --check` on touched JS files.
