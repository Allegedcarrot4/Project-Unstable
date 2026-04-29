import { createServer } from "http";
import app, { bares, wispHandler } from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

const server = createServer((req, res) => {
  for (const bare of bares) {
    if (bare.shouldRoute(req)) { bare.routeRequest(req, res); return; }
  }
  app(req, res);
});

server.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "";

  // Wisp protocol (optional — needs wisp-server-node installed)
  if (url.startsWith("/api/wisp") && wispHandler) {
    wispHandler(req, socket, head);
    return;
  }

  // Bare servers
  for (const bare of bares) {
    if (bare.shouldRoute(req)) { bare.routeUpgrade(req, socket, head); return; }
  }

  socket.end();
});

server.listen(port, (err?: Error) => {
  if (err) { logger.error({ err }, "Error listening on port"); process.exit(1); }
  logger.info({ port }, "Server listening");
});
