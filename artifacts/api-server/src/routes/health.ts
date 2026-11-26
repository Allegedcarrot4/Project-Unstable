import type { FastifyPluginAsync } from "fastify";

const healthRoute: FastifyPluginAsync = async (app) => {
  const health = async (_req: unknown, reply: { send: (payload: unknown) => unknown }) => {
    return reply.send({ status: "ok" });
  };

  app.get("/healthz", health);
  // Older proxy assets still check this endpoint; keep it as a compatibility
  // alias so a stale service worker cannot mark the backend offline.
  app.get("/health", health);
  
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
