import { json } from "./_lib/upstream.js";

export function onRequestGet() {
  return json(
    {
      ok: true,
      service: "streamx-api",
      source: "cinemeta",
      requiresApiKey: false,
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
