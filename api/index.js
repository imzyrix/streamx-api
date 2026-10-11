import { handle } from "../server/app.js";

export default async function vercelHandler(req, res) {
  try {
    const host = req.headers.host || "localhost";
    const url = `https://${host}${req.url || "/"}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
      else if (value != null) headers.set(key, String(value));
    }
    const request = new Request(url, { method: req.method || "GET", headers });
    const response = await handle(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "Internal error", detail: String((error && error.message) || error) }));
  }
}
