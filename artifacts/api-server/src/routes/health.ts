import type { FastifyPluginAsync } from "fastify";

const healthRoute: FastifyPluginAsync = async (app) => {
  app.get("/healthz", async (_req, reply) => {
    return reply.send({ status: "ok" });
  });
  
  // MoonBeam/Wisp info endpoint
  app.get("/wisp/info", async (_req, reply) => {
    return reply.send({
      protocol: "Wisp v2.1",
      extensions: {
        motd: true,
        stream_open_confirmation: true,
        udp: true,
        password_auth: false,
        pubkey_auth: false,
      },
      motd: "Unstable Node - MoonBeam Compatible",
      server: "Unstable Node API",
      version: "1.0.0",
    });
  });
};

export default healthRoute;
