import type { FastifyPluginAsync } from "fastify";
import healthRouter from "./health";
import authRouter from "./auth";
import aiRouter from "./ai";
import releasesRouter from "./releases";

const router: FastifyPluginAsync = async (app) => {
  await app.register(healthRouter);
  await app.register(authRouter);
  await app.register(aiRouter);
  await app.register(releasesRouter);
};

export default router;
