import type { FastifyPluginAsync } from "fastify";

const healthRoute: FastifyPluginAsync = async (app) => {
  app.get("/healthz", async (_req, reply) => {
    return reply.send({ status: "ok" });
  });
};

export default healthRoute;
