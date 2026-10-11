import { useState, useEffect, useCallback } from "react";
import {
  getFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  getRating,
  setRating,
  removeRating,
  getNote,
  setNote,
  removeNote,
  getGamePlaytime,
  getPlaytime,
  formatPlaytime,
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  addGameToCollection,
  removeGameFromCollection,
  getAchievements,
  getUnlockedAchievements,
  getLockedAchievements,
  getUserProfile,
  getUserLevel,
  getRecommendedGames,
  getRecentGames,
  getTopRatedGames,
  getMostPlayedGames,
  getStats,
  trackGameLaunch,
  trackGameClose,
  type GameFavorite,
  type GameRating,
  type GameNote,
  type GamePlaytime,
  type GameCollection,
  type GameAchievement,
  type UserGameProfile
} from "../lib/gamePersonalization";

export function useGameFavorites() {
  const [favorites, setFavorites] = useState<GameFavorite[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
    const handleStorage = () => setFavorites(getFavorites());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const add = useCallback((gameId: string) => {
    addFavorite(gameId);
    setFavorites(getFavorites());
  }, []);

  const remove = useCallback((gameId: string) => {
    removeFavorite(gameId);
    setFavorites(getFavorites());
  }, []);

  const toggle = useCallback((gameId: string) => {
    toggleFavorite(gameId);
    setFavorites(getFavorites());
  }, []);

  const check = useCallback((gameId: string) => isFavorite(gameId), []);

  return { favorites, add, remove, toggle, check };
}

export function useGameRating(gameId: string) {
  const [rating, setRatingState] = useState<number | null>(() => getRating(gameId));

  const updateRating = useCallback((newRating: number) => {
    setRating(gameId, newRating);
    setRatingState(getRating(gameId));
  }, [gameId]);

  const clear = useCallback(() => {
    removeRating(gameId);
    setRatingState(null);
  }, [gameId]);

  return { rating, setRating: updateRating, clear };
}

export function useGameNote(gameId: string) {
  const [note, setNoteState] = useState<string | null>(() => getNote(gameId));

  const updateNote = useCallback((newNote: string) => {
    setNote(gameId, newNote);
    setNoteState(getNote(gameId));
  }, [gameId]);

  const clear = useCallback(() => {
    removeNote(gameId);
    setNoteState(null);
  }, [gameId]);

  return { note, setNote: updateNote, clear };
}

export function useGamePlaytime(gameId: string) {
  const [playtime, setPlaytime] = useState<GamePlaytime | null>(() => getGamePlaytime(gameId));

  useEffect(() => {
    const handleStorage = () => setPlaytime(getGamePlaytime(gameId));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [gameId]);

  const add = useCallback((ms: number) => {
    import("../lib/gamePersonalization").then(({ addPlaytime }) => {
      addPlaytime(gameId, ms);
      setPlaytime(getGamePlaytime(gameId));
    });
  }, [gameId]);

  const formatted = playtime ? formatPlaytime(playtime.totalMs) : "0m";

  return { playtime, add, formatted };
}

export function useGameCollections() {
  const [collections, setCollections] = useState<GameCollection[]>([]);

  useEffect(() => {
    setCollections(getCollections());
    const handleStorage = () => setCollections(getCollections());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const create = useCallback((collection: Omit<GameCollection, "id" | "createdAt" | "updatedAt">) => {
    const newCollection = createCollection(collection);
    setCollections(getCollections());
    return newCollection;
  }, []);

  const update = useCallback((id: string, updates: Partial<GameCollection>) => {
    updateCollection(id, updates);
    setCollections(getCollections());
  }, []);

  const remove = useCallback((id: string) => {
    deleteCollection(id);
    setCollections(getCollections());
  }, []);

  const addGame = useCallback((collectionId: string, gameId: string) => {
    addGameToCollection(collectionId, gameId);
    setCollections(getCollections());
  }, []);

  const removeGame = useCallback((collectionId: string, gameId: string) => {
    removeGameFromCollection(collectionId, gameId);
    setCollections(getCollections());
  }, []);

  return { collections, create, update, remove, addGame, removeGame };
}

export function useGameAchievements() {
  const [achievements, setAchievements] = useState<GameAchievement[]>([]);
  const [unlocked, setUnlocked] = useState<GameAchievement[]>([]);
  const [locked, setLocked] = useState<GameAchievement[]>([]);

  useEffect(() => {
    setAchievements(getAchievements());
    setUnlocked(getUnlockedAchievements());
    setLocked(getLockedAchievements());
    const handleStorage = () => {
      setAchievements(getAchievements());
      setUnlocked(getUnlockedAchievements());
      setLocked(getLockedAchievements());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return { achievements, unlocked, locked };
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserGameProfile>(() => getUserProfile());
  const [level, setLevel] = useState(() => getUserLevel());

  useEffect(() => {
    const handleStorage = () => {
      setProfile(getUserProfile());
      setLevel(getUserLevel());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return { profile, level };
}

export function useGameRecommendations(allGames: { id: string; category: string; platforms: { platform: string }[] }[]) {
  const [recommendations, setRecommendations] = useState<string[]>(() =>
    getRecommendedGames(allGames)
  );

  useEffect(() => {
    setRecommendations(getRecommendedGames(allGames));
  }, [allGames]);

  return recommendations;
}

export function useRecentGames(limit = 5) {
  const [games, setGames] = useState<GamePlaytime[]>(() => getRecentGames(limit));

  useEffect(() => {
    const handleStorage = () => setGames(getRecentGames(limit));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [limit]);

  return games;
}

export function useTopRatedGames(limit = 5) {
  const [games, setGames] = useState<(GameRating & { gameId: string })[]>(() => getTopRatedGames(limit));

  useEffect(() => {
    const handleStorage = () => setGames(getTopRatedGames(limit));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [limit]);

  return games;
}

export function useMostPlayedGames(limit = 5) {
  const [games, setGames] = useState<GamePlaytime[]>(() => getMostPlayedGames(limit));

  useEffect(() => {
    const handleStorage = () => setGames(getMostPlayedGames(limit));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [limit]);

  return games;
}

export function useGameStats() {
  const [stats, setStats] = useState(() => getStats());

  useEffect(() => {
    const handleStorage = () => setStats(getStats());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return stats;
}

export function useGameSession(gameId: string) {
  const [sessionStart, setSessionStart] = useState<number | null>(null);

  const start = useCallback(() => {
    const startTime = Date.now();
    setSessionStart(startTime);
    trackGameLaunch(gameId);
    return startTime;
  }, [gameId]);

  const end = useCallback(() => {
    if (sessionStart) {
      trackGameClose(gameId, sessionStart);
      setSessionStart(null);
    }
  }, [gameId, sessionStart]);

  return { start, end, sessionStart };
}