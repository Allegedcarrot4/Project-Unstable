import Fastify from "fastify";
import fastifyCompress from "@fastify/compress";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import fastifyFormbody from "@fastify/formbody";
import { createBareServer } from "@tomphttp/bare-server-node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import http from "http";
import https from "https";
import { createServer } from "http";
import router from "./routes";
import { logger } from "./lib/logger";
import type { IncomingMessage, ServerResponse } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 32,
  maxFreeSockets: 8,
  keepAliveMsecs: 10000,
  timeout: 30000,
});
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 32,
  maxFreeSockets: 8,
  keepAliveMsecs: 10000,
  timeout: 30000,
});

export const bare1 = createBareServer("/api/cdn/",  { logErrors: false, blockLocal: false, httpAgent, httpsAgent, connectionLimiter: { maxConnectionsPerIP: 100000 } });
export const bare2 = createBareServer("/api/cdn2/", { logErrors: false, blockLocal: false, httpAgent, httpsAgent, connectionLimiter: { maxConnectionsPerIP: 100000 } });
export const bare3 = createBareServer("/api/cdn3/", { logErrors: false, blockLocal: false, httpAgent, httpsAgent, connectionLimiter: { maxConnectionsPerIP: 100000 } });
export const bare4 = createBareServer("/api/cdn4/", { logErrors: false, blockLocal: false, httpAgent, httpsAgent, connectionLimiter: { maxConnectionsPerIP: 100000 } });
export const bare5 = createBareServer("/api/cdn5/", { logErrors: false, blockLocal: false, httpAgent, httpsAgent, connectionLimiter: { maxConnectionsPerIP: 100000 } });
export const bares = [bare1, bare2, bare3, bare4, bare5];

type WispHandler = (req: IncomingMessage, socket: any, head?: Buffer) => void;
export let wispHandler: WispHandler | null = null;

try {
  const { server: wisp, logging } = await import("@mercuryworkshop/wisp-js/server");
  Object.assign(wisp.options, {
    dns_method: "resolve",
    dns_servers: ["1.1.1.3", "1.0.0.3"],
    dns_result_order: "ipv4first",
    wisp_motd: "Unstable Node",
  });
  wispHandler = wisp.routeRequest as WispHandler;
  logger.info("Wisp protocol enabled at /api/wisp/");
} catch (err) {
  logger.warn({ err }, "wisp-js not available — Wisp disabled");
}

function resolvePkgDist(pkg: string): string {
  const mainPath = require.resolve(pkg);
  const pkgRoot = path.dirname(path.dirname(mainPath));
  return path.join(pkgRoot, "dist");
}

const staticCandidates = [
  path.resolve(process.cwd(), "app/dist/public"),
  path.resolve(__dirname, "../../app/dist/public"),
  path.resolve(__dirname, "../../artifacts/app/dist/public"),
];

const staticDir = staticCandidates.find((candidate) => fs.existsSync(candidate));

if (!staticDir) {
  throw new Error(`Static frontend folder not found; tried: ${staticCandidates.join(", ")}`);
}

const app = Fastify({
  logger: false,
  serverFactory: (handler) => {
    const server = createServer();

    server.on("request", (req, res) => {
      for (const bare of bares) {
        if (bare.shouldRoute(req)) { bare.routeRequest(req, res); return; }
      }
      handler(req, res);
    });

    server.on("upgrade", (req, socket, head) => {
      if (req.url?.startsWith("/api/wisp/") && wispHandler) {
        wispHandler(req, socket, head);
        return;
      }
      for (const bare of bares) {
        if (bare.shouldRoute(req)) { bare.routeUpgrade(req, socket, head); return; }
      }
      socket.destroy();
    });

    return server;
  },
});

await app.register(fastifyCompress, {
  encodings: ["gzip", "deflate", "br"],
  threshold: 512,
});

await app.register(fastifyCors, {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowed = (process.env.CORS_ORIGINS || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    if (!origin || allowed.length === 0) return callback(null, true);
    if (allowed.some((o: string) => origin === o || origin.endsWith("." + o.replace(/^https?:\/\//, "")))) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
});

await app.register(fastifyFormbody);

// ─── Bare-as-module3 static ───────────────────────────────────────────────────
const bareModDist = resolvePkgDist("@mercuryworkshop/bare-as-module3");
await app.register(fastifyStatic, {
  root: bareModDist,
  prefix: "/api/baremod/",
  decorateReply: false,
  wildcard: false,
});

// ─── Frontend static with cache headers ───────────────────────────────────────
await app.register(fastifyStatic, {
  root: staticDir,
  prefix: "/",
  wildcard: true,
  cacheControl: false,
  setHeaders(res: ServerResponse, filePath: string) {
    if (/\.html?$/i.test(filePath)) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    } else {
      const hashed = /[.\-_][A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|jpe?g|svg|webp|gif)$/.test(filePath);
      res.setHeader(
        "Cache-Control",
        hashed ? "public, max-age=31536000, immutable" : "public, max-age=3600",
      );
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  },
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.register(router, { prefix: "/api" });

// ─── DuckDuckGo search suggestions ───────────────────────────────────────────
app.get("/return", async (req, reply) => {
  const q = (req.query as any)?.q;

  if (!q || typeof q !== "string") {
    return reply.status(401).send({ error: "query parameter?" });
  }

  try {
    const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}`);
    if (!response.ok) {
      return reply.status(response.status).send();
    }
    return reply.send(await response.json());
  } catch {
    return reply.status(500).send({ error: "request failed" });
  }
});

// ─── SPA fallback ────────────────────────────────────────────────────────────
app.setNotFoundHandler((request, reply) => {
  const url = request.url;
  if (
    !url.startsWith("/api") &&
    !url.startsWith("/service") &&
    !url.startsWith("/ham") &&
    !url.startsWith("/baremux")
  ) {
    const indexPath = path.join(staticDir, "index.html");
    return reply.type("text/html").send(fs.readFileSync(indexPath, "utf-8"));
  }
  return reply.status(404).send("Not found");
});

export default app;
