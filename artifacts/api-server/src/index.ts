import "dotenv/config";
import cluster from "node:cluster";
import os from "node:os";
import { logger } from "./lib/logger";

const NUM_WORKERS = Math.max(1, os.cpus().length);

if (cluster.isPrimary) {
  logger.info({ workers: NUM_WORKERS }, "Primary process spawning workers");

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.warn({ pid: worker.process.pid, code, signal }, "Worker died — respawning");
    cluster.fork();
  });
} else {
  // Each worker runs its own Fastify instance + bare servers
  const { default: app } = await import("./app");

  const rawPort = process.env["PORT"] || "8080";
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

  try {
    await app.listen({ port, host: "0.0.0.0" });
    logger.info({ port, pid: process.pid }, "Worker listening");
  } catch (err) {
    logger.error({ err }, "Worker failed to listen");
    process.exit(1);
  }
}
