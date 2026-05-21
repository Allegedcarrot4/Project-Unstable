import { Router } from "express";
import {
  getAuthedUser,
  getSupabaseAdmin,
} from "../lib/supabase-admin";

const router = Router();

type MaybePostgrestError = {
  code?: string;
  message?: string;
};

function isMissingRelationError(error: MaybePostgrestError | null | undefined) {
  return error?.code === "42P01";
}

function missingTableMessage(tableName: string) {
  return `Supabase table "${tableName}" is missing. Run the admin setup SQL for this project.`;
}

async function requireAdmin(authorizationHeader: string | undefined) {
  const authed = await getAuthedUser(authorizationHeader);
  if (!authed) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authed.user.id)
    .maybeSingle();

  if (error || data?.role !== "admin") return null;
  return { supabase, user: authed.user };
}

router.get("/admin/check", async (req, res) => {
  try {
    const admin = await requireAdmin(req.headers.authorization);
    res.json({ isAdmin: Boolean(admin) });
  } catch (err) {
    res.status(503).json({ error: err instanceof Error ? err.message : "Admin check unavailable." });
  }
});

router.get("/admin/overview", async (req, res) => {
  try {
    const admin = await requireAdmin(req.headers.authorization);
    if (!admin) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    const [
      { data: profiles, error: profilesError },
      { data: roles, error: rolesError },
      { data: bans, error: bansError },
      { data: devices, error: devicesError },
      { data: messages, error: messagesError },
    ] = await Promise.all([
      admin.supabase.from("profiles").select("id, username").order("username", { ascending: true }),
      admin.supabase.from("user_roles").select("user_id, role"),
      admin.supabase.from("user_bans").select("user_id, reason, banned_until, created_at"),
      admin.supabase.from("user_devices").select("user_id, device_hash"),
      admin.supabase.from("chat_messages").select("id, user_id, username, content, created_at").order("created_at", { ascending: false }).limit(150),
    ]);

    if (profilesError) {
      throw new Error(
        isMissingRelationError(profilesError)
          ? missingTableMessage("profiles")
          : profilesError.message || "Unable to read profiles.",
      );
    }

    if (rolesError) {
      throw new Error(
        isMissingRelationError(rolesError)
          ? missingTableMessage("user_roles")
          : rolesError.message || "Unable to read admin roles.",
      );
    }

    if (messagesError) {
      throw new Error(
        isMissingRelationError(messagesError)
          ? missingTableMessage("chat_messages")
          : messagesError.message || "Unable to read chat messages.",
      );
    }

    const roleMap = new Map((roles ?? []).map((row) => [row.user_id, row.role]));
    const safeBans = isMissingRelationError(bansError) ? [] : (bans ?? []);
    const safeDevices = isMissingRelationError(devicesError) ? [] : (devices ?? []);

    if (bansError && !isMissingRelationError(bansError)) {
      throw new Error(bansError.message || "Unable to read banned users.");
    }

    if (devicesError && !isMissingRelationError(devicesError)) {
      throw new Error(devicesError.message || "Unable to read registered devices.");
    }

    const warnings: string[] = [];
    if (isMissingRelationError(bansError)) {
      warnings.push(missingTableMessage("user_bans"));
    }
    if (isMissingRelationError(devicesError)) {
      warnings.push(missingTableMessage("user_devices"));
    }

    const banMap = new Map(safeBans.map((row) => [row.user_id, row]));
    const deviceCountMap = new Map<string, number>();
    for (const row of safeDevices) {
      deviceCountMap.set(row.user_id, (deviceCountMap.get(row.user_id) ?? 0) + 1);
    }

    res.json({
      warnings,
      users: (profiles ?? []).map((profile) => ({
        id: profile.id,
        username: profile.username,
        isAdmin: roleMap.get(profile.id) === "admin",
        isBanned: banMap.has(profile.id),
        banReason: banMap.get(profile.id)?.reason ?? null,
        bannedUntil: banMap.get(profile.id)?.banned_until ?? null,
        deviceCount: deviceCountMap.get(profile.id) ?? 0,
      })),
      messages: messages ?? [],
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to load admin overview." });
  }
});

router.delete("/admin/messages/:messageId", async (req, res) => {
  try {
    const admin = await requireAdmin(req.headers.authorization);
    if (!admin) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    const messageId = req.params.messageId?.trim();
    if (!messageId) {
      res.status(400).json({ error: "A message id is required." });
      return;
    }

    const { error } = await admin.supabase.from("chat_messages").delete().eq("id", messageId);
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to delete message." });
  }
});

router.post("/admin/users/:userId/ban", async (req, res) => {
  try {
    const admin = await requireAdmin(req.headers.authorization);
    if (!admin) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    const userId = req.params.userId?.trim();
    if (!userId) {
      res.status(400).json({ error: "A user id is required." });
      return;
    }

    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";

    const { error: banError } = await admin.supabase.from("user_bans").upsert({
      user_id: userId,
      reason: reason || null,
      banned_until: null,
      banned_by: admin.user.id,
    }, { onConflict: "user_id" });
    if (banError) throw banError;

    const { data: userDevices, error: devicesError } = await admin.supabase
      .from("user_devices")
      .select("device_hash")
      .eq("user_id", userId);
    if (devicesError) throw devicesError;

    if (userDevices && userDevices.length > 0) {
      const { error: deviceBanError } = await admin.supabase.from("device_bans").upsert(
        userDevices.map((device) => ({
          device_hash: device.device_hash,
          reason: reason || null,
          banned_until: null,
          banned_by: admin.user.id,
        })),
        { onConflict: "device_hash" },
      );
      if (deviceBanError) throw deviceBanError;
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to ban user." });
  }
});

router.post("/admin/users/:userId/unban", async (req, res) => {
  try {
    const admin = await requireAdmin(req.headers.authorization);
    if (!admin) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    const userId = req.params.userId?.trim();
    if (!userId) {
      res.status(400).json({ error: "A user id is required." });
      return;
    }

    const { data: userDevices, error: devicesError } = await admin.supabase
      .from("user_devices")
      .select("device_hash")
      .eq("user_id", userId);
    if (devicesError) throw devicesError;

    const { error: unbanError } = await admin.supabase.from("user_bans").delete().eq("user_id", userId);
    if (unbanError) throw unbanError;

    if (userDevices && userDevices.length > 0) {
      const hashes = userDevices.map((device) => device.device_hash);
      const { error: deviceUnbanError } = await admin.supabase.from("device_bans").delete().in("device_hash", hashes);
      if (deviceUnbanError) throw deviceUnbanError;
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to unban user." });
  }
});

router.delete("/admin/users/:userId", async (req, res) => {
  try {
    const admin = await requireAdmin(req.headers.authorization);
    if (!admin) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    const userId = req.params.userId?.trim();
    if (!userId) {
      res.status(400).json({ error: "A user id is required." });
      return;
    }

    await admin.supabase.from("chat_messages").delete().eq("user_id", userId);
    await admin.supabase.from("ai_conversations").delete().eq("user_id", userId);
    await admin.supabase.from("user_bans").delete().eq("user_id", userId);
    await admin.supabase.from("user_roles").delete().eq("user_id", userId);
    await admin.supabase.from("user_devices").delete().eq("user_id", userId);
    await admin.supabase.from("profiles").delete().eq("id", userId);

    const { error } = await admin.supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to delete user." });
  }
});

export default router;
