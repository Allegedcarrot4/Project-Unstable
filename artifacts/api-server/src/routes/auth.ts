import type { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
import {
  getAuthedUser,
  getSupabaseAdmin,
  hashDeviceId,
  requireDeviceId,
} from "../lib/supabase-admin";

const expectedHash = (() => {
  const raw = process.env.PASSWORD;
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  return crypto.createHash("sha256").update(trimmed).digest("hex");
})();

const authRoute: FastifyPluginAsync = async (app) => {
  app.post("/auth/check", async (req, reply) => {
    const { password } = (req.body as any) ?? {};

    if (!expectedHash) {
      return reply.status(503).send({ dev: true });
    }

    const provided = typeof password === "string" ? password.trim() : "";
    if (!provided) {
      return reply.status(401).send({ ok: false });
    }

    const providedHash = crypto.createHash("sha256").update(provided).digest("hex");
    const valid = crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(expectedHash));
    if (!valid) {
      return reply.status(401).send({ ok: false });
    }

    return reply.send({ ok: true });
  });

  app.post("/auth/device-status", async (req, reply) => {
    try {
      const deviceId = requireDeviceId((req.body as any)?.deviceId);
      const deviceHash = hashDeviceId(deviceId);
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("device_bans")
        .select("reason, banned_until")
        .eq("device_hash", deviceHash)
        .maybeSingle() as any;

      if (error) throw error;

      const record = data as { reason?: string; banned_until?: string | null } | null;
      const activeBan = Boolean(record && (!record.banned_until || new Date(record.banned_until).getTime() > Date.now()));
      return reply.send({
        banned: activeBan,
        reason: activeBan ? record?.reason ?? null : null,
      });
    } catch (err) {
      return reply.status(503).send({ error: err instanceof Error ? err.message : "Device-ban check unavailable." });
    }
  });

  app.get("/auth/context", async (req, reply) => {
    try {
      const authed = await getAuthedUser(req.headers.authorization);
      if (!authed) {
        return reply.status(401).send({ error: "Authentication required." });
      }

      const supabase = getSupabaseAdmin();
      const { data: banRow, error: banError } = await supabase
        .from("user_bans")
        .select("reason, banned_until")
        .eq("user_id", authed.user.id)
        .maybeSingle() as any;

      if (banError) throw banError;

      const banRecord = banRow as { reason?: string; banned_until?: string | null } | null;
      const banned = Boolean(banRecord && (!banRecord.banned_until || new Date(banRecord.banned_until).getTime() > Date.now()));
      return reply.send({
        isBanned: banned,
        banReason: banned ? banRecord?.reason ?? null : null,
      });
    } catch (err) {
      return reply.status(503).send({ error: err instanceof Error ? err.message : "Auth context unavailable." });
    }
  });

  app.post("/auth/register-device", async (req, reply) => {
    try {
      const authed = await getAuthedUser(req.headers.authorization);
      if (!authed) {
        return reply.status(401).send({ error: "Authentication required." });
      }

      const deviceId = requireDeviceId((req.body as any)?.deviceId);
      const deviceHash = hashDeviceId(deviceId);
      const supabase = getSupabaseAdmin();

      const { error } = await (supabase.from("user_devices") as any).upsert({
        user_id: authed.user.id,
        device_hash: deviceHash,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_id,device_hash" });

      if (error) throw error;

      return reply.send({ ok: true });
    } catch (err) {
      return reply.status(503).send({ error: err instanceof Error ? err.message : "Device registration unavailable." });
    }
  });
};

export default authRoute;
