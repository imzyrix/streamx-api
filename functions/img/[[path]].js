import { fetchImage, METAHUB, fail } from "../_lib/upstream.js";

export async function onRequestGet(context) {
  const { params } = context;
  const segments = Array.isArray(params.path)
    ? params.path
    : params.path
      ? [params.path]
      : [];

  if (segments.length === 0) {
    return fail("No image path. Use /img/<kind>/<size>/<id>/img, e.g. /img/poster/medium/tt0133093/img", 400);
  }

  const target = `${METAHUB}/${segments.join("/")}`;
  return fetchImage(context, target, {});
}
