import "dotenv/config";
import { logger } from "./lib/logger";

const { default: app } = await import("./app");

const rawPort = process.env["PORT"] || "8080";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

try {
  await app.listen({ port, host: "0.0.0.0" });
  logger.info({ port, pid: process.pid }, "Server listening");
} catch (err) {
  logger.error({ err }, "Server failed to listen");
  process.exit(1);
}
