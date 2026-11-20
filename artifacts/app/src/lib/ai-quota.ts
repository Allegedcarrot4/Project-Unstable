/**
 * Free AI usage allowance.
 *
 * The app has no billing backend, so the allowance lives in localStorage per
 * account: a simple counter for the current UTC week. The window starts at
 * Monday 00:00 UTC and the bar in the AI sidebar shows how much is left.
 */

export const AI_WEEKLY_FREE_MESSAGES = 100;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "unstable_ai_quota_";

export interface AiQuota {
  used: number;
  limit: number;
  remaining: number;
  /** Epoch ms of the next Monday 00:00 UTC. */
  resetsAt: number;
  /** 0..1 share of the allowance still available. */
  fraction: number;
}

interface StoredQuota {
  week: number;
  used: number;
}

/** Monday 00:00 UTC of the week containing `now`. */
export function weekStartUtc(now: number = Date.now()): number {
  const date = new Date(now);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday);
}

export function nextWeeklyResetUtc(now: number = Date.now()): number {
  return weekStartUtc(now) + WEEK_MS;
}

function readStored(userId: string): StoredQuota | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredQuota>;
    if (typeof parsed?.week !== "number" || typeof parsed?.used !== "number") return null;
    return { week: parsed.week, used: parsed.used };
  } catch {
    return null;
  }
}

function toQuota(used: number): AiQuota {
  const limit = AI_WEEKLY_FREE_MESSAGES;
  const clamped = Math.max(0, Math.min(limit, used));
  return {
    used: clamped,
    limit,
    remaining: limit - clamped,
    resetsAt: nextWeeklyResetUtc(),
    fraction: (limit - clamped) / limit,
  };
}

/** Current allowance, rolling over automatically once the week changes. */
export function readAiQuota(userId: string): AiQuota {
  if (!userId) return toQuota(0);
  const stored = readStored(userId);
  const week = weekStartUtc();
  if (!stored || stored.week !== week) return toQuota(0);
  return toQuota(stored.used);
}

/** Counts one sent message and returns the updated allowance. */
export function recordAiMessage(userId: string): AiQuota {
  const current = readAiQuota(userId);
  const next = toQuota(current.used + 1);
  try {
    localStorage.setItem(
      STORAGE_PREFIX + userId,
      JSON.stringify({ week: weekStartUtc(), used: next.used } satisfies StoredQuota)
    );
  } catch {
    /* storage blocked: the bar just will not persist */
  }
  return next;
}

export function formatQuotaReset(resetsAt: number, now: number = Date.now()): string {
  const ms = Math.max(0, resetsAt - now);
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 48) return `${Math.round(hours / 24)}d`;
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(1, Math.round(ms / (60 * 1000)))}m`;
}
