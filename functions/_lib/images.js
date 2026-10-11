export const METAHUB_HOST = "https://images.metahub.space";
export const EPISODE_HOST = "https://episodes.metahub.space";

export const KINDS = ["poster", "background", "logo"];
export const SIZES = ["small", "medium", "large", "original"];

// Episode stills are resolved by MetaHub against the TMDB image CDN, which
// accepts the standard TMDB width buckets below.
export const STILL_SIZES = ["w92", "w154", "w185", "w300", "w342", "w500", "w780", "original"];

const STILL_ALIAS = { small: "w185", medium: "w500", large: "w780", xlarge: "original" };

export function resolveStillSize(size) {
  const value = String(size || "w780").toLowerCase().replace(/\.jpe?g$/, "");
  if (STILL_ALIAS[value]) return STILL_ALIAS[value];
  return STILL_SIZES.includes(value) ? value : "w780";
}

export function upstreamImageUrl(kind, size, id) {
  return `${METAHUB_HOST}/${kind}/${size}/${encodeURIComponent(id)}/img`;
}

export function upstreamStillUrl(id, season, episode, size = "w780") {
  return `${EPISODE_HOST}/${encodeURIComponent(id)}/${Number(season)}/${Number(episode)}/${resolveStillSize(size)}.jpg`;
}

export function proxyImageUrl(origin, kind, size, id) {
  return `${origin}/img/${kind}/${size}/${encodeURIComponent(id)}/img`;
}

export function proxyStillUrl(origin, id, season, episode, size = "w780") {
  return `${origin}/img/still/${encodeURIComponent(id)}/${Number(season)}/${Number(episode)}/${resolveStillSize(size)}`;
}

function sizesToMap(sizes, build) {
  const out = {};
  for (const size of sizes) out[size] = build(size);
  return out;
}

export function imageManifest(id, origin, options = {}) {
  const { direct = false } = options;
  const build = (kind, size) =>
    direct ? upstreamImageUrl(kind, size, id) : proxyImageUrl(origin, kind, size, id);

  return {
    id,
    source: direct ? "metahub" : "streamx",
    direct,
    kinds: KINDS,
    sizes: SIZES,
    poster: sizesToMap(SIZES, (size) => build("poster", size)),
    background: sizesToMap(SIZES, (size) => build("background", size)),
    logo: sizesToMap(SIZES, (size) => build("logo", size)),
  };
}

export function stillTemplate(id, origin, options = {}) {
  const { direct = false } = options;
  if (direct) return `${EPISODE_HOST}/${encodeURIComponent(id)}/{season}/{episode}/{size}.jpg`;
  return `${origin}/img/still/${encodeURIComponent(id)}/{season}/{episode}/{size}`;
}
