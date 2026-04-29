import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { createBareServer } from "@nebula-services/bare-server-node";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import type { IncomingMessage } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ─── Bare servers (1-5) ───────────────────────────────────────────────────────
export const bare1 = createBareServer("/api/bare/",  { logErrors: false, blockLocal: false });
export const bare2 = createBareServer("/api/bare2/", { logErrors: false, blockLocal: false });
export const bare3 = createBareServer("/api/bare3/", { logErrors: false, blockLocal: false });
export const bare4 = createBareServer("/api/bare4/", { logErrors: false, blockLocal: false });
export const bare5 = createBareServer("/api/bare5/", { logErrors: false, blockLocal: false });

export const bares = [bare1, bare2, bare3, bare4, bare5];

// ─── Wisp server (optional — install wisp-server-node to enable) ──────────────
type WispHandler = (req: IncomingMessage, socket: any, head: Buffer) => void;
export let wispHandler: WispHandler | null = null;

try {
  const wisp = require("wisp-server-node");
  wispHandler = wisp.routeRequest ?? wisp.default?.routeRequest ?? null;
  if (wispHandler) logger.info("Wisp protocol enabled at /api/wisp");
} catch {
  logger.warn("wisp-server-node not installed — Wisp disabled. Run: pnpm --filter @workspace/api-server add wisp-server-node");
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

// ─── Static frontend (production only) ───────────────────────────────────────
// In Docker/production, the Vite-built frontend lives at ../public relative to dist/
if (process.env.NODE_ENV === "production") {
  const staticDir = path.join(__dirname, "../public");
  app.use(express.static(staticDir));
  // SPA fallback — send index.html for any unmatched route that isn't /api or a proxy route
  app.use((req, res, next) => {
    const p = req.path;
    if (!p.startsWith("/api") && !p.startsWith("/service") && !p.startsWith("/baremux")) {
      res.sendFile(path.join(staticDir, "index.html"));
    } else {
      next();
    }
  });
}

export default app;
