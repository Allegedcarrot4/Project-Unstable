const FAVORITES_KEY = "unstable_game_favorites";
const RATINGS_KEY = "unstable_game_ratings";
const NOTES_KEY = "unstable_game_notes";
const PLAYTIME_KEY = "unstable_game_playtime";
const COLLECTIONS_KEY = "unstable_game_collections";
const ACHIEVEMENTS_KEY = "unstable_game_achievements";
const RECOMMENDATIONS_KEY = "unstable_game_recommendations";

interface GameFavorite {
  gameId: string;
  addedAt: number;
}

interface GameRating {
  gameId: string;
  rating: number;
  ratedAt: number;
}

interface GameNote {
  gameId: string;
  note: string;
  updatedAt: number;
}

interface GamePlaytime {
  gameId: string;
  totalMs: number;
  lastPlayedAt: number;
  sessionCount: number;
}

interface GameCollection {
  id: string;
  name: string;
  description: string;
  gameIds: string[];
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
  color: string;
  icon: string;
}

interface GameAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "playtime" | "favorites" | "ratings" | "collections" | "exploration" | "social";
  requirement: {
    type: "count" | "time" | "streak" | "variety";
    target: number;
    gameId?: string;
    platform?: string;
  };
  reward: {
    xp: number;
    badge?: string;
  };
  unlockedAt?: number;
  progress: number;
}

interface UserGameProfile {
  totalPlaytimeMs: number;
  totalGamesPlayed: number;
  totalFavorites: number;
  totalRatings: number;
  totalCollections: number;
  favoriteGenres: string[];
  favoritePlatforms: string[];
  level: number;
  xp: number;
  streakDays: number;
  lastActiveDate: string;
}

const DEFAULT_COLLECTIONS: GameCollection[] = [
  {
    id: "favorites",
    name: "Favorites",
    description: "Your most loved games",
    gameIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPublic: false,
    color: "#ff6b6b",
    icon: "Heart"
  },
  {
    id: "want-to-play",
    name: "Want to Play",
    description: "Games you're excited to try",
    gameIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPublic: false,
    color: "#4ecdc4",
    icon: "Bookmark"
  },
  {
    id: "completed",
    name: "Completed",
    description: "Games you've finished",
    gameIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPublic: false,
    color: "#45b7d1",
    icon: "CheckCircle2"
  },
  {
    id: "playing-now",
    name: "Currently Playing",
    description: "Games you're actively playing",
    gameIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPublic: false,
    color: "#f9ca24",
    icon: "Play"
  }
];

