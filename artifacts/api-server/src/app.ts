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

export const bare = createBareServer("/api/bare/", {
  logErrors: false,
  blockLocal: false,
});

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function resolvePkgPath(pkg: string, ...rest: string[]): string {
  const mainPath = require.resolve(pkg);
  const pkgDir = path.dirname(mainPath);
  return path.join(pkgDir, ...rest);
}

app.use(
  "/api/baremod",
  express.static(resolvePkgPath("@mercuryworkshop/bare-as-module3", "dist"), {
    index: false,
  }),
);

app.use("/api", router);

export default app;
