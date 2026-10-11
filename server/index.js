import http from "node:http";
import { handle } from "./app.js";

const port = Number(process.env.PORT) || 8788;

function toRequest(req) {
  const host = req.headers.host || `localhost:${port}`;
  const url = `http://${host}${req.url || "/"}`;
  const method = req.method || "GET";
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else if (value != null) headers.set(key, String(value));
  }
  return new Request(url, { method, headers });
}

const server = http.createServer(async (req, res) => {
  try {
    const response = await handle(toRequest(req));
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "Internal error", detail: String((error && error.message) || error) }));
  }
});

server.listen(port, () => {
  console.log(`streamx-api listening on http://localhost:${port}`);
});
