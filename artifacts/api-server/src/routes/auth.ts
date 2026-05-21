import { Router } from "express";
import {
  getAuthedUser,
  getSupabaseAdmin,
  hashDeviceId,
  requireDeviceId,
} from "../lib/supabase-admin";

const router = Router();

router.post("/auth/check", (req, res) => {
  const { password } = req.body ?? {};
  const expectedRaw = process.env.PASSWORD;

  if (!expectedRaw) {
    // PASSWORD not configured — tell the client to handle auth locally (dev mode)
    res.status(503).json({ dev: true });
    return;
  }

  const expected = expectedRaw.trim().replace(/^['"]|['"]$/g, "");
  const provided = typeof password === "string" ? password.trim() : "";

  if (!provided || provided !== expected) {
    res.status(401).json({ ok: false });
    return;
  }

  res.json({ ok: true });
});

router.post("/auth/device-status", async (req, res) => {
  try {
    const deviceId = requireDeviceId(req.body?.deviceId);
    const deviceHash = hashDeviceId(deviceId);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("device_bans")
      .select("reason, banned_until")
      .eq("device_hash", deviceHash)
      .maybeSingle();

    if (error) throw error;

    const activeBan = Boolean(data && (!data.banned_until || new Date(data.banned_until).getTime() > Date.now()));
    res.json({
      banned: activeBan,
      reason: activeBan ? data?.reason ?? null : null,
    });
  } catch (err) {
    res.status(503).json({ error: err instanceof Error ? err.message : "Device-ban check unavailable." });
  }
});

router.get("/auth/context", async (req, res) => {
  try {
    const authed = await getAuthedUser(req.headers.authorization);
    if (!authed) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const supabase = getSupabaseAdmin();
    const [{ data: roleRow, error: roleError }, { data: banRow, error: banError }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", authed.user.id).maybeSingle(),
      supabase.from("user_bans").select("reason, banned_until").eq("user_id", authed.user.id).maybeSingle(),
    ]);

    if (roleError || banError) throw roleError || banError;

    const banned = Boolean(banRow && (!banRow.banned_until || new Date(banRow.banned_until).getTime() > Date.now()));
    res.json({
      isAdmin: roleRow?.role === "admin",
      isBanned: banned,
      banReason: banned ? banRow?.reason ?? null : null,
    });
  } catch (err) {
    res.status(503).json({ error: err instanceof Error ? err.message : "Auth context unavailable." });
  }
});

router.post("/auth/register-device", async (req, res) => {
  try {
    const authed = await getAuthedUser(req.headers.authorization);
    if (!authed) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const deviceId = requireDeviceId(req.body?.deviceId);
    const deviceHash = hashDeviceId(deviceId);
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("user_devices").upsert({
      user_id: authed.user.id,
      device_hash: deviceHash,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id,device_hash" });

    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ error: err instanceof Error ? err.message : "Device registration unavailable." });
  }
});

export default router;
