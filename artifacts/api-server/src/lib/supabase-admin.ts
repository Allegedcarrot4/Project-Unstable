import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

let adminClient: ReturnType<typeof createClient> | null = null;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) {
    throw new Error("Missing required environment variable: SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });

  return adminClient;
}

export function hashDeviceId(deviceId: string): string {
  const secret = process.env.DEVICE_ID_HMAC_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing required environment variable: DEVICE_ID_HMAC_SECRET");
  }

  return crypto.createHmac("sha256", secret).update(deviceId).digest("hex");
}

export function parseBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function getAuthedUser(authorizationHeader: string | undefined) {
  const token = parseBearerToken(authorizationHeader);
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return { token, user: data.user };
}

export function requireDeviceId(raw: unknown): string {
  const deviceId = typeof raw === "string" ? raw.trim() : "";
  if (!deviceId || deviceId.length < 16 || deviceId.length > 200) {
    throw new Error("A valid device id is required.");
  }
  return deviceId;
}
