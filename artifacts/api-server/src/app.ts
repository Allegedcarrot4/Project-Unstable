import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { createBareServer } from "@tomphttp/bare-server-node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import type { IncomingMessage } from "http";
import http from "http";
import https from "https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Disable keep-alive on outgoing connections so target servers (e.g. Google)
// don't reject with "Too many keep-alive connections from this IP address"
const httpAgent = new http.Agent({ keepAlive: false });
const httpsAgent = new https.Agent({ keepAlive: false });

// ─── Bare servers (1-5) ───────────────────────────────────────────────────────
export const bare1 = createBareServer("/api/bare/",  { logErrors: false, blockLocal: false, httpAgent, httpsAgent, connectionLimiter: { maxConnectionsPerIP: 100000 } });
export const bare2 = createBareServer("/api/bare2/", { logErrors: false, blockLocal: false, httpAgent, httpsAgent, connectionLimiter: { maxConnectionsPerIP: 100000 } });
export const bare3 = createBareServer("/api/bare3/", { logErrors: false, blockLocal: false, httpAgent, httpsAgent, connectionLimiter: { maxConnectionsPerIP: 100000 } });
export const bare4 = createBareServer("/api/bare4/", { logErrors: false, blockLocal: false, httpAgent, httpsAgent, connectionLimiter: { maxConnectionsPerIP: 100000 } });
export const bare5 = createBareServer("/api/bare5/", { logErrors: false, blockLocal: false, httpAgent, httpsAgent, connectionLimiter: { maxConnectionsPerIP: 100000 } });

export const bares = [bare1, bare2, bare3, bare4, bare5];

// ─── Wisp server ──────────────────────────────────────────────────────────────
type WispHandler = (req: IncomingMessage, socket: any, head?: Buffer) => void;
export let wispHandler: WispHandler | null = null;

try {
  const { server: wisp, logging } = await import("@mercuryworkshop/wisp-js/server");
  Object.assign(wisp.options, {
    dns_method: "resolve",
    dns_servers: ["1.1.1.3", "1.0.0.3"],
    dns_result_order: "ipv4first",
  });
  wispHandler = wisp.routeRequest as WispHandler;
  logger.info("Wisp protocol enabled at /api/wisp/");
} catch (err) {
  logger.warn({ err }, "wisp-js not available — Wisp disabled");
}

// ─── Express app ──────────────────────────────────────────────────────────────
const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function resolvePkgDist(pkg: string): string {
  const mainPath = require.resolve(pkg);
  const pkgRoot = path.dirname(path.dirname(mainPath));
  return path.join(pkgRoot, "dist");
}

app.use(
  "/api/baremod",
  express.static(resolvePkgDist("@mercuryworkshop/bare-as-module3"), { index: false }),
);

app.use("/api", router);

// ─── Static frontend ───────────────────────────────────────
const staticCandidates = [
  path.resolve(process.cwd(), "app/dist/public"),
  path.resolve(__dirname, "../../app/dist/public"),
  path.resolve(__dirname, "../../artifacts/app/dist/public"),
];
const staticDir = staticCandidates.find((candidate) => fs.existsSync(candidate));
if (!staticDir) {
  throw new Error(`Static frontend folder not found; tried: ${staticCandidates.join(", ")}`);
}
app.use(express.static(staticDir));
app.use((req, res, next) => {
  const p = req.path;
  if (!p.startsWith("/api") && !p.startsWith("/service") && !p.startsWith("/ham") && !p.startsWith("/baremux")) {
    res.sendFile(path.join(staticDir, "index.html"));
  } else {
    next();
  }
});

export default app;
