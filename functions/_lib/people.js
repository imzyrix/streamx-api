import { cachedValue } from "./scrape.js";

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "StreamX-API/1.3 (+https://streamx.qzz.io)";
const WEEK = 604800;

function bindingValue(binding) {
  return binding && binding.value ? binding.value : null;
}

function commonsImage(url, width = 300) {
  if (!url) return null;
  const base = url.replace(/^http:/, "https:");
  return `${base}${base.includes("?") ? "&" : "?"}width=${width}`;
}

function yearOf(date) {
  if (!date) return null;
  const match = /^(\d{4})/.exec(date);
  return match ? Number(match[1]) : null;
}

function dateOnly(value) {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : value;
}

function qidOf(uri) {
  return uri ? String(uri).split("/").pop() : null;
}

function looksLikeQid(value) {
  return /^Q\d+$/.test(value || "");
}

async function sparql(query, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(WIKIDATA_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/sparql-results+json",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "user-agent": USER_AGENT,
      },
      body: new URLSearchParams({ query }).toString(),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data && data.results ? data.results.bindings : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isImdbId(id) {
  return /^tt\d+$/.test(id || "");
}

function isPersonImdbId(id) {
  return /^nm\d+$/.test(id || "");
}

function isWikidataId(id) {
  return /^Q\d+$/.test(id || "");
}

export async function credits(context, type, id, { ttl = WEEK } = {}) {
  if (!isImdbId(id)) return null;
  const query = `SELECT ?person ?personLabel ?personDescription ?imdb ?img ?role WHERE {
  ?film wdt:P345 "${id}" .
  { ?film wdt:P161 ?person . BIND("cast" AS ?role) }
  UNION { ?film wdt:P57 ?person . BIND("director" AS ?role) }
  UNION { ?film wdt:P58 ?person . BIND("writer" AS ?role) }
  UNION { ?film wdt:P86 ?person . BIND("composer" AS ?role) }
  UNION { ?film wdt:P162 ?person . BIND("producer" AS ?role) }
  OPTIONAL { ?person wdt:P345 ?imdb }
  OPTIONAL { ?person wdt:P18 ?img }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 100`;
  const rows = await cachedValue(context, `people:credits:${id}`, ttl, () => sparql(query, 12000), 12000);
  if (!rows) return null;

  const groups = { cast: [], crew: [] };
  const seen = new Set();
  for (const row of rows) {
    const qidUri = bindingValue(row.person);
    const qid = qidOf(qidUri);
    const name = bindingValue(row.personLabel);
    const role = bindingValue(row.role);
    if (!qidUri || !name || name === qid || looksLikeQid(name)) continue;
    const key = `${role}:${qid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const person = {
      id: bindingValue(row.imdb) || qid,
      wikidataId: qid,
      name,
      role,
      image: commonsImage(bindingValue(row.img)),
      description: bindingValue(row.personDescription),
    };
    if (role === "cast") groups.cast.push(person);
    else groups.crew.push(person);
  }

  return {
    id,
    type,
    cast: groups.cast,
    crew: groups.crew,
    directors: groups.crew.filter((p) => p.role === "director"),
    source: "wikidata",
  };
}

export async function person(context, id, { ttl = WEEK } = {}) {
  if (!isPersonImdbId(id) && !isWikidataId(id)) return null;

  const filter = isPersonImdbId(id)
    ? `?person wdt:P345 "${id}" .`
    : `VALUES ?person { wd:${id} }`;
  const query = `SELECT ?person ?personLabel ?personDescription ?imdb ?img ?birth ?death ?site ?tmdb ?twitter ?instagram WHERE {
  ${filter}
  OPTIONAL { ?person wdt:P345 ?imdb }
  OPTIONAL { ?person wdt:P18 ?img }
  OPTIONAL { ?person wdt:P569 ?birth }
  OPTIONAL { ?person wdt:P570 ?death }
  OPTIONAL { ?person wdt:P856 ?site }
  OPTIONAL { ?person wdt:P4983 ?tmdb }
  OPTIONAL { ?person wdt:P2002 ?twitter }
  OPTIONAL { ?person wdt:P2003 ?instagram }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 1`;

  const rows = await cachedValue(context, `people:person:${id}`, ttl, () => sparql(query, 12000), 12000);
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  const name = bindingValue(row.personLabel);

  return {
    id,
    wikidataId: qidOf(bindingValue(row.person)),
    name: name && !looksLikeQid(name) ? name : null,
    description: bindingValue(row.personDescription),
    image: commonsImage(bindingValue(row.img), 400),
    born: dateOnly(bindingValue(row.birth)),
    died: dateOnly(bindingValue(row.death)),
    externalIds: {
      imdb: bindingValue(row.imdb),
      tmdb: bindingValue(row.tmdb),
      twitter: bindingValue(row.twitter),
      instagram: bindingValue(row.instagram),
    },
    officialSite: bindingValue(row.site),
    source: "wikidata",
  };
}

export async function similar(context, type, id, { ttl = WEEK } = {}) {
  if (!isImdbId(id)) return null;
  const query = `SELECT ?imdb (SAMPLE(?date) AS ?date) WHERE {
  ?film wdt:P345 "${id}" .
  { ?film wdt:P179 ?series . ?other wdt:P179 ?series . }
  UNION
  { ?film wdt:P57 ?director . ?other wdt:P57 ?director . }
  ?other wdt:P345 ?imdb .
  OPTIONAL { ?other wdt:P577 ?date }
  FILTER(?imdb != "${id}")
} GROUP BY ?imdb LIMIT 16`;

  const rows = await cachedValue(context, `people:similar:${id}`, ttl, () => sparql(query, 12000), 12000);
  if (!rows) return null;

  const seen = new Set();
  const metas = [];
  for (const row of rows) {
    const imdb = bindingValue(row.imdb);
    if (!imdb || seen.has(imdb)) continue;
    seen.add(imdb);
    const year = yearOf(bindingValue(row.date));
    metas.push({
      id: imdb,
      type,
      name: imdb,
      releaseInfo: year ? String(year) : null,
      poster: `https://images.metahub.space/poster/medium/${imdb}/img`,
      background: `https://images.metahub.space/background/medium/${imdb}/img`,
    });
  }

  return { id, type, metas: metas.slice(0, 12), source: "wikidata" };
}
