/**
 * AI credits.
 *
 * The app has no billing backend, so the allowance lives in localStorage per
 * account. It is deliberately strict: 10 credits per UTC day, and credits do
 * not carry over. A prompt is priced by how much you send: each block of
 * characters costs a credit, and Think mode costs twice as much.
 */

export const AI_DAILY_CREDITS = 10;

/** Characters that buy one credit. Larger prompts spend more. */
export const AI_PROMPT_CHARS_PER_CREDIT = 320;

const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "unstable_ai_credits_";

export type AiEffort = "fast" | "think";

export interface AiQuota {
  used: number;
  limit: number;
  remaining: number;
  /** Epoch ms of the next 00:00 UTC. */
  resetsAt: number;
  /** 0..1 share of the allowance still available. */
  fraction: number;
}

interface StoredQuota {
  day: number;
  used: number;
}

/** 00:00 UTC of the day containing `now`. */
export function dayStartUtc(now: number = Date.now()): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function nextDailyResetUtc(now: number = Date.now()): number {
  return dayStartUtc(now) + DAY_MS;
}

/**
 * What a prompt costs. Short prompts cost 1; every extra block of characters
 * costs another credit, and Think mode doubles the price. The cost never
 * exceeds the whole daily allowance.
 */
export function estimateCreditCost(prompt: string, effort: AiEffort = "fast"): number {
  const chars = prompt.trim().length;
  const blocks = Math.max(1, Math.ceil(chars / AI_PROMPT_CHARS_PER_CREDIT));
  const multiplier = effort === "think" ? 2 : 1;
  return Math.min(AI_DAILY_CREDITS, blocks * multiplier);
}

function readStored(userId: string): StoredQuota | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredQuota>;
    if (typeof parsed?.day !== "number" || typeof parsed?.used !== "number") return null;
    return { day: parsed.day, used: parsed.used };
  } catch {
    return null;
  }
}

function toQuota(used: number): AiQuota {
  const limit = AI_DAILY_CREDITS;
  const clamped = Math.max(0, Math.min(limit, used));
  return {
    used: clamped,
    limit,
    remaining: limit - clamped,
    resetsAt: nextDailyResetUtc(),
    fraction: (limit - clamped) / limit,
  };
}

/** Today's credits, rolling over at 00:00 UTC. */
export function readAiQuota(userId: string): AiQuota {
  if (!userId) return toQuota(0);
  const stored = readStored(userId);
  const day = dayStartUtc();
  if (!stored || stored.day !== day) return toQuota(0);
  return toQuota(stored.used);
}

/** Spends `cost` credits and returns the updated allowance. */
export function recordAiUsage(userId: string, cost: number): AiQuota {
  const current = readAiQuota(userId);
  const spend = Math.max(0, Math.ceil(cost));
  const next = toQuota(current.used + spend);
  try {
    localStorage.setItem(
      STORAGE_PREFIX + userId,
      JSON.stringify({ day: dayStartUtc(), used: next.used } satisfies StoredQuota)
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
