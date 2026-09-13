import type { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
import {
  getAuthedUser,
  getSupabaseAdmin,
  hasDeviceHashSecret,
  hasSupabaseAdminConfig,
  hashDeviceId,
  requireDeviceId,
} from "../lib/supabase-admin";
import { logger } from "../lib/logger";

const SALT = process.env.AUTH_SALT || (() => {
  const fallback = crypto.randomBytes(16).toString("hex");
  logger.warn({ salt: "random (not persisted)" }, "AUTH_SALT not set; using ephemeral salt — multi-instance auth will break");
  return fallback;
})();
const expectedHash = (() => {
  const raw = process.env.PASSWORD;
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return null;
  return crypto.pbkdf2Sync(trimmed, SALT, 100000, 64, "sha512").toString("hex");
})();

// ─── Auth rate limiter ────────────────────────────────────────────────────────
const AUTH_RATE_WINDOW_MS = 60_000;
const AUTH_RATE_MAX = 5;
const authRateMap = new Map<string, { count: number; resetAt: number }>();

function checkAuthRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = authRateMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    authRateMap.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
    return { allowed: true, remaining: AUTH_RATE_MAX - 1, resetIn: AUTH_RATE_WINDOW_MS };
  }
  if (entry.count >= AUTH_RATE_MAX) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  entry.count++;
  return { allowed: true, remaining: AUTH_RATE_MAX - entry.count, resetIn: entry.resetAt - now };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authRateMap) {
    if (now >= entry.resetAt) authRateMap.delete(ip);
  }
}, AUTH_RATE_WINDOW_MS * 2);

const authRoute: FastifyPluginAsync = async (app) => {
  app.get("/auth/password-status", async (_req, reply) => {
    reply.header("Cache-Control", "no-store, no-cache, must-revalidate");
    reply.header("Pragma", "no-cache");
    return reply.send({ required: Boolean(expectedHash) });
  });

  app.post("/auth/check", async (req, reply) => {
    const { password } = (req.body as any) ?? {};
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";

    if (!expectedHash) {
      return reply.send({ ok: true, required: false });
    }

    const rateLimit = checkAuthRateLimit(clientIp);
    if (!rateLimit.allowed) {
      reply.header("Retry-After", Math.ceil(rateLimit.resetIn / 1000));
      return reply.status(429).send({ ok: false, error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` });
    }

    const provided = typeof password === "string" ? password.trim() : "";
    if (!provided) {
      return reply.status(401).send({ ok: false });
    }

    const providedHash = crypto.pbkdf2Sync(provided, SALT, 100000, 64, "sha512").toString("hex");
    const valid = crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(expectedHash));
    if (!valid) {
      return reply.status(401).send({ ok: false });
    }

    return reply.send({ ok: true });
  });

  app.post("/auth/device-status", async (req, reply) => {
    try {
      if (!hasSupabaseAdminConfig() || !hasDeviceHashSecret()) {
        return reply.send({ banned: false, reason: null, skipped: true });
      }

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
      logger.warn({ err }, "Device-ban check unavailable");
      return reply.status(503).send({ banned: true, reason: "Ban check unavailable. Please try again.", skipped: false });
    }
  });

  app.get("/auth/context", async (req, reply) => {
    try {
      if (!hasSupabaseAdminConfig()) {
        return reply.send({ isBanned: false, banReason: null, skipped: true });
      }

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
      logger.warn({ err }, "Auth context unavailable");
      return reply.status(503).send({ isBanned: true, banReason: "Account check unavailable. Please try again.", skipped: false });
    }
  });

  app.post("/auth/register-device", async (req, reply) => {
    try {
      if (!hasSupabaseAdminConfig() || !hasDeviceHashSecret()) {
        return reply.send({ ok: true, skipped: true });
      }

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
      logger.warn({ err }, "Device registration unavailable; continuing without device registry");
      return reply.send({ ok: true, skipped: true });
    }
  });
};

export default authRoute;
