# StreamX MCP server

A **zero-dependency** [Model Context Protocol](https://modelcontextprotocol.io) server
that exposes the StreamX API as tools, so any MCP-capable agent can call it directly.

## Run

```bash
STREAMX_API_BASE=https://api.streamx.qzz.io node mcp/server.mjs
```

`STREAMX_API_BASE` is optional (defaults to the hosted API). Point it at your own
deployment to use a private instance.

## Tools

| Tool | What it does |
| --- | --- |
| `streamx_search` | Search movies/series by title. |
| `streamx_meta` | Full details for one title. |
| `streamx_scores` | IMDb + Rotten Tomatoes + Metacritic. |
| `streamx_streaming` | Where to watch (JustWatch), by country. |
| `streamx_credits` | Cast & crew. |
| `streamx_similar` | Sequels / same-director titles. |
| `streamx_person` | Person bio (nm… or Q…). |
| `streamx_trending` | Popular titles. |
| `streamx_images` | Artwork manifest (poster/background/logo). |
| `streamx_catalog` | Browse a catalogue with optional genre. |

## Wire it into an MCP client

Add a stdio server entry, for example (Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "streamx": {
      "command": "node",
      "args": ["/absolute/path/to/streamx-api/mcp/server.mjs"],
      "env": { "STREAMX_API_BASE": "https://api.streamx.qzz.io" }
    }
  }
}
```

Any client that speaks MCP stdio will work the same way.
