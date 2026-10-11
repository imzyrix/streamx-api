/*
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
  //\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\//\
 || StreamX API — by @imzyrix & @zyrixdevs | https://github.com/imzyrix/streamx-api ||
  \\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
     ZyrixDev — Crafted with precision for seamless streaming data.
     _   _   _   _   _   _   _   _   _   _   _   _   _   _   _   _
*/

import { cachedValue, fetchJsonGet, fetchJsonPost, stripHtml } from "./scrape.js";

const TVMAZE = "https://api.tvmaze.com";
const ANILIST = "https://graphql.anilist.co";
const DAY = 86400;

function shapeShow(show) {
  return {
    source: "tvmaze",
    id: show.id ?? null,
    url: show.url ?? null,
    name: show.name ?? null,
    type: show.type ?? null,
    language: show.language ?? null,
    genres: Array.isArray(show.genres) ? show.genres : [],
    status: show.status ?? null,
    runtime: show.runtime ?? show.averageRuntime ?? null,
    premiered: show.premiered ?? null,
    ended: show.ended ?? null,
    officialSite: show.officialSite ?? null,
    rating: (show.rating && show.rating.average) ?? null,
    weight: show.weight ?? null,
    network: (show.network && show.network.name) || (show.webChannel && show.webChannel.name) || null,
    country: (show.network && show.network.country && show.network.country.code) || null,
    image: (show.image && (show.image.original || show.image.medium)) || null,
    summary: stripHtml(show.summary),
    externals: {
      imdb: (show.externals && show.externals.imdb) ?? null,
      thetvdb: (show.externals && show.externals.thetvdb) ?? null,
      tvrage: (show.externals && show.externals.tvrage) ?? null,
    },
  };
}

export async function tvmazeShow(context, id) {
  const raw = String(id || "").trim();
  const byImdb = /^tt\d+$/i.test(raw);
  const byId = /^\d+$/.test(raw);
  if (!byImdb && !byId) return null;

  const key = `https://streamx.internal/tvmaze/${encodeURIComponent(raw)}.json`;

  return cachedValue(
    context,
    key,
    DAY,
    async () => {
      const url = byImdb
        ? `${TVMAZE}/lookup/shows?imdb=${encodeURIComponent(raw)}`
        : `${TVMAZE}/shows/${encodeURIComponent(raw)}`;
      const show = await fetchJsonGet(url, { timeoutMs: 8000 });
      if (!show || !show.id) return null;
      return shapeShow(show);
    },
    8000,
  );
}

const ANIME_QUERY = `query($q:String){Page(perPage:8){media(search:$q,type:ANIME,sort:SEARCH_MATCH){id title{romaji english native} format status episodes duration seasonYear averageScore popularity genres coverImage{extraLarge color} bannerImage siteUrl description(asHtml:false)}}}`;

function shapeAnime(media) {
  return {
    id: media.id ?? null,
    title: (media.title && (media.title.english || media.title.romaji || media.title.native)) || null,
    titleNative: (media.title && media.title.native) || null,
    format: media.format ?? null,
    status: media.status ?? null,
    episodes: media.episodes ?? null,
    duration: media.duration ?? null,
    seasonYear: media.seasonYear ?? null,
    averageScore: media.averageScore ?? null,
    popularity: media.popularity ?? null,
    genres: Array.isArray(media.genres) ? media.genres : [],
    coverImage: (media.coverImage && (media.coverImage.extraLarge || media.coverImage.color)) || null,
    bannerImage: media.bannerImage ?? null,
    siteUrl: media.siteUrl ?? null,
    description: media.description ?? null,
  };
}

export async function anilistSearch(context, query) {
  const term = String(query || "").trim();
  if (!term) return null;
  const key = `https://streamx.internal/anilist/${encodeURIComponent(term.toLowerCase())}.json`;

  return cachedValue(
    context,
    key,
    DAY,
    async () => {
      const payload = await fetchJsonPost(
        ANILIST,
        { query: ANIME_QUERY, variables: { q: term } },
        { timeoutMs: 8000 },
      );
      const media = payload && payload.data && payload.data.Page && payload.data.Page.media;
      if (!Array.isArray(media)) return null;
      return media.map(shapeAnime);
    },
    8000,
  );
}
