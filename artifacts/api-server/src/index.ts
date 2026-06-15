import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] || "8080";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

try {
  await app.listen({ port, host: "0.0.0.0" });
  logger.info({ port }, "Server listening");
} catch (err) {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
}
