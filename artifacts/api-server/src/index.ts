import "dotenv/config";
import { logger } from "./lib/logger";

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
});
process.on("beforeExit", (code) => {
  logger.error({ code }, "Event loop draining — server likely not keeping process alive");
});

// Keep event loop alive even if server doesn't register handles properly
setInterval(() => {}, 60000);

const { default: app } = await import("./app");

// Root-level health check — Railway pings this
app.get("/", async (_req, reply) => reply.type("text/plain").send("OK"));

const rawPort = process.env["PORT"] || "8080";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

try {
  await app.listen({ port, host: "0.0.0.0" });
  logger.info({ port, pid: process.pid }, "Server listening");
  console.log(`[startup] HTTP server active: ${app.server.listening} on port ${port} (PORT env: "${process.env["PORT"]}")`);
} catch (err) {
  logger.error({ err }, "Server failed to listen");
  process.exit(1);
}
