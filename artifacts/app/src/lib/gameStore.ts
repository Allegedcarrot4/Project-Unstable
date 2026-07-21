const RECENTLY_PLAYED_KEY = "unstable_games_recently_played";
const PLAY_COUNT_KEY = "unstable_games_play_count";
const MAX_RECENT = 20;

interface GameHistory {
  gameId: number;
  lastPlayed: number;
  playCount: number;
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function trackGamePlay(gameId: number) {
  const counts = safeGet<Record<number, number>>(PLAY_COUNT_KEY, {});
  counts[gameId] = (counts[gameId] || 0) + 1;
  safeSet(PLAY_COUNT_KEY, counts);

  const recent = safeGet<GameHistory[]>(RECENTLY_PLAYED_KEY, []);
  const existing = recent.findIndex((g) => g.gameId === gameId);
  if (existing !== -1) recent.splice(existing, 1);
  recent.unshift({ gameId, lastPlayed: Date.now(), playCount: counts[gameId] });
  if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
  safeSet(RECENTLY_PLAYED_KEY, recent);
}

export function getRecentlyPlayed(limit = 12): GameHistory[] {
  return safeGet<GameHistory[]>(RECENTLY_PLAYED_KEY, []).slice(0, limit);
}

export function getContinuePlaying(limit = 12): GameHistory[] {
  return safeGet<GameHistory[]>(RECENTLY_PLAYED_KEY, [])
    .filter((g) => g.playCount > 1)
    .slice(0, limit);
}

export function getPlayCounts(): Record<number, number> {
  return safeGet<Record<number, number>>(PLAY_COUNT_KEY, {});
}

export function getRecommendedIds(allIds: number[], limit = 12): number[] {
  const counts = getPlayCounts();
  const entries = Object.entries(counts)
    .map(([id, count]) => [Number(id), count] as const)
    .sort((a, b) => b[1] - a[1]);
  const played = new Set(entries.map(([id]) => id));
  const top = entries.slice(0, limit).map(([id]) => id);
  const remaining = allIds.filter((id) => !played.has(id));
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return [...top, ...remaining].slice(0, limit);
}
