/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

#!/usr/bin/env node
// Zero-dependency MCP server for the StreamX API.
// Exposes the API as tools over the Model Context Protocol stdio transport.
//
//   STREAMX_API_BASE=https://api.streamx.qzz.io node mcp/server.mjs

const BASE = (process.env.STREAMX_API_BASE || process.env.STREAMX_API_URL || "https://api.streamx.qzz.io").replace(/\/+$/, "");
const FALLBACK = "https://streamx-api.pages.dev";
const PROTOCOL_VERSION = "2024-11-05";

const TOOLS = [
  {
    name: "streamx_search",
    description: "Search movies or TV series by title. Returns matching titles with IMDb ids, posters and years.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term, e.g. 'dune'." },
        type: { type: "string", enum: ["movie", "series"], description: "Content type. Default movie." },
        skip: { type: "integer", description: "Pagination offset." },
      },
      required: ["query"],
    },
    path: (a) => `/search?q=${encodeURIComponent(a.query)}&type=${a.type || "movie"}${a.skip ? `&skip=${a.skip}` : ""}`,
  },
  {
    name: "streamx_meta",
    description: "Full details for one title by IMDb id: overview, genres, runtime, cast, images, external ids, facts and Wikipedia summary.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "IMDb id, e.g. tt0133093." },
        type: { type: "string", enum: ["movie", "series"], description: "Content type. Default movie." },
        enrich: { type: "boolean", description: "Set false for a faster response without Wikidata/Wikipedia." },
      },
      required: ["id"],
    },
    path: (a) => `/meta/${a.type || "movie"}/${encodeURIComponent(a.id)}${a.enrich === false ? "?enrich=0" : ""}`,
  },
  {
    name: "streamx_scores",
    description: "Critic scores for a title: IMDb rating, Rotten Tomatoes Tomatometer + audience, Metacritic Metascore.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "IMDb id, e.g. tt0133093." },
        type: { type: "string", enum: ["movie", "series"] },
      },
      required: ["id"],
    },
    path: (a) => `/scores/${a.type || "movie"}/${encodeURIComponent(a.id)}`,
  },
  {
    name: "streamx_streaming",
    description: "Where to watch a title: streaming, rental and purchase providers for a country (JustWatch).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "IMDb id, e.g. tt0133093." },
        type: { type: "string", enum: ["movie", "series"] },
        country: { type: "string", description: "ISO-3166 alpha-2 country code. Default US." },
      },
      required: ["id"],
    },
    path: (a) => `/streaming/${a.type || "movie"}/${encodeURIComponent(a.id)}?country=${encodeURIComponent(a.country || "US")}`,
  },
  {
    name: "streamx_credits",
    description: "Cast and crew for a title: actors, directors, writers, composers and producers (with images where available).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "IMDb id, e.g. tt0133093." },
        type: { type: "string", enum: ["movie", "series"] },
      },
      required: ["id"],
    },
    path: (a) => `/credits/${a.type || "movie"}/${encodeURIComponent(a.id)}`,
  },
  {
    name: "streamx_similar",
    description: "Titles similar to a given title (sequels and other works by the same director).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "IMDb id, e.g. tt0133093." },
        type: { type: "string", enum: ["movie", "series"] },
      },
      required: ["id"],
    },
    path: (a) => `/similar/${a.type || "movie"}/${encodeURIComponent(a.id)}`,
  },
  {
    name: "streamx_person",
    description: "Person biography: name, description, image, birth/death, external ids and Wikipedia summary. Accepts IMDb nm… or Wikidata Q… ids.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "nm0000206 or Q43416." } },
      required: ["id"],
    },
    path: (a) => `/person/${encodeURIComponent(a.id)}`,
  },
  {
    name: "streamx_trending",
    description: "Popular / trending titles for a content type.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["movie", "series"] },
        limit: { type: "integer", description: "Max results (1-100, default 40)." },
      },
    },
    path: (a) => `/trending/${a.type || "movie"}${a.limit ? `?limit=${a.limit}` : ""}`,
  },
  {
    name: "streamx_images",
    description: "Artwork manifest for a title: poster, background and logo URLs at small/medium/large/original sizes.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "IMDb id, e.g. tt0133093." },
        type: { type: "string", enum: ["movie", "series"] },
      },
      required: ["id"],
    },
    path: (a) => `/images/${a.type || "movie"}/${encodeURIComponent(a.id)}`,
  },
  {
    name: "streamx_catalog",
    description: "Browse a catalogue of titles (e.g. top movies) with optional genre filter.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["movie", "series"] },
        catalog: { type: "string", description: "Catalogue id. Default 'top'." },
        genre: { type: "string", description: "Optional genre, e.g. Action." },
      },
    },
    path: (a) => `/catalog/${a.type || "movie"}/${a.catalog || "top"}${a.genre ? `?genre=${encodeURIComponent(a.genre)}` : ""}`,
  },
];

async function fetchApi(path) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
  } catch (error) {
    response = await fetch(`${FALLBACK}${path}`, { headers: { accept: "application/json" } }).catch(() => null);
    if (!response) throw new Error(`Request failed: ${error.message}`);
  }
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function respond(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function respondError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handle(message) {
  const { id, method, params } = message;

  if (method === "initialize") {
    return respond(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "streamx-api", version: "1.3.0" },
    });
  }
  if (method === "notifications/initialized" || method === "initialized") return;
  if (method === "ping") return respond(id, {});
  if (method === "tools/list") return respond(id, { tools: TOOLS });

  if (method === "tools/call") {
    const tool = TOOLS.find((t) => t.name === params?.name);
    if (!tool) return respondError(id, -32602, `Unknown tool: ${params?.name}`);
    try {
      const data = await fetchApi(tool.path(params.arguments || {}));
      return respond(id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
    } catch (error) {
      return respond(id, { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true });
    }
  }

  if (id != null) respondError(id, -32601, `Method not found: ${method}`);
}

let buffer = "";
let pending = 0;
let ended = false;

function maybeExit() {
  if (ended && pending === 0) process.exit(0);
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }
    pending += 1;
    handle(message)
      .catch((error) => {
        if (message && message.id != null) respondError(message.id, -32603, String(error.message || error));
      })
      .finally(() => {
        pending -= 1;
        maybeExit();
      });
  }
});
process.stdin.on("end", () => {
  ended = true;
  maybeExit();
});
