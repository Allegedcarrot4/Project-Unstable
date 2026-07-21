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

// Railway diagnostic endpoint
app.get("/api/railway-info", async (_req, reply) => {
  const addr = app.server.address();
  return reply.send({
    listening: app.server.listening,
    port: typeof addr === "object" && addr ? addr.port : null,
    address: typeof addr === "object" && addr ? addr.address : null,
    family: typeof addr === "object" && addr ? addr.family : null,
    envPort: process.env["PORT"],
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
  });
});

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT env not set");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

try {
  await app.listen({ port, host: "0.0.0.0" });
  const addr = app.server.address();
  const addrInfo = typeof addr === "object" ? `address=${addr!.address} port=${addr!.port} family=${addr!.family}` : String(addr);
  logger.info({ port, pid: process.pid, addr: addrInfo }, "Server listening");
  console.log(`[startup] HTTP server active: ${app.server.listening} — ${addrInfo} (PORT env: "${process.env["PORT"]}")`);
} catch (err) {
  logger.error({ err }, "Server failed to listen");
  process.exit(1);
}
