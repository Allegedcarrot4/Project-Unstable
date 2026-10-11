import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad,
  Play,
  Search,
  Maximize2,
  Tv,
  Sparkles,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  LayoutGrid,
  Filter,
  ArrowLeft,
  Flame,
  Clock,
  CheckCircle2,
  Heart,
  Star,
  MessageSquare,
  Bookmark,
  FolderPlus,
  Trophy,
  Crown,
  Zap,
  Medal,
  Flame as FlameIcon,
  Infinity,
  Globe,
  Compass,
  PenTool,
  MessageSquare as MessageSquareIcon,
  FolderPlus as FolderPlusIcon,
  Clock as ClockIcon,
  Gamepad as GamepadIcon,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Settings,
  BarChart2,
  Target,
  Award,
  Layers
} from "lucide-react";
import {
  CLOUD_GAMES,
  PLATFORM_INFO,
  type CloudGame,
  type CloudPlatform,
  type GamePlatformLink,
  trackCloudGamePlay,
  getMostPlayedCloudGames
} from "../data/cloudGames";
import {
  getFavorites,
  isFavorite,
  toggleFavorite,
  getRating,
  setRating,
  getNote,
  setNote,
  getGamePlaytime,
  formatPlaytime,
  getCollections,
  addGameToCollection,
  getAchievements,
  getUserLevel,
  getRecommendedGames,
  trackGameLaunch,
  trackGameClose,
  getPlaytime,
  getRecentGames,
  type GameCollection
} from "../lib/gamePersonalization";

interface GamesPageProps {
  onNavigate?: (url: string) => void;
}

