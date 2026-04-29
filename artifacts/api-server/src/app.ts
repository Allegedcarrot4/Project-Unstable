import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { createBareServer } from "@nebula-services/bare-server-node";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export const bare1 = createBareServer("/api/bare/",  { logErrors: false, blockLocal: false });
export const bare2 = createBareServer("/api/bare2/", { logErrors: false, blockLocal: false });
export const bare3 = createBareServer("/api/bare3/", { logErrors: false, blockLocal: false });
export const bare4 = createBareServer("/api/bare4/", { logErrors: false, blockLocal: false });

export const bares = [bare1, bare2, bare3, bare4];

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
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
  express.static(resolvePkgDist("@mercuryworkshop/bare-as-module3"), {
    index: false,
  }),
);

app.use("/api", router);

export default app;