const ACHIEVEMENT_DEFINITIONS: Omit<GameAchievement, "unlockedAt" | "progress">[] = [
  {
    id: "first-game",
    name: "First Steps",
    description: "Play your first cloud game",
    icon: "Gamepad",
    category: "exploration",
    requirement: { type: "count", target: 1 },
    reward: { xp: 50, badge: "🎮" }
  },
  {
    id: "five-games",
    name: "Explorer",
    description: "Play 5 different games",
    icon: "Compass",
    category: "exploration",
    requirement: { type: "variety", target: 5 },
    reward: { xp: 100, badge: "🗺️" }
  },
  {
    id: "ten-games",
    name: "Gamer",
    description: "Play 10 different games",
    icon: "Trophy",
    category: "exploration",
    requirement: { type: "variety", target: 10 },
    reward: { xp: 200, badge: "🏆" }
  },
  {
    id: "twenty-games",
    name: "Collector",
    description: "Play 20 different games",
    icon: "Crown",
    category: "exploration",
    requirement: { type: "variety", target: 20 },
    reward: { xp: 500, badge: "👑" }
  },
  {
    id: "first-favorite",
    name: "Heart of Gold",
    description: "Add your first game to favorites",
    icon: "Heart",
    category: "favorites",
    requirement: { type: "count", target: 1 },
    reward: { xp: 50, badge: "❤️" }
  },
  {
    id: "five-favorites",
    name: "Curator",
    description: "Add 5 games to favorites",
    icon: "Star",
    category: "favorites",
    requirement: { type: "count", target: 5 },
    reward: { xp: 100, badge: "⭐" }
  },
  {
    id: "first-rating",
    name: "Critic",
    description: "Rate your first game",
    icon: "MessageSquare",
    category: "ratings",
    requirement: { type: "count", target: 1 },
    reward: { xp: 50, badge: "📝" }
  },
  {
    id: "ten-ratings",
    name: "Reviewer",
    description: "Rate 10 games",
    icon: "PenTool",
    category: "ratings",
    requirement: { type: "count", target: 10 },
    reward: { xp: 150, badge: "✍️" }
  },
  {
    id: "one-hour",
    name: "Dedicated",
    description: "Play for 1 hour total",
    icon: "Clock",
    category: "playtime",
    requirement: { type: "time", target: 60 * 60 * 1000 },
    reward: { xp: 100, badge: "⏱️" }
  },
  {
    id: "ten-hours",
    name: "Marathon Runner",
    description: "Play for 10 hours total",
    icon: "Zap",
    category: "playtime",
    requirement: { type: "time", target: 10 * 60 * 60 * 1000 },
    reward: { xp: 300, badge: "⚡" }
  },
  {
    id: "fifty-hours",
    name: "Legend",
    description: "Play for 50 hours total",
    icon: "Medal",
    category: "playtime",
    requirement: { type: "time", target: 50 * 60 * 60 * 1000 },
    reward: { xp: 1000, badge: "🏅" }
  },
  {
    id: "first-collection",
    name: "Organizer",
    description: "Create your first custom collection",
    icon: "FolderPlus",
    category: "collections",
    requirement: { type: "count", target: 1 },
    reward: { xp: 100, badge: "📁" }
  },
  {
    id: "three-platforms",
    name: "Platform Agnostic",
    description: "Play games on 3 different cloud platforms",
    icon: "Globe",
    category: "exploration",
    requirement: { type: "variety", target: 3 },
    reward: { xp: 150, badge: "🌐" }
  },
  {
    id: "week-streak",
    name: "Daily Driver",
    description: "Play games for 7 days in a row",
    icon: "Flame",
    category: "playtime",
    requirement: { type: "streak", target: 7 },
    reward: { xp: 200, badge: "🔥" }
  },
  {
    id: "month-streak",
    name: "Unstoppable",
    description: "Play games for 30 days in a row",
    icon: "Infinity",
    category: "playtime",
    requirement: { type: "streak", target: 30 },
    reward: { xp: 1000, badge: "♾️" }
  }
];

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

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

function xpForLevel(level: number): number {
  return 50 * (level - 1) ** 2;
}

function xpToNextLevel(level: number): number {
  return xpForLevel(level + 1) - xpForLevel(level);
}

export function getFavorites(): GameFavorite[] {
  return safeGet<GameFavorite[]>(FAVORITES_KEY, []);
}

export function isFavorite(gameId: string): boolean {
  return getFavorites().some((f) => f.gameId === gameId);
}

export function addFavorite(gameId: string) {
  const favorites = getFavorites();
  if (!favorites.some((f) => f.gameId === gameId)) {
    favorites.push({ gameId, addedAt: Date.now() });
    safeSet(FAVORITES_KEY, favorites);
    checkAchievements();
  }
}

export function removeFavorite(gameId: string) {
  const favorites = getFavorites().filter((f) => f.gameId !== gameId);
  safeSet(FAVORITES_KEY, favorites);
}

export function toggleFavorite(gameId: string) {
  if (isFavorite(gameId)) {
    removeFavorite(gameId);
  } else {
    addFavorite(gameId);
  }
}

export function getRatings(): GameRating[] {
  return safeGet<GameRating[]>(RATINGS_KEY, []);
}

export function getRating(gameId: string): number | null {
  const rating = getRatings().find((r) => r.gameId === gameId);
  return rating ? rating.rating : null;
}

export function setRating(gameId: string, rating: number) {
  const ratings = getRatings();
  const existing = ratings.findIndex((r) => r.gameId === gameId);
  const newRating = { gameId, rating: Math.max(1, Math.min(5, rating)), ratedAt: Date.now() };
  if (existing >= 0) {
    ratings[existing] = newRating;
  } else {
    ratings.push(newRating);
  }
  safeSet(RATINGS_KEY, ratings);
  checkAchievements();
}

export function removeRating(gameId: string) {
  const ratings = getRatings().filter((r) => r.gameId !== gameId);
  safeSet(RATINGS_KEY, ratings);
}

