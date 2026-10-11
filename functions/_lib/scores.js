import { cachedValue, fetchHtml } from "./scrape.js";

const WEEK = 604800;
const RT_BASE = "https://www.rottentomatoes.com";
const MC_BASE = "https://www.metacritic.com";

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRtScorecard(html) {
  const match = html.match(/<script[^>]*id="media-scorecard-json"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function resolveRtPath(type, title) {
  const searchType = type === "series" ? "tvSeries" : "movies";
  const html = await fetchHtml(`${RT_BASE}/search?search=${encodeURIComponent(title)}&type=${searchType}`);
  if (!html) return null;
  const prefix = type === "series" ? "/tv/" : "/m/";
  const re = /href="https:\/\/www\.rottentomatoes\.com(\/[^"?#]+)"/g;
  let match;
  while ((match = re.exec(html))) {
    if (match[1].startsWith(prefix)) return match[1].slice(1);
  }
  return null;
}

export async function rottenTomatoes(context, { type, title, rtId }) {
  const slug = String(rtId || "").trim();
  const key = `https://streamx.internal/rt/${type}/${encodeURIComponent(slug || title || "unknown")}.json`;

  return cachedValue(
    context,
    key,
    WEEK,
    async () => {
      let path = /^(m|tv)\//.test(slug) ? slug : null;
      if (!path && title) path = await resolveRtPath(type, title);
      if (!path) return null;

      const html = await fetchHtml(`${RT_BASE}/${path}`, { timeoutMs: 10000 });
      if (!html) return null;
      const card = parseRtScorecard(html);
      if (!card) return null;

      const critics = card.criticsScore || {};
      const audience = card.audienceScore || {};

      return {
        source: "rottentomatoes",
        url: `${RT_BASE}/${path}`,
        critics: {
          title: critics.title || "Tomatometer",
          score: numberOrNull(critics.score),
          averageRating: numberOrNull(critics.averageRating),
          reviewCount: numberOrNull(critics.reviewCount) ?? numberOrNull(critics.ratingCount),
          sentiment: critics.sentiment || null,
          certified: critics.certified === true,
        },
        audience: {
          title: audience.title || "Popcornmeter",
          score: numberOrNull(audience.score),
          averageRating: numberOrNull(audience.averageRating),
          reviewCount: numberOrNull(audience.reviewCount),
          sentiment: audience.sentiment || null,
        },
      };
    },
    10000,
  );
}

function parseMetacritic(html) {
  const blocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const block of blocks) {
    const json = block.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      continue;
    }
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      const rating = item && item.aggregateRating;
      if (!rating || rating.ratingValue == null) continue;
      if (item["@type"] !== "Movie" && item["@type"] !== "TVSeries") continue;
      return {
        score: numberOrNull(rating.ratingValue),
        reviewCount: numberOrNull(rating.reviewCount),
        bestRating: numberOrNull(rating.bestRating),
        contentRating: item.contentRating || null,
        url: rating.url || null,
      };
    }
  }
  return null;
}

async function resolveMcPath(type, title) {
  const kind = type === "series" ? "tv" : "movie";
  const html = await fetchHtml(`${MC_BASE}/search/${encodeURIComponent(title)}/`);
  if (!html) return null;
  const re = new RegExp(`href="(?:https:\\/\\/www\\.metacritic\\.com)?(\\/${kind}\\/[^"?#]+)"`, "g");
  const match = re.exec(html);
  return match ? match[1] : null;
}

export async function metacritic(context, { type, title, mcId }) {
  const slug = String(mcId || "").trim();
  const key = `https://streamx.internal/mc/${type}/${encodeURIComponent(slug || title || "unknown")}.json`;

  return cachedValue(
    context,
    key,
    WEEK,
    async () => {
      let path = /^(movie|tv)\//.test(slug) ? slug : null;
      if (!path && title) path = await resolveMcPath(type, title);
      if (!path) return null;

      const html = await fetchHtml(`${MC_BASE}/${path.replace(/\/+$/, "")}/`, { timeoutMs: 10000 });
      if (!html) return null;
      const card = parseMetacritic(html);
      if (!card) return null;

      return {
        source: "metacritic",
        url: `${MC_BASE}/${path.replace(/\/+$/, "")}/`,
        critics: {
          title: "Metascore",
          score: card.score,
          reviewCount: card.reviewCount,
          bestRating: card.bestRating,
        },
        contentRating: card.contentRating,
      };
    },
    10000,
  );
}

export { numberOrNull };
