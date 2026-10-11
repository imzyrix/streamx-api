import { cachedValue, fetchJsonPost } from "./scrape.js";

const JW_GRAPHQL = "https://apis.justwatch.com/graphql";
const DAY = 86400;

const OFFERS_QUERY = `query GetOffers($q:String!,$c:Country!,$l:Language!){popularTitles(country:$c,first:1,filter:{searchQuery:$q}){edges{node{objectType content(country:$c,language:$l){title originalReleaseYear fullPath}offers(country:$c,platform:WEB){monetizationType presentationType standardWebURL package{clearName}}}}}}`;

const MONETIZATION = {
  FLATRATE: "subscription",
  FREE: "free",
  ADS: "free",
  RENT: "rent",
  BUY: "buy",
};

const QUALITY = { SD: 1, HD: 2, _4K: 3, "4K": 3 };

function qualityRank(value) {
  return QUALITY[value] || 0;
}

export async function justWatchOffers(context, { title, year, type, country }) {
  const name = String(title || "").trim();
  if (!name) return null;
  const region = String(country || "US").toUpperCase();
  const key = `https://streamx.internal/justwatch/${region}/${type}/${encodeURIComponent(name)}.json`;

  return cachedValue(
    context,
    key,
    DAY,
    async () => {
      const payload = await fetchJsonPost(
        JW_GRAPHQL,
        {
          query: OFFERS_QUERY,
          variables: { q: name, c: region, l: "en" },
        },
        { timeoutMs: 10000 },
      );

      const edges = payload && payload.data && payload.data.popularTitles && payload.data.popularTitles.edges;
      const node = edges && edges[0] && edges[0].node;
      if (!node) return null;

      const content = node.content || {};
      if (year) {
        const releaseYear = Number(content.originalReleaseYear);
        if (Number.isFinite(releaseYear) && Math.abs(releaseYear - Number(year)) > 1) return null;
      }

      const byProvider = new Map();
      for (const offer of node.offers || []) {
        const providerName = offer.package && offer.package.clearName;
        if (!providerName) continue;
        const entry =
          byProvider.get(providerName) || { name: providerName, types: [], quality: null, webUrl: null };
        const kind = MONETIZATION[offer.monetizationType];
        if (kind && !entry.types.includes(kind)) entry.types.push(kind);
        if (offer.standardWebURL && (!entry.webUrl || kind === "subscription")) entry.webUrl = offer.standardWebURL;
        if (qualityRank(offer.presentationType) > qualityRank(entry.quality)) entry.quality = offer.presentationType;
        byProvider.set(providerName, entry);
      }

      const providers = [...byProvider.values()]
        .map((entry) => ({ ...entry, types: entry.types.sort(), quality: entry.quality }))
        .sort((a, b) => {
          const aSub = a.types.includes("subscription") ? 0 : 1;
          const bSub = b.types.includes("subscription") ? 0 : 1;
          return aSub - bSub || a.name.localeCompare(b.name);
        });

      return {
        source: "justwatch",
        country: region,
        matched: {
          title: content.title || null,
          year: content.originalReleaseYear ?? null,
          path: content.fullPath || null,
        },
        justWatchUrl: content.fullPath ? `https://www.justwatch.com${content.fullPath}` : null,
        providers,
      };
    },
    10000,
  );
}