export function getNotes(): GameNote[] {
  return safeGet<GameNote[]>(NOTES_KEY, []);
}

export function getNote(gameId: string): string | null {
  const note = getNotes().find((n) => n.gameId === gameId);
  return note ? note.note : null;
}

export function setNote(gameId: string, note: string) {
  const notes = getNotes();
  const existing = notes.findIndex((n) => n.gameId === gameId);
  const newNote = { gameId, note, updatedAt: Date.now() };
  if (existing >= 0) {
    notes[existing] = newNote;
  } else if (note.trim()) {
    notes.push(newNote);
  }
  safeSet(NOTES_KEY, notes);
}

export function removeNote(gameId: string) {
  const notes = getNotes().filter((n) => n.gameId !== gameId);
  safeSet(NOTES_KEY, notes);
}

export function getPlaytime(): GamePlaytime[] {
  return safeGet<GamePlaytime[]>(PLAYTIME_KEY, []);
}

export function getGamePlaytime(gameId: string): GamePlaytime | null {
  const playtime = getPlaytime().find((p) => p.gameId === gameId);
  return playtime || null;
}

export function addPlaytime(gameId: string, ms: number) {
  const playtime = getPlaytime();
  const existing = playtime.findIndex((p) => p.gameId === gameId);
  const now = Date.now();
  if (existing >= 0) {
    playtime[existing] = {
      ...playtime[existing],
      totalMs: playtime[existing].totalMs + ms,
      lastPlayedAt: now,
      sessionCount: playtime[existing].sessionCount + 1
    };
  } else {
    playtime.push({ gameId, totalMs: ms, lastPlayedAt: now, sessionCount: 1 });
  }
  safeSet(PLAYTIME_KEY, playtime);
  updateStreak();
  checkAchievements();
}

export function formatPlaytime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function getCollections(): GameCollection[] {
  const collections = safeGet<GameCollection[]>(COLLECTIONS_KEY, []);
  if (collections.length === 0) {
    safeSet(COLLECTIONS_KEY, DEFAULT_COLLECTIONS);
    return DEFAULT_COLLECTIONS;
  }
  return [...DEFAULT_COLLECTIONS, ...collections.filter((c) => !DEFAULT_COLLECTIONS.some((d) => d.id === c.id))];
}

export function getCollection(id: string): GameCollection | null {
  return getCollections().find((c) => c.id === id) || null;
}

