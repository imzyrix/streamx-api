const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "StreamX-API/1.1 (+https://streamx.qzz.io)";
const WEEK = 604800;

function cacheStore() {
  try {
    return typeof caches !== "undefined" && caches.default ? caches.default : null;
  } catch {
    return null;
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function cached(context, key, ttl, producer, ms) {
  const cache = cacheStore();
  const request = new Request(key, { method: "GET" });

  if (cache) {
    const hit = await cache.match(request);
    if (hit) {
      try {
        return await hit.json();
      } catch {
        /* fall through to live fetch */
      }
    }
  }

  let data = null;
  try {
    data = await withTimeout(producer(), ms);
  } catch {
    return null;
  }

  if (data && cache && context && context.waitUntil) {
    context.waitUntil(
      cache.put(
        request,
        new Response(JSON.stringify(data), {
          headers: { "content-type": "application/json", "cache-control": `public, max-age=${ttl}` },
        }),
      ),
    );
  }

  return data;
}

const AGGREGATES = [
  "(SAMPLE(?rt) AS ?rt)",
  "(SAMPLE(?mc) AS ?mc)",
  "(SAMPLE(?tmdbMovie) AS ?tmdbMovie)",
  "(SAMPLE(?tmdbTv) AS ?tmdbTv)",
  "(SAMPLE(?budget) AS ?budget)",
  "(SAMPLE(?box) AS ?box)",
  "(SAMPLE(?duration) AS ?duration)",
  "(SAMPLE(?website) AS ?website)",
  "(SAMPLE(?rating) AS ?rating)",
  '(GROUP_CONCAT(DISTINCT ?countryLabel; separator="|") AS ?countries)',
  '(GROUP_CONCAT(DISTINCT ?languageLabel; separator="|") AS ?languages)',
  '(GROUP_CONCAT(DISTINCT ?companyLabel; separator="|") AS ?companies)',
  '(GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres)',
  '(GROUP_CONCAT(DISTINCT ?directorLabel; separator="|") AS ?directors)',
  '(GROUP_CONCAT(DISTINCT ?composerLabel; separator="|") AS ?composers)',
  '(GROUP_CONCAT(DISTINCT ?seriesLabel; separator="|") AS ?series)',
].join(" ");

const OPTIONALS = [
  "OPTIONAL{?item wdt:P1258 ?rt}",
  "OPTIONAL{?item wdt:P1712 ?mc}",
  "OPTIONAL{?item wdt:P4947 ?tmdbMovie}",
  "OPTIONAL{?item wdt:P4983 ?tmdbTv}",
  "OPTIONAL{?item wdt:P2130 ?budget}",
  "OPTIONAL{?item wdt:P2142 ?box}",
  "OPTIONAL{?item wdt:P2047 ?duration}",
  "OPTIONAL{?item wdt:P856 ?website}",
  "OPTIONAL{?item wdt:P1657 ?rating}",
  'OPTIONAL{?item wdt:P495 ?country . ?country rdfs:label ?countryLabel FILTER(lang(?countryLabel)="en")}',
  'OPTIONAL{?item wdt:P364 ?languageItem . ?languageItem rdfs:label ?languageLabel FILTER(lang(?languageLabel)="en")}',
  'OPTIONAL{?item wdt:P272 ?company . ?company rdfs:label ?companyLabel FILTER(lang(?companyLabel)="en")}',
  'OPTIONAL{?item wdt:P136 ?genre . ?genre rdfs:label ?genreLabel FILTER(lang(?genreLabel)="en")}',
  'OPTIONAL{?item wdt:P57 ?director . ?director rdfs:label ?directorLabel FILTER(lang(?directorLabel)="en")}',
  'OPTIONAL{?item wdt:P86 ?composer . ?composer rdfs:label ?composerLabel FILTER(lang(?composerLabel)="en")}',
  'OPTIONAL{?item wdt:P179 ?seriesItem . ?seriesItem rdfs:label ?seriesLabel FILTER(lang(?seriesLabel)="en")}',
].join(" ");

function wikidataQuery(imdbId) {
  return `SELECT ${AGGREGATES} WHERE { ?item wdt:P345 "${imdbId}" . ${OPTIONALS} }`;
}

function shapeFacts(bindings) {
  const row = Array.isArray(bindings) ? bindings[0] : null;
  if (!row) return null;

  const value = (key) => (row[key] ? row[key].value : null);
  const list = (key) => {
    const raw = value(key);
    return raw ? raw.split("|").map((entry) => entry.trim()).filter(Boolean) : [];
  };
  const number = (key) => {
    const raw = value(key);
    if (raw == null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    source: "wikidata",
    externalIds: {
      rottenTomatoes: value("rt"),
      metacritic: value("mc"),
      tmdb: value("tmdbMovie") || value("tmdbTv"),
    },
    budget: number("budget"),
    boxOffice: number("box"),
    runtimeMinutes: number("duration"),
    certification: value("rating"),
    officialWebsite: value("website"),
    countries: list("countries"),
    languages: list("languages"),
    productionCompanies: list("companies"),
    genres: list("genres"),
    directors: list("directors"),
    composers: list("composers"),
    partOfSeries: list("series"),
  };
}

export async function wikidataFacts(context, imdbId) {
  const id = String(imdbId || "");
  if (!/^tt\d+$/i.test(id)) return null;

  const key = `https://streamx.internal/wikidata/${id}.json`;
  return cached(
    context,
    key,
    WEEK,
    async () => {
      const response = await fetch(WIKIDATA_ENDPOINT, {
        method: "POST",
        headers: {
          accept: "application/sparql-results+json",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent": USER_AGENT,
        },
        body: new URLSearchParams({ query: wikidataQuery(id) }).toString(),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return shapeFacts(data && data.results && data.results.bindings);
    },
    4500,
  );
}

export async function wikipediaSummary(context, title, lang = "en") {
  const name = String(title || "").trim();
  if (!name) return null;
  const safeLang = /^[a-z]{2,3}$/i.test(lang) ? lang : "en";
  const page = encodeURIComponent(name.replace(/\s+/g, "_"));
  const key = `https://streamx.internal/wikipedia/${safeLang}/${encodeURIComponent(name)}.json`;

  return cached(
    context,
    key,
    WEEK,
    async () => {
      const response = await fetch(
        `https://${safeLang}.wikipedia.org/api/rest_v1/page/summary/${page}?redirect=true`,
        { headers: { accept: "application/json", "user-agent": USER_AGENT } },
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (!data || data.type === "disambiguation") return null;
      return {
        source: "wikipedia",
        title: data.title ?? name,
        description: data.description ?? null,
        extract: data.extract ?? null,
        url: (data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page) || null,
        thumbnail: (data.thumbnail && data.thumbnail.source) || null,
      };
    },
    3500,
  );
}

function shapeImdbItems(payload) {
  const rows = (payload && payload.d) || [];
  const items = [];
  for (const row of rows) {
    if (!row || !row.id || !/^tt\d+$/i.test(row.id)) continue;
    const image = row.i || {};
    items.push({
      id: row.id,
      title: row.l ?? null,
      type: row.qid === "tvSeries" || row.q === "TV series" ? "series" : "movie",
      kind: row.q ?? null,
      year: row.y ?? null,
      rank: row.rank ?? null,
      stars: row.s ? row.s.split(",").map((name) => name.trim()).filter(Boolean) : [],
      poster: image.imageUrl ?? null,
      posterWidth: image.width ?? null,
      posterHeight: image.height ?? null,
    });
  }
  return items;
}

export async function imdbSearch(context, query) {
  const term = String(query || "").trim();
  if (!term) return null;
  const bucket = /[a-z0-9]/i.test(term[0]) ? term[0].toLowerCase() : "x";
  const key = `https://streamx.internal/imdb-suggest/${encodeURIComponent(term.toLowerCase())}.json`;

  return cached(
    context,
    key,
    86400,
    async () => {
      const response = await fetch(
        `https://v2.sg.media-imdb.com/suggestion/${bucket}/${encodeURIComponent(term.toLowerCase())}.json?includeVideos=1`,
        { headers: { accept: "application/json", "user-agent": USER_AGENT } },
      );
      if (!response.ok) return null;
      const data = await response.json();
      return shapeImdbItems(data);
    },
    4000,
  );
}