export function GamesPage({ onNavigate }: GamesPageProps) {
  const [activeTab, setActiveTab] = useState<"games" | "media" | "profile">("games");
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [selectedPlatformGame, setSelectedPlatformGame] = useState<CloudGame | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [playVersion, setPlayVersion] = useState<number>(0);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [showCollections, setShowCollections] = useState<boolean>(false);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [showRecommendations, setShowRecommendations] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>("");
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Personalization data
  const favorites = useMemo(() => getFavorites(), [playVersion]);
  const ratings = useMemo(() => CLOUD_GAMES.reduce((acc, game) => {
    const r = getRating(game.id);
    if (r !== null) acc[game.id] = r;
    return acc;
  }, {} as Record<string, number>), [playVersion]);
  const playtimes = useMemo(() => getPlaytime(), [playVersion]);
  const collections = useMemo(() => getCollections(), [playVersion]);
  const achievements = useMemo(() => getAchievements(), [playVersion]);
  const userLevel = useMemo(() => getUserLevel(), [playVersion]);
  const recommendations = useMemo(() => getRecommendedGames(CLOUD_GAMES), [playVersion]);
  // Derive most played games from playtimes or fall back to first games
  const mostPlayedGames = useMemo(() => {
    const withPlaytime = CLOUD_GAMES.map(g => {
      const pt = playtimes.find(p => p.gameId === g.id);
      return { game: g, ms: pt?.totalMs ?? 0 };
    });
    withPlaytime.sort((a, b) => b.ms - a.ms);
    return withPlaytime.slice(0, 10).map(w => w.game);
  }, [playtimes]);

  const isGameFavorite = useCallback((gameId: string) => isFavorite(gameId), [playVersion]);
  const getGameRating = useCallback((gameId: string) => ratings[gameId] ?? null, [ratings]);
  const getGameNote = useCallback((gameId: string) => getNote(gameId), []);
  const getGamePlaytime = useCallback((gameId: string) => {
    const pt = playtimes.find(p => p.gameId === gameId);
    return pt ? formatPlaytime(pt.totalMs) : "Not played";
  }, [playtimes]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--t-bg)",
        color: "var(--t-text)",
        fontFamily: "'Space Grotesk', sans-serif",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative"
      }}
    >
      {/* ─── UNSTABLE HEADER BAR ────────────────────────────────────────────── */}
      <div
        style={{
          padding: "0.85rem 1.5rem",
          borderBottom: "1px solid var(--t-border-light)",
          display: "flex",
          alignItems: "center",
          gap: "1.25rem",
          flexShrink: 0
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Gamepad size={16} style={{ color: "var(--t-accent)" }} />
          <h2
            style={{
              margin: 0,
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--t-text)",
              letterSpacing: "0.02em"
            }}
          >
            Unstable Cloud
          </h2>
        </div>

{/* Category Tabs: Games & Media */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <button
              onClick={() => {
                setActiveTab("games");
                setShowGallery(false);
              }}
              style={{
                background: activeTab === "games" && !showGallery ? "var(--t-accent)" : "transparent",
                color: activeTab === "games" && !showGallery ? "var(--t-accent-text)" : "var(--t-text-muted)",
                border: "1px solid " + (activeTab === "games" && !showGallery ? "var(--t-accent)" : "transparent"),
                borderRadius: "6px",
                padding: "0.35rem 0.85rem",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}
            >
              Games
            </button>

            <button
              onClick={() => {
                setActiveTab("games");
                setShowGallery(true);
              }}
              style={{
                background: showGallery ? "var(--t-accent)" : "transparent",
                color: showGallery ? "var(--t-accent-text)" : "var(--t-text-muted)",
                border: "1px solid " + (showGallery ? "var(--t-accent)" : "transparent"),
                borderRadius: "6px",
                padding: "0.35rem 0.85rem",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem"
              }}
            >
              <LayoutGrid size={12} />
              All Games ({CLOUD_GAMES.length})
            </button>

            <button
              onClick={() => {
                setActiveTab("media");
                setShowGallery(false);
              }}
              style={{
                background: activeTab === "media" ? "var(--t-accent)" : "transparent",
                color: activeTab === "media" ? "var(--t-accent-text)" : "var(--t-text-muted)",
                border: "1px solid " + (activeTab === "media" ? "var(--t-accent)" : "transparent"),
                borderRadius: "6px",
                padding: "0.35rem 0.85rem",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}
            >
              Media
            </button>

            <button
              onClick={() => {
                setActiveTab("profile");
                setShowGallery(false);
              }}
              style={{
                background: activeTab === "profile" ? "var(--t-accent)" : "transparent",
                color: activeTab === "profile" ? "var(--t-accent-text)" : "var(--t-text-muted)",
                border: "1px solid " + (activeTab === "profile" ? "var(--t-accent)" : "transparent"),
                borderRadius: "6px",
                padding: "0.35rem 0.85rem",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem"
              }}
            >
              <Trophy size={12} />
              Profile
            </button>
          </div>

        <div style={{ flex: 1 }} />

        {/* Search Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search
              size={12}
              style={{
                position: "absolute",
                left: "0.6rem",
                color: "var(--t-text-muted)",
                pointerEvents: "none"
              }}
            />
            <input
              placeholder="search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: "var(--t-bg-secondary)",
                border: "1px solid var(--t-border-light)",
                color: "var(--t-text)",
                padding: "0.35rem 0.65rem 0.35rem 1.8rem",
                fontSize: "0.68rem",
                fontFamily: "inherit",
                outline: "none",
                borderRadius: "6px",
                width: "190px"
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  background: "none",
                  border: "none",
                  color: "var(--t-text-muted)",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Clock */}
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--t-text-muted)",
              letterSpacing: "0.05em",
              fontWeight: 500,
              minWidth: "60px",
              textAlign: "right"
            }}
          >
            {currentTime}
          </div>
        </div>
      </div>

      {activeTab === "profile" ? (
        /* ─── PROFILE VIEW ───────────────────────────────────────────────────────── */
        <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto" }}>
          {/* Profile Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--t-border-light)" }}>
            <div style={{ background: "var(--t-accent)", color: "var(--t-accent-text)", borderRadius: "50%", width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "2rem", flexShrink: 0 }}>
              {userLevel.level}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--t-text)" }}>Gamer Profile</h2>
                <span style={{ background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)", borderRadius: "4px", padding: "0.25rem 0.75rem", fontSize: "0.65rem", color: "var(--t-text-muted)" }}>
                  Level {userLevel.level}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ height: "6px", flex: 1, maxWidth: "200px", background: "var(--t-border-light)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${userLevel.progress}%`, background: "var(--t-accent)", borderRadius: "3px", transition: "width 0.3s ease" }} />
                  </div>
                  <span style={{ fontSize: "0.65rem", color: "var(--t-text-muted)" }}>{userLevel.xp} / {userLevel.xp + userLevel.xpToNext} XP</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.7rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#f9ca24" }}>
                  <FlameIcon size={13} /> {userLevel.streakDays || 0} Day Streak
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#ff6b6b" }}>
                  <Heart size={13} /> {favorites.length} Favorites
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#4ecdc4" }}>
                  <Trophy size={13} /> {achievements.filter(a => a.unlockedAt).length} Achievements
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#45b7d1" }}>
                  <ClockIcon size={13} /> {formatPlaytime(playtimes.reduce((sum, p) => sum + p.totalMs, 0))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            {[
              { label: "Total Playtime", value: formatPlaytime(playtimes.reduce((sum, p) => sum + p.totalMs, 0)), icon: ClockIcon, color: "#f9ca24" },
              { label: "Games Played", value: new Set(playtimes.map(p => p.gameId)).size.toString(), icon: GamepadIcon, color: "#4ecdc4" },
              { label: "Favorites", value: favorites.length.toString(), icon: Heart, color: "#ff6b6b" },
              { label: "Ratings Given", value: Object.keys(ratings).length.toString(), icon: Star, color: "#f9ca24" },
              { label: "Collections", value: collections.filter(c => !["favorites", "want-to-play", "completed", "playing-now"].includes(c.id)).length.toString(), icon: FolderPlusIcon, color: "#45b7d1" },
              { label: "Achievements", value: `${achievements.filter(a => a.unlockedAt).length}/${achievements.length}`, icon: Award, color: "#a855f7" }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
              >
                <stat.icon size={20} style={{ color: stat.color, marginBottom: "0.5rem" }} />
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--t-text)", lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: "0.6rem", color: "var(--t-text-muted)", marginTop: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Achievements */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--t-text)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Award size={16} style={{ color: "#a855f7" }} /> Achievements
              </h3>
              <span style={{ fontSize: "0.65rem", color: "var(--t-text-muted)" }}>
                {achievements.filter(a => a.unlockedAt).length} / {achievements.length} unlocked
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem" }}>
              {achievements.slice(0, 12).map((achievement, i) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    background: achievement.unlockedAt ? "rgba(168, 85, 247, 0.1)" : "var(--t-bg-secondary)",
                    border: `1px solid ${achievement.unlockedAt ? "rgba(168, 85, 247, 0.3)" : "var(--t-border-light)"}`,
                    borderRadius: "8px",
                    padding: "0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    opacity: achievement.unlockedAt ? 1 : 0.6,
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>{achievement.icon || "🏆"}</div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--t-text)", marginBottom: "0.2rem" }}>{achievement.name}</div>
                  <div style={{ fontSize: "0.55rem", color: "var(--t-text-muted)", marginBottom: "0.5rem" }}>{achievement.description}</div>
                  <div style={{ height: "4px", width: "100%", background: "var(--t-border-light)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${achievement.progress}%`, background: achievement.unlockedAt ? "#a855f7" : "var(--t-accent)", borderRadius: "2px", transition: "width 0.3s ease" }} />
                  </div>
                  <div style={{ fontSize: "0.5rem", color: "var(--t-text-muted)", marginTop: "0.25rem" }}>
                    {achievement.unlockedAt ? "Unlocked" : `${Math.round(achievement.progress)}%`}
                  </div>
                  {achievement.unlockedAt && (
                    <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "#a855f7", color: "#fff", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem" }}>
                      ✓
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            {achievements.length > 12 && (
              <p style={{ margin: "1rem 0 0", fontSize: "0.65rem", color: "var(--t-text-muted)", textAlign: "center" }}>
                +{achievements.length - 12} more achievements...
              </p>
            )}
          </div>

          {/* Recommendations */}
          <div>
            <h3 style={{ margin: "0 0 1rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--t-text)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Target size={16} style={{ color: "#4ecdc4" }} /> Recommended for You
            </h3>
            {recommendations.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--t-text-muted)", textAlign: "center", padding: "2rem" }}>
                Play more games to get personalized recommendations!
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem" }}>
                {recommendations.slice(0, 6).map((gameId) => {
                  const game = CLOUD_GAMES.find(g => g.id === gameId);
                  if (!game) return null;
                  return (
                    <motion.div
                      key={game.id}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPlatformGame(game)}
                      style={{
                        background: "var(--t-bg-secondary)",
                        border: "1px solid var(--t-border-light)",
                        borderRadius: "8px",
                        overflow: "hidden",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)"
                      }}
                    >
                      <div style={{ position: "relative", width: "100%", height: "90px", background: "#151515" }}>
                        <img
                          src={game.coverImage}
                          alt={game.name}
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80"; }}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                      <div style={{ padding: "0.65rem 0.75rem" }}>
                        <h4 style={{ margin: "0 0 0.2rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--t-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{game.name}</h4>
                        <p style={{ margin: 0, fontSize: "0.6rem", color: "var(--t-text-muted)" }}>{game.category.split("/")[0]}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recently Played */}
          <div>
            <h3 style={{ margin: "0 0 1rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--t-text)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock size={16} style={{ color: "#f9ca24" }} /> Recently Played
            </h3>
            {getRecentGames(5).length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--t-text-muted)", textAlign: "center", padding: "2rem" }}>
                No recent games. Start playing to see history!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {getRecentGames(5).map((pt, i) => {
                  const game = CLOUD_GAMES.find(g => g.id === pt.gameId);
                  if (!game) return null;
                  return (
                    <motion.div
                      key={pt.gameId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)", borderRadius: "6px" }}
                    >
                      <img src={game.coverImage} alt={game.name} style={{ width: "40px", height: "40px", borderRadius: "4px", objectFit: "cover" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--t-text)" }}>{game.name}</div>
                        <div style={{ fontSize: "0.58rem", color: "var(--t-text-muted)" }}>
                          Last played: {new Date(pt.lastPlayedAt).toLocaleDateString()} · {formatPlaytime(pt.totalMs)} total
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(game.id); setPlayVersion(v => v + 1); }}
                          style={{ background: isGameFavorite(game.id) ? "rgba(255, 107, 107, 0.2)" : "transparent", border: "none", padding: "0.25rem", borderRadius: "4px", color: isGameFavorite(game.id) ? "#ff6b6b" : "var(--t-text-muted)", cursor: "pointer" }}
                        >
                          <Heart size={14} style={{ fill: isGameFavorite(game.id) ? "currentColor" : "none" }} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "media" ? (
        /* ─── MEDIA VIEW ─────────────────────────────────────────────────────── */
        <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--t-text-muted)" }}>
            Media & streaming destinations proxied through Unstable.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.75rem" }}>
            {[
              { title: "YouTube", tag: "VIDEO", url: "https://www.youtube.com", desc: "Watch videos and livestreams." },
              { title: "Twitch", tag: "LIVESTREAM", url: "https://www.twitch.tv", desc: "Live gaming broadcasts and esports." },
              { title: "SoundCloud", tag: "MUSIC", url: "https://soundcloud.com", desc: "Stream music, tracks, and podcasts." },
              { title: "Spotify Web", tag: "AUDIO", url: "https://open.spotify.com", desc: "Listen to albums and playlists." }
            ].map((media, i) => (
              <div
                key={i}
                onClick={() => onNavigate && onNavigate(media.url)}
                style={{
                  background: "var(--t-bg-secondary)",
                  border: "1px solid var(--t-border-light)",
                  borderRadius: "8px",
                  padding: "1rem",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--t-accent)", letterSpacing: "0.06em" }}>
                      {media.tag}
                    </span>
                    <ExternalLink size={12} style={{ color: "var(--t-text-muted)" }} />
                  </div>
                  <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "0.85rem", fontWeight: 600, color: "var(--t-text)" }}>
                    {media.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--t-text-muted)" }}>
                    {media.desc}
                  </p>
                </div>
                <button
                  style={{
                    marginTop: "0.85rem",
                    background: "transparent",
                    border: "1px solid var(--t-border-light)",
                    borderRadius: "4px",
                    color: "var(--t-text)",
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    alignSelf: "flex-start"
                  }}
                >
                  <Play size={11} /> Launch Media
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : showGallery ? (
        /* ─── ALL GAMES GALLERY VIEW ─────────────────────────────────────────── */
        <div style={{ padding: "1.25rem 1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Gallery Top Navigation & Filters */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                onClick={() => setShowGallery(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "var(--t-bg-secondary)",
                  border: "1px solid var(--t-border-light)",
                  borderRadius: "6px",
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.7rem",
                  color: "var(--t-text)",
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
              >
                <ArrowLeft size={13} />
                Back to Homescreen
              </button>
              <span style={{ fontSize: "0.75rem", color: "var(--t-text-muted)" }}>
                Showing <strong>{galleryGames.length}</strong> titles
              </span>
            </div>

            {/* Category Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    background: selectedCategory === cat ? "var(--t-accent)" : "var(--t-bg-secondary)",
                    color: selectedCategory === cat ? "var(--t-accent-text)" : "var(--t-text-muted)",
                    border: "1px solid var(--t-border-light)",
                    borderRadius: "4px",
                    padding: "0.25rem 0.55rem",
                    fontSize: "0.64rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: selectedCategory === cat ? 600 : 500
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Games Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: "0.85rem",
              paddingBottom: "2rem"
            }}
          >
            {galleryGames.map((game) => (
              <motion.div
                key={game.id}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPlatformGame(game)}
                style={{
                  background: "var(--t-bg-secondary)",
                  border: "1px solid var(--t-border-light)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  transition: "border-color 0.15s ease",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)"
                }}
              >
                {/* Cover Image Thumbnail */}
                <div style={{ position: "relative", width: "100%", height: "105px", background: "#151515" }}>
                  <img
                    src={game.coverImage}
                    alt={game.name}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback image if steam cdn fails
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80";
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      background: "rgba(0, 0, 0, 0.75)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      padding: "2px 5px",
                      borderRadius: "4px",
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      color: "var(--t-text)"
                    }}
                  >
                    {game.platforms.length} Platforms
                  </div>
                </div>

{/* Card Info */}
                  <div style={{ padding: "0.65rem 0.75rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "var(--t-accent)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        {game.category.split("/")[0]}
                      </span>
                      <h3
                        style={{
                          margin: "0.2rem 0 0 0",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--t-text)",
                          lineHeight: 1.25,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {game.name}
                      </h3>
                    </div>

                    <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.6rem", color: "var(--t-text-muted)" }}>
                          Click to Play
                        </span>
                        <ChevronRight size={13} style={{ color: "var(--t-text-muted)" }} />
                      </div>
                      
                      {/* Personalization: Favorite & Rating */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(game.id);
                            setPlayVersion((v) => v + 1);
                          }}
                          style={{
                            background: isGameFavorite(game.id) ? "rgba(255, 107, 107, 0.2)" : "transparent",
                            border: "none",
                            padding: "0.2rem",
                            cursor: "pointer",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: isGameFavorite(game.id) ? "#ff6b6b" : "var(--t-text-muted)",
                            transition: "all 0.15s ease"
                          }}
                          title={isGameFavorite(game.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart size={14} style={{ fill: isGameFavorite(game.id) ? "currentColor" : "none" }} />
                        </button>
                        {getGameRating(game.id) !== null && (
                          <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                size={11}
                                style={{
                                  fill: i < getGameRating(game.id)! ? "#f9ca24" : "transparent",
                                  color: i < getGameRating(game.id)! ? "#f9ca24" : "var(--t-text-muted)",
                                  stroke: i < getGameRating(game.id)! ? "#f9ca24" : "var(--t-text-muted)"
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* ─── HOMESCREEN VIEW: MOST PLAYED PS5 CAROUSEL ──────────────────────── */
        <>
          {/* ─── PS5 HORIZONTAL TILE CAROUSEL (MOST PLAYED + ALL GAMES) ────────── */}
          <div
            style={{
              padding: "1.1rem 1.5rem 0.6rem 1.5rem",
              flexShrink: 0
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.4rem",
                padding: "0 0.25rem"
              }}
            >
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--t-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem"
                }}
              >
                <Flame size={12} color="var(--t-accent)" /> Most Played
              </span>
              <button
                onClick={() => setShowGallery(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--t-text-muted)",
                  fontSize: "0.68rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontFamily: "inherit"
                }}
              >
                View all ({CLOUD_GAMES.length}) <ChevronRight size={12} />
              </button>
            </div>

            <div
              ref={carouselRef}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                overflowX: "auto",
                padding: "0.5rem 0.25rem",
                scrollbarWidth: "none",
                msOverflowStyle: "none"
              }}
            >
              {mostPlayedGames.map((game, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <motion.div
                    key={game.id}
                    onClick={() => setSelectedIndex(idx)}
                    onDoubleClick={() => setSelectedPlatformGame(game)}
                    whileHover={{ scale: isSelected ? 1.05 : 1.03 }}
                    animate={{
                      scale: isSelected ? 1.05 : 0.96,
                      opacity: isSelected ? 1 : 0.7
                    }}
                    transition={{ duration: 0.16 }}
                    style={{
                      flexShrink: 0,
                      width: isSelected ? "118px" : "102px",
                      height: isSelected ? "118px" : "102px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: "var(--t-bg-secondary)",
                      border: isSelected
                        ? "2px solid var(--t-accent)"
                        : "1px solid var(--t-border-light)",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      overflow: "hidden",
                      boxShadow: isSelected ? "0 4px 18px rgba(0, 0, 0, 0.5)" : "none"
                    }}
                  >
                    {/* Game Cover Art Image */}
                    <img
                      src={game.coverImage}
                      alt={game.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80";
                      }}
                      style={{
                        width: "100%",
                        height: "72%",
                        objectFit: "cover"
                      }}
                    />

                    {/* Title Banner */}
                    <div
                      style={{
                        flex: 1,
                        padding: "0.25rem 0.4rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--t-bg-secondary)"
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.58rem",
                          fontWeight: 600,
                          color: isSelected ? "var(--t-text)" : "var(--t-text-muted)",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%"
                        }}
                      >
                        {game.name}
                      </span>
                    </div>

                    {/* Active highlight bar */}
                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: "20%",
                          right: "20%",
                          height: "2px",
                          background: "var(--t-accent)",
                          borderRadius: "2px"
                        }}
                      />
                    )}
                  </motion.div>
                );
              })}

              {/* ─── ALL GAMES TILE AT THE END OF CAROUSEL ─────────────────── */}
              {(() => {
                const isAllGamesSelected = selectedIndex === mostPlayedGames.length;
                return (
                  <motion.div
                    onClick={() => {
                      setSelectedIndex(mostPlayedGames.length);
                      setShowGallery(true);
                    }}
                    whileHover={{ scale: 1.05 }}
                    animate={{
                      scale: isAllGamesSelected ? 1.05 : 0.96,
                      opacity: isAllGamesSelected ? 1 : 0.7
                    }}
                    transition={{ duration: 0.16 }}
                    style={{
                      flexShrink: 0,
                      width: isAllGamesSelected ? "118px" : "102px",
                      height: isAllGamesSelected ? "118px" : "102px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: "var(--t-bg-secondary)",
                      border: isAllGamesSelected
                        ? "2px solid var(--t-accent)"
                        : "1px dashed var(--t-border-light)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                      boxShadow: isAllGamesSelected ? "0 4px 18px rgba(0, 0, 0, 0.5)" : "none"
                    }}
                  >
                    <LayoutGrid size={24} style={{ color: "var(--t-accent)" }} />
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        color: "var(--t-text)",
                        letterSpacing: "0.04em",
                        textAlign: "center"
                      }}
                    >
                      All Games
                    </span>
                    <span style={{ fontSize: "0.55rem", color: "var(--t-text-muted)" }}>
                      {CLOUD_GAMES.length} Titles
                    </span>
                  </motion.div>
                );
              })()}
            </div>
          </div>

          {/* ─── PS5 HERO DETAILS SECTION (BOTTOM-MID) ────────────────────────── */}
          {selectedPlatformGame && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "1rem 1.75rem 1.5rem 1.75rem",
                maxWidth: "960px"
              }}
            >
              {/* Category & Supported Platform Badges */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.55rem" }}>
                <span
                  style={{
                    background: "var(--t-bg-secondary)",
                    border: "1px solid var(--t-border-light)",
                    padding: "0.2rem 0.55rem",
                    borderRadius: "4px",
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--t-accent)"
                  }}
                >
                  {selectedPlatformGame.category}
                </span>

                {selectedPlatformGame.platforms.map((p, i) => {
                  const info = PLATFORM_INFO[p.platform];
                  return (
                    <span
                      key={i}
                      style={{
                        background: info?.badgeBg || "var(--t-bg-secondary)",
                        border: "1px solid var(--t-border-light)",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.58rem",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        color: info?.color || "var(--t-text)"
                      }}
                    >
                      {info?.tag || p.platform}
                    </span>
                  );
                })}
              </div>

              {/* Game Title & Preview Layout */}
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <h1
                    style={{
                      fontSize: "clamp(1.5rem, 3.2vw, 2.3rem)",
                      fontWeight: 700,
                      margin: "0 0 0.35rem 0",
                      color: "var(--t-text)",
                      letterSpacing: "-0.01em"
                    }}
                  >
                    {selectedPlatformGame.name}
                  </h1>

                  {/* Description */}
                  <p
                    style={{
                      margin: "0 0 1.25rem 0",
                      fontSize: "0.82rem",
                      lineHeight: 1.5,
                      color: "var(--t-text-secondary, rgba(255,255,255,0.7))",
                      maxWidth: "640px"
                    }}
                  >
                    {selectedPlatformGame.description}
                  </p>

                  {/* Primary Action Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedPlatformGame(selectedPlatformGame)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        background: "var(--t-accent)",
                        color: "var(--t-accent-text)",
                        border: "none",
                        borderRadius: "6px",
                        padding: "0.6rem 1.4rem",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase"
                      }}
                    >
                      <Play size={14} fill="currentColor" />
                      Play Game ({selectedPlatformGame.platforms.length} Platforms)
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowGallery(true)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        background: "var(--t-bg-secondary)",
                        border: "1px solid var(--t-border-light)",
                        color: "var(--t-text)",
                        borderRadius: "6px",
                        padding: "0.6rem 1rem",
                        fontSize: "0.72rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        letterSpacing: "0.04em"
                      }}
                    >
                      <LayoutGrid size={13} />
                      Browse All Games
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (!document.fullscreenElement) {
                          document.documentElement.requestFullscreen().catch(() => {});
                        } else {
                          document.exitFullscreen().catch(() => {});
                        }
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        background: "var(--t-bg-secondary)",
                        border: "1px solid var(--t-border-light)",
                        color: "var(--t-text)",
                        borderRadius: "6px",
                        padding: "0.6rem 1rem",
                        fontSize: "0.72rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        letterSpacing: "0.04em"
                      }}
                    >
                      <Maximize2 size={13} />
                      Fullscreen
                    </motion.button>
                  </div>
                </div>

                {/* Game Art Poster Card */}
                <div
                  style={{
                    width: "160px",
                    height: "105px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid var(--t-border-light)",
                    flexShrink: 0,
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                    display: "none"
                  }}
                  className="sm:block"
                >
                  <img
                    src={selectedPlatformGame.coverImage}
                    alt={selectedPlatformGame.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              </div>

              {/* ─── PS5 SIGNATURE ACTIVITY / INFO CARDS (LOWER SECTION) ─────────── */}
              <div>
                <p
                  style={{
                    margin: "0 0 0.5rem 0",
                    fontSize: "0.62rem",
                    color: "var(--t-text-muted)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: 600
                  }}
                >
                  Cloud Gaming Architecture
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "0.65rem"
                  }}
                >
                  <div
                    style={{
                      background: "var(--t-bg-secondary)",
                      border: "1px solid var(--t-border-light)",
                      borderRadius: "8px",
                      padding: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                        <span style={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.06em", color: "var(--t-accent)" }}>
                          PROXIED CLOUD
                        </span>
                        <Sparkles size={11} style={{ opacity: 0.4 }} />
                      </div>
                      <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "0.75rem", fontWeight: 600, color: "var(--t-text)" }}>
                        Zero Install Required
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--t-text-muted)", lineHeight: 1.4 }}>
                        Runs via high-speed cloud gaming servers through Unstable&apos;s proxy layer.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--t-bg-secondary)",
                      border: "1px solid var(--t-border-light)",
                      borderRadius: "8px",
                      padding: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                        <span style={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.06em", color: "#f59e0b" }}>
                          OWNERSHIP REQUIRED
                        </span>
                        <ShieldCheck size={11} style={{ opacity: 0.4 }} />
                      </div>
                      <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "0.75rem", fontWeight: 600, color: "var(--t-text)" }}>
                        Account Linked
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--t-text-muted)", lineHeight: 1.4 }}>
                        You must own this game on your linked store account or have an active service subscription.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--t-bg-secondary)",
                      border: "1px solid var(--t-border-light)",
                      borderRadius: "8px",
                      padding: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                        <span style={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.06em", color: "var(--t-accent)" }}>
                          INPUT READY
                        </span>
                        <Gamepad size={11} style={{ opacity: 0.4 }} />
                      </div>
                      <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "0.75rem", fontWeight: 600, color: "var(--t-text)" }}>
                        Controller & Keyboard
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--t-text-muted)", lineHeight: 1.4 }}>
                        Compatible with Xbox, DualSense, and PC keyboard inputs with low latency.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── PLATFORM SELECTION MODAL (WITH OWNERSHIP DISCLAIMER) ──────────────── */}
      <AnimatePresence>
        {selectedPlatformGame && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: "1rem"
            }}
            onClick={() => setSelectedPlatformGame(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "480px",
                background: "var(--t-bg-secondary)",
                borderRadius: "10px",
                border: "1px solid var(--t-border-light)",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Modal Header with Game Cover */}
              <div
                style={{
                  position: "relative",
                  height: "120px",
                  background: "#121212",
                  overflow: "hidden"
                }}
              >
                <img
                  src={selectedPlatformGame.coverImage}
                  alt={selectedPlatformGame.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(18,18,18,0.95) 100%)"
                  }}
                />
                <button
                  onClick={() => setSelectedPlatformGame(null)}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "rgba(0, 0, 0, 0.65)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    color: "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <X size={14} />
                </button>
                <div style={{ position: "absolute", bottom: "10px", left: "14px", right: "45px" }}>
                  <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--t-accent)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Select Cloud Platform
                  </span>
                  <h3 style={{ margin: "0.15rem 0 0 0", fontSize: "1.05rem", fontWeight: 700, color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                    {selectedPlatformGame.name}
                  </h3>
                </div>
              </div>

              {/* MANDATORY OWNERSHIP DISCLAIMER NOTICE */}
              <div style={{ padding: "0.85rem 1.25rem 0.35rem 1.25rem" }}>
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: "6px",
                    padding: "0.65rem 0.85rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.55rem"
                  }}
                >
                  <AlertTriangle size={15} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "1px" }} />
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.68rem",
                      color: "#fde68a",
                      lineHeight: 1.45
                    }}
                  >
                    <strong>Ownership Required:</strong> You must own this game on your linked store account (Steam, Epic, Xbox, Ubisoft, etc.) or possess an active cloud subscription for the chosen platform.
                  </p>
                </div>
              </div>

              {/* PERSONALIZATION SECTION: Notes, Collections, Playtime, Rating */}
              <div style={{ padding: "0.85rem 1.25rem", borderTop: "1px solid var(--t-border-light)", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--t-accent)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Personalization
                  </span>
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    style={{
                      background: showNotes ? "var(--t-accent)" : "transparent",
                      border: "1px solid " + (showNotes ? "var(--t-accent)" : "var(--t-border-light)"),
                      color: showNotes ? "var(--t-accent-text)" : "var(--t-text-muted)",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.58rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                  >
                    <MessageSquareIcon size={11} /> Notes
                  </button>
                  <button
                    onClick={() => setShowCollections(!showCollections)}
                    style={{
                      background: showCollections ? "var(--t-accent)" : "transparent",
                      border: "1px solid " + (showCollections ? "var(--t-accent)" : "var(--t-border-light)"),
                      color: showCollections ? "var(--t-accent-text)" : "var(--t-text-muted)",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.58rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                  >
                    <Bookmark size={11} /> Collections
                  </button>
                  <button
                    onClick={() => setShowAchievements(!showAchievements)}
                    style={{
                      background: showAchievements ? "var(--t-accent)" : "transparent",
                      border: "1px solid " + (showAchievements ? "var(--t-accent)" : "var(--t-border-light)"),
                      color: showAchievements ? "var(--t-accent-text)" : "var(--t-text-muted)",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.58rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                  >
                    <Trophy size={11} /> Achievements
                  </button>
                </div>

                {/* Notes Section */}
                <AnimatePresence>
                  {showNotes && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: "hidden", marginBottom: "0.75rem" }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <textarea
                          value={noteText || getGameNote(selectedPlatformGame.id) || ""}
                          onChange={(e) => setNoteText(e.target.value)}
                          onBlur={() => {
                            if (noteText !== getGameNote(selectedPlatformGame.id)) {
                              setNote(selectedPlatformGame.id, noteText);
                              setPlayVersion((v) => v + 1);
                            }
                          }}
                          placeholder="Add your personal notes about this game..."
                          rows={3}
                          style={{
                            background: "var(--t-bg)",
                            border: "1px solid var(--t-border-light)",
                            borderRadius: "6px",
                            padding: "0.5rem",
                            fontSize: "0.65rem",
                            fontFamily: "inherit",
                            color: "var(--t-text)",
                            resize: "vertical",
                            outline: "none"
                          }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => {
                              setNote(selectedPlatformGame.id, noteText);
                              setPlayVersion((v) => v + 1);
                            }}
                            style={{
                              background: "var(--t-accent)",
                              border: "none",
                              color: "var(--t-accent-text)",
                              padding: "0.35rem 0.75rem",
                              borderRadius: "4px",
                              fontSize: "0.6rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit"
                            }}
                          >
                            Save Note
                          </button>
                          {getGameNote(selectedPlatformGame.id) && (
                            <button
                              onClick={() => {
                                setNote(selectedPlatformGame.id, "");
                                setNoteText("");
                                setPlayVersion((v) => v + 1);
                              }}
                              style={{
                                background: "transparent",
                                border: "1px solid var(--t-border-light)",
                                color: "var(--t-text-muted)",
                                padding: "0.35rem 0.75rem",
                                borderRadius: "4px",
                                fontSize: "0.6rem",
                                cursor: "pointer",
                                fontFamily: "inherit"
                              }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Collections Section */}
                <AnimatePresence>
                  {showCollections && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: "hidden", marginBottom: "0.75rem" }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <p style={{ margin: 0, fontSize: "0.6rem", color: "var(--t-text-muted)" }}>
                          Add this game to your collections:
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                          {collections.map((collection) => {
                            const inCollection = collection.gameIds.includes(selectedPlatformGame.id);
                            return (
                              <button
                                key={collection.id}
                                onClick={() => {
                                  if (inCollection) {
                                    import("../lib/gamePersonalization").then(({ removeGameFromCollection }) =>
                                      removeGameFromCollection(collection.id, selectedPlatformGame.id)
                                    );
                                  } else {
                                    addGameToCollection(collection.id, selectedPlatformGame.id);
                                  }
                                  setPlayVersion((v) => v + 1);
                                }}
                                style={{
                                  background: inCollection ? collection.color : "var(--t-bg)",
                                  border: `1px solid ${inCollection ? collection.color : "var(--t-border-light)"}`,
                                  color: inCollection ? "#fff" : "var(--t-text)",
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "4px",
                                  fontSize: "0.6rem",
                                  fontWeight: inCollection ? 600 : 500,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                {inCollection && <CheckCircle2 size={11} />}
                                {collection.name}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => {
                            const newCollection = import("../lib/gamePersonalization").then(({ createCollection }) =>
                              createCollection({
                                name: "New Collection",
                                description: "Custom collection",
                                gameIds: [selectedPlatformGame.id],
                                isPublic: false,
                                color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
                                icon: "FolderPlus"
                              })
                            );
                            newCollection.then(() => setPlayVersion((v) => v + 1));
                          }}
                          style={{
                            background: "transparent",
                            border: "1px dashed var(--t-border-light)",
                            color: "var(--t-text-muted)",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "4px",
                            fontSize: "0.6rem",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem"
                          }}
                        >
                          <Plus size={11} /> New Collection
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Achievements/Stats Section */}
                <AnimatePresence>
                  {showAchievements && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ background: "var(--t-accent)", color: "var(--t-accent-text)", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem" }}>
                              {userLevel.level}
                            </div>
                            <div>
                              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--t-text)" }}>Level {userLevel.level}</div>
                              <div style={{ fontSize: "0.55rem", color: "var(--t-text-muted)" }}>{userLevel.xp} XP · {userLevel.xpToNext} to next level</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <div style={{ background: "rgba(255, 202, 36, 0.1)", border: "1px solid rgba(255, 202, 36, 0.3)", borderRadius: "4px", padding: "0.25rem 0.5rem" }}>
                              <span style={{ fontSize: "0.6rem", color: "#f9ca24", fontWeight: 600 }}>{FlameIcon} {userLevel.streakDays || 0}</span>
                            </div>
                            <div style={{ background: "rgba(255, 107, 107, 0.1)", border: "1px solid rgba(255, 107, 107, 0.3)", borderRadius: "4px", padding: "0.25rem 0.5rem" }}>
                              <span style={{ fontSize: "0.6rem", color: "#ff6b6b", fontWeight: 600 }}>{Heart} {favorites.length}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ height: "4px", background: "var(--t-border-light)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${userLevel.progress}%`, background: "var(--t-accent)", borderRadius: "2px", transition: "width 0.3s ease" }} />
                        </div>
                        <p style={{ margin: 0, fontSize: "0.58rem", color: "var(--t-text-muted)" }}>
                          Playtime: {getGamePlaytime(selectedPlatformGame.id)} · {achievements.filter(a => a.unlockedAt).length}/{achievements.length} achievements unlocked
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Platform Options List */}
              <div style={{ padding: "0.75rem 1.25rem 1.25rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <p
                  style={{
                    margin: "0 0 0.35rem 0",
                    fontSize: "0.62rem",
                    color: "var(--t-text-muted)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontWeight: 600
                  }}
                >
                  Choose Service ({selectedPlatformGame.platforms.length} Available)
                </p>

                {selectedPlatformGame.platforms.map((link, idx) => {
                  const info = PLATFORM_INFO[link.platform];
                  return (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.01, background: "var(--t-bg-tertiary, rgba(255, 255, 255, 0.06))" }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleLaunchPlatform(selectedPlatformGame, link)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.65rem 0.85rem",
                        background: "var(--t-bg)",
                        border: "1px solid var(--t-border-light)",
                        borderRadius: "6px",
                        cursor: "pointer",
                        color: "var(--t-text)",
                        fontFamily: "inherit",
                        textAlign: "left"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: info?.color || "var(--t-accent)"
                          }}
                        />
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--t-text)" }}>
                            {info?.name || link.platform}
                          </div>
                          <div style={{ fontSize: "0.6rem", color: "var(--t-text-muted)" }}>
                            Launch cloud stream through Unstable Proxy
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            background: info?.badgeBg || "var(--t-bg-secondary)",
                            color: info?.color || "var(--t-text)"
                          }}
                        >
                          {info?.tag || "PLAY"}
                        </span>
                        <ChevronRight size={13} style={{ color: "var(--t-text-muted)" }} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default GamesPage;