export function createCollection(collection: Omit<GameCollection, "id" | "createdAt" | "updatedAt">): GameCollection {
  const collections = getCollections().filter((c) => !DEFAULT_COLLECTIONS.some((d) => d.id === c.id));
  const newCollection: GameCollection = {
    ...collection,
    id: `collection_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  collections.push(newCollection);
  safeSet(COLLECTIONS_KEY, collections);
  checkAchievements();
  return newCollection;
}

export function updateCollection(id: string, updates: Partial<GameCollection>) {
  const collections = getCollections().filter((c) => !DEFAULT_COLLECTIONS.some((d) => d.id === c.id));
  const index = collections.findIndex((c) => c.id === id);
  if (index >= 0) {
    collections[index] = { ...collections[index], ...updates, updatedAt: Date.now() };
    safeSet(COLLECTIONS_KEY, collections);
  }
}

export function deleteCollection(id: string) {
  if (DEFAULT_COLLECTIONS.some((d) => d.id === id)) return;
  const collections = getCollections().filter((c) => c.id !== id);
  safeSet(COLLECTIONS_KEY, collections);
}

export function addGameToCollection(collectionId: string, gameId: string) {
  const collections = getCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (collection && !collection.gameIds.includes(gameId)) {
    collection.gameIds.push(gameId);
    collection.updatedAt = Date.now();
    safeSet(COLLECTIONS_KEY, collections);
  }
}

export function removeGameFromCollection(collectionId: string, gameId: string) {
  const collections = getCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (collection) {
    collection.gameIds = collection.gameIds.filter((id) => id !== gameId);
    collection.updatedAt = Date.now();
    safeSet(COLLECTIONS_KEY, collections);
  }
}

export function getAchievements(): GameAchievement[] {
  const saved = safeGet<GameAchievement[]>(ACHIEVEMENTS_KEY, []);
  const merged = ACHIEVEMENT_DEFINITIONS.map((def) => {
    const existing = saved.find((a) => a.id === def.id);
    return {
      ...def,
      unlockedAt: existing?.unlockedAt,
      progress: existing?.progress || 0
    };
  });
  return merged;
}

export function getUnlockedAchievements(): GameAchievement[] {
  return getAchievements().filter((a) => a.unlockedAt);
}

export function getLockedAchievements(): GameAchievement[] {
  return getAchievements().filter((a) => !a.unlockedAt);
}

function checkAchievements() {
  const achievements = getAchievements();
  const favorites = getFavorites();
  const ratings = getRatings();
  const playtime = getPlaytime();
  const collections = getCollections();
  const profile = getUserProfile();

  let hasChanges = false;

  for (const achievement of achievements) {
    if (achievement.unlockedAt) continue;

    let progress = 0;
    let unlocked = false;

    switch (achievement.requirement.type) {
      case "count": {
        let count = 0;
        if (achievement.category === "favorites") count = favorites.length;
        else if (achievement.category === "ratings") count = ratings.length;
        else if (achievement.category === "collections") count = collections.filter((c) => !DEFAULT_COLLECTIONS.some((d) => d.id === c.id)).length;
        progress = Math.min(100, (count / achievement.requirement.target) * 100);
        unlocked = count >= achievement.requirement.target;
        break;
      }
      case "time": {
        const totalTime = playtime.reduce((sum, p) => sum + p.totalMs, 0);
        progress = Math.min(100, (totalTime / achievement.requirement.target) * 100);
        unlocked = totalTime >= achievement.requirement.target;
        break;
      }
      case "variety": {
        const uniqueGames = new Set(playtime.map((p) => p.gameId)).size;
        progress = Math.min(100, (uniqueGames / achievement.requirement.target) * 100);
        unlocked = uniqueGames >= achievement.requirement.target;
        break;
      }
      case "streak": {
        progress = Math.min(100, (profile.streakDays / achievement.requirement.target) * 100);
        unlocked = profile.streakDays >= achievement.requirement.target;
        break;
      }
    }

    if (progress !== achievement.progress || unlocked !== !!achievement.unlockedAt) {
      achievement.progress = progress;
      if (unlocked) {
        achievement.unlockedAt = Date.now();
        addXp(achievement.reward.xp);
      }
      hasChanges = true;
    }
  }

  if (hasChanges) {
    safeSet(ACHIEVEMENTS_KEY, achievements);
  }
}

export function getUserProfile(): UserGameProfile {
  return safeGet<UserGameProfile>(RECOMMENDATIONS_KEY, {
    totalPlaytimeMs: 0,
    totalGamesPlayed: 0,
    totalFavorites: 0,
    totalRatings: 0,
    totalCollections: 0,
    favoriteGenres: [],
    favoritePlatforms: [],
    level: 1,
    xp: 0,
    streakDays: 0,
    lastActiveDate: ""
  });
}

function updateUserProfile(updates: Partial<UserGameProfile>) {
  const profile = getUserProfile();
  const updated = { ...profile, ...updates };
  safeSet(RECOMMENDATIONS_KEY, updated);
}

function updateStreak() {
  const profile = getUserProfile();
  const today = getTodayString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  if (profile.lastActiveDate === today) return;

  if (profile.lastActiveDate === yesterday) {
    updateUserProfile({ streakDays: profile.streakDays + 1, lastActiveDate: today });
  } else if (profile.lastActiveDate !== today) {
    updateUserProfile({ streakDays: 1, lastActiveDate: today });
  }
  checkAchievements();
}

function addXp(amount: number) {
  const profile = getUserProfile();
  const newXp = profile.xp + amount;
  const newLevel = calculateLevel(newXp);
  const leveledUp = newLevel > profile.level;
  updateUserProfile({ xp: newXp, level: newLevel });
  return leveledUp;
}

export function getUserLevel(): { level: number; xp: number; xpToNext: number; progress: number } {
  const profile = getUserProfile();
  const xpToNext = xpToNextLevel(profile.level);
  const currentLevelXp = xpForLevel(profile.level);
  const progress = ((profile.xp - currentLevelXp) / xpToNext) * 100;
  return {
    level: profile.level,
    xp: profile.xp,
    xpToNext,
    progress: Math.min(100, Math.max(0, progress))
  };
}

export function getRecommendedGames(allGames: { id: string; category: string; platforms: { platform: string }[] }[], limit = 10): string[] {
  const playtime = getPlaytime();
  const favorites = getFavorites();
  const ratings = getRatings();

  const genreScores: Record<string, number> = {};
  const platformScores: Record<string, number> = {};

  for (const p of playtime) {
    const game = allGames.find((g) => g.id === p.gameId);
    if (game) {
      for (const cat of game.category.split("/")) {
        const genre = cat.trim();
        genreScores[genre] = (genreScores[genre] || 0) + p.totalMs;
      }
      for (const platform of game.platforms) {
        platformScores[platform.platform] = (platformScores[platform.platform] || 0) + p.totalMs;
      }
    }
  }

  for (const f of favorites) {
    const game = allGames.find((g) => g.id === f.gameId);
    if (game) {
      for (const cat of game.category.split("/")) {
        const genre = cat.trim();
        genreScores[genre] = (genreScores[genre] || 0) + 100000;
      }
    }
  }

  for (const r of ratings) {
    if (r.rating >= 4) {
      const game = allGames.find((g) => g.id === r.gameId);
      if (game) {
        for (const cat of game.category.split("/")) {
          const genre = cat.trim();
          genreScores[genre] = (genreScores[genre] || 0) + r.rating * 50000;
        }
      }
    }
  }

  const playedIds = new Set(playtime.map((p) => p.gameId));
  const favoriteIds = new Set(favorites.map((f) => f.gameId));

  const candidates = allGames
    .filter((g) => !playedIds.has(g.id))
    .map((game) => {
      let score = 0;
      for (const cat of game.category.split("/")) {
        score += genreScores[cat.trim()] || 0;
      }
      for (const platform of game.platforms) {
        score += platformScores[platform.platform] || 0;
      }
      return { id: game.id, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => c.id);

  return candidates;
}

export function getRecentGames(limit = 5): GamePlaytime[] {
  return getPlaytime()
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
    .slice(0, limit);
}

export function getTopRatedGames(limit = 5): (GameRating & { gameId: string })[] {
  return getRatings()
    .filter((r) => r.rating >= 4)
    .sort((a, b) => b.rating - a.rating || b.ratedAt - a.ratedAt)
    .slice(0, limit);
}

export function getMostPlayedGames(limit = 5): GamePlaytime[] {
  return getPlaytime()
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, limit);
}

export function getStats() {
  const playtime = getPlaytime();
  const favorites = getFavorites();
  const ratings = getRatings();
  const collections = getCollections().filter((c) => !DEFAULT_COLLECTIONS.some((d) => d.id === c.id));
  const achievements = getAchievements();
  const profile = getUserProfile();

  const totalPlaytimeMs = playtime.reduce((sum, p) => sum + p.totalMs, 0);
  const totalGamesPlayed = new Set(playtime.map((p) => p.gameId)).size;
  const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

  return {
    totalPlaytimeMs,
    totalPlaytimeFormatted: formatPlaytime(totalPlaytimeMs),
    totalGamesPlayed,
    totalFavorites: favorites.length,
    totalRatings: ratings.length,
    avgRating: Math.round(avgRating * 10) / 10,
    totalCollections: collections.length,
    totalAchievements: achievements.length,
    unlockedAchievements: achievements.filter((a) => a.unlockedAt).length,
    level: profile.level,
    xp: profile.xp,
    streakDays: profile.streakDays
  };
}

export function trackGameLaunch(gameId: string) {
  addPlaytime(gameId, 0);
}

export function trackGameClose(gameId: string, sessionStartMs: number) {
  const duration = Date.now() - sessionStartMs;
  if (duration > 1000) {
    addPlaytime(gameId, duration);
  }
}

export function resetAllData() {
  localStorage.removeItem(FAVORITES_KEY);
  localStorage.removeItem(RATINGS_KEY);
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(PLAYTIME_KEY);
  localStorage.removeItem(COLLECTIONS_KEY);
  localStorage.removeItem(ACHIEVEMENTS_KEY);
  localStorage.removeItem(RECOMMENDATIONS_KEY);
}

export type {
  GameFavorite,
  GameRating,
  GameNote,
  GamePlaytime,
  GameCollection,
  GameAchievement,
  UserGameProfile
};