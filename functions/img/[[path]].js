import { fetchImage, fail, METAHUB } from "../_lib/upstream.js";
import { upstreamStillUrl } from "../_lib/images.js";

function segmentsOf(params) {
  if (Array.isArray(params.path)) return params.path;
  return params.path ? [params.path] : [];
}

export async function onRequestGet(context) {
  const { params } = context;
  const segments = segmentsOf(params);

  if (segments.length === 0) {
    return fail(
      "No image path. Use /img/<kind>/<size>/<id>/img (kind: poster|background|logo) or /img/still/<id>/<season>/<episode>/<size>.",
      400,
    );
  }

  // Episode still: /img/still/<id>/<season>/<episode>/<size> (size optional)
  if (segments[0] === "still") {
    const [, id, season, episode, size = "w780"] = segments;
    if (!id || season == null || episode == null) {
      return fail("Use /img/still/<id>/<season>/<episode>/<size>, e.g. /img/still/tt0944947/1/1/w780", 400);
    }
    const target = upstreamStillUrl(id, season, episode, size);
    return fetchImage(context, target, {});
  }

  // Artwork: /img/<kind>/<size>/<id>/img
  const target = `${METAHUB}/${segments.join("/")}`;
  return fetchImage(context, target, {});
}
