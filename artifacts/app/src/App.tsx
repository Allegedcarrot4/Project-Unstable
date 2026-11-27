import { useState, useEffect, useRef, useCallback, useMemo, memo, lazy, Suspense, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useVelocity, useTransform, useAnimation } from "framer-motion";
import { useMotionTokens, useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Gamepad, MessageCircle, Settings, Atom, House, Zap, Brain, Mic, ThumbsUp, ThumbsDown, Flame, Laugh, Heart, Volume2, VolumeX, RefreshCw, Wrench, Maximize, EllipsisVertical, Columns2, Layers, ArrowLeft, ArrowRight, ArrowLeftRight, ArrowUpDown, GripVertical, GripHorizontal, PanelLeftClose, PanelLeft, ChevronLeft, ChevronRight, Play, Pause, SkipBack, SkipForward, Music, Swords, Puzzle, Car, Ghost, Users, User as UserIcon, X, Clock, History as HistoryIcon, Bookmark, Download, Trash2, ExternalLink, Globe, Settings2, Star, Shield, Copy, Pencil, Send, QrCode, EyeOff, Pin, Plus, MemoryStick } from "lucide-react";

import { ErrorScreen } from "./components/ErrorScreen";
import { DownloadIndicator } from "./components/DownloadIndicator";
import { DownloadsPanel } from "./components/DownloadsPanel";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./components/ui/dialog";
import { Checkbox } from "./components/ui/checkbox";
import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number";
const AIChat = lazy(() => import("./components/AIChat").then(m => ({ default: m.AIChat })));
const ChatHub = lazy(() => import("./components/ChatHub").then(m => ({ default: m.ChatHub })));
const ProfilePage = lazy(() => import("./components/ProfilePage").then(m => ({ default: m.ProfilePage })));
const GamesPage = lazy(() => import("./components/GamesPage").then(m => ({ default: m.GamesPage })));
const ReleasesPage = lazy(() => import("./components/ReleasesPage").then(m => ({ default: m.ReleasesPage })));
const NotFound = lazy(() => import("./pages/not-found"));

import type { CodecType } from "./lib/codec";
import { makeCodec } from "./lib/codec";
import { useErrorHandler } from "./lib/errorContext";
import { addHistory, getHistory, clearHistory, deleteHistoryEntry, searchHistory } from "./lib/history";
import { getBookmarks, addBookmark, removeBookmark, searchBookmarks, isBookmarked } from "./lib/bookmarks";
import { getDownloads, addDownload, removeDownload, clearDownloads, updateDownload, startDownload, setDownloadTransport, retryDownload, cancelDownload, formatBytes, formatSpeed, deriveFilename, saveBlob, subscribe, type DownloadEntry } from "./lib/downloads";
import { loadWidgetConfig, saveWidgetConfig, toggleWidget, getGreeting, QUOTES, type WidgetType, type WidgetConfig, type Quote } from "./lib/widgets";
import {
  faviconUrl as _faviconUrl,
  extractDomain as _extractDomain,
  stripTrackingParams as _stripTrackingParams,
  getEffectiveEngine as _getEffectiveEngine,
  encodeProxyUrl as _encodeProxyUrl,
  decodeProxyUrl as _decodeProxyUrl,
  hostnameFromTabUrl as _hostnameFromTabUrl,
  getDomainFromProxyUrl as _getDomainFromProxyUrl,
  barePathForNum as _barePathForNum,
  normalizeUrl as _normalizeUrl,
  encodeProxyUrlAdvanced,
  decodeProxyUrlAdvanced,
} from "./lib/proxy";
import type { ScramjetCtrl } from "./lib/proxy";
import { createWispTransport, getLibCurlInstance } from "./lib/wisp-transport";
import { createRelay, attachClient, getRelayStats, closeRelay } from "./lib/wisp-relay";
import { detectSecurly } from "./lib/securly";
import {
  detectDeployment,
  getDeploymentMode,
  subscribeDeployment,
  resolveWispUrls,
  type DeploymentMode,
} from "./lib/deployment";


declare global {
  interface Window {
    Ultraviolet: { codec: { xor: { encode: (s: string) => string; decode: (s: string) => string } } };
    __uv$config: { prefix: string; encodeUrl: (s: string) => string; decodeUrl: (s: string) => string };
    $scramjetLoadController: () => { ScramjetController: new (cfg: any) => ScramjetCtrl };
    $scramjetLoadWorker: () => any;
    __wispLibCurl: { encodeUrl: (s: string) => string | Promise<string>; decodeUrl: (s: string) => string | Promise<string> };
    __wispRelay: { encodeUrl: (s: string) => Promise<string>; decodeUrl: (s: string) => Promise<string>; attach: (meta?: any) => MessagePort };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CloakId = "none" | "google-drive" | "schoology" | "classlink" | "google-classroom";

interface KeyShortcuts {
  tab1: string; tab2: string; tab3: string; tab4: string; tab5: string;
  tab6: string; tab7: string; tab8: string; tab9: string;
  closeTab: string; newTab: string; addShortcut: string;
}

type ProxyEngine = "auto" | "uv" | "scramjet";
type TransportMode = "auto" | "wisp" | "bare" | "epoxy" | "drift";
type ThemeId = "dark" | "midnight" | "ocean" | "sunset" | "cyberpunk" | "matrix" | "tuff";

interface ThemeColors {
  bg: string; bgSecondary: string; bgTertiary: string; bgHover: string;
  text: string; textSecondary: string; textMuted: string;
  border: string; borderLight: string;
  accent: string; accentHover: string; accentText: string;
  inputBg: string; inputBorder: string; inputText: string;
  btnBg: string; btnHover: string; btnText: string;
  scrollbar: string; scrollbarThumb: string;
  tabActive: string; tabInactive: string; tabBorder: string;
  cardBg: string; cardBorder: string;
}

const THEMES: Record<ThemeId, { label: string; wallpaper?: string; backgroundEffect?: string; colors: ThemeColors }> = {
  dark: {
    label: "Dark",
    colors: {
      bg: "#0d0d0d", bgSecondary: "#111", bgTertiary: "#161616", bgHover: "#1a1a1a",
      text: "#e0e0e0", textSecondary: "rgba(255,255,255,0.55)", textMuted: "rgba(255,255,255,0.3)",
      border: "#1e1e1e", borderLight: "#222",
      accent: "#e8e8e8", accentHover: "#fff", accentText: "#0d0d0d",
      inputBg: "#0a0a0a", inputBorder: "#1e1e1e", inputText: "#e0e0e0",
      btnBg: "#111", btnHover: "#1a1a1a", btnText: "rgba(255,255,255,0.45)",
      scrollbar: "#1e1e1e", scrollbarThumb: "#333",
      tabActive: "#111", tabInactive: "#080808", tabBorder: "#1a1a1a",
      cardBg: "#111", cardBorder: "#222",
    },
  },
  midnight: {
    label: "Midnight Blue",
    colors: {
      bg: "#0a0a1a", bgSecondary: "#101028", bgTertiary: "#161636", bgHover: "#1c1c42",
      text: "#c8c8e0", textSecondary: "rgba(200,200,224,0.6)", textMuted: "rgba(200,200,224,0.35)",
      border: "#1e1e3a", borderLight: "#2a2a4a",
      accent: "#5588ff", accentHover: "#7799ff", accentText: "#fff",
      inputBg: "#0e0e22", inputBorder: "#2a2a4a", inputText: "#c8c8e0",
      btnBg: "#161636", btnHover: "#1e1e42", btnText: "rgba(200,200,224,0.5)",
      scrollbar: "#1e1e3a", scrollbarThumb: "#3a3a5a",
      tabActive: "#101028", tabInactive: "#08081a", tabBorder: "#1a1a3a",
      cardBg: "#101028", cardBorder: "#2a2a4a",
    },
  },
  ocean: {
    label: "Ocean",
    colors: {
      bg: "#0a1520", bgSecondary: "#0e1e2c", bgTertiary: "#122535", bgHover: "#16303f",
      text: "#b0d0e0", textSecondary: "rgba(176,208,224,0.6)", textMuted: "rgba(176,208,224,0.35)",
      border: "#1a3040", borderLight: "#243e50",
      accent: "#00aacc", accentHover: "#22ccee", accentText: "#fff",
      inputBg: "#0c1a26", inputBorder: "#243e50", inputText: "#b0d0e0",
      btnBg: "#122535", btnHover: "#1a3545", btnText: "rgba(176,208,224,0.5)",
      scrollbar: "#1a3040", scrollbarThumb: "#2a5060",
      tabActive: "#0e1e2c", tabInactive: "#081018", tabBorder: "#1a3040",
      cardBg: "#0e1e2c", cardBorder: "#243e50",
    },
  },
  sunset: {
    label: "Sunset",
    colors: {
      bg: "#1a0e0e", bgSecondary: "#221414", bgTertiary: "#2a1818", bgHover: "#341e1e",
      text: "#e8c8b8", textSecondary: "rgba(232,200,184,0.6)", textMuted: "rgba(232,200,184,0.35)",
      border: "#3a2020", borderLight: "#4a2828",
      accent: "#ff6644", accentHover: "#ff8866", accentText: "#fff",
      inputBg: "#1e1010", inputBorder: "#3a2020", inputText: "#e8c8b8",
      btnBg: "#2a1818", btnHover: "#342020", btnText: "rgba(232,200,184,0.5)",
      scrollbar: "#3a2020", scrollbarThumb: "#5a3030",
      tabActive: "#221414", tabInactive: "#140a0a", tabBorder: "#2a1818",
      cardBg: "#221414", cardBorder: "#3a2020",
    },
  },
  cyberpunk: {
    label: "Cyberpunk",
    colors: {
      bg: "#0d0a1a", bgSecondary: "#15102a", bgTertiary: "#1c1536", bgHover: "#241a42",
      text: "#e0c0ff", textSecondary: "rgba(224,192,255,0.6)", textMuted: "rgba(224,192,255,0.35)",
      border: "#2a1e44", borderLight: "#3a2858",
      accent: "#ff00ff", accentHover: "#ff44ff", accentText: "#fff",
      inputBg: "#120e22", inputBorder: "#2a1e44", inputText: "#e0c0ff",
      btnBg: "#1c1536", btnHover: "#2a1e44", btnText: "rgba(224,192,255,0.5)",
      scrollbar: "#2a1e44", scrollbarThumb: "#4a2e6e",
      tabActive: "#15102a", tabInactive: "#0a0816", tabBorder: "#2a1e44",
      cardBg: "#15102a", cardBorder: "#2a1e44",
    },
  },
  matrix: {
    label: "Matrix",
    colors: {
      bg: "#0a0f0a", bgSecondary: "#0e160e", bgTertiary: "#121c12", bgHover: "#162216",
      text: "#88cc88", textSecondary: "rgba(136,204,136,0.6)", textMuted: "rgba(136,204,136,0.35)",
      border: "#1a2a1a", borderLight: "#243424",
      accent: "#00ff41", accentHover: "#33ff66", accentText: "#000",
      inputBg: "#0c120c", inputBorder: "#1a2a1a", inputText: "#88cc88",
      btnBg: "#121c12", btnHover: "#1a2a1a", btnText: "rgba(136,204,136,0.5)",
      scrollbar: "#1a2a1a", scrollbarThumb: "#2a4a2a",
      tabActive: "#0e160e", tabInactive: "#080c08", tabBorder: "#1a2a1a",
      cardBg: "#0e160e", cardBorder: "#1a2a1a",
    },
  },
  tuff: {
    label: "Allegedcarrot's theme",
    wallpaper: "/wallpaper-tuff.png",
    colors: {
      bg: "#0d0d0d", bgSecondary: "#111", bgTertiary: "#161616", bgHover: "#1a1a1a",
      text: "#e0e0e0", textSecondary: "rgba(255,255,255,0.55)", textMuted: "rgba(255,255,255,0.3)",
      border: "#1e1e1e", borderLight: "#222",
      accent: "#e8e8e8", accentHover: "#fff", accentText: "#0d0d0d",
      inputBg: "#0a0a0a", inputBorder: "#1e1e1e", inputText: "#e0e0e0",
      btnBg: "#111", btnHover: "#1a1a1a", btnText: "rgba(255,255,255,0.45)",
      scrollbar: "#1e1e1e", scrollbarThumb: "#333",
      tabActive: "#111", tabInactive: "#080808", tabBorder: "#1a1a1a",
      cardBg: "#111", cardBorder: "#222",
    },
  },
};

interface Settings {
  cloak: CloakId;
  shortcuts: KeyShortcuts;
  proxyEngine: ProxyEngine;
  transportMode: TransportMode;
  theme: ThemeId;
  wallpaper: string;
  panicUrl: string;
  wispServer: string;
  searchEngine: string;
  adblockEnabled: boolean;
  codec: CodecType;
  siteEngineOverrides: Record<string, ProxyEngine>;
  wispRelayUrl: string;
  transportEncryption: boolean;
  fontObfuscation: boolean;
  uiScale: number;
  confirmLeave: boolean;
  magicCursorEnabled: boolean;
  newtabMode: "mue" | "legacy";
  verticalTabs: boolean;
  showMsIndicator: boolean;
  /** External sites pinned to the sidebar. Spotify is the only default. */
  sidebarSites: SidebarSite[];
  /** When true, pinned tabs also appear in the sidebar. */
  pinnedTabsToSidebar: boolean;
  // SSH settings
  sshWasmPath: string;
  sshWasmExecPath: string;
}
interface Shortcut { id: string; name: string; url: string; favicon: string; }

/** A website that can be pinned to the sidebar. `icon` is an optional preset id. */
interface SidebarSite {
  id: string;
  name: string;
  url: string;
  icon?: string;
}

interface Tab {
  id: string; title: string; url: string; favicon: string;
  history: string[]; historyIndex: number; loading: boolean;
  muted: boolean;
  incognito?: boolean;
  /** Pinned tabs can be surfaced in the sidebar (see pinnedTabsToSidebar). */
  pinned?: boolean;
  /** Last proxied page before opening an unstable:// section (games, settings, etc.) */
  lastProxyUrl?: string;
  /**
   * Live URL reported by the proxied page (redirects, SPA navigation). Used for
   * the address bar, title and favicon only — `url` stays the iframe src so a
   * redirect never re-mounts the frame.
   */
  currentUrl?: string;
}

/** Playback state reported by inject.js for a tab's proxied page. */
interface MediaState {
  playing: boolean;
  hasMedia: boolean;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  currentTime: number;
  duration: number;
}

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

interface AppAuthContext {
  isBanned: boolean;
  banReason: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_BOOT_TIMEOUT_MS = 4000;
const UV_PREFIX = "/service/";
const SCRAMJET_PREFIX = "/ham/";
const SHORTCUTS_KEY = "unstable_shortcuts";
const SETTINGS_KEY = "unstable_settings";
const PANIC_URL_KEY = "unstable_panic_url";
const BARE_KEY = "unstable_bare";
const DEVICE_ID_KEY = "unstable_device_id";
const TABS_KEY = "unstable_tabs";

const DEFAULT_KEY_SHORTCUTS: KeyShortcuts = {
  tab1: "Alt+1", tab2: "Alt+2", tab3: "Alt+3", tab4: "Alt+4", tab5: "Alt+5",
  tab6: "Alt+6", tab7: "Alt+7", tab8: "Alt+8", tab9: "Alt+9",
  closeTab: "Alt+W", newTab: "Alt+T", addShortcut: "Alt+D",
};
const DEFAULT_PANIC_URL = "https://google.com";

const SEARCH_ENGINES: Record<string, { name: string; url: string }> = {
  duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
  google: { name: "Google", url: "https://www.google.com/search?q=" },
  brave: { name: "Brave", url: "https://search.brave.com/search?q=" },
  bing: { name: "Bing", url: "https://www.bing.com/search?q=" },
  yahoo: { name: "Yahoo", url: "https://search.yahoo.com/search?p=" },
  qwant: { name: "Qwant", url: "https://www.qwant.com/?q=" },
  startpage: { name: "Startpage", url: "https://www.startpage.com/do/dsearch?query=" },
  ecosia: { name: "Ecosia", url: "https://www.ecosia.org/search?q=" },
};

function searchUrl(query: string, engine: string) {
  const e = SEARCH_ENGINES[engine] ?? SEARCH_ENGINES.duckduckgo;
  return e.url + encodeURIComponent(query);
}

// Premade sidebar sites offered in Settings. Spotify is the only one enabled by
// default; everything else is opt-in.
const SIDEBAR_SITE_PRESETS: SidebarSite[] = [
  { id: "spotify", name: "Spotify", url: "https://open.spotify.com", icon: "spotify" },
  { id: "discord", name: "Discord", url: "https://discord.com/app" },
  { id: "tiktok", name: "TikTok", url: "https://www.tiktok.com" },
  { id: "snapchat", name: "Snapchat", url: "https://web.snapchat.com" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com" },
  { id: "instagram", name: "Instagram", url: "https://www.instagram.com" },
];

const DEFAULT_SIDEBAR_SITES: SidebarSite[] = [SIDEBAR_SITE_PRESETS[0]];

const DEFAULT_SETTINGS: Settings = {
  cloak: "none",
  shortcuts: DEFAULT_KEY_SHORTCUTS,
  proxyEngine: "auto",
  transportMode: "wisp",
  theme: "dark",
  wallpaper: "",
  panicUrl: DEFAULT_PANIC_URL,
  wispServer: "",
  searchEngine: "duckduckgo",
  adblockEnabled: true,
  codec: "xor",
  siteEngineOverrides: {},
  wispRelayUrl: "",
  transportEncryption: false,
  fontObfuscation: false,
  uiScale: 1,
  confirmLeave: false,
  magicCursorEnabled: false,
  newtabMode: "legacy",
  verticalTabs: false,
  showMsIndicator: false,
  sidebarSites: [...DEFAULT_SIDEBAR_SITES],
  pinnedTabsToSidebar: true,
  sshWasmPath: "/assets/lunassh.wasm",
  sshWasmExecPath: "/assets/wasm_exec.js",
};

const CLOAK_PRESETS: Record<CloakId, { label: string; title: string; favicon: string }> = {
  none: { label: "None", title: "Unstable", favicon: "/favicon.svg" },
  "google-drive": { label: "Google Drive", title: "My Drive - Google Drive", favicon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
  schoology: { label: "Schoology", title: "Schoology", favicon: "https://asset-cdn.schoology.com/sites/all/themes/schoology_theme/favicon.ico" },
  classlink: { label: "ClassLink", title: "ClassLink", favicon: "https://www.classlink.com/hubfs/favicon.ico" },
  "google-classroom": { label: "Google Classroom", title: "Classroom", favicon: "https://www.gstatic.com/classroom/favicon.png" },
};

const SHORTCUT_LABELS: Record<string, string> = {
  tab1: "Tab 1", tab2: "Tab 2", tab3: "Tab 3", tab4: "Tab 4", tab5: "Tab 5",
  tab6: "Tab 6", tab7: "Tab 7", tab8: "Tab 8", tab9: "Tab 9",
  closeTab: "Close tab", newTab: "New tab", addShortcut: "Add as shortcut",
};

const ENIGMA_KEY = "Unstabl";

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "google", name: "Google", url: "https://google.com", favicon: faviconUrl("google.com") },
  { id: "discord", name: "Discord", url: "https://discord.com", favicon: faviconUrl("discord.com") },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com", favicon: faviconUrl("youtube.com") },
  { id: "github", name: "GitHub", url: "https://github.com", favicon: faviconUrl("github.com") },
  { id: "spotify", name: "Spotify", url: "https://open.spotify.com", favicon: faviconUrl("open.spotify.com") },
  { id: "twitch", name: "Twitch", url: "https://twitch.tv", favicon: faviconUrl("twitch.tv") },
  { id: "vscode", name: "VS Code", url: "https://vscode.dev", favicon: faviconUrl("vscode.dev") },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function faviconUrl(domain: string) { return _faviconUrl(domain); }
function extractDomain(url: string) { return _extractDomain(url); }

function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function usernameToAuthEmail(username: string) {
  return `${normalizeUsername(username)}@unstableuser.com`;
}

async function readJson<T>(res: Response): Promise<T | null> {
  return res.json().catch(() => null) as Promise<T | null>;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs);
    promise.then(
      value => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      error => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function fetchDeviceBanStatus(): Promise<{ banned: boolean; reason: string | null }> {
  try {
    const res = await fetch("/api/auth/device-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId() }),
    });

    const data = await readJson<{ banned?: boolean; reason?: string | null; error?: string; skipped?: boolean }>(res);
    if (!res.ok || data?.skipped) {
      if (!res.ok) console.warn("Device ban check unavailable; continuing sign-in.", data);
      return { banned: false, reason: null };
    }

    return {
      banned: Boolean(data?.banned),
      reason: data?.reason ?? null,
    };
  } catch (err) {
    console.warn("Device ban check failed; continuing sign-in.", err);
    return { banned: false, reason: null };
  }
}

async function resolveAuthEmail(username: string): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/resolve-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await readJson<{ email?: string }>(res);
    const email = data?.email?.trim();
    return res.ok && email ? email : null;
  } catch {
    return null;
  }
}

async function fetchAuthContext(accessToken: string): Promise<AppAuthContext> {
  try {
    const res = await fetch("/api/auth/context", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await readJson<{ isBanned?: boolean; banReason?: string | null; error?: string; skipped?: boolean }>(res);
    if (!res.ok || data?.skipped) {
      if (res.status === 401) {
        throw new Error(data?.error || "Authentication required.");
      }
      console.warn("Auth context fetch unavailable; allowing access.", data);
      return { isBanned: false, banReason: null };
    }

    return {
      isBanned: Boolean(data?.isBanned),
      banReason: data?.banReason ?? null,
    };
  } catch (err) {
    console.warn("Auth context fetch failed; allowing access.", err);
    return { isBanned: false, banReason: null };
  }
}

async function registerCurrentDevice(accessToken: string) {
  const res = await fetch("/api/auth/register-device", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ deviceId: getDeviceId() }),
  });

  const data = await readJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error || "Unable to register this device.");
  }
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, bio, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

async function createProfile(userId: string, username: string): Promise<Profile> {
  const trimmed = username.trim();
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, username: trimmed })
    .select("id, username, bio, avatar_url, created_at")
    .single();

  if (error) throw error;
  return data as Profile;
}

function stripTrackingParams(url: string): string { return _stripTrackingParams(url); }

function getEffectiveEngine(url: string, settings: Settings): ProxyEngine {
  return _getEffectiveEngine(url, settings);
}

function encodeProxyUrl(url: string, engine: ProxyEngine = "auto", settings?: Settings): string {
  return _encodeProxyUrl(url, engine, settings, scrController);
}

function normalizeUrl(input: string, searchEngine?: string): string {
  return _normalizeUrl(input, searchEngine);
}

function decodeProxyUrl(url: string): string {
  return _decodeProxyUrl(url, scrController);
}

function hostnameFromTabUrl(tabUrl: string): string | null {
  return _hostnameFromTabUrl(tabUrl, scrController);
}

function getDomainFromProxyUrl(url: string): string {
  return _getDomainFromProxyUrl(url, scrController);
}

function barePathForNum(n: number): string {
  return _barePathForNum(n);
}

function buildCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");
  if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
    parts.push(e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key);
  }
  return parts.join("+");
}

function migrateCtrlShortcuts(shortcuts: KeyShortcuts): KeyShortcuts {
  const copy = { ...shortcuts } as Record<string, string>;
  for (const key of Object.keys(copy)) {
    const combo = copy[key];
    if (typeof combo === "string" && /^Ctrl\+/.test(combo)) {
      copy[key] = combo.replace(/^Ctrl\+/, "Alt+");
    }
  }
  return copy as unknown as KeyShortcuts;
}

// ─── Settings persistence ──────────────────────────────────────────────────────

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      cloak: parsed.cloak ?? "none",
      shortcuts: migrateCtrlShortcuts({ ...DEFAULT_KEY_SHORTCUTS, ...(parsed.shortcuts ?? {}) }),
      proxyEngine: (parsed.proxyEngine ?? "auto") as ProxyEngine,
      transportMode: (parsed.transportMode ?? "wisp") as TransportMode,
      theme: (parsed.theme ?? "dark") as ThemeId,
      wallpaper: (parsed.wallpaper ?? "") as string,
      panicUrl: typeof parsed.panicUrl === "string" && parsed.panicUrl.trim() ? parsed.panicUrl : DEFAULT_PANIC_URL,
      wispServer: typeof parsed.wispServer === "string" ? parsed.wispServer : "",
      searchEngine: parsed.searchEngine ?? "duckduckgo",
      adblockEnabled: parsed.adblockEnabled ?? true,
      codec: (parsed.codec ?? "xor") as CodecType,
      siteEngineOverrides: parsed.siteEngineOverrides ?? {},
      wispRelayUrl: typeof parsed.wispRelayUrl === "string" ? parsed.wispRelayUrl : "",
      transportEncryption: parsed.transportEncryption ?? false,
      fontObfuscation: parsed.fontObfuscation ?? true,
      uiScale: typeof parsed.uiScale === "number" ? parsed.uiScale : 1,
      confirmLeave: parsed.confirmLeave ?? false,
      magicCursorEnabled: parsed.magicCursorEnabled ?? false,
      newtabMode: parsed.newtabMode ?? "legacy",
      verticalTabs: parsed.verticalTabs ?? false,
      showMsIndicator: parsed.showMsIndicator ?? false,
      sidebarSites: Array.isArray(parsed.sidebarSites)
        ? parsed.sidebarSites
            .filter((s: unknown): s is SidebarSite => {
              if (!s || typeof s !== "object") return false;
              const site = s as Record<string, unknown>;
              return typeof site.id === "string" && typeof site.name === "string" && typeof site.url === "string";
            })
            .map((s: SidebarSite) => ({ id: s.id, name: s.name, url: s.url, icon: typeof s.icon === "string" ? s.icon : undefined }))
        : [...DEFAULT_SIDEBAR_SITES],
      pinnedTabsToSidebar: parsed.pinnedTabsToSidebar ?? true,
      sshWasmPath: typeof parsed.sshWasmPath === "string" ? parsed.sshWasmPath : "/assets/lunassh.wasm",
      sshWasmExecPath: typeof parsed.sshWasmExecPath === "string" ? parsed.sshWasmExecPath : "/assets/wasm_exec.js",
    };
  } catch { return DEFAULT_SETTINGS; }
}
function saveSettings(s: Settings) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

function normalizePanicUrl(input: string): string {
  const v = (input || "").trim();
  if (!v) return DEFAULT_PANIC_URL;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) {
    try {
      const parsed = new URL(v);
      if (parsed.protocol === "javascript:" || parsed.protocol === "data:" || parsed.protocol === "vbscript:") {
        return DEFAULT_PANIC_URL;
      }
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(parsed.hostname)) {
        return DEFAULT_PANIC_URL;
      }
      return v;
    } catch {
      return DEFAULT_PANIC_URL;
    }
  }
  return "https://" + v;
}

function loadCustomShortcuts(): Shortcut[] {
  try { const r = localStorage.getItem(SHORTCUTS_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveCustomShortcuts(s: Shortcut[]) { localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(s)); }

function loadTabs(): { tabs: Tab[]; activeId: string } {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    if (!raw) { const t = makeTab(); return { tabs: [t], activeId: t.id }; }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { tabs: parsed.map(t => ({ ...t, loading: false })), activeId: parsed[0]?.id ?? "" };
    }
    if (parsed && Array.isArray(parsed.tabs)) {
      const tabs = parsed.tabs.map((t: Tab) => ({ ...t, loading: false }));
      const activeId = tabs.some((t: Tab) => t.id === parsed.activeId) ? parsed.activeId : tabs[0]?.id ?? "";
      return { tabs, activeId };
    }
    const t = makeTab(); return { tabs: [t], activeId: t.id };
  } catch { const t = makeTab(); return { tabs: [t], activeId: t.id }; }
}
function saveTabs(t: Tab[], activeId?: string) {
  localStorage.setItem(TABS_KEY, JSON.stringify({ tabs: t, activeId }));
}

// ─── Session restore ─────────────────────────────────────────────────────────
// Restored proxy pages are kept aside as a pending payload instead of being
// parked in the tab list: the tabs themselves open as plain new tabs (exactly
// like a fresh launch), and the bottom-right prompt either puts the pages back
// or drops them. The payload has its own storage key so answering can wait.

const PENDING_RESTORE_KEY = "unstable_restore_pending";

interface PendingRestore {
  id: string;
  url: string;
  title: string;
  favicon: string;
  history: string[];
  historyIndex: number;
}

function isProxyUrl(url: string): boolean {
  return url.startsWith(SCRAMJET_PREFIX) || url.startsWith(UV_PREFIX);
}

function loadPendingRestore(initial: { tabs: Tab[] }): PendingRestore[] {
  const liveIds = new Set(initial.tabs.map(t => t.id));
  try {
    const raw = localStorage.getItem(PENDING_RESTORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((p): p is PendingRestore => !!p
          && typeof p.id === "string" && liveIds.has(p.id)
          && typeof p.url === "string" && isProxyUrl(p.url));
      }
    }
  } catch { /* ignore */ }
  return initial.tabs
    .filter(t => !!t.url && isProxyUrl(t.url))
    .map(t => ({
      id: t.id,
      url: t.url,
      title: t.title,
      favicon: t.favicon,
      history: t.history ?? [],
      historyIndex: t.historyIndex ?? -1,
    }));
}

// ─── Cloak ────────────────────────────────────────────────────────────────────

function applyCloak(id: CloakId) {
  const preset = CLOAK_PRESETS[id];
  document.title = preset.title;
  document.querySelectorAll('link[rel*="icon"]').forEach(l => l.remove());
  const link = document.createElement("link");
  link.rel = "icon"; link.href = preset.favicon;
  document.head.appendChild(link);
}

function openCloakPopup(decoyUrl: string = "https://www.google.com") {
  let win: Window | null = null;
  try {
    win = window.open("about:blank", "_blank", "width=1024,height=768,menubar=no,toolbar=no,location=no,status=no");
  } catch { win = null; }
  const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const decoyTitle = "Google";
  if (win) {
    try {
      win.document.open();
      win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safe(decoyTitle)}</title><link rel="icon" href="https://www.google.com/favicon.ico"></head><body style="margin:0;background:#fff;font-family:arial,sans-serif;color:#202124;"></body></html>`);
      win.document.close();
      try { win.history.replaceState(null, "", decoyUrl); } catch {}
      try {
        Object.defineProperty(win, "onbeforeunload", {
          configurable: false,
          set() {},
          get() { return null; },
        });
      } catch {}
      try {
        Object.defineProperty(win.document, "onbeforeunload", {
          configurable: false,
          set() {},
          get() { return null; },
        });
      } catch {}
      win.addEventListener("beforeunload", (ev) => { ev.preventDefault(); ev.stopPropagation(); ev.returnValue = ""; return ""; });
    } catch {}
  }
  try {
    history.pushState(null, "", decoyUrl);
    history.replaceState(null, "", decoyUrl);
  } catch {}
  try { window.focus(); } catch {}
  return win;
}

// ─── Tab factory ─────────────────────────────────────────────────────────────

function makeTab(url = "", incognito = false): Tab {
  let title = "New Tab", favicon = "";
  if (url && !url.startsWith("unstable://")) {
    try { const d = new URL(url.startsWith("http") ? url : "https://" + url).hostname; title = d; favicon = faviconUrl(d); } catch { }
  } else if (url.startsWith("unstable://")) {
    title = url.slice("unstable://".length);
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  return { id: Math.random().toString(36).slice(2), title, url, favicon, history: url ? [url] : [], historyIndex: url ? 0 : -1, loading: false, muted: false, incognito, currentUrl: url };
}

// ─── Proxy state ──────────────────────────────────────────────────────────────

type EngineStatus = "pending" | "ready" | "error";

interface ProxyState {
  phase: "idle" | "loading" | "ready" | "error";
  message: string;
  uv: EngineStatus;
  scramjet: EngineStatus;
  transport: "none" | "libcurl" | "bare" | "epoxy" | "drift" | "cdn";  // libcurl = wisp (primary), bare = fallback, epoxy = alternative, drift = rust wasm wisp (Nova-based), cdn = rendered by cdn-gateway.svg (no backend possible)
  bare: number;
  switching: boolean;
}

const defaultProxyState: ProxyState = {
  phase: "idle", message: "", uv: "pending", scramjet: "pending",
  transport: "none", bare: 1, switching: false,
};

let swRegistered = false;
let bareConn: any = null;
let scrController: ScramjetCtrl | null = null;

/**
 * Scramjet owns the `$scramjet` database and creates its object stores from an
 * upgrade handler at version 1. Anything else that opens the same name/version
 * first (the PSL cache below, or a reload racing the controller) creates an
 * empty version-1 database instead, so Scramjet's upgrade never runs and every
 * proxied request fails with "object store not found". Create the full schema
 * here, and drop a storeless database so it can be rebuilt.
 */
const SCRAMJET_STORES = ["config", "cookies", "redirectTrackers", "referrerPolicies", "publicSuffixList"] as const;

function openScramjetDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("$scramjet", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of SCRAMJET_STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function ensureScramjetDB(): Promise<void> {
  const db = await openScramjetDB();
  const complete = SCRAMJET_STORES.every((store) => db.objectStoreNames.contains(store));
  db.close();
  if (complete) return;
  // A partial or storeless version-1 database cannot be upgraded by Scramjet
  // itself, because its open() uses the same version. Drop it so the schema can
  // be rebuilt; if another tab still holds a connection the delete stays queued
  // and the next load finishes the job.
  const deleted = await new Promise<boolean>((resolve) => {
    const del = indexedDB.deleteDatabase("$scramjet");
    del.onsuccess = () => resolve(true);
    del.onerror = () => resolve(false);
    del.onblocked = () => resolve(false);
  });
  if (!deleted) return;
  (await openScramjetDB()).close();
}

type SL = (s: ProxyState) => void;
const statusListeners = new Set<SL>();
let currentStatus: ProxyState = { ...defaultProxyState };

function emitStatus(patch: Partial<ProxyState>) {
  currentStatus = { ...currentStatus, ...patch };
  statusListeners.forEach(l => l(currentStatus));
}

async function setupProxy(bareNum = 1, transportMode: TransportMode = "auto", wispServer = "", codecType: CodecType = "xor", wispRelayUrl = "", useEncryption = false, settings?: Settings): Promise<void> {
  const mode = transportMode;
  const originalMode = transportMode as TransportMode;
  if (!("serviceWorker" in navigator)) {
    emitStatus({ phase: "error", message: "Service workers not supported" });
    return;
  }
  emitStatus({ phase: "loading" });

  // Resolve deployment mode before choosing transports: frontend-only builds
  // must use the public Wisp relay list instead of the bundled `/api/wisp/`.
  const deployment = await detectDeployment();
  const isFrontendOnly = deployment === "frontend";

  try {
    if (!swRegistered) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) { if (r.active?.scriptURL?.includes("uv.sw.js")) await r.unregister(); }
      const swReg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      // A freshly installed worker otherwise waits for every tab to close, so a
      // proxy fix stays inactive across reloads. Ask it to take over instead.
      const activateWaitingWorker = () => {
        if (swReg.waiting) swReg.waiting.postMessage({ type: "SKIP_WAITING" });
      };
      activateWaitingWorker();
      swReg.addEventListener("updatefound", () => {
        const installing = swReg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed") activateWaitingWorker();
        });
      });
      void swReg.update().catch(() => { /* offline or blocked — keep the current worker */ });
      await navigator.serviceWorker.ready;
      swRegistered = true;
    }
    emitStatus({ uv: "ready" });
  } catch (err) {
    emitStatus({ uv: "error" });
  }

  try {
    if (!document.querySelector('script[src="/eggs/scramjet.all.js"]')) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = "/eggs/scramjet.all.js";
        s.onload = () => res(); s.onerror = () => rej(new Error("scramjet.all.js load failed"));
        document.head.appendChild(s);
      });
    }
    const { ScramjetController } = window.$scramjetLoadController();
    if (!scrController) {
      await ensureScramjetDB();
      scrController = new ScramjetController({
        prefix: SCRAMJET_PREFIX,
        files: {
          wasm: "/eggs/scramjet.wasm.wasm",
          all: "/eggs/scramjet.all.js",
          sync: "/eggs/scramjet.sync.js",
        },
        flags: { rewriterLogs: false, cleanErrors: false },
        codec: makeCodec(codecType),
        transport: transportMode,
        encoding: codecType,
      });
      await scrController.init();
    }

    try {
      const PSL_KEY = "publicSuffixList";
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("$scramjet", 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const existing = await new Promise<{ expiry: number } | undefined>((resolve) => {
        const tx = db.transaction(PSL_KEY, "readonly");
        const req = tx.objectStore(PSL_KEY).get(PSL_KEY);
        req.onsuccess = () => resolve(req.result as { expiry: number } | undefined);
        req.onerror = () => resolve(undefined);
      });
      if (!existing || Date.now() >= existing.expiry) {
        const resp = await fetch("/psl.dat");
        const text = await resp.text();
        const data = text.split("\n").map((line: string) => {
          const t = line.trim();
          const sp = t.indexOf(" ");
          return sp > -1 ? t.substring(0, sp) : t;
        }).filter((l: string) => l && !l.startsWith("//"));
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(PSL_KEY, "readwrite");
          const req = tx.objectStore(PSL_KEY).put({ data, expiry: Date.now() + 7 * 24 * 36e5 }, PSL_KEY);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
      db.close();
    } catch (pslErr) {
      console.warn("PSL pre-population failed:", pslErr);
    }

    try {
      const reg = await navigator.serviceWorker.register("/s_sw.js", {
        scope: SCRAMJET_PREFIX,
        updateViaCache: "none",
      });
      const activateWorker = (worker: ServiceWorker | null) => {
        if (!worker) return;
        if (worker.state === "installed" || worker.state === "activated") {
          worker.postMessage({ type: "SKIP_WAITING" });
        }
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" });
        });
      };
      activateWorker(reg.waiting);
      activateWorker(reg.installing);
      reg.addEventListener("updatefound", () => activateWorker(reg.installing));

      // Do not report Scramjet as ready until the worker actually controls
      // /ham/. A tab opened during registration would otherwise load /ham/…
      // from the network (404/SPA HTML) instead of through Scramjet.
      if (!reg.active) {
        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => { if (!settled) { settled = true; resolve(); } };
          const watch = () => {
            const worker = reg.installing || reg.waiting;
            if (!worker) return;
            if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" });
            if (worker.state === "activated" || worker.state === "redundant") finish();
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" });
              if (worker.state === "activated" || worker.state === "redundant") finish();
            });
          };
          reg.addEventListener("updatefound", watch);
          watch();
          // Never hold proxy setup hostage to a worker that cannot activate.
          setTimeout(finish, 6000);
        });
      }
      void reg.update().catch(() => { /* offline or blocked — keep the current worker */ });
    } catch { /* scope might already be claimed */ }
    emitStatus({ scramjet: "ready" });
  } catch (err) {
    emitStatus({ scramjet: "error" });
  }

  // cdn-gateway.svg renders this build behind a file CDN: there is no backend
  // or Wisp endpoint on that origin, so every transport attempt here would
  // fail ("Failed to fetch dynamically imported module: …/api/baremod/…")
  // and push the app into its error screen. Skip transport setup entirely —
  // the gateway shows a "Forbidden" screen when the proxy is actually used.
  if ((window as unknown as { __cdnGatewayPath?: string }).__cdnGatewayPath) {
    emitStatus({ phase: "ready", transport: "cdn", bare: bareNum });
    return;
  }

  // Initialize Wisp transport (replaces drift with Nova-based transport)
  try {
    const { BareMuxConnection } = await import("bare-mux-fork");
    if (!bareConn) bareConn = new BareMuxConnection("/baremux/worker.js");

    const origin = location.origin;
    const wispUrls = resolveWispUrls(wispServer, deployment);
    const relayUrl = wispRelayUrl || `${location.protocol === "http:" ? "ws:" : "wss:"}//${location.hostname}/api/wisp/`;

    let transportSet = false;

    const applyEncryption = () => {
      if (useEncryption && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "ENIGMA", data: { enabled: true, key: ENIGMA_KEY } });
      }
    };

    const trySetTransport = async (url: string, args: any[], label: string) => {
      await bareConn.setTransport(url, args);
      applyEncryption();
      transportSet = true;
      emitStatus({ phase: "ready", transport: label as any, bare: bareNum });
    };

    const tryWispTransport = async () => {
      // Wisp transport via bare-mux using @nightnetwork/nova. Try every
      // configured relay in order before giving up.
      let lastErr: unknown = null;
      for (const url of wispUrls) {
        try {
          const transport = await createWispTransport({ wisp: url });
          await bareConn.setTransport("/drift/index.mjs", [transport]);
          applyEncryption();
          transportSet = true;
          emitStatus({ phase: "ready", transport: "drift", bare: bareNum });
          return;
        } catch (err) {
          lastErr = err;
          console.warn("Wisp bare-mux transport failed:", url, err);
        }
      }
      throw lastErr ?? new Error("All Wisp transports failed");
    };

    // libcurl/epoxy accept a wisp URL per call, so loop the relay list.
    const tryWithWispList = async (loader: string, label: string) => {
      let lastErr: unknown = null;
      for (const url of wispUrls) {
        try {
          await bareConn.setTransport(loader, [{ wisp: url }]);
          applyEncryption();
          transportSet = true;
          emitStatus({ phase: "ready", transport: label as any, bare: bareNum });
          return;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr ?? new Error("All Wisp endpoints failed");
    };

    const tryDrift = async () => tryWithWispList("/drift/index.mjs", "drift");
    const tryWisp = async () => tryWithWispList("/libcurl/index.mjs", "libcurl");
    const tryRelay = async () => trySetTransport("/libcurl/index.mjs", [{ wisp: relayUrl }], "libcurl");
    const tryEpoxy = async () => tryWithWispList("/epoxy/index.mjs", "epoxy");
    const tryBare = async () => trySetTransport(origin + "/api/baremod/index.mjs", [origin + barePathForNum(bareNum)], "bare");

    const runMode = mode as TransportMode;
    if (runMode === "bare") {
      // Frontend-only builds have no bundled bare server, so fall back to Wisp.
      if (isFrontendOnly) { try { await tryWispTransport(); } catch { /* fall through */ } }
      else try { await tryBare(); } catch { /* fall through */ }
    } else if (runMode === "epoxy") {
      try { await tryEpoxy(); } catch { if (!isFrontendOnly) await tryBare(); }
    } else if (runMode === "wisp") {
      try { await tryWisp(); } catch { if (!isFrontendOnly) await tryBare(); }
    } else if (runMode === "drift") {
      // Use new Wisp transport (Nova-based) for drift mode
      try { await tryWispTransport(); } catch { if (!isFrontendOnly) await tryBare(); }
    } else {
      // auto: wisp transport (drift) → wisp → relay → epoxy → bare
      try { await tryWispTransport(); } catch {
        if (!transportSet) try { await tryWisp(); } catch {}
        if (!transportSet && !isFrontendOnly) try { await tryRelay(); } catch {}
        if (!transportSet) try { await tryEpoxy(); } catch {}
        if (!transportSet && !isFrontendOnly) try { await tryBare(); } catch {}
      }
    }

    if (!transportSet) {
      emitStatus({ phase: "error", message: "No transport available" });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    emitStatus({ phase: "error", message: msg });
  }
}

async function switchBare(n: number, transportMode: TransportMode = "auto", wispServer = "", wispRelayUrl = "", useEncryption = false, settings?: Settings): Promise<void> {
  emitStatus({ switching: true, bare: n });
  try {
    const { BareMuxConnection } = await import("bare-mux-fork");
    if (!bareConn) bareConn = new BareMuxConnection("/baremux/worker.js");
    const deployment = await detectDeployment();
    const isFrontendOnly = deployment === "frontend";
    const wispUrls = resolveWispUrls(wispServer, deployment);
    const relayUrl = wispRelayUrl || `${location.protocol === "http:" ? "ws:" : "wss:"}//${location.hostname}/api/wisp/`;
    const mode = transportMode || "auto";

    const applyEncryption = () => {
      if (useEncryption && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: "ENIGMA", data: { enabled: true, key: ENIGMA_KEY } });
    };

    const tryWispTransport = async () => {
      // Wisp transport via bare-mux using @nightnetwork/nova
      let lastErr: unknown = null;
      for (const url of wispUrls) {
        try {
          const transport = await createWispTransport({ wisp: url });
          await bareConn.setTransport("/drift/index.mjs", [transport]);
          applyEncryption();
          emitStatus({ switching: false, transport: "drift", bare: n });
          return;
        } catch (err) {
          lastErr = err;
          console.warn("Wisp bare-mux transport failed:", url, err);
        }
      }
      throw lastErr ?? new Error("All Wisp transports failed");
    };

    const tryWithWispList = async (loader: string, label: "drift" | "libcurl" | "epoxy") => {
      let lastErr: unknown = null;
      for (const url of wispUrls) {
        try {
          await bareConn.setTransport(loader, [{ wisp: url }]);
          applyEncryption();
          emitStatus({ switching: false, transport: label, bare: n });
          return;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr ?? new Error("All Wisp endpoints failed");
    };

    const tryBare = async () => {
      await bareConn.setTransport(location.origin + "/api/baremod/index.mjs", [location.origin + barePathForNum(n)]);
      applyEncryption();
      emitStatus({ switching: false, transport: "bare", bare: n });
    };
    const tryDrift = async () => tryWithWispList("/drift/index.mjs", "drift");
    const tryWisp = async () => tryWithWispList("/libcurl/index.mjs", "libcurl");
    const tryRelay = async () => {
      await bareConn.setTransport("/libcurl/index.mjs", [{ wisp: relayUrl }]);
      emitStatus({ switching: false, transport: "libcurl", bare: n });
    };
    const tryEpoxy = async () => tryWithWispList("/epoxy/index.mjs", "epoxy");
    const runMode = mode as TransportMode;
    if (runMode === "bare") {
      if (!isFrontendOnly) await tryBare();
      else await tryWispTransport();
    } else if (runMode === "epoxy") {
      try { await tryEpoxy(); } catch { if (!isFrontendOnly) await tryBare(); }
    } else if (runMode === "wisp") {
      try { await tryWisp(); } catch { if (!isFrontendOnly) await tryBare(); }
    } else if (runMode === "drift") {
      // Use new Wisp transport (Nova-based) for drift mode
      try { await tryWispTransport(); } catch { if (!isFrontendOnly) await tryBare(); }
    } else {
      // auto: wisp transport (drift) → wisp → relay → epoxy → bare
      try { await tryWispTransport(); } catch {
        try { await tryWisp(); } catch {}
        if (!isFrontendOnly) try { await tryRelay(); } catch {}
        try { await tryEpoxy(); } catch {}
        if (!isFrontendOnly) await tryBare();
      }
    }
    localStorage.setItem(BARE_KEY, String(n));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emitStatus({ switching: false, phase: "error", message });
  }
}

function useProxyStatus(): ProxyState {
  const [s, setS] = useState<ProxyState>(currentStatus);
  useEffect(() => { statusListeners.add(setS); return () => { statusListeners.delete(setS); }; }, []);
  return s;
}

/**
 * Resolves whether this build is running against the full stack (backend
 * available) or the static frontend only. Returns "detecting" until the probe
 * finishes.
 */
function useDeploymentMode(): "detecting" | DeploymentMode {
  const [mode, setMode] = useState<"detecting" | DeploymentMode>(() => getDeploymentMode() ?? "detecting");
  useEffect(() => {
    if (mode !== "detecting") return;
    let cancelled = false;
    const unsubscribe = subscribeDeployment((next) => { if (!cancelled) setMode(next); });
    void detectDeployment().then((next) => { if (!cancelled) setMode(next); });
    return () => { cancelled = true; unsubscribe(); };
  }, [mode]);
  return mode;
}

// ─── Magic Cursor ─────────────────────────────────────────────────────────────

// ─── Floating music controller ────────────────────────────────────────────────
// Pops up when inject.js reports audio playing in any tab. Can be dismissed
// (dismissal persists in localStorage) and reopened via the small pill button.

const MEDIA_DISMISS_KEY = "unstable_media_controller_dismissed";

function formatMediaTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MediaController({
  state,
  tabId,
  onCommand,
  onDismiss,
}: {
  state: MediaState;
  tabId: string;
  onCommand: (action: "toggle" | "next" | "prev") => void;
  onDismiss: () => void;
}) {
  const progress = state.duration > 0 ? Math.min(1, state.currentTime / state.duration) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      data-tab={tabId}
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1000001,
        width: 300,
        padding: "0.7rem 0.8rem 0.6rem",
        background: "radial-gradient(circle 140px at 30% 0%, rgba(255,255,255,0.09), rgba(255,255,255,0.02) 75%), linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: "8px",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#e8e8e8",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 32px rgba(0,0,0,0.5)",
        backdropFilter: "blur(16px) saturate(1.1)",
        WebkitBackdropFilter: "blur(16px) saturate(1.1)",
      }}
    >
      <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
        {/* Artwork */}
        <div style={{ width: 42, height: 42, borderRadius: "0", flexShrink: 0, overflow: "hidden", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {state.artwork ? (
            <img src={state.artwork} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <Music size={16} style={{ color: "rgba(255,255,255,0.35)" }} />
          )}
        </div>
        {/* Track info */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {state.title || "Unknown title"}
          </div>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "1px" }}>
            {state.artist || (state.album || "Unknown artist")}
          </div>
        </div>
        {/* Dismiss */}
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onDismiss} aria-label="Close player"
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: "0.2rem", display: "flex", flexShrink: 0 }}>
          <X size={14} />
        </motion.button>
      </div>

      {/* Progress */}
      <div style={{ height: "3px", borderRadius: "10px", background: "rgba(255,255,255,0.10)", margin: "0.55rem 0 0.45rem", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: "rgba(255,255,255,0.55)", borderRadius: "10px", transition: "width 0.9s linear" }} />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0.15rem" }}>
        <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" }}>
          {formatMediaTime(state.currentTime)} / {formatMediaTime(state.duration)}
        </span>
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => onCommand("prev")} aria-label="Previous track"
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", padding: "0.25rem", display: "flex" }}>
            <SkipBack size={15} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => onCommand("toggle")} aria-label={state.playing ? "Pause" : "Play"}
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "#e8e8e8", cursor: "pointer", padding: "0.35rem", borderRadius: "50%", display: "flex", width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
            {state.playing ? <Pause size={13} /> : <Play size={13} />}
          </motion.button>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => onCommand("next")} aria-label="Next track"
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", padding: "0.25rem", display: "flex" }}>
            <SkipForward size={15} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function MagicCursor({ suppressed }: { suppressed?: boolean }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 40, stiffness: 1200 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);
  const cursorTipX = useTransform(cursorX, v => v - 5.5);
  const cursorTipY = useTransform(cursorY, v => v - 20.5);

  const spinControls = useAnimation();
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    function updateCursorStyle() {
      let el = document.getElementById("unstable-cursor-global");
      if (!el) {
        el = document.createElement("style");
        el.id = "unstable-cursor-global";
        document.head.appendChild(el);
      }
      el.textContent = suppressed
        ? "* { cursor: auto !important; }"
        : "* { cursor: none !important; }";
    }
    updateCursorStyle();
    return () => {
      const el = document.getElementById("unstable-cursor-global");
      if (el) el.remove();
    };
  }, [suppressed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    const handleIframeMouseMove = (e: Event) => {
      const { clientX, clientY, iframeRect } = (e as CustomEvent).detail;
      mouseX.set(clientX + iframeRect.left);
      mouseY.set(clientY + iframeRect.top);
    };

    const handleHoverEvent = (e: Event) => setIsHovering((e as CustomEvent).detail.hovering);
    const handleParentOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "BUTTON" || target.tagName === "A" || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || window.getComputedStyle(target).cursor === "pointer")) {
        setIsHovering(true);
      }
    };
    const handleParentOut = () => setIsHovering(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("iframe-mousemove", handleIframeMouseMove);
    window.addEventListener("iframe-hover", handleHoverEvent);
    window.addEventListener("mouseover", handleParentOver);
    window.addEventListener("mouseout", handleParentOut);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("iframe-mousemove", handleIframeMouseMove);
      window.removeEventListener("iframe-hover", handleHoverEvent);
      window.removeEventListener("mouseover", handleParentOver);
      window.removeEventListener("mouseout", handleParentOut);
    };
  }, [mouseX, mouseY]);

  useEffect(() => {
    if (isHovering) {
      spinControls.start({
        rotate: [0, 360],
        transition: { duration: 0.5, ease: "easeInOut" }
      });
    } else {
      spinControls.set({ rotate: 0 });
    }
  }, [isHovering, spinControls]);

  if (suppressed) return null;

  return (
    <>
      <motion.div
        animate={spinControls}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          x: cursorTipX,
          y: cursorTipY,
          pointerEvents: "none",
          zIndex: 999999,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
            display: "block",
          }}
        >
          <path
            d="M5.5 3.5L5.5 20.5L10.5 15.5H18.5L5.5 3.5Z"
            fill="white"
            stroke="white"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </>
  );
}

// ─── StatusBar ────────────────────────────────────────────────────────────────

function ConnectionStatusSummary({ transportMode, wispServer, wispRelayUrl, transportEncryption, settings }: { transportMode: TransportMode; wispServer: string; wispRelayUrl: string; transportEncryption: boolean; settings: Settings }) {
  const s = useProxyStatus();
  const green = "rgba(80,200,120,0.9)", red = "rgba(220,80,80,0.9)", amber = "rgba(200,170,80,0.85)", gray = "rgba(255,255,255,0.3)";
  const phaseLabel = s.phase === "idle" ? "Initializing…"
    : s.phase === "loading" ? "Starting proxy…"
      : s.switching ? `Switching ws${s.bare}…`
        : s.phase === "ready" ? (s.transport === "cdn" ? "CDN (no proxy)" : s.transport === "libcurl" ? "Libcurl + Wisp" : s.transport === "drift" ? "Drift (Rust WASM)" : `Bare ws${s.bare}`)
          : s.phase === "error" ? `Error: ${s.message?.slice(0, 60)}`
            : "…";
  const phaseColor = s.phase === "ready" ? green : s.phase === "error" ? red : amber;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.68rem", color: "var(--t-text-muted)" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <EngineBadge label="UV" status={s.uv} />
        <span style={{ color: gray }}>|</span>
        <EngineBadge label="SCR" status={s.scramjet} />
      </div>
      <span style={{ color: phaseColor }}>{phaseLabel}</span>
      {s.transport === "bare" && (
        <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: gray, fontSize: "0.6rem" }}>Bare servers:</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => switchBare(n, transportMode, wispServer, wispRelayUrl, transportEncryption, settings)} title={`Switch to bare server ${n}`} style={{
              background: s.bare === n ? "rgba(80,200,120,0.15)" : "none",
              border: `1px solid ${s.bare === n ? green : "#333"}`,
              color: s.bare === n ? green : gray,
              padding: "0.2rem 0.5rem", fontSize: "0.6rem", cursor: "pointer", borderRadius: "10px",
              fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.04em",
            }}>ws{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function EngineBadge({ label, status }: { label: string; status: EngineStatus }) {
  const color = status === "ready" ? "rgba(80,200,120,0.9)" : status === "error" ? "rgba(220,80,80,0.9)" : "rgba(255,255,255,0.2)";
  const dot = status === "ready" ? "●" : status === "error" ? "●" : "○";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.55rem", letterSpacing: "0.05em", color, textShadow: "0 1px 4px rgba(0,0,0,0.9)", fontFamily: "'Space Grotesk', sans-serif" }}>
      <span style={{ fontSize: "0.45rem" }}>{dot}</span>{label}
    </span>
  );
}

function StatusBar({ visible, leftOffset = 12, transportMode = "auto", wispServer = "", wispRelayUrl = "", transportEncryption = false, settings }: { visible: boolean; leftOffset?: number; transportMode?: TransportMode; wispServer?: string; wispRelayUrl?: string; transportEncryption?: boolean; settings: Settings }) {
  const s = useProxyStatus();

  const green = "rgba(80,200,120,0.9)", gray = "rgba(255,255,255,0.15)", red = "rgba(220,80,80,0.9)", amber = "rgba(200,170,80,0.85)";
  const isReady = s.phase === "ready";
  const isError = s.phase === "error";

  const phaseLabel = s.phase === "idle" ? "initializing…"
    : s.phase === "loading" ? "starting proxy…"
      : s.switching ? `switching ws${s.bare}…`
        : isReady ? (s.transport === "cdn" ? "cdn (no proxy)" : s.transport === "libcurl" ? "libcurl+wisp" : s.transport === "drift" ? "drift" : `bare ws${s.bare}`)
          : isError ? `err: ${s.message.slice(0, 40)}`
            : "…";
  const phaseColor = isReady ? green : isError ? red : amber;

  return (
    <AnimatePresence>
      {visible && (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{ position: "fixed", bottom: 10, left: leftOffset, zIndex: 9999, display: "flex", alignItems: "center", gap: "0.55rem", fontFamily: "'Space Grotesk', sans-serif", pointerEvents: "none" }}>
      <EngineBadge label="uv" status={s.uv} />
      <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.45rem" }}>│</span>
      <EngineBadge label="scr" status={s.scramjet} />
      <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.45rem" }}>│</span>
      <span style={{ fontSize: "0.55rem", letterSpacing: "0.05em", color: phaseColor, textShadow: "0 1px 6px rgba(0,0,0,0.9)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{phaseLabel}</span>
      {s.transport === "bare" && (
        <>
          <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.45rem" }}>│</span>
          <span style={{ display: "flex", gap: "0.2rem", pointerEvents: "all" }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => switchBare(n, transportMode, wispServer, wispRelayUrl, transportEncryption, settings)} title={`Switch to bare server ${n}`} style={{
                background: "none", border: "none", padding: "0 2px", cursor: "pointer",
                fontSize: "0.52rem", letterSpacing: "0.04em",
                color: s.bare === n ? green : gray,
                fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.9)", transition: "color 0.15s",
              }}
                onMouseEnter={e => { if (s.bare !== n) (e.target as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = s.bare === n ? green : gray; }}
              >ws{n}</button>
            ))}
          </span>
        </>
      )}
    </motion.div>
      )}
    </AnimatePresence>
  );
}

function AccountAuthScreen({
  onAuthenticated,
  embedded = false,
}: {
  onAuthenticated: (payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) => void;
  /** Rendered inside a dialog: drop the full-page background and centering. */
  embedded?: boolean;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setNotice("");
    setLoading(true);

    try {
      if (username.includes("@")) throw new Error("Enter your username only, not an email address.");
      const cleanUsername = normalizeUsername(username);
      if (cleanUsername.length < 3) throw new Error("Username must be at least 3 valid characters.");
      const authEmail = usernameToAuthEmail(cleanUsername);
      const deviceStatus = await fetchDeviceBanStatus();
      if (deviceStatus.banned) {
        throw new Error(deviceStatus.reason ? `This device is banned: ${deviceStatus.reason}` : "This device is banned.");
      }

      if (mode === "signup") {
        const cleanEmail = email.trim();
        if (!isValidEmail(cleanEmail)) throw new Error("Enter a valid working email address.");
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { username: cleanUsername } },
        });
        if (signUpError) throw signUpError;

        if (!data.user) throw new Error("Sign up did not return a user.");
        if (!data.session) {
          setNotice("Account created. Check your email to confirm before signing in.");
          return;
        }

        let profile = await fetchProfile(data.user.id);
        if (!profile) {
          profile = await createProfile(data.user.id, cleanUsername);
        }
        try {
          await registerCurrentDevice(data.session.access_token);
        } catch (err) {
          console.warn("Device registration skipped.", err);
        }
        const authContext = await fetchAuthContext(data.session.access_token);
        if (authContext.isBanned) {
          await supabase.auth.signOut();
          throw new Error(authContext.banReason ? `This account is banned: ${authContext.banReason}` : "This account is banned.");
        }
        onAuthenticated({ session: data.session, user: data.user, profile, authContext });
        return;
      }

      const signInEmails = [authEmail];
      const resolvedEmail = await resolveAuthEmail(cleanUsername);
      if (resolvedEmail && resolvedEmail.toLowerCase() !== authEmail.toLowerCase()) {
        signInEmails.push(resolvedEmail);
      }

      let data: { session: Session | null; user: User | null } | null = null;
      let signInError: Error | null = null;
      for (const email of signInEmails) {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (!result.error && result.data.session && result.data.user) {
          data = result.data;
          signInError = null;
          break;
        }
        signInError = result.error ?? new Error("Sign in failed.");
      }
      if (signInError) throw signInError;
      if (!data?.session || !data.user) throw new Error("Sign in failed.");

      const profile = await fetchProfile(data.user.id);
      if (!profile) {
        throw new Error("No profile found for this account. Sign up again or create the profile in Supabase.");
      }

      try {
        await registerCurrentDevice(data.session.access_token);
      } catch (err) {
        console.warn("Device registration skipped.", err);
      }
      const authContext = await fetchAuthContext(data.session.access_token);
      if (authContext.isBanned) {
        await supabase.auth.signOut();
        throw new Error(authContext.banReason ? `This account is banned: ${authContext.banReason}` : "This account is banned.");
      }

      onAuthenticated({ session: data.session, user: data.user, profile, authContext });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--t-bg-secondary)",
    border: "1px solid var(--t-border-light)",
    color: "#e8e8e8",
    padding: "0.875rem 1rem",
    fontSize: "0.85rem",
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: "0.04em",
    outline: "none",
    borderRadius: "10px",
    boxSizing: "border-box",
    transition: "border-color 0.18s ease",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={embedded
        ? { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif" }
        : { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif", position: "relative", overflow: "hidden" }}
    >
      {!embedded && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      )}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", width: "100%", maxWidth: "400px", padding: "0 1.5rem" }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: 0 }}>unstable account</p>
          <p style={{ margin: "0.85rem 0 0", fontSize: "0.78rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.6 }}>
            Sign in to sync AI history and use realtime chat across devices.
          </p>
        </div>

        <motion.div layout style={{ display: "flex", gap: "0.45rem", width: "100%" }}>
          {(["signin", "signup"] as const).map((currentMode) => {
            const active = mode === currentMode;
            return (
              <motion.button
                key={currentMode}
                onClick={() => { setMode(currentMode); setError(""); setNotice(""); }}
                whileHover={{ scale: 1.03, background: active ? "#e8e8e8" : "#1c1c1c" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1,
                  background: active ? "#e8e8e8" : "#111",
                  color: active ? "#0d0d0d" : "rgba(255,255,255,0.45)",
                  border: `1px solid ${active ? "#e8e8e8" : "#222"}`,
                  padding: "0.7rem 0.9rem",
                  fontSize: "0.66rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  borderRadius: "10px",
                }}
              >
                {currentMode === "signin" ? "sign in" : "sign up"}
              </motion.button>
            );
          })}
        </motion.div>

        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <motion.input
            value={username}
            autoFocus
            onChange={e => { setUsername(e.target.value); setError(""); setNotice(""); }}
            placeholder={mode === "signup" ? "username" : "username"}
            style={inputStyle}
            whileFocus={{ borderColor: "#666" }}
          />
          {mode === "signup" && (
            <motion.input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); setNotice(""); }}
              placeholder="email address"
              style={inputStyle}
              whileFocus={{ borderColor: "#666" }}
            />
          )}
          <motion.input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); setNotice(""); }}
            placeholder="password"
            style={inputStyle}
            whileFocus={{ borderColor: "#666" }}
          />

          <AnimatePresence mode="wait">
            {error && <motion.p key="error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} style={{ color: "#b94a4a", fontSize: "0.68rem", letterSpacing: "0.04em", margin: 0, textAlign: "center" }}>{error}</motion.p>}
            {!error && notice && <motion.p key="notice" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} style={{ color: "rgba(200,200,200,0.7)", fontSize: "0.68rem", letterSpacing: "0.04em", margin: 0, textAlign: "center", lineHeight: 1.5 }}>{notice}</motion.p>}
          </AnimatePresence>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.24)", fontSize: "0.62rem", lineHeight: 1.5, textAlign: "center" }}>
            Username is used as your sign-in identity here. Under the hood, Supabase still needs email-style auth.
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }}
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: loading ? "#555" : "#e8e8e8", color: loading ? "#aaa" : "#0d0d0d", border: "none", padding: "0.875rem 1rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", borderRadius: "10px", transition: "background 0.15s" }}
          >
            {loading ? "working…" : mode === "signin" ? "enter account" : "create account"}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Credits page ─────────────────────────────────────────────────────────────

function CreditsPage() {
  const items = [
    ["Ultraviolet", "web proxy engine"], ["Scramjet", "web proxy engine (primary)"],
    ["bare-mux", "transport multiplexer"], ["libcurl-transport", "libcurl + Wisp transport"],
    ["bare-server-node", "bare proxy backend"], ["bare-as-module3", "bare transport module"],
    ["wisp-js", "Wisp server"], ["React", "frontend library"],
    ["Vite", "build tool"], ["TypeScript", "language"],
    ["Motion / Animate UI", "animation primitives"], ["Radix UI / Base UI", "UI primitives"],
    ["Tailwind CSS", "utility CSS"], ["lucide-react", "icons"],
    ["three.js", "3D engine"], ["Supabase", "auth, database, realtime"],
    ["Space Grotesk", "typeface"], ["DuckDuckGo", "search suggestions"],
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif", gap: "2rem" }}
    >
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", margin: 0 }}>unstable — credits</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", width: "100%", maxWidth: "320px", padding: "0 2rem" }}>
        {items.map(([name, desc]) => (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={name}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid #111", paddingBottom: "0.4rem" }}
          >
            <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{name}</span>
            <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.28)", letterSpacing: "0.04em" }}>{desc}</span>
          </motion.div>
        ))}
      </div>
      <p style={{ maxWidth: 440, padding: "0 2rem", fontSize: "0.6rem", color: "rgba(255,255,255,0.24)", lineHeight: 1.6, margin: 0, textAlign: "center" }}>
        Third-party libraries, engines, typefaces and assets remain the property of their respective owners and are used under their own licenses. The Unstable name, interface and original code are © 2026 Allegedcarrot4. Viewing the source is permitted; copying Unstable's own code is not, except for third-party and open-source components.
      </p>
      <p style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em", margin: 0 }}>type unstable://credits in the url bar</p>
    </motion.div>
  );
}

// ─── Terms of Service page ────────────────────────────────────────────────────

function ToSPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ height: "100%", overflowY: "auto", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", padding: "2.5rem 2rem", maxWidth: 560, margin: "0 auto", scrollbarWidth: "thin", scrollbarColor: "#333 #111" }}
    >
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginTop: 0, marginBottom: "2rem" }}>unstable — terms of service</p>
      {[
        ["Service Overview", "Unstable is a browser-style web proxy that loads third-party sites through Scramjet, Ultraviolet and Bare/Wisp transports. It also includes optional accounts, AI chat, group chat, games, and customization. The service is provided as-is, with no guarantee of uptime, availability, or fitness for a particular purpose."],
        ["Eligibility and Accounts", "Accounts are optional and handled by Supabase Auth. You are responsible for keeping your credentials secure and for all activity under your account. Device registration and ban enforcement may be used to protect the service from abuse."],
        ["Acceptable Use", "You agree not to use Unstable to access, store, or distribute illegal content, to violate applicable laws, or to breach institutional policies. You must not abuse the proxy, AI, or chat systems, attempt to disrupt the service, or interfere with other users."],
        ["Proxied Content", "Proxied pages belong to their respective sites. Unstable does not control, endorse, or guarantee that content, and some sites may block or degrade proxy access. You are responsible for complying with the terms of the sites you visit."],
        ["AI Features and Daily Credits", "AI requests are forwarded to third-party providers through a server-side route. Each account receives 10 AI credits per UTC day, reset at 00:00 UTC with no carryover. Credit cost depends on prompt size, and Think mode costs twice as much. AI output can be inaccurate or incomplete and must not be treated as professional advice."],
        ["Chat and Encryption", "Global chat is public to signed-in users and relies on transport security. Direct messages and groups use end-to-end encryption when every participant has published a key; in that case the server stores ciphertext, not plaintext. Participants, timestamps and delivery metadata may still be visible. Do not send secrets you cannot afford to expose."],
        ["Source Code and License", "You may view this project's source code. You may not copy, redistribute, or reuse Unstable's own code, in whole or in part, without written permission. Third-party libraries, engines, assets and other open-source components are excluded from that restriction and remain governed by their own licenses."],
        ["Privacy", "Account, chat, AI and device data are handled as described in the privacy policy (unstable://privacy). By using the service you consent to that handling."],
        ["Disclaimers and Liability", "The service is provided without warranties of any kind. To the maximum extent permitted by law, the operators are not liable for indirect, incidental, or consequential damages, data loss, service interruption, or the actions of third-party sites and providers."],
        ["Changes and Termination", "These terms may be updated at any time, and access may be limited or terminated for abuse or operational reasons. Continued use after a change means you accept the updated terms."],
      ].map(([title, body], i) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          key={title}
          style={{ marginBottom: "1.5rem" }}
        >
          <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.55)", margin: "0 0 0.35rem", letterSpacing: "0.04em" }}>{title}</p>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.32)", margin: 0, lineHeight: 1.65 }}>{body}</p>
        </motion.div>
      ))}
      <p style={{ marginTop: "2rem", fontSize: "0.58rem", color: "rgba(255,255,255,0.12)", letterSpacing: "0.06em" }}>type unstable://tos in the url bar</p>
    </motion.div>
  );
}

// ─── Privacy policy page ──────────────────────────────────────────────────────

function PrivacyPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ height: "100%", overflowY: "auto", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", padding: "2.5rem 2rem", maxWidth: 560, margin: "0 auto", scrollbarWidth: "thin", scrollbarColor: "#333 #111" }}
    >
      <div id="pp-scroll" style={{ height: "100%", overflowY: "auto" }}>
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginTop: 0, marginBottom: "2rem" }}>unstable — privacy policy</p>
      {[
        ["Data We Collect", "Account records (username, email and auth identifiers), AI conversation history, chat messages, and device/security records are stored in Supabase. Local preferences such as theme, shortcuts, settings and wallpaper are stored in your browser."],
        ["Account and Authentication", "Authentication is handled by Supabase Auth. Unstable does not store your password in its own code or database. Server-side secrets and API keys must remain outside public repositories."],
        ["AI Conversations and Credits", "Prompts and responses are stored as conversation history and forwarded to a third-party AI provider through a server-side route. Daily credit usage is tracked per account so the 10-credit limit can be enforced; usage resets at 00:00 UTC and does not carry over."],
        ["Chat and End-to-End Encryption", "Global chat is public to signed-in users. Direct messages and groups use per-account ECDH keys and per-message AES-256-GCM encryption when every participant has published a key, so the server stores ciphertext for those conversations. Message metadata such as sender, participants, timestamps and reactions may still be stored."],
        ["Local Storage", "UI settings, keyboard shortcuts, custom shortcuts, panic URL, cloak selection, proxy engine, transport mode, custom Wisp URL, draft state and the local E2EE identity are stored in your browser. This data does not leave your browser unless you use a feature that sends it."],
        ["Device and Security Data", "A device identifier and ban status may be checked to protect the service from abuse. Device identifiers are derived and are not used for advertising. Security checks may log limited technical data such as timestamps and request outcomes."],
        ["Third-Party Services", "Supabase stores and processes account data, chat messages and AI history. AI providers process forwarded prompts to generate responses. Proxied sites receive the requests you make through them. These services have their own privacy policies, and retention depends on the deployment's configuration."],
        ["Retention and Deletion", "Conversation history and chat messages remain until you delete them or the deployment removes them. Account deletion may be requested from the operator. Locally stored data can be removed at any time by clearing site data for this origin."],
        ["Your Choices", "You can use the app without an account, avoid AI and chat features, clear local storage, and choose which proxy engine and transport to use. Some features require an account or a network connection to a third-party service."],
        ["Changes", "This policy may be updated at any time. Check unstable://privacy for the current version."],
      ].map(([title, body], i) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          key={title}
          style={{ marginBottom: "1.5rem" }}
        >
          <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.55)", margin: "0 0 0.35rem", letterSpacing: "0.04em" }}>{title}</p>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.32)", margin: 0, lineHeight: 1.65 }}>{body}</p>
        </motion.div>
      ))}
      <p style={{ marginTop: "2rem", fontSize: "0.58rem", color: "rgba(255,255,255,0.12)", letterSpacing: "0.06em" }}>type unstable://privacy in the url bar</p>
      </div>
    </motion.div>
  );
}

// ─── Settings page ────────────────────────────────────────────────────────────

const SETTINGS_INPUT_BASE: React.CSSProperties = {
  background: "none", border: "1px solid #222", borderRadius: "10px",
  color: "#e0e0e0", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem",
  padding: "0.3rem 0.65rem", letterSpacing: "0.04em", outline: "none",
  transition: "border-color 0.18s ease",
};
const SETTINGS_KBD_STYLE: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "0.62rem",
  background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "3px",
  padding: "0.05rem 0.35rem", color: "rgba(255,255,255,0.55)",
};
const SETTINGS_CODE_STYLE: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "0.62rem",
  background: "rgba(255,255,255,0.04)", borderRadius: "3px",
  padding: "0.05rem 0.3rem", color: "rgba(255,255,255,0.5)",
};

function SettingsPage({ settings, onSettingsChange, onLogout, onNavigate, frontendOnly = false }: { settings: Settings; onSettingsChange: (s: Settings) => void; onLogout?: () => void; onNavigate?: (url: string) => void; frontendOnly?: boolean }) {
  const [recording, setRecording] = useState<string | null>(null);
  const [customSiteName, setCustomSiteName] = useState("");
  const [customSiteUrl, setCustomSiteUrl] = useState("");
  const [siteError, setSiteError] = useState("");
  const settingsRef = useRef(settings);
  const onSettingsChangeRef = useRef(onSettingsChange);
  settingsRef.current = settings;
  onSettingsChangeRef.current = onSettingsChange;

  useEffect(() => {
    if (!recording) return;
    function onKey(e: KeyboardEvent) {
      e.preventDefault(); e.stopPropagation();
      const combo = buildCombo(e);
      if (combo && !["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
        onSettingsChangeRef.current({ ...settingsRef.current, shortcuts: { ...settingsRef.current.shortcuts, [recording as string]: combo } });
        setRecording(null);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording]);

  const inputBase = SETTINGS_INPUT_BASE;
  const kbdStyle = SETTINGS_KBD_STYLE;
  const codeStyle = SETTINGS_CODE_STYLE;

  function removeSidebarSite(id: string) {
    onSettingsChange({ ...settings, sidebarSites: settings.sidebarSites.filter(s => s.id !== id) });
  }
  function addPresetSite(preset: SidebarSite) {
    if (settings.sidebarSites.some(s => s.id === preset.id || s.url === preset.url)) return;
    onSettingsChange({ ...settings, sidebarSites: [...settings.sidebarSites, { ...preset }] });
  }
  function addCustomSite() {
    const rawName = customSiteName.trim();
    let rawUrl = customSiteUrl.trim();
    if (!rawUrl) { setSiteError("Enter a website URL."); return; }
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(rawUrl)) rawUrl = "https://" + rawUrl;
    let host = "";
    try { host = new URL(rawUrl).hostname; } catch { setSiteError("That doesn't look like a valid URL."); return; }
    if (!host) { setSiteError("That doesn't look like a valid URL."); return; }
    const name = rawName || host.replace(/^www\./i, "");
    const id = `site-${Date.now().toString(36)}`;
    onSettingsChange({ ...settings, sidebarSites: [...settings.sidebarSites, { id, name, url: rawUrl }] });
    setCustomSiteName("");
    setCustomSiteUrl("");
    setSiteError("");
  }

  const catIds = ["appearance", "privacy", "controls", "advanced"] as const;
  const catLabels: Record<string, string> = { appearance: "Appearance", privacy: "Privacy", controls: "Controls", advanced: "Advanced" };
  function scrollToCat(id: string) {
    const el = document.getElementById(`settings-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      id="settings-scroll"
      style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <div style={{ display: "flex", maxHeight: "90%", borderRadius: "0", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", background: "var(--t-bg)" }}>
      <div style={{
        width: 160, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", padding: "2.5rem 0",
        display: "flex", flexDirection: "column", gap: "0.15rem", alignItems: "stretch", overflowY: "auto",
      }}>
        <p style={{ fontSize: "0.55rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", margin: "0 1.25rem 1rem 1.25rem" }}>unstable</p>
        {catIds.map(id => (
          <motion.button key={id} whileHover={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.03)", x: 2 }} whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }} onClick={() => scrollToCat(id)} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.3)", textAlign: "left",
            padding: "0.45rem 1.25rem", fontSize: "0.6rem", fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
          }}>{catLabels[id]}</motion.button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "2.5rem 2rem", maxWidth: 560 }}>

      <div id="settings-appearance">
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem", marginTop: 0 }}>
        <span style={{ fontSize: "0.55rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.15)" }}>appearance</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
      </div>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>background</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Set a wallpaper URL, upload an image, or pick a random one from Unsplash.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            value={settings.wallpaper}
            onChange={e => onSettingsChange({ ...settings, wallpaper: e.target.value })}
            placeholder="image url (https://...)"
            style={{ ...inputBase, flex: 1 }}
          />
          <label style={{ ...inputBase, cursor: "pointer", whiteSpace: "nowrap" }}>
            upload
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => onSettingsChange({ ...settings, wallpaper: reader.result as string });
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSettingsChange({ ...settings, wallpaper: `https://source.unsplash.com/random/1920x1080?sig=${Date.now()}` })}
            style={{
              background: "none", border: "1px solid var(--t-border-light)", color: "var(--t-text-muted)",
              padding: "0.4rem 0.85rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
            }}
          >random</motion.button>
          {settings.wallpaper && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSettingsChange({ ...settings, wallpaper: "" })}
              style={{
                background: "none", border: "1px solid var(--t-border-light)", color: "var(--t-text-muted)",
                padding: "0.4rem 0.85rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
              }}
            >clear</motion.button>
          )}
        </div>
        {settings.wallpaper && (
          <div style={{ marginTop: "0.75rem", width: "100%", height: 120, borderRadius: "0", overflow: "hidden", border: "1px solid var(--t-border-light)" }}>
            <div style={{ width: "100%", height: "100%", backgroundImage: `url("${settings.wallpaper}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
          </div>
        )}

      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>new tab page</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Choose between the classic Unstable new tab page or the Mue-powered new tab.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["mue", "legacy"] as const).map(mode => (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={mode}
              onClick={() => onSettingsChange({ ...settings, newtabMode: mode })}
              style={{
                flex: 1,
                background: settings.newtabMode === mode ? "var(--t-bg-card)" : "none",
                border: "1px solid", borderColor: settings.newtabMode === mode ? "var(--t-border-light)" : "var(--t-border)",
                color: settings.newtabMode === mode ? "var(--t-text)" : "var(--t-text-muted)",
                padding: "0.5rem 0.75rem", borderRadius: "10px", cursor: "pointer",
                fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.04em", textTransform: "uppercase",
                transition: "background 0.15s, border-color 0.15s, color 0.15s",
              }}
            >{mode === "mue" ? "Mue" : "Legacy"}</motion.button>
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>tab layout</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Choose between horizontal tabs at the top or vertical tabs on the side.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[{ id: false, label: "Horizontal" }, { id: true, label: "Vertical (beta)" }].map(opt => (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={String(opt.id)}
              onClick={() => onSettingsChange({ ...settings, verticalTabs: opt.id })}
              style={{
                flex: 1,
                background: settings.verticalTabs === opt.id ? "var(--t-bg-card)" : "none",
                border: "1px solid", borderColor: settings.verticalTabs === opt.id ? "var(--t-border-light)" : "var(--t-border)",
                color: settings.verticalTabs === opt.id ? "var(--t-text)" : "var(--t-text-muted)",
                padding: "0.5rem 0.75rem", borderRadius: "10px", cursor: "pointer",
                fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.04em", textTransform: "uppercase",
                transition: "background 0.15s, border-color 0.15s, color 0.15s",
              }}
            >{opt.label}</motion.button>
          ))}
        </div>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: "1.5rem" }}>pinned tabs</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Choose where pinned tabs appear. Right-click any tab and choose “Pin tab”.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[{ id: true, label: "Sidebar" }, { id: false, label: "Tab bar only" }].map(opt => (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={String(opt.id)}
              onClick={() => onSettingsChange({ ...settings, pinnedTabsToSidebar: opt.id })}
              style={{
                flex: 1,
                background: settings.pinnedTabsToSidebar === opt.id ? "var(--t-bg-card)" : "none",
                border: "1px solid", borderColor: settings.pinnedTabsToSidebar === opt.id ? "var(--t-border-light)" : "var(--t-border)",
                color: settings.pinnedTabsToSidebar === opt.id ? "var(--t-text)" : "var(--t-text-muted)",
                padding: "0.5rem 0.75rem", borderRadius: "10px", cursor: "pointer",
                fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.04em", textTransform: "uppercase",
                transition: "background 0.15s, border-color 0.15s, color 0.15s",
              }}
            >{opt.label}</motion.button>
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>sidebar sites</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Pin websites to the sidebar. Spotify is included by default — remove it or add more below. Sites open through the proxy inside Unstable.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.1rem" }}>
          {settings.sidebarSites.length === 0 && (
            <p style={{ margin: 0, fontSize: "0.66rem", color: "var(--t-text-muted)" }}>No sites pinned to the sidebar.</p>
          )}
          {settings.sidebarSites.map(site => (
            <div key={site.id} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.55rem 0.7rem", background: "var(--t-bg-secondary)", border: "1px solid var(--t-border)", borderRadius: "10px" }}>
              <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t-text)" }}>
                <SidebarSiteIcon site={site} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--t-text)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.02em" }}>{site.name}</p>
                <p style={{ margin: "0.1rem 0 0", fontSize: "0.6rem", color: "var(--t-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{site.url}</p>
              </div>
              <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} onClick={() => removeSidebarSite(site.id)} aria-label={`Remove ${site.name}`} title="Remove from sidebar" style={{ background: "none", border: "none", color: "var(--t-text-muted)", cursor: "pointer", padding: "0.2rem", display: "flex" }}>
                <X size={13} />
              </motion.button>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "0.55rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--t-text-muted)", margin: "0 0 0.55rem" }}>add a site</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.9rem" }}>
          {SIDEBAR_SITE_PRESETS.filter(preset => !settings.sidebarSites.some(s => s.id === preset.id || s.url === preset.url)).map(preset => (
            <motion.button
              key={preset.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => addPresetSite(preset)}
              style={{
                display: "flex", alignItems: "center", gap: "0.45rem",
                background: "none", border: "1px solid var(--t-border-light)", color: "var(--t-text-secondary)",
                padding: "0.4rem 0.75rem", fontSize: "0.66rem", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.04em", borderRadius: "10px", cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <SidebarSiteIcon site={preset} size={13} />
              {preset.name}
              <Plus size={11} style={{ opacity: 0.5 }} />
            </motion.button>
          ))}
          {SIDEBAR_SITE_PRESETS.every(preset => settings.sidebarSites.some(s => s.id === preset.id || s.url === preset.url)) && (
            <p style={{ margin: 0, fontSize: "0.64rem", color: "var(--t-text-muted)", alignSelf: "center" }}>All premade sites added.</p>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
          <input
            value={customSiteName}
            onChange={e => { setCustomSiteName(e.target.value); setSiteError(""); }}
            placeholder="Name (optional)"
            style={{ ...inputBase, flex: "0 1 160px" }}
          />
          <input
            value={customSiteUrl}
            onChange={e => { setCustomSiteUrl(e.target.value); setSiteError(""); }}
            onKeyDown={e => { if (e.key === "Enter") addCustomSite(); }}
            placeholder="any website — e.g. example.com"
            style={{ ...inputBase, flex: "1 1 220px" }}
          />
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={addCustomSite}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "var(--t-bg-card)", border: "1px solid var(--t-border-light)", color: "var(--t-text)",
              padding: "0.4rem 0.85rem", fontSize: "0.66rem", fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: "10px", cursor: "pointer",
            }}
          >
            <Plus size={12} /> add
          </motion.button>
        </div>
        {siteError && <p style={{ margin: "0.5rem 0 0", fontSize: "0.64rem", color: "rgba(235,120,120,0.9)" }}>{siteError}</p>}
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>search engine</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Choose your default search engine. You can also switch per-query from the URL bar.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {Object.entries(SEARCH_ENGINES).map(([id, engine]) => {
            const active = settings.searchEngine === id;
            return (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={id}
                onClick={() => onSettingsChange({ ...settings, searchEngine: id })}
                style={{
                  display: "flex", alignItems: "center", gap: "0.45rem",
                  background: active ? "var(--t-accent)" : "var(--t-bg-secondary)",
                  color: active ? "var(--t-accent-text)" : "var(--t-text-secondary)",
                  border: `1px solid ${active ? "var(--t-accent)" : "var(--t-border-light)"}`,
                  padding: "0.4rem 0.85rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.06em", cursor: "pointer", borderRadius: "10px",
                  transition: "all 0.15s",
                }}
              >
                <img src={`https://www.google.com/s2/favicons?domain=${new URL(engine.url).hostname}&sz=32`} alt="" width={14} height={14} style={{ borderRadius: "10px", flexShrink: 0 }} />
                {engine.name}
              </motion.button>
            );
          })}
        </div>
      </motion.section>
      </div>

      <div id="settings-privacy">
      {/* ─── PRIVACY ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem", marginTop: 0 }}>
        <span style={{ fontSize: "0.55rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.15)" }}>privacy</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
      </div>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>tab cloak</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Makes the browser tab containing Unstable look like another site.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {(Object.keys(CLOAK_PRESETS) as CloakId[]).map(id => (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={id}
              onClick={() => onSettingsChange({ ...settings, cloak: id })}
              style={{
                background: settings.cloak === id ? "#e8e8e8" : "#111",
                color: settings.cloak === id ? "#0d0d0d" : "rgba(255,255,255,0.45)",
                border: `1px solid ${settings.cloak === id ? "#e8e8e8" : "#222"}`,
                padding: "0.4rem 0.85rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
                transition: "all 0.15s",
              }}
            >{CLOAK_PRESETS[id].label}</motion.button>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }}
          onClick={() => openCloakPopup("https://www.google.com")}
          style={{
            marginTop: "0.85rem", background: "none", border: "1px solid #222", color: "rgba(255,255,255,0.45)",
            padding: "0.4rem 0.85rem", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
          }}
        >open in about:blank</motion.button>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>panic button</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Press <kbd style={kbdStyle}>Esc</kbd> to instantly load a decoy page. <kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>Esc</kbd> works inside text fields. You can also share a link as <code style={codeStyle}>/embed.html#https://example.com</code> to open a site in the top frame.
        </p>
        <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.4rem" }}>Panic URL</label>
        <motion.input
          type="text"
          value={settings.panicUrl}
          onChange={(e) => onSettingsChange({ ...settings, panicUrl: e.target.value })}
          onBlur={(e) => onSettingsChange({ ...settings, panicUrl: normalizePanicUrl(e.target.value) })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSettingsChange({ ...settings, panicUrl: normalizePanicUrl(e.currentTarget.value) });
              e.currentTarget.blur();
            }
          }}
          placeholder="https://google.com"
          style={inputBase}
          whileFocus={{ borderColor: "#555" }}
        />
        <p style={{ fontSize: "0.58rem", color: "var(--t-text-muted)", margin: "0.5rem 0 0", opacity: 0.7 }}>
          Default: <code style={codeStyle}>{DEFAULT_PANIC_URL}</code>. <code style={codeStyle}>http://</code> or <code style={codeStyle}>https://</code> is added automatically if missing.
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }}
          onClick={() => onSettingsChange({ ...settings, panicUrl: DEFAULT_PANIC_URL })}
          style={{
            marginTop: "0.85rem", background: "none", border: "1px solid #222", color: "var(--t-text-muted)",
            padding: "0.4rem 0.85rem", fontSize: "0.6rem", fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
          }}
        >reset panic url</motion.button>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>confirm leave</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
          <div onClick={() => onSettingsChange({ ...settings, confirmLeave: !settings.confirmLeave })} style={{ position: "relative", width: "36px", height: "20px", background: settings.confirmLeave ? "#e8e8e8" : "#222", borderRadius: "10px", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}>
            <motion.div animate={{ left: settings.confirmLeave ? "18px" : "2px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} style={{ position: "absolute", top: "2px", width: "16px", height: "16px", background: settings.confirmLeave ? "#0d0d0d" : "#555", borderRadius: "50%" }} />
          </div>
          <motion.span animate={{ color: settings.confirmLeave ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)" }} style={{ fontSize: "0.7rem" }}>{settings.confirmLeave ? "On" : "Off"}</motion.span>
        </div>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0.2rem 0 0", lineHeight: 1.5 }}>
          Show a confirmation dialog when attempting to leave or close the site.
        </p>
      </motion.section>
      </div>

      <div id="settings-controls">
      {/* ─── CONTROLS ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem", marginTop: 0 }}>
        <span style={{ fontSize: "0.55rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.15)" }}>controls</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
      </div>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>keyboard shortcuts</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {Object.keys(SHORTCUT_LABELS).map(key => {
            const isRec = recording === key;
            const val = settings.shortcuts[key as keyof KeyShortcuts] ?? "";
            return (
              <motion.div key={key} whileHover={{ x: 2 }} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0", borderBottom: "1px solid #111" }}>
                <span style={{ flex: 1, fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>{SHORTCUT_LABELS[key]}</span>
                <span style={{ ...inputBase, minWidth: "80px", textAlign: "center", color: isRec ? "#e8e8e8" : "rgba(255,255,255,0.5)", borderColor: isRec ? "#555" : "#222", background: isRec ? "#161616" : "none" }}>
                  {isRec ? "press keys…" : val}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRecording(isRec ? null : key)}
                  style={{
                    background: isRec ? "rgba(220,80,80,0.15)" : "none",
                    border: `1px solid ${isRec ? "rgba(220,80,80,0.5)" : "#222"}`,
                    color: isRec ? "rgba(220,80,80,0.9)" : "rgba(255,255,255,0.35)",
                    padding: "0.25rem 0.6rem", fontSize: "0.6rem", fontFamily: "'Space Grotesk', sans-serif",
                    letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
                  }}
                >{isRec ? "cancel" : "record"}</motion.button>
              </motion.div>
            );
          })}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }}
          onClick={() => onSettingsChange({ ...settings, shortcuts: DEFAULT_KEY_SHORTCUTS })}
          style={{
            marginTop: "1rem", background: "none", border: "1px solid #222", color: "rgba(255,255,255,0.25)",
            padding: "0.4rem 0.85rem", fontSize: "0.6rem", fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
          }}
        >reset to defaults</motion.button>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.31 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>ui scale</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Adjust the overall size of the interface.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3].map(scale => {
            const active = settings.uiScale === scale;
            return (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={scale}
                onClick={() => onSettingsChange({ ...settings, uiScale: scale })}
                style={{
                  background: active ? "#e8e8e8" : "#111",
                  color: active ? "#0d0d0d" : "rgba(255,255,255,0.45)",
                  border: `1px solid ${active ? "#e8e8e8" : "#222"}`,
                  padding: "0.4rem 0.7rem", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.04em", cursor: "pointer", borderRadius: "10px",
                  transition: "all 0.15s",
                }}
              >{Math.round(scale * 100)}%</motion.button>
            );
          })}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>magic cursor</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
          <div onClick={() => onSettingsChange({ ...settings, magicCursorEnabled: !settings.magicCursorEnabled })} style={{ position: "relative", width: "36px", height: "20px", background: settings.magicCursorEnabled ? "#e8e8e8" : "#222", borderRadius: "10px", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}>
            <motion.div animate={{ left: settings.magicCursorEnabled ? "18px" : "2px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} style={{ position: "absolute", top: "2px", width: "16px", height: "16px", background: settings.magicCursorEnabled ? "#0d0d0d" : "#555", borderRadius: "50%" }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>{settings.magicCursorEnabled ? "On" : "Off"}</span>
        </div>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0.2rem 0 0", lineHeight: 1.5 }}>
          Replace the regular system cursor with Unstable's animated cursor.
        </p>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>clock</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
          <div onClick={() => onSettingsChange({ ...settings, showMsIndicator: !settings.showMsIndicator })} style={{ position: "relative", width: "36px", height: "20px", background: settings.showMsIndicator ? "#e8e8e8" : "#222", borderRadius: "10px", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}>
            <motion.div animate={{ left: settings.showMsIndicator ? "18px" : "2px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} style={{ position: "absolute", top: "2px", width: "16px", height: "16px", background: settings.showMsIndicator ? "#0d0d0d" : "#555", borderRadius: "50%" }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>{settings.showMsIndicator ? "On" : "Off"}</span>
        </div>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0.2rem 0 0", lineHeight: 1.5 }}>
          Show milliseconds on the clock.
        </p>
      </motion.section>
      </div>

      <div id="settings-advanced">
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem", marginTop: 0 }}>
        <span style={{ fontSize: "0.55rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.15)" }}>advanced</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
      </div>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>proxy engine</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Choose which rewriting engine handles proxied pages. Auto tries Scramjet first, falls back to Ultraviolet.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["auto", "scramjet", "uv"] as ProxyEngine[]).map(id => {
            const labels: Record<ProxyEngine, string> = { auto: "Auto", scramjet: "Scramjet", uv: "Ultraviolet" };
            const active = settings.proxyEngine === id;
            return (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={id}
                onClick={() => onSettingsChange({ ...settings, proxyEngine: id })}
                style={{
                  background: active ? "#e8e8e8" : "#111",
                  color: active ? "#0d0d0d" : "rgba(255,255,255,0.45)",
                  border: `1px solid ${active ? "#e8e8e8" : "#222"}`,
                  padding: "0.4rem 0.85rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
                  transition: "all 0.15s",
                }}
              >{labels[id]}</motion.button>
            );
          })}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>transport mode</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          {frontendOnly
            ? "Determines how your traffic is routed. Ordered fastest to slowest: Drift (Rust WASM) > Wisp > Epoxy. Auto tries Drift first, then Wisp."
            : "Determines how your traffic is routed. Ordered fastest to slowest: Drift (Rust WASM) > Wisp > Epoxy > Bare HTTP. Auto tries Drift first, then Wisp, then bare HTTP."}
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(frontendOnly
            ? (["auto", "drift", "wisp", "epoxy"] as TransportMode[])
            : (["auto", "drift", "wisp", "epoxy", "bare"] as TransportMode[])
          ).map(id => {
            const labels: Record<TransportMode, string> = { auto: "Auto", drift: "Drift", wisp: "Wisp", epoxy: "Epoxy", bare: "Bare" };
            const active = settings.transportMode === id;
            return (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={id}
                onClick={() => onSettingsChange({ ...settings, transportMode: id })}
                style={{
                  background: active ? "#e8e8e8" : "#111",
                  color: active ? "#0d0d0d" : "rgba(255,255,255,0.45)",
                  border: `1px solid ${active ? "#e8e8e8" : "#222"}`,
                  padding: "0.4rem 0.85rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
                  transition: "all 0.15s",
                }}
              >{labels[id]}</motion.button>
            );
          })}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>wisp server</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          {frontendOnly
            ? <>Override the default Wisp WebSocket server. Leave empty to use the public relay list.</>
            : <>Override the default Wisp WebSocket server. Leave empty to use the built-in server at <code style={codeStyle}>/api/wisp/</code>.</>}
        </p>
        <motion.input
          type="text"
          value={settings.wispServer}
          onChange={e => onSettingsChange({ ...settings, wispServer: e.target.value })}
          placeholder="ws://your-server.com/api/wisp/"
          style={inputBase}
          whileFocus={{ borderColor: "#555" }}
        />
      </motion.section>

      {!frontendOnly && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }} style={{ marginBottom: "2.5rem" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>wisp relay (fallback)</p>
          <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
            Fallback relay server used when primary Wisp fails. Leave empty for default.
          </p>
          <motion.input
            type="text"
            value={settings.wispRelayUrl}
            onChange={e => onSettingsChange({ ...settings, wispRelayUrl: e.target.value })}
            placeholder="ws://your-relay.com/api/wisp/"
            style={inputBase}
            whileFocus={{ borderColor: "#555" }}
          />
        </motion.section>
      )}

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>transport encryption</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
          <div onClick={() => onSettingsChange({ ...settings, transportEncryption: !settings.transportEncryption })} style={{ position: "relative", width: "36px", height: "20px", background: settings.transportEncryption ? "#e8e8e8" : "#222", borderRadius: "10px", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}>
            <motion.div animate={{ left: settings.transportEncryption ? "18px" : "2px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} style={{ position: "absolute", top: "2px", width: "16px", height: "16px", background: settings.transportEncryption ? "#0d0d0d" : "#555", borderRadius: "50%" }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>{settings.transportEncryption ? "On" : "Off"}</span>
        </div>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0.2rem 0 0", lineHeight: 1.5 }}>
          XOR-encrypts transport layer data between client and proxy.
        </p>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>font obfuscation</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
          <div onClick={() => onSettingsChange({ ...settings, fontObfuscation: !settings.fontObfuscation })} style={{ position: "relative", width: "36px", height: "20px", background: settings.fontObfuscation ? "#e8e8e8" : "#222", borderRadius: "10px", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}>
            <motion.div animate={{ left: settings.fontObfuscation ? "18px" : "2px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} style={{ position: "absolute", top: "2px", width: "16px", height: "16px", background: settings.fontObfuscation ? "#0d0d0d" : "#555", borderRadius: "50%" }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>{settings.fontObfuscation ? "On" : "Off"}</span>
        </div>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0.2rem 0 0", lineHeight: 1.5 }}>
          Replaces displayed text with obfuscated CJK characters to bypass classroom monitoring.
        </p>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>ad blocking</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Blocks known ad networks, trackers, and analytics scripts in the service worker.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>{settings.adblockEnabled ? "On" : "Off"}</span>
          <button
            onClick={() => onSettingsChange({ ...settings, adblockEnabled: !settings.adblockEnabled })}
            style={{
              width: "36px", height: "18px", borderRadius: "9px", border: "none", cursor: "pointer", position: "relative",
              background: settings.adblockEnabled ? "#e8e8e8" : "#222", transition: "background 0.2s", padding: 0,
            }}
          >
            <motion.span animate={{ left: settings.adblockEnabled ? "20px" : "2px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} style={{
              position: "absolute", top: "2px", width: "14px", height: "14px", borderRadius: "50%", background: settings.adblockEnabled ? "#0d0d0d" : "#666",
            }} />
          </button>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>url encoding</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          How proxied URLs are encoded. XOR is date+host rotating key (most secure). Base64 and plain are simpler.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["xor", "base64", "plain"] as CodecType[]).map(id => {
            const labels: Record<string, string> = { xor: "XOR", base64: "Base64", plain: "Plain" };
            const active = settings.codec === id;
            return (
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                key={id}
                onClick={() => onSettingsChange({ ...settings, codec: id })}
                style={{
                  background: active ? "#e8e8e8" : "#111",
                  color: active ? "#0d0d0d" : "rgba(255,255,255,0.45)",
                  border: `1px solid ${active ? "#e8e8e8" : "#222"}`,
                  padding: "0.4rem 0.85rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
                  transition: "all 0.15s",
                }}
              >{labels[id]}</motion.button>
            );
          })}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>site engine overrides</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Force a specific proxy engine for certain domains. One per line: <code style={codeStyle}>domain.com=scramjet</code> or <code style={codeStyle}>domain.com=uv</code>
        </p>
        <motion.textarea
          value={Object.entries(settings.siteEngineOverrides).map(([k, v]) => `${k}=${v}`).join("\n")}
          onChange={e => {
            const overrides: Record<string, "uv" | "scramjet"> = {};
            for (const line of e.target.value.split("\n")) {
              const m = line.trim().match(/^(.+?)=(uv|scramjet)$/i);
              if (m) overrides[m[1].toLowerCase()] = m[2].toLowerCase() as "uv" | "scramjet";
            }
            onSettingsChange({ ...settings, siteEngineOverrides: overrides });
          }}
          placeholder={"example.com=scramjet\nads.example.com=uv"}
          style={{ ...inputBase, minHeight: "60px", resize: "vertical", fontFamily: "monospace", fontSize: "0.65rem" }}
          whileFocus={{ borderColor: "#555" }}
        />
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>proxy status</p>
        <ConnectionStatusSummary transportMode={settings.transportMode} wispServer={settings.wispServer} wispRelayUrl={settings.wispRelayUrl ?? ""} transportEncryption={settings.transportEncryption} settings={settings} />
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>settings management</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }}
            onClick={() => {
              const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "unstable-settings.json";
              a.click(); URL.revokeObjectURL(url);
            }}
            style={{
              background: "none", border: "1px solid #222", color: "rgba(255,255,255,0.45)",
              padding: "0.4rem 0.85rem", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
            }}
          >export settings</motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file"; input.accept = ".json";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    const imported = JSON.parse(reader.result as string);
                    if (typeof imported !== "object" || imported === null) { alert("Invalid settings file."); return; }
                    const validKeys = Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>;
                    const safeImport: Record<string, unknown> = {};
                    for (const key of validKeys) {
                      if (key in imported) safeImport[key] = imported[key];
                    }
                    if (typeof safeImport.panicUrl === "string") safeImport.panicUrl = normalizePanicUrl(safeImport.panicUrl);
                    if (typeof safeImport.wispServer === "string" && safeImport.wispServer) {
                      try { new URL(safeImport.wispServer as string); } catch { delete safeImport.wispServer; }
                    }
                    onSettingsChange({ ...settings, ...safeImport } as Settings);
                  } catch { alert("Invalid settings file."); }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
            style={{
              background: "none", border: "1px solid #222", color: "rgba(255,255,255,0.45)",
              padding: "0.4rem 0.85rem", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
            }}
          >import settings</motion.button>
          {onLogout && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }}
              onClick={onLogout}
              style={{
                background: "none", border: "1px solid #333", color: "rgba(200,70,70,0.7)",
                padding: "0.4rem 0.85rem", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px",
              }}
            >sign out</motion.button>
          )}
        </div>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
          Export or import your settings as a JSON file.
        </p>
      </motion.section>
      </div>

      <p style={{ marginTop: "2rem", fontSize: "0.58rem", color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em" }}>type unstable://settings in the url bar</p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} style={{ display: "flex", gap: "1.5rem", marginTop: "1.5rem" }}>
        {[["credits", "unstable://credits"], ["tos", "unstable://tos"], ["privacy", "unstable://privacy"]].map(([label, url]) => (
          <motion.button
            whileHover={{ color: "var(--t-text-secondary)" }}
            key={label}
            onClick={() => onNavigate?.(url)}
            style={{ background: "none", border: "none", color: "var(--t-text-muted)", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
          >{label}</motion.button>
        ))}
      </motion.div>
      </div>
      </div>
    </motion.div>
  );
}

// ─── Inline auth screen (shown inside AI/Chat pages when not signed in) ────────

function InlineAuthScreen({
  onAuthenticated,
  feature,
}: {
  onAuthenticated: (payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) => void;
  feature: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--t-bg)",
        fontFamily: "'Space Grotesk', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem", textAlign: "center" }}
      >
        <p style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: 0 }}>unstable — {feature.toLowerCase()}</p>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 320 }}>
          Sign in or create an account to use {feature}.
        </p>
      </motion.div>
      <AccountAuthScreen onAuthenticated={onAuthenticated} />
    </motion.div>
  );
}

// ─── Sign-in dialog ───────────────────────────────────────────────────────────
// AI/Chat/Profile requests from a signed-out session open this over whatever is
// on screen instead of replacing the page with a full-screen auth view.

function AuthDialog({
  prompt,
  onClose,
  onAuthenticated,
}: {
  prompt: { url: string; tabId: string; feature: string } | null;
  onClose: () => void;
  onAuthenticated: (payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) => void;
}) {
  const feature = prompt?.feature ?? "this feature";
  const srOnly: React.CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };
  return (
    <Dialog open={!!prompt} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent
        className="gap-0 p-0"
        style={{ background: "var(--t-bg)", border: "1px solid #232323", borderRadius: "6px", width: "calc(100% - 2rem)", maxWidth: "400px", padding: "1.75rem 1.5rem", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 24px 64px rgba(0,0,0,0.65)" }}
      >
        <DialogTitle style={srOnly}>Sign in to Unstable</DialogTitle>
        <DialogDescription style={srOnly}>Sign in or create an account to use {feature}.</DialogDescription>
        <AccountAuthScreen embedded onAuthenticated={onAuthenticated} />
      </DialogContent>
    </Dialog>
  );
}

// ─── AI page ──────────────────────────────────────────────────────────────────

function AIPage({ user, profile, onAuthenticated }: { user: User | null; profile: Profile | null; onAuthenticated: (payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) => void }) {
  if (!user || !profile) {
    return <InlineAuthScreen onAuthenticated={onAuthenticated} feature="AI" />;
  }

  return <AIPageInner user={user} profile={profile} />;
}

function AIPageInner({ user, profile }: { user: User; profile: Profile }) {
  return (
    <div style={{ height: "100%", minHeight: 0 }}>
      <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", fontFamily: "'Space Grotesk', sans-serif" }}>Loading AI…</div>}>
        <AIChat user={{ id: user.id }} profile={{ username: profile.username }} />
      </Suspense>
    </div>
  );
}

function ChatPage({ user, profile, session, onAuthenticated, chatTab, onChatTabChange }: {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  onAuthenticated: (payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) => void;
  /** Opened as unstable://dm vs unstable://chat. */
  chatTab?: "global" | "dm";
  onChatTabChange?: (tab: "global" | "dm") => void;
}) {
  if (!user || !profile || !session) {
    return <InlineAuthScreen onAuthenticated={onAuthenticated} feature="Chat" />;
  }

  return <ChatPageInner user={user} profile={profile} session={session} chatTab={chatTab} onChatTabChange={onChatTabChange} />;
}

function ChatPageInner({ user, profile, chatTab, onChatTabChange }: {
  user: User;
  profile: Profile;
  session: Session;
  chatTab?: "global" | "dm";
  onChatTabChange?: (tab: "global" | "dm") => void;
}) {
  return (
    <div style={{ height: "100%", minHeight: 0 }}>
      <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", fontFamily: "'Space Grotesk', sans-serif" }}>Loading chat…</div>}>
        <ChatHub
          user={{ id: user.id }}
          profile={{ id: profile.id, username: profile.username, avatar_url: profile.avatar_url }}
          initialTab={chatTab ?? "global"}
          onTabChange={onChatTabChange}
        />
      </Suspense>
    </div>
  );
}

/**
 * Shown when a tab points at an internal route that doesn't exist. Without this
 * the URL was passed straight to the proxy iframe, which can't load a
 * non-http scheme and shows the browser's "site can't be reached" page.
 */
function UnknownPage({ url, onNavigate }: { url: string; onNavigate: (url: string) => void }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.9rem", padding: "2rem", textAlign: "center", background: "var(--t-bg, #0d0d0d)", fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ padding: "0.4rem 0.75rem", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "999px", background: "rgba(255,255,255,0.04)", fontSize: "0.56rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
        page not found
      </div>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "#e8e8e8", wordBreak: "break-all" }}>{url}</p>
      <p style={{ margin: 0, fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", maxWidth: 380, lineHeight: 1.6 }}>
        That internal page doesn't exist. Check the address, or head back to the new tab page.
      </p>
      <button
        onClick={() => onNavigate("unstable://newtab")}
        style={{ marginTop: "0.3rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#e8e8e8", padding: "0.5rem 0.9rem", fontSize: "0.66rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Go home
      </button>
    </div>
  );
}

// ─── New tab page ─────────────────────────────────────────────────────────────

function NewTabPage({ onNavigate, customShortcuts, setCustomShortcuts, wallpaper, searchEngine, showMs }: {
  onNavigate: (url: string) => void;
  customShortcuts: Shortcut[];
  setCustomShortcuts: (s: Shortcut[]) => void;
  wallpaper?: string;
  searchEngine?: string;
  showMs?: boolean;
}) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState(""); const [newUrl, setNewUrl] = useState(""); const [newImg, setNewImg] = useState("");
  const [ntSuggestions, setNtSuggestions] = useState<string[]>([]);
  const [showNtSuggestions, setShowNtSuggestions] = useState(false);
  const [ntSuggestIndex, setNtSuggestIndex] = useState(-1);
  const ntSuggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ntSuggestListRef = useRef<HTMLDivElement>(null);
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const HIDDEN_DEFAULTS_KEY = "unstable-hidden-defaults";
  const [hiddenDefaultIds, setHiddenDefaultIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_DEFAULTS_KEY) || "[]"); } catch { return []; }
  });
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(() => loadWidgetConfig());
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  const [addHover, setAddHover] = useState(false);
  const { spring, transition, scale } = useMotionTokens();
  const reduceMotion = useShouldReduceMotion();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpenId(null);
      const el = target instanceof Element ? target : target.parentElement;
      if (!el?.closest("[data-widget-settings]")) setShowWidgetSettings(false);
    }
    function handleBlur() { setMenuOpenId(null); }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    clearTimeout(ntSuggestTimer.current);
    const q = input.trim();
    if (q.length < 2 || q.includes(".") || q.includes("/") || q.includes(" ")) {
      setShowNtSuggestions(false);
      return;
    }
    ntSuggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/return?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = await res.json();
        const phrases = (data as { phrase: string }[]).map(d => d.phrase).filter(p => p.toLowerCase().startsWith(q.toLowerCase()));
        setNtSuggestions(phrases);
        setShowNtSuggestions(phrases.length > 0);
        setNtSuggestIndex(-1);
      } catch {}
    }, 180);
  }, [input]);

  useEffect(() => {
    if (ntSuggestIndex < 0 || !ntSuggestListRef.current) return;
    const el = ntSuggestListRef.current.children[ntSuggestIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [ntSuggestIndex]);

  const all = [...DEFAULT_SHORTCUTS.filter(d => !hiddenDefaultIds.includes(d.id)), ...customShortcuts];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(input, searchEngine); if (url) onNavigate(url);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim(), rawUrl = newUrl.trim(); if (!name || !rawUrl) return;
    const url = normalizeUrl(rawUrl);
    let domain = ""; try { domain = new URL(url).hostname; } catch { }
    const favicon = newImg.trim() || faviconUrl(domain);
    if (editingShortcut) {
      if (DEFAULT_SHORTCUTS.find(d => d.id === editingShortcut.id)) {
        const updatedHidden = [...hiddenDefaultIds, editingShortcut.id];
        setHiddenDefaultIds(updatedHidden); localStorage.setItem(HIDDEN_DEFAULTS_KEY, JSON.stringify(updatedHidden));
      }
      let updated = customShortcuts.filter(s => s.id !== editingShortcut.id);
      updated = [...updated, { id: editingShortcut.id, name, url, favicon }];
      setCustomShortcuts(updated); saveCustomShortcuts(updated);
      setEditingShortcut(null);
    } else {
      const sc: Shortcut = { id: Math.random().toString(36).slice(2), name, url, favicon };
      const updated = [...customShortcuts, sc]; setCustomShortcuts(updated); saveCustomShortcuts(updated);
    }
    setAdding(false); setNewName(""); setNewUrl(""); setNewImg("");
  }

  function removeShortcut(id: string) {
    if (DEFAULT_SHORTCUTS.find(d => d.id === id)) {
      const updated = [...hiddenDefaultIds, id];
      setHiddenDefaultIds(updated); localStorage.setItem(HIDDEN_DEFAULTS_KEY, JSON.stringify(updated));
    } else {
      const updated = customShortcuts.filter(s => s.id !== id); setCustomShortcuts(updated); saveCustomShortcuts(updated);
    }
  }

  const inputSt: React.CSSProperties = { background: "var(--t-bg)", border: "1px solid var(--t-border-light)", color: "var(--t-text)", padding: "0.5rem 0.75rem", fontSize: "0.8rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "10px" };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition.reveal}
      style={{ 
        height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: wallpaper ? `var(--t-bg) url(${wallpaper}) center/cover no-repeat` : "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif" 
      }}
    >
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring.entrance}
        style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "1.75rem", padding: "2.5rem 3rem",
        background: wallpaper ? "color-mix(in srgb, var(--t-bg) 45%, transparent)" : "transparent",
        backdropFilter: wallpaper ? "blur(20px) saturate(1.3)" : "none",
        WebkitBackdropFilter: wallpaper ? "blur(20px) saturate(1.3)" : "none",
        borderRadius: "24px", border: wallpaper ? "1px solid var(--t-border-light)" : "none",
        boxShadow: wallpaper ? "0 8px 48px rgba(0,0,0,0.5)" : "none",
      }}>
      <div style={{ position: "relative", width: "100%" }}>
        <motion.button
          type="button"
          data-widget-settings
          aria-label="Widget settings"
          aria-expanded={showWidgetSettings}
          onClick={() => setShowWidgetSettings(v => !v)}
          className="widget-btn"
          whileTap={{ scale: scale.press }}
          transition={spring.press}
          style={{ position: "absolute", top: -8, right: -8, background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)", color: "var(--t-text-muted)", cursor: "pointer", padding: "5px", borderRadius: "6px", opacity: 0.5, zIndex: 10, lineHeight: 1 }}
        >
          <motion.span
            style={{ display: "flex" }}
            animate={{ rotate: reduceMotion ? 0 : showWidgetSettings ? 90 : 0 }}
            transition={transition.spin}
          >
            <Settings2 size={13} />
          </motion.span>
        </motion.button>
      </div>
      <WidgetBar config={widgetConfig} showMs={showMs} />
      <AnimatePresence>
        {showWidgetSettings && (
          <motion.div
            data-widget-settings
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion
              ? { opacity: 0, transition: transition.dismiss }
              : { opacity: 0, scale: 0.96, y: -4, transition: transition.dismiss }}
            transition={spring.pop}
            style={{ transformOrigin: "top center", background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)", borderRadius: "16px", padding: "0.75rem 1rem", width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: "0.35rem" }}
          >
            <p style={{ margin: 0, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--t-text-muted)" }}>Widgets</p>
            {(["clock", "date", "greeting", "quote", "branding"] as WidgetType[]).map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.68rem", color: "var(--t-text)", padding: "0.25rem 0" }}>
                <Checkbox
                  id={`widget-toggle-${t}`}
                  checked={widgetConfig.enabled.includes(t)}
                  onCheckedChange={() => {
                    const next = toggleWidget(widgetConfig, t);
                    setWidgetConfig(next);
                    saveWidgetConfig(next);
                  }}
                />
                <label htmlFor={`widget-toggle-${t}`} style={{ cursor: "pointer" }}>
                  {t === "clock" ? "Clock" : t === "date" ? "Date" : t === "greeting" ? "Greeting" : t === "quote" ? "Quote" : "Branding"}
                </label>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {widgetConfig.enabled.includes("branding") && (
      <motion.p
        initial={reduceMotion ? { opacity: 0 } : { y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...transition.reveal, delay: 0.05 }}
        style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--t-text-muted)", margin: 0 }}
      >unstable</motion.p>
      )}

      <motion.form
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.entrance, delay: 0.08 }}
        onSubmit={handleSearch}
        style={{ display: "flex", width: "100%", maxWidth: "520px", padding: "0 2rem" }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <input autoFocus value={input} onChange={e => { setInput(e.target.value); setNtSuggestIndex(-1); }} placeholder="search or enter a url"
            style={{ width: "100%", background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.045))", border: "1px solid rgba(255,255,255,0.24)", borderRight: "none", color: "var(--t-text)", padding: "0.75rem 1rem", fontSize: "0.85rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "0", backdropFilter: "blur(22px) saturate(1.18)", WebkitBackdropFilter: "blur(22px) saturate(1.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(255,255,255,0.06), 0 16px 48px rgba(0,0,0,0.2)", transition: "border-color 0.18s ease, box-shadow 0.18s ease" } as React.CSSProperties}
            onFocus={e => { if (ntSuggestions.length) setShowNtSuggestions(true); }}
            onBlur={e => { setTimeout(() => setShowNtSuggestions(false), 200); }}
            onKeyDown={e => {
              if (!showNtSuggestions || !ntSuggestions.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setNtSuggestIndex(i => Math.min(i + 1, ntSuggestions.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setNtSuggestIndex(i => Math.max(i - 1, -1)); }
              if (e.key === "Enter" && ntSuggestIndex >= 0) {
                e.preventDefault();
                const s = ntSuggestions[ntSuggestIndex];
                setInput(s); setShowNtSuggestions(false); setNtSuggestIndex(-1);
                onNavigate(searchUrl(s, searchEngine ?? "duckduckgo"));
              }
            }}
          />
          <AnimatePresence>
            {showNtSuggestions && (
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: transition.dismiss }}
                transition={spring.pop}
                style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000, background: "var(--t-bg-secondary)", border: "1px solid var(--t-border)", borderRadius: "0", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", transformOrigin: "top center" }}
              >
                <div ref={ntSuggestListRef} style={{ maxHeight: 160, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "var(--t-border) var(--t-bg-secondary)" }}>
                  {ntSuggestions.map((s, i) => (
                    <div key={s} onClick={() => { setInput(s); setShowNtSuggestions(false); setNtSuggestIndex(-1); onNavigate(searchUrl(s, searchEngine ?? "duckduckgo")); }}
                      style={{ padding: "0.6rem 0.9rem", fontSize: "0.8rem", color: "var(--t-text-secondary)", cursor: "pointer", borderBottom: "1px solid var(--t-border-light)", background: i === ntSuggestIndex ? "var(--t-bg-tertiary)" : "transparent", transition: "background 0.1s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--t-bg-tertiary)"; setNtSuggestIndex(i); }}
                      onMouseLeave={e => { if (ntSuggestIndex !== i) e.currentTarget.style.background = "transparent"; }}
                    >{s}</div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.button
          whileHover={{ background: "var(--t-accent-hover)" }}
          whileTap={{ scale: scale.press }}
          transition={spring.press}
          type="submit"
          style={{ background: "var(--t-accent)", color: "var(--t-accent-text)", border: "none", padding: "0.75rem 1.25rem", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", borderRadius: "0" }}
        >go</motion.button>
      </motion.form>

      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...transition.reveal, delay: 0.16 }}
        style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", justifyContent: "center", padding: "0 2rem", maxWidth: 600 }}
      >
        {all.map((sc, i) => (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring.entrance, delay: 0.22 + i * 0.045 }}
            key={sc.id}
            style={{ position: "relative" }}
            className="sc-wrap"
          >
            <motion.button
              whileHover={reduceMotion
                ? { background: "var(--t-bg-tertiary)" }
                : { y: -4, background: "var(--t-bg-tertiary)", boxShadow: "0 8px 20px rgba(0,0,0,0.22)" }}
              whileTap={{ scale: scale.press }}
              transition={spring.press}
              onClick={() => onNavigate(sc.url)}
              title={sc.name}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", padding: "0.55rem 0.4rem", borderRadius: "6px", transition: "background 0.15s", minWidth: "52px" }}
            >
              <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={sc.favicon && /^(https?:)?\/\//i.test(sc.favicon) ? sc.favicon : ""} alt={sc.name} width={24} height={24} style={{ borderRadius: "6px", objectFit: "contain" }}
                  onError={e => { const img = e.target as HTMLImageElement; img.style.display = "none"; const fb = img.nextSibling as HTMLElement; if (fb) fb.style.display = "flex"; }}
                />
                <span style={{ display: "none", width: 24, height: 24, background: "var(--t-bg-tertiary)", borderRadius: "6px", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "var(--t-text-secondary)", fontWeight: 600 }}>{sc.name[0]?.toUpperCase()}</span>
              </div>
              <span style={{ fontSize: "0.57rem", color: "var(--t-text-muted)", letterSpacing: "0.03em", maxWidth: "56px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.name}</span>
            </motion.button>
            <button onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === sc.id ? null : sc.id); }} className="sc-menu-btn" style={{ position: "absolute", top: 0, right: 0, background: "var(--t-bg-hover)", border: "none", color: "var(--t-text-muted)", borderRadius: "8px", width: 18, height: 18, fontSize: 11, cursor: "pointer", display: "none", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>⋮</button>
            <AnimatePresence>
              {menuOpenId === sc.id && (
                <motion.div
                  ref={menuRef}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: scale.menu, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduceMotion
                    ? { opacity: 0, transition: transition.dismiss }
                    : { opacity: 0, scale: 0.96, y: -3, transition: transition.dismiss }}
                  transition={spring.pop}
                  style={{ position: "absolute", top: 22, right: 0, zIndex: 1000, background: "var(--t-bg-secondary)", border: "1px solid var(--t-border)", borderRadius: "14px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", minWidth: 100, transformOrigin: "top right" }}
                >
                  <button onClick={() => { setMenuOpenId(null); setEditingShortcut(sc); setNewName(sc.name); setNewUrl(sc.url); setNewImg(sc.favicon === faviconUrl(extractDomain(sc.url)) ? "" : sc.favicon); setAdding(true); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "none", border: "none", color: "var(--t-text)", fontSize: "0.68rem", padding: "0.5rem 0.8rem", cursor: "pointer", textAlign: "left", fontFamily: "'Space Grotesk', sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}><Pencil size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Edit</button>
                  <button onClick={() => { setMenuOpenId(null); removeShortcut(sc.id); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "none", border: "none", color: "rgba(235,120,120,0.9)", fontSize: "0.68rem", padding: "0.5rem 0.8rem", cursor: "pointer", textAlign: "left", fontFamily: "'Space Grotesk', sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}><Trash2 size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Delete</button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
        {!adding && (
          <motion.button
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring.entrance, delay: 0.22 + all.length * 0.045 }}
            whileHover={{ background: "var(--t-bg-tertiary)" }}
            whileTap={{ scale: scale.press }}
            onMouseEnter={() => setAddHover(true)}
            onMouseLeave={() => setAddHover(false)}
            onClick={() => setAdding(true)}
            title="Add shortcut"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", padding: "0.55rem 0.4rem", borderRadius: "6px", transition: "background 0.15s", minWidth: "52px" }}
          >
            <div style={{ width: 28, height: 28, borderRadius: "6px", border: "1px dashed var(--t-border-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "var(--t-text-muted)" }}>
              <motion.span
                style={{ display: "flex", lineHeight: 1 }}
                animate={{ rotate: reduceMotion ? 0 : addHover ? 90 : 0 }}
                transition={transition.spin}
              >+</motion.span>
            </div>
            <span style={{ fontSize: "0.57rem", color: "var(--t-text-muted)", letterSpacing: "0.03em" }}>add</span>
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>
        {adding && (
          <motion.form
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0, transition: transition.dismiss } : { opacity: 0, scale: 0.92, y: 10, transition: transition.dismiss }}
            transition={spring.pop}
            onSubmit={handleAdd}
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem", background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)", borderRadius: "18px", padding: "1rem 1.25rem", width: "100%", maxWidth: "300px" }}
          >
            <p style={{ margin: 0, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--t-text-muted)" }}>{editingShortcut ? "edit shortcut" : "new shortcut"}</p>
            <input autoFocus placeholder="name" value={newName} onChange={e => setNewName(e.target.value)} style={inputSt} onFocus={e => e.target.style.borderColor = "var(--t-border)"} onBlur={e => e.target.style.borderColor = "var(--t-border-light)"} />
            <input placeholder="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={inputSt} onFocus={e => e.target.style.borderColor = "var(--t-border)"} onBlur={e => e.target.style.borderColor = "var(--t-border-light)"} />
            <input placeholder="image url (optional)" value={newImg} onChange={e => setNewImg(e.target.value)} style={inputSt} onFocus={e => e.target.style.borderColor = "var(--t-border)"} onBlur={e => e.target.style.borderColor = "var(--t-border-light)"} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <motion.button whileTap={{ scale: scale.press }} transition={spring.press} type="submit" style={{ flex: 1, background: "var(--t-accent)", color: "var(--t-accent-text)", border: "none", padding: "0.5rem", fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px" }}>{editingShortcut ? "save" : "add"}</motion.button>
              <motion.button whileTap={{ scale: scale.press }} transition={spring.press} type="button" onClick={() => { setAdding(false); setEditingShortcut(null); setNewName(""); setNewUrl(""); setNewImg(""); }} style={{ flex: 1, background: "none", color: "var(--t-text-muted)", border: "1px solid var(--t-border-light)", padding: "0.5rem", fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", borderRadius: "10px" }}>cancel</motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <style>{`.sc-wrap:hover .sc-menu-btn{display:flex!important} input::placeholder{color:rgba(255,255,255,0.2)} .widget-btn:hover{opacity:1!important}`}</style>
      </motion.div>
    </motion.div>
  );
}

function WidgetBar({ config, showMs }: { config: WidgetConfig; showMs?: boolean }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [greeting, setGreeting] = useState("");
  const { spring } = useMotionTokens();
  const reduceMotion = useShouldReduceMotion();
  useEffect(() => {
    setGreeting(getGreeting());
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);
  if (!config.enabled.length) return null;
  return (
    <motion.div initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={spring.entrance} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", marginBottom: "0.5rem" }}>
      {config.enabled.includes("clock") && (
        <ClockWidget showMs={showMs} />
      )}
      {config.enabled.includes("date") && (
        <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--t-text-muted)", letterSpacing: "0.02em" }}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      )}
      {config.enabled.includes("greeting") && (
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--t-text-secondary)", letterSpacing: "0.02em" }}>{greeting}</p>
      )}
      {config.enabled.includes("quote") && quote && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.6rem", color: "var(--t-text-muted)", fontStyle: "italic", maxWidth: 400, textAlign: "center", letterSpacing: "0.01em", lineHeight: 1.4 }}>"{quote.text}"</p>
          <p style={{ margin: 0, fontSize: "0.55rem", color: "var(--t-text-muted)", opacity: 0.7, textAlign: "center", letterSpacing: "0.02em" }}>— {quote.author}</p>
        </div>
      )}
    </motion.div>
  );
}

const CLOCK_FACE: React.CSSProperties = {
  margin: 0,
  display: "flex",
  alignItems: "baseline",
  gap: "0.02em",
  fontSize: "3rem",
  fontWeight: 200,
  color: "var(--t-text)",
  letterSpacing: "0.02em",
  lineHeight: 1.1,
  fontVariantNumeric: "tabular-nums",
};

/** Two digits that roll on their own, so the clock keeps a steady width. */
const CLOCK_ROLL = { stiffness: 400, damping: 34, mass: 0.3 };

function ClockPair({ value }: { value: number }) {
  return (
    <span aria-hidden="true" style={{ display: "inline-flex" }}>
      <SlidingNumber number={Math.floor(value / 10)} transition={CLOCK_ROLL} />
      <SlidingNumber number={value % 10} transition={CLOCK_ROLL} />
    </span>
  );
}

const ClockWidget = memo(function ClockWidget({ showMs }: { showMs?: boolean }) {
  const { spring } = useMotionTokens();
  const reduceMotion = useShouldReduceMotion();
  const hour12 = useMemo(
    () => new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12 ?? false,
    []
  );
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      const next = new Date();
      setNow(next);
      timer = setTimeout(tick, 1000 - next.getMilliseconds());
    }
    timer = setTimeout(tick, 1000 - Date.now() % 1000);
    return () => clearTimeout(timer);
  }, []);

  const hours24 = now.getHours();
  const hour = hour12 ? (hours24 % 12 || 12) : hours24;
  const label = `${hour}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  const colon: React.CSSProperties = { opacity: 0.45 };

  return (
    <motion.p
      initial={reduceMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.entrance}
      style={CLOCK_FACE}
    >
      <span className="sr-only">{label}</span>
      {hour12 ? (
        <SlidingNumber aria-hidden="true" number={hour} transition={CLOCK_ROLL} />
      ) : (
        <ClockPair value={hour} />
      )}
      <span aria-hidden="true" style={colon}>:</span>
      <ClockPair value={now.getMinutes()} />
      <span aria-hidden="true" style={colon}>:</span>
      <ClockPair value={now.getSeconds()} />
      {showMs && (
        <span style={{ fontSize: "0.8rem", fontWeight: 300, opacity: 0.3, fontVariantNumeric: "tabular-nums", marginLeft: "0.15rem" }}>
          {String(now.getMilliseconds()).padStart(3, "0")}
        </span>
      )}
    </motion.p>
  );
});

const ENTRY_BTN: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "0.65rem", cursor: "pointer",
  padding: "0.55rem 0.75rem", borderRadius: "8px", border: "none",
  background: "transparent", color: "var(--t-text)", fontFamily: "'Space Grotesk', sans-serif",
  textAlign: "left", width: "100%", transition: "background 0.12s",
};

function HistoryPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof getHistory>>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = search.trim() ? await searchHistory(search) : await getHistory(200);
    setEntries(data);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof entries> = {};
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    for (const e of entries) {
      const d = new Date(e.visitedAt);
      const key = d >= today ? "Today" : d >= yesterday ? "Yesterday" : d >= weekAgo ? "This Week" : "Older";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return groups;
  }, [entries]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--t-border-light)", display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        <HistoryIcon size={16} />
        <h2 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--t-text)", flex: 1, letterSpacing: "0.01em" }}>History</h2>
        <input placeholder="search history..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)", color: "var(--t-text)", padding: "0.35rem 0.65rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "6px", width: 200 }}
        />
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={async () => { await clearHistory(); load(); }}
          style={{ background: "none", border: "1px solid rgba(255,100,100,0.3)", color: "rgba(255,120,120,0.8)", padding: "0.35rem 0.7rem", borderRadius: "6px", fontSize: "0.6rem", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: "0.3rem" }}
        ><Trash2 size={12} /> Clear</motion.button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1.5rem" }}>
        {loading ? (
          <p style={{ textAlign: "center", marginTop: "3rem", color: "var(--t-text-muted)", fontSize: "0.7rem" }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: "3rem", color: "var(--t-text-muted)", fontSize: "0.7rem" }}>{search ? "No results" : "No history yet"}</p>
        ) : (
          Object.entries(grouped).map(([label, items]) => (
            <div key={label} style={{ marginBottom: "1rem" }}>
              <p style={{ margin: "0 0 0.35rem 0.2rem", fontSize: "0.58rem", color: "var(--t-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                {items.map(e => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
                    onMouseEnter={e2 => { const t = e2.currentTarget.querySelector(".hist-del") as HTMLElement; if (t) t.style.opacity = "1"; }}
                    onMouseLeave={e2 => { const t = e2.currentTarget.querySelector(".hist-del") as HTMLElement; if (t) t.style.opacity = "0"; }}
                  >
                    <button onClick={() => onNavigate(e.url)} style={ENTRY_BTN}
                      onMouseEnter={e2 => e2.currentTarget.style.background = "var(--t-bg-secondary)"}
                      onMouseLeave={e2 => e2.currentTarget.style.background = "transparent"}
                    >
                      {e.favicon ? <img src={e.favicon} alt="" width={16} height={16} style={{ borderRadius: 3, flexShrink: 0 }} onError={e2 => { (e2.target as HTMLImageElement).style.display = "none"; }} /> : <Globe size={14} style={{ flexShrink: 0, color: "var(--t-text-muted)" }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 500, color: "var(--t-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</p>
                        <p style={{ margin: "0.05rem 0 0", fontSize: "0.55rem", color: "var(--t-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.url}</p>
                      </div>
                      <span style={{ fontSize: "0.52rem", color: "var(--t-text-muted)", flexShrink: 0, whiteSpace: "nowrap" }}>{new Date(e.visitedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                    </button>
                    <button onClick={async () => { await deleteHistoryEntry(e.id); load(); }}
                      className="hist-del"
                      style={{ opacity: 0, background: "none", border: "none", color: "rgba(255,120,120,0.6)", cursor: "pointer", padding: "4px", borderRadius: "0", transition: "opacity 0.15s", flexShrink: 0 }}
                      onMouseEnter={e2 => e2.currentTarget.style.background = "var(--t-bg-secondary)"}
                      onMouseLeave={e2 => e2.currentTarget.style.background = "transparent"}
                    ><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function BookmarksPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof getBookmarks>>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = search.trim() ? await searchBookmarks(search) : await getBookmarks();
    setEntries(data);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--t-border-light)", display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        <Bookmark size={16} />
        <h2 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--t-text)", flex: 1, letterSpacing: "0.01em" }}>Bookmarks</h2>
        <input placeholder="search bookmarks..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)", color: "var(--t-text)", padding: "0.35rem 0.65rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "6px", width: 200 }}
        />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1.5rem" }}>
        {loading ? (
          <p style={{ textAlign: "center", marginTop: "3rem", color: "var(--t-text-muted)", fontSize: "0.7rem" }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: "3rem", color: "var(--t-text-muted)", fontSize: "0.7rem" }}>{search ? "No results" : "No bookmarks yet"}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem" }}>
            {entries.map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid var(--t-border-light)", background: "var(--t-bg-secondary)", position: "relative" }}
                onMouseEnter={e2 => { const t = e2.currentTarget.querySelector(".bm-del") as HTMLElement; if (t) t.style.opacity = "1"; }}
                onMouseLeave={e2 => { const t = e2.currentTarget.querySelector(".bm-del") as HTMLElement; if (t) t.style.opacity = "0"; }}
              >
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onNavigate(e.url)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    {e.favicon ? <img src={e.favicon} alt="" width={18} height={18} style={{ borderRadius: 4, flexShrink: 0 }} onError={e2 => { (e2.target as HTMLImageElement).style.display = "none"; }} /> : <Bookmark size={14} style={{ flexShrink: 0, color: "var(--t-accent)" }} />}
                    <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 500, color: "var(--t-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</p>
                  </div>
                  <p style={{ margin: "0.1rem 0 0 1.55rem", fontSize: "0.55rem", color: "var(--t-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.url}</p>
                </div>
                <button onClick={async () => { await removeBookmark(e.id); load(); }}
                  className="bm-del"
                  style={{ opacity: 0, background: "none", border: "none", color: "rgba(255,120,120,0.6)", cursor: "pointer", padding: "4px", borderRadius: "0", transition: "opacity 0.15s", flexShrink: 0 }}
                  onMouseEnter={e2 => e2.currentTarget.style.background = "var(--t-bg-hover)"}
                  onMouseLeave={e2 => e2.currentTarget.style.background = "transparent"}
                ><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DownloadsPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [entries, setEntries] = useState<DownloadEntry[]>(() => getDownloads());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");

  const refresh = useCallback(() => setEntries(getDownloads()), []);

  useEffect(() => {
    const unsub = subscribe(refresh);
    return unsub;
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = entries;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d => d.filename.toLowerCase().includes(q) || d.url.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sortBy === "name") sorted.sort((a, b) => a.filename.localeCompare(b.filename));
    else if (sortBy === "size") sorted.sort((a, b) => b.totalBytes - a.totalBytes);
    else sorted.sort((a, b) => b.startedAt - a.startedAt);
    return sorted;
  }, [entries, search, sortBy]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--t-border-light)", display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        <Download size={16} />
        <h2 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--t-text)", flex: 1, letterSpacing: "0.01em" }}>Downloads</h2>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search downloads…"
          style={{ background: "var(--t-bg-tertiary)", border: "1px solid var(--t-border-light)", borderRadius: "6px", padding: "0.3rem 0.6rem", fontSize: "0.65rem", color: "var(--t-text)", outline: "none", width: 160, fontFamily: "'Space Grotesk', sans-serif" }}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{ background: "var(--t-bg-tertiary)", border: "1px solid var(--t-border-light)", borderRadius: "6px", padding: "0.3rem 0.4rem", fontSize: "0.6rem", color: "var(--t-text)", outline: "none", fontFamily: "'Space Grotesk', sans-serif" }}>
          <option value="date">Newest</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
        {entries.length > 0 && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { clearDownloads(); refresh(); }}
            style={{ background: "none", border: "1px solid rgba(255,100,100,0.3)", color: "rgba(255,120,120,0.8)", padding: "0.35rem 0.7rem", borderRadius: "6px", fontSize: "0.6rem", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: "0.3rem" }}
          ><Trash2 size={12} /> Clear all</motion.button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1.5rem" }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: "3rem", color: "var(--t-text-muted)", fontSize: "0.7rem" }}>
            {search ? "No matching downloads" : "No downloads yet"}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {filtered.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.6rem 0.75rem", borderRadius: "8px", background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)" }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: "var(--t-bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Download size={14} style={{ color: d.state === "complete" ? "var(--t-accent)" : d.state === "error" ? "rgba(255,120,120,0.7)" : "var(--t-text-muted)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 500, color: "var(--t-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.filename}</p>
                  <p style={{ margin: "0.05rem 0 0", fontSize: "0.55rem", color: "var(--t-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.state === "complete" && `${formatBytes(d.totalBytes)} · ${new Date(d.completedAt || d.startedAt).toLocaleDateString()}`}
                    {d.state === "error" && `Failed${d.errorMessage ? ": " + d.errorMessage : ""}`}
                    {d.state === "in-progress" && (
                      <span>{d.totalBytes > 0 ? `${formatBytes(d.downloadedBytes)} / ${formatBytes(d.totalBytes)}` : formatBytes(d.downloadedBytes)}{d.speedBytesPerSec ? ` · ${formatSpeed(d.speedBytesPerSec)}` : ""}</span>
                    )}
                  </p>
                  {d.state === "in-progress" && d.totalBytes > 0 && (
                    <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: "var(--t-bg-tertiary)", overflow: "hidden" }}>
                      <motion.div animate={{ width: `${Math.min((d.downloadedBytes / d.totalBytes) * 100, 100)}%` }}
                        style={{ height: "100%", borderRadius: 2, background: "var(--t-accent, #5898d4)", transition: "width 0.3s ease" }} />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                  {d.state === "complete" && (
                    <button onClick={() => onNavigate(d.url)}
                      style={{ background: "var(--t-bg-tertiary)", border: "none", color: "var(--t-text-secondary)", cursor: "pointer", padding: "5px 8px", borderRadius: "6px", fontSize: "0.6rem", fontFamily: "'Space Grotesk', sans-serif" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--t-bg-tertiary)"}
                    ><ExternalLink size={12} /></button>
                  )}
                  {d.state === "error" && (
                    <button onClick={() => retryDownload(d.id)}
                      style={{ background: "var(--t-bg-tertiary)", border: "none", color: "var(--t-text-secondary)", cursor: "pointer", padding: "5px 8px", borderRadius: "6px", fontSize: "0.6rem", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: "0.2rem" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--t-bg-tertiary)"}
                    ><RefreshCw size={11} /> Retry</button>
                  )}
                  {d.state === "in-progress" ? (
                    <button onClick={() => { cancelDownload(d.id); }}
                      style={{ background: "none", border: "none", color: "rgba(255,120,120,0.6)", cursor: "pointer", padding: "5px", borderRadius: "6px" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-tertiary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    ><X size={12} /></button>
                  ) : (
                    <button onClick={() => { removeDownload(d.id); refresh(); }}
                      style={{ background: "none", border: "none", color: "rgba(255,120,120,0.6)", cursor: "pointer", padding: "5px", borderRadius: "6px" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-tertiary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    ><X size={12} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Split pane header ────────────────────────────────────────────────────────

/** Height of the split pane header bar; the keep-alive stage lays tabs out to match. */
const SPLIT_HEADER_H = 26;
/** Thickness of the split divider. */
const D = 4;

function SplitHeader({ tab, onSwap, onClose, style }: { tab: Tab; onSwap: () => void; onClose: () => void; style?: React.CSSProperties }) {
  const label = tab.title || getDomainFromProxyUrl(tab.url) || "New Tab";
  const hdrBtn: React.CSSProperties = { background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: "2px", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div onClick={onSwap} title="Click to swap sides" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.45rem", background: "#0c0c0c", borderBottom: "1px solid #1a1a1a", flexShrink: 0, fontSize: "0.62rem", color: "rgba(255,255,255,0.55)", userSelect: "none", cursor: "pointer", overflow: "hidden", boxSizing: "border-box", ...style }}>
      {tab.favicon ? <img src={tab.favicon} alt="" width={12} height={12} style={{ borderRadius: 2, objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }} /> : <Globe size={12} style={{ opacity: 0.5 }} />}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <button title="Swap sides" style={hdrBtn} onClick={e => { e.stopPropagation(); onSwap(); }} onMouseEnter={e => e.currentTarget.style.color = "#e8e8e8"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}><ArrowLeftRight size={11} /></button>
      <button title="Close split" style={hdrBtn} onClick={e => { e.stopPropagation(); onClose(); }} onMouseEnter={e => e.currentTarget.style.color = "#e8e8e8"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}><X size={11} /></button>
    </div>
  );
}

// ─── Browser tab ──────────────────────────────────────────────────────────────

// ─── QrCodeCanvas ─────────────────────────────────────────────────────────────

function QrCodeCanvas({ url, size = 160 }: { url: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { default: QRCode } = await import("qrcode");
        if (!cancelled && canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, url, { width: size, margin: 1, color: { dark: "#0d0d0d", light: "#ffffff" } });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [url, size]);
  return (
    <div style={{ width: size + 24, height: size + 24, display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: "8px", padding: 8 }}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
    </div>
  );
}

/**
 * Hosts a captured preview canvas. The capture is often CORS-tainted (proxied
 * pages load assets from other origins), which blocks reading it back but not
 * painting it, so the canvas element itself is adopted into the card.
 */
function PreviewSurface({ canvas }: { canvas: HTMLCanvasElement | undefined }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    if (canvas) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      host.appendChild(canvas);
    }
    return () => { canvas?.remove(); };
  }, [canvas]);
  return <div ref={hostRef} style={{ width: "100%", height: "100%", background: "#0a0a0a" }} />;
}

/**
 * Deterministic stand-in preview for when no capture exists yet (a tab that was
 * never on screen, a page that refuses to rasterise, a brand-new tab). It looks
 * like a page rather than an empty box, so the hover card is never blank.
 */
function makeFallbackPreview(title: string, url: string): HTMLCanvasElement {
  const W = 280;
  const H = 160;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  let seed = 0;
  for (let i = 0; i < url.length; i++) seed = (seed * 31 + url.charCodeAt(i)) % 360;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, `hsl(${seed}, 30%, 17%)`);
  grad.addColorStop(1, `hsl(${(seed + 52) % 360}, 36%, 9%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Faint grid, so it reads as a rendered page rather than a flat swatch.
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let x = 20; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
  for (let y = 20; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
  // Window chrome.
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(0, 0, W, 18);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(11 + i * 8, 9, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Monogram + label.
  const label = (title || "New Tab").trim() || "New Tab";
  ctx.beginPath();
  ctx.arc(W / 2, 78, 28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "600 28px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillText(label.charAt(0).toUpperCase(), W / 2, 80);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "500 11px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillText(label.length > 32 ? `${label.slice(0, 32)}…` : label, W / 2, 126);
  return canvas;
}

/** Preview bitmap size, in CSS pixels, used by every tab thumbnail. */
const PREVIEW_W = 280;
const PREVIEW_H = 160;
/** Upper bound on elements inspected per thumbnail; keeps a build in the ~ms range. */
const PREVIEW_NODE_BUDGET = 300;
/** Tabs kept mounted (active included) so switching back is instant, not a reload. */
const KEEP_ALIVE_TABS = 3;

/** True when the element directly contains visible text (not just child boxes). */
function hasOwnText(el: Element): boolean {
  const nodes = el.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.nodeType === 3 && (n.textContent || "").trim()) return true;
  }
  return false;
}

/**
 * Our own page thumbnailer.
 *
 * A cross-document iframe cannot be screenshotted from the parent page
 * (Chromium refuses to draw one into a canvas), and DOM-cloning libraries
 * rasterise the entire tree — far too heavy to run while hovering. This walks
 * the live document instead and paints a coarse block map: element backgrounds,
 * media placeholders and text runs, clipped to the viewport and scaled into the
 * card. It only reads layout that already exists, never clones anything, and
 * stops after a small node budget, so a build costs a couple of milliseconds.
 *
 * Returns the canvas plus how many shapes were painted; too few means the page
 * gave us nothing recognisable and the caller should keep the fallback.
 */
function paintPagePreview(root: Element, viewW: number, viewH: number, win?: Window | null): { canvas: HTMLCanvasElement; painted: number } {
  const canvas = document.createElement("canvas");
  canvas.width = PREVIEW_W;
  canvas.height = PREVIEW_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, painted: 0 };
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
  if (!viewW || !viewH) return { canvas, painted: 0 };

  const styleOf = win?.getComputedStyle ? win.getComputedStyle.bind(win) : getComputedStyle;
  const sx = PREVIEW_W / viewW;
  const sy = PREVIEW_H / viewH;
  const queue: Element[] = [root];
  let head = 0;
  let painted = 0;
  let budget = PREVIEW_NODE_BUDGET;

  while (head < queue.length && budget > 0) {
    const el = queue[head++];
    budget--;
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "LINK" || tag === "META" || tag === "HEAD" || tag === "NOSCRIPT" || tag === "TEMPLATE") continue;

    let rect: DOMRect;
    try { rect = el.getBoundingClientRect(); } catch { continue; }
    if (rect.width < 2 || rect.height < 2) continue;
    if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= viewH || rect.left >= viewW) continue;

    let cs: CSSStyleDeclaration | null = null;
    try { cs = styleOf(el); } catch { /* detached or unreadable: draw from layout alone */ }
    if (cs && (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity || "1") < 0.05)) continue;

    const x = Math.max(0, rect.left * sx);
    const y = Math.max(0, rect.top * sy);
    const w = Math.min(PREVIEW_W - x, rect.width * sx);
    const h = Math.min(PREVIEW_H - y, rect.height * sy);
    if (w >= 1 && h >= 1) {
      if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS" || tag === "SVG" || tag === "PICTURE") {
        // Media is never drawn (it would taint the canvas); a soft box stands in.
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(x, y, w, h);
        painted++;
      } else if (cs) {
        const bg = cs.backgroundColor;
        if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
          ctx.fillStyle = bg;
          ctx.fillRect(x, y, w, h);
          painted++;
        }
      }
      // Text becomes a low-alpha bar: enough to read the shape of the page.
      if (cs && hasOwnText(el)) {
        const fontSize = parseFloat(cs.fontSize) || 14;
        const barH = Math.max(1.5, Math.min(h, fontSize * sy * 0.85));
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = cs.color || "#e8e8e8";
        ctx.fillRect(x, y + Math.min(h - barH, h * 0.12), Math.min(w, Math.max(4, w * 0.9)), barH);
        ctx.globalAlpha = 1;
        painted++;
      }
    }

    const kids = el.childElementCount;
    for (let i = 0; i < kids && budget > 0 && queue.length < PREVIEW_NODE_BUDGET * 3; i++) queue.push(el.children[i]);
  }

  return { canvas, painted };
}

/** Runs `fn` when the browser is idle, so a thumbnail never competes with input. */
function runWhenIdle(fn: () => void, timeout = 300): void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(fn, { timeout });
  else setTimeout(fn, 40);
}

function BrowserTab({ tab, isActive, onActivate, onClose, onRefresh, onDuplicate, onCloseRight, onCloseOthers, onSplit, onToggleMute, onTogglePin, inSplit, thumbnail, readMemory, requestPreview }: {
  tab: Tab; isActive: boolean; onActivate: () => void; onClose: () => void;
  onRefresh?: () => void; onDuplicate?: () => void; onCloseRight?: () => void; onCloseOthers?: () => void; onSplit?: () => void; onToggleMute?: () => void; onTogglePin?: () => void; inSplit?: boolean;
  /** Captured screenshot of the tab's page, if one could be taken. */
  thumbnail?: HTMLCanvasElement;
  /** Measures this tab's memory (MB) — the tab strip owns the iframes. */
  readMemory?: () => number | null;
  /** Asks the shell for a fresh preview screenshot when the card opens. */
  requestPreview?: () => void;
}) {
  const rawLabel = tab.url ? (tab.title || getDomainFromProxyUrl(tab.url) || "Loading…") : "New Tab";
  const label = rawLabel.length > 20 ? rawLabel.slice(0, 20) + "…" : rawLabel;
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });
  const ctxRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPreview, setPreviewVisible] = useState(false);
  const [previewPos, setPreviewPos] = useState<{ left: number; top: number } | null>(null);
  const [memoryMb, setMemoryMb] = useState<number | null>(null);

  const CARD_W = 300;

  // The hover card sits above the context menu, so it must never be visible
  // while the menu is open — otherwise it covers the menu items.
  const ctxOpenRef = useRef(false);

  /** Always-available stand-in so the card shows a picture even with no capture. */
  const fallbackPreview = useMemo(
    () => makeFallbackPreview(tab.title || rawLabel, tab.url || "unstable://newtab"),
    [tab.title, tab.url, rawLabel],
  );

  /** Portalled to <body>: the tab has overflow:hidden, so an inline popup would be clipped away. */
  function openPreview() {
    if (ctxOpenRef.current) return;
    const el = tabRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    requestPreview?.();
    const cardH = 264;
    let left = rect.left + rect.width / 2 - CARD_W / 2;
    left = Math.max(8, Math.min(window.innerWidth - CARD_W - 8, left));
    let top = rect.bottom + 6;
    if (top + cardH > window.innerHeight - 8) top = Math.max(8, rect.top - cardH - 6);
    setPreviewPos({ left, top });
    setPreviewVisible(true);
  }
  function closePreview() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setPreviewVisible(false);
    setPreviewPos(null);
  }

  useEffect(() => {
    return () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); };
  }, []);

  // Opening the tab's context menu dismisses the card immediately.
  useEffect(() => {
    ctxOpenRef.current = ctxOpen;
    if (ctxOpen) closePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxOpen]);

  // Keep the figure live while the card is open, like the browser's own card.
  useEffect(() => {
    if (!showPreview) return;
    const read = () => setMemoryMb(readMemory ? readMemory() : null);
    read();
    const id = setInterval(read, 1000);
    return () => clearInterval(id);
  }, [showPreview, readMemory, tab.id]);

  const fullUrl = tab.url
    ? (tab.url.startsWith("unstable://") ? tab.url : (getDomainFromProxyUrl(tab.url) || decodeProxyUrl(tab.url)))
    : "New tab";
  const memLabel = memoryMb == null ? "unavailable" : `${memoryMb < 10 ? memoryMb.toFixed(1) : Math.round(memoryMb)} MB`;

  const previewCard = showPreview && previewPos && !ctxOpen ? createPortal(
    <div style={{ position: "fixed", left: previewPos.left, top: previewPos.top, width: CARD_W, zIndex: 6000, pointerEvents: "none", fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ background: "#111", border: "1px solid #262626", borderRadius: 10, padding: 10, boxShadow: "0 16px 44px rgba(0,0,0,0.65)" }}>
        <p title={tab.title || rawLabel} style={{ margin: 0, fontSize: "0.78rem", color: "#eef0f3", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tab.title || rawLabel}
        </p>
        <p title={fullUrl} style={{ margin: "2px 0 0", fontSize: "0.66rem", color: "rgba(255,255,255,0.38)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fullUrl}
        </p>
        <div style={{ marginTop: 8, width: "100%", height: 158, borderRadius: 6, overflow: "hidden", background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)", position: "relative" }}>
          <PreviewSurface canvas={thumbnail ?? fallbackPreview} />
          {tab.favicon && (
            <img src={tab.favicon} alt="" width={16} height={16}
              style={{ position: "absolute", right: 6, bottom: 6, borderRadius: 3, objectFit: "contain", opacity: 0.85, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))" }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          )}
        </div>
        <div title={memoryMb == null ? "Memory reporting is unavailable for this page." : "JavaScript heap used by this tab's frame."} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <MemoryStick size={13} style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0 }} />
          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.55)" }}>Memory usage: {memLabel}</span>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxOpen(false);
    }
    function handleBlur() { setCtxOpen(false); }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("blur", handleBlur);
    return () => { document.removeEventListener("mousedown", handleClick); window.removeEventListener("blur", handleBlur); };
  }, []);

  return (
    <motion.div ref={tabRef} layout="position" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8, width: 0, paddingLeft: 0, paddingRight: 0, borderRightWidth: 0 }} transition={{ duration: 0.18, ease: "easeInOut" }}
      onClick={onActivate} onMouseDown={e => { if (e.button === 1) { e.preventDefault(); onClose(); } }} onContextMenu={e => { e.preventDefault(); closePreview(); ctxOpenRef.current = true; setCtxPos({ x: e.clientX, y: e.clientY }); setCtxOpen(true); }}
      onMouseEnter={() => { setHovered(true); if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); hoverTimerRef.current = setTimeout(openPreview, 500); }}
      onMouseLeave={() => { setHovered(false); closePreview(); }}
      style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0 0.5rem 0 0.7rem", height: "100%", cursor: "pointer", background: isActive ? (tab.incognito ? "#14121a" : "#111") : hovered ? "#0f0f0f" : "transparent", borderRight: "1px solid #1a1a1a", width: 160, flexShrink: 0, transition: "background 0.1s", position: "relative", overflow: "hidden" }}
    >
      <div style={{ width: 14, height: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {tab.loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.6)" }} />
          : tab.favicon ? <img src={tab.favicon} alt="" width={14} height={14} style={{ borderRadius: "10px", objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
            : <Globe size={14} strokeWidth={1.5} style={{ opacity: 0.35 }} />
        }
      </div>
      <motion.span layout style={{ flex: 1, fontSize: "0.7rem", color: isActive ? "#e0e0e0" : "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>{label}</motion.span>
      {tab.incognito && <EyeOff size={10} style={{ flexShrink: 0, opacity: 0.5 }} />}
      {tab.pinned && <Pin size={10} style={{ flexShrink: 0, opacity: 0.55 }} />}
      {tab.muted && <VolumeX size={11} style={{ flexShrink: 0, opacity: 0.55 }} />}
      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={e => { e.stopPropagation(); onClose(); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.22)", cursor: "pointer", padding: "1px 3px", fontSize: 13, lineHeight: 1, borderRadius: "10px", flexShrink: 0 }}
        onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"}
        onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.22)"}
      >×</motion.button>
      <AnimatePresence>
        {ctxOpen && (
          <motion.div ref={ctxRef} initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ position: "fixed", top: ctxPos.y, left: ctxPos.x, zIndex: 2000, background: "#111", border: "1px solid #222", borderRadius: "6px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", minWidth: 160 }}>
            <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onClose(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><X size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Close tab</motion.button>
            {tab.url && <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onRefresh?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><RefreshCw size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Refresh tab</motion.button>}
            {tab.url && <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onDuplicate?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><Copy size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Duplicate tab</motion.button>}
            <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onTogglePin?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><Pin size={12} style={{ opacity: 0.7, flexShrink: 0 }} />{tab.pinned ? "Unpin tab" : "Pin tab"}</motion.button>
            {tab.url && <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onSplit?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><Columns2 size={12} style={{ opacity: 0.7, flexShrink: 0 }} />{inSplit ? "Close split" : "Split view"}</motion.button>}
            {tab.url && <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onToggleMute?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}>{tab.muted ? <VolumeX size={12} style={{ opacity: 0.7, flexShrink: 0 }} /> : <Volume2 size={12} style={{ opacity: 0.7, flexShrink: 0 }} />}{tab.muted ? "Unmute tab" : "Mute tab"}</motion.button>}
            <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onCloseRight?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><ChevronRight size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Close tabs to right</motion.button>
            <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onCloseOthers?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><Layers size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Close other tabs</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      {previewCard}
    </motion.div>
  );
}

// ─── Browser app ──────────────────────────────────────────────────────────────

/** Renders a sidebar site's brand mark (real Spotify glyph) or its favicon. */
function SidebarSiteIcon({ site, size = 18 }: { site: SidebarSite; size?: number }) {
  if (site.icon === "spotify") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    );
  }
  let domain = "";
  try { domain = new URL(site.url).hostname; } catch { /* ignore */ }
  return (
    <img
      src={domain ? faviconUrl(domain) : "/favicon.svg"}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 4, objectFit: "contain", flexShrink: 0 }}
      onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
    />
  );
}

/** lucide `rotate-ccw-clock`, inlined to match the other sidebar brand marks. */
function RotateCcwClockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function CollapsedSidebar({
  activeUrl,
  onNavigate,
  canReturnToBrowse,
  tabs,
  activeTabId,
  onTabActivate,
  onTabClose,
  onNewTab,
  verticalTabs,
  onOpenLink,
  sidebarSites,
  pinnedTabsToSidebar,
  frontendOnly = false,
}: {
  activeUrl: string;
  onNavigate: (url: string) => void;
  canReturnToBrowse?: boolean;
  tabs?: Tab[];
  activeTabId?: string;
  onTabActivate?: (id: string) => void;
  onTabClose?: (id: string) => void;
  onNewTab?: () => void;
  verticalTabs?: boolean;
  /** Opens an external link through the proxy in a new in-app tab. */
  onOpenLink?: (url: string) => void;
  /** External sites pinned to the sidebar. */
  sidebarSites?: SidebarSite[];
  /** Surface pinned tabs in the sidebar. */
  pinnedTabsToSidebar?: boolean;
  /** Static frontend-only build: hide account/AI/chat entries. */
  frontendOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const sidebarW = 56;

  useEffect(() => { setExpanded(false); }, [verticalTabs]);

  const siteItems = (sidebarSites ?? []).map((site) => ({
    label: site.name,
    url: site.url,
    external: true,
    icon: ((props: { size?: number }) => <SidebarSiteIcon site={site} size={props.size} />) as ComponentType<{ size?: number; className?: string }>,
  }));

  const items: Array<{
    label: string;
    url: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    hidden?: boolean;
    external?: boolean;
  }> = [
    { label: canReturnToBrowse ? "Browse" : "Home", url: "unstable://newtab", icon: House },
    ...(frontendOnly ? [] : [{ label: "Profile", url: "unstable://profile", icon: UserIcon }]),
    { label: "Games", url: "unstable://games", icon: Gamepad },
    ...(frontendOnly ? [] : [
      { label: "AI", url: "unstable://ai", icon: Atom },
      { label: "Chat", url: "unstable://chat", icon: MessageCircle },
    ]),
    ...siteItems,
    { label: "Settings", url: "unstable://settings", icon: Settings },
  ];

  const currentPage = activeUrl.startsWith("unstable://") ? activeUrl : "";

  function isActive(url: string) {
    if (url === "unstable://newtab") return !activeUrl;
    return currentPage === url;
  }

  const games = items.find(i => i.url === "unstable://games");
  const settings = items.find(i => i.url === "unstable://settings");
  const middle = items.filter(i => i.url !== "unstable://profile" && i.url !== "unstable://settings");
  const pinnedTabs = pinnedTabsToSidebar ? (tabs ?? []).filter(t => t.pinned) : [];

  const iconBtn: React.CSSProperties = {
    width: 38, height: 38, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid transparent",
    background: "none", color: "rgba(255,255,255,0.28)",
    cursor: "pointer", transition: "background 0.12s, color 0.12s, border-color 0.12s",
  };

  const linkBtn: React.CSSProperties = {
    ...iconBtn,
    width: "auto", height: "auto", padding: "0.5rem 0.7rem", gap: "0.55rem", borderRadius: 10,
    justifyContent: "flex-start", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
    color: "rgba(255,255,255,0.5)", letterSpacing: "0.01em",
  };

  const tabLinkBtn: React.CSSProperties = {
    ...iconBtn,
    width: "auto", height: "auto", padding: "0.4rem 0.5rem", gap: "0.4rem", borderRadius: 8,
    justifyContent: "flex-start", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
    color: "rgba(255,255,255,0.45)", letterSpacing: "0.01em",
  };

  return (
    <motion.div
      animate={{ width: sidebarW }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      style={{
        flexShrink: 0,
        background: "#080808",
        borderRight: "1px solid #1a1a1a",
        display: "flex",
        flexDirection: "column",
        padding: "0.65rem 0",
        overflow: "hidden",
      }}
    >
      {/* TOP: profile uses the same subdued treatment as every other sidebar action. */}
      {!verticalTabs && !frontendOnly && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.55rem", marginBottom: "0.55rem" }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate("unstable://profile")}
            aria-label="Profile"
            data-tooltip="Profile"
            onMouseEnter={e => { if (activeUrl !== "unstable://profile") { e.currentTarget.style.background = "#0f0f0f"; e.currentTarget.style.borderColor = "#1b1b1b"; } }}
            onMouseLeave={e => { e.currentTarget.style.background = activeUrl === "unstable://profile" ? "#101010" : "none"; e.currentTarget.style.borderColor = activeUrl === "unstable://profile" ? "#1f1f1f" : "transparent"; }}
            style={{
              ...iconBtn,
              background: activeUrl === "unstable://profile" ? "#101010" : "none",
              borderColor: activeUrl === "unstable://profile" ? "#1f1f1f" : "transparent",
              width: 38,
              height: 38,
              padding: 0,
            }}
          >
            <UserIcon size={18} />
          </motion.button>
        </div>
      )}

      {/* MIDDLE: tabs (if verticalTabs) + Home, AI, Chat */}
      {verticalTabs && tabs && onTabActivate && onTabClose && onNewTab ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", gap: "0.15rem", alignItems: expanded ? "stretch" : "center" }}>
          {/* Tab list */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", width: "100%", display: "flex", flexDirection: "column", alignItems: expanded ? "stretch" : "center", padding: expanded ? "0 0.4rem" : 0 }}>
            {tabs.map(tab => {
              const active = tab.id === activeTabId;
              const rawLabel = tab.url ? (tab.title || getDomainFromProxyUrl(tab.url) || "Loading…") : "New Tab";
              const label = rawLabel.length > 14 ? rawLabel.slice(0, 14) + "…" : rawLabel;
              const s = expanded ? tabLinkBtn : iconBtn;
              return (
                <motion.div
                  key={tab.id}
                  layout
                  onClick={() => onTabActivate(tab.id)}
                  onMouseDown={e => { if (e.button === 1) { e.preventDefault(); onTabClose(tab.id); } }}
                  style={{
                    ...s,
                    marginBottom: "0.15rem",
                    background: active ? "#101010" : "none",
                    borderColor: active ? "#1f1f1f" : "transparent",
                    color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
                  }}
                  onMouseEnter={e => { const el = e.currentTarget; if (!active) { el.style.background = "#0f0f0f"; el.style.color = "rgba(255,255,255,0.55)"; el.style.borderColor = "#1b1b1b"; } }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.background = active ? "#101010" : "none"; el.style.color = active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)"; el.style.borderColor = active ? "#1f1f1f" : "transparent"; }}
                >
                  <div style={{ width: 18, height: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {tab.loading
                      ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.6)" }} />
                      : tab.favicon ? <img src={tab.favicon} alt="" width={18} height={18} style={{ borderRadius: "0", objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                    }
                  </div>
                  {expanded && (
                    <>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={e => { e.stopPropagation(); onTabClose(tab.id); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.22)", cursor: "pointer", padding: "1px 3px", fontSize: 12, lineHeight: 1, borderRadius: "10px", flexShrink: 0 }}
                        onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"}
                        onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.22)"}
                      >×</motion.button>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
          {/* + New Tab */}
          <div style={{ display: "flex", padding: expanded ? "0 0.4rem" : 0 }}>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onNewTab} style={{
              ...(expanded ? { ...linkBtn, justifyContent: "center", padding: "0.35rem 0.5rem", fontSize: "0.6rem" } : iconBtn),
              border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.25)" as const,
              width: expanded ? "100%" : 38, height: 38, flex: expanded ? 1 : undefined,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
            >
              {expanded ? "+ New Tab" : "+"}
            </motion.button>
          </div>
          {/* Middle nav items (Home, AI, Chat) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: expanded ? "stretch" : "center", gap: "0.55rem", padding: expanded ? "0 0.4rem" : 0 }}>
            {middle.filter(i => !i.hidden).map(({ label, url, icon: Icon, external }) => {
              const active = isActive(url);
              const s = expanded ? linkBtn : iconBtn;
              const brandColor = url.includes("open.spotify.com") ? "#1DB954" : null;
              return (
                <motion.button
                  key={url}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => (external ? onOpenLink?.(url) : onNavigate(url))}
                  data-tooltip={label} aria-label={label}
                  style={{
                    ...s,
                    background: active ? "#101010" : "none",
                    borderColor: active ? "#1f1f1f" : "transparent",
                    color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f"; (e.currentTarget as HTMLButtonElement).style.color = brandColor ?? "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b"; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? "#101010" : "none"; (e.currentTarget as HTMLButtonElement).style.color = active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)"; (e.currentTarget as HTMLButtonElement).style.borderColor = active ? "#1f1f1f" : "transparent"; }}
                >
                  <Icon size={18} />
                  {expanded && label}
                </motion.button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.55rem" }}>
            {pinnedTabs.length > 0 && (
              <>
                {pinnedTabs.map(tab => {
                  const active = tab.id === activeTabId;
                  const label = tab.title || getDomainFromProxyUrl(tab.url) || "Pinned tab";
                  return (
                    <motion.button
                      key={`pin-${tab.id}`}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onTabActivate?.(tab.id)}
                      data-tooltip={label} aria-label={label}
                      style={{
                        ...iconBtn,
                        background: active ? "#101010" : "none",
                        borderColor: active ? "#1f1f1f" : "transparent",
                        color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
                      }}
                      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b"; } }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? "#101010" : "none"; (e.currentTarget as HTMLButtonElement).style.color = active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)"; (e.currentTarget as HTMLButtonElement).style.borderColor = active ? "#1f1f1f" : "transparent"; }}
                    >
                      {tab.loading
                        ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.6)" }} />
                        : tab.favicon
                          ? <img src={tab.favicon} alt="" width={16} height={16} style={{ borderRadius: 4, objectFit: "contain" }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} />
                          : <Globe size={15} strokeWidth={1.5} />}
                    </motion.button>
                  );
                })}
                <div style={{ width: 22, height: 1, background: "rgba(255,255,255,0.08)", margin: "0.05rem 0" }} />
              </>
            )}
            {middle.filter(i => !i.hidden).map(({ label, url, icon: Icon, external }) => {
              const active = isActive(url);
              const brandColor = url.includes("open.spotify.com") ? "#1DB954" : null;
              return (
                <motion.button
                  key={url}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => (external ? onOpenLink?.(url) : onNavigate(url))}
                  data-tooltip={label} aria-label={label}
                  style={{
                    ...iconBtn,
                    background: active ? "#101010" : "none",
                    borderColor: active ? "#1f1f1f" : "transparent",
                    color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f"; (e.currentTarget as HTMLButtonElement).style.color = brandColor ?? "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b"; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? "#101010" : "none"; (e.currentTarget as HTMLButtonElement).style.color = active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)"; (e.currentTarget as HTMLButtonElement).style.borderColor = active ? "#1f1f1f" : "transparent"; }}
                >
                  <Icon size={18} />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* BOTTOM: Releases, GitHub, Discord, Settings */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.55rem" }}>
        {(() => {
          const active = activeUrl === "unstable://releases";
          const s = expanded ? linkBtn : iconBtn;
          return (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate("unstable://releases")}
              data-tooltip="Releases" aria-label="Releases"
              style={{
                ...s,
                background: active ? "#101010" : "none",
                borderColor: active ? "#1f1f1f" : "transparent",
                color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b"; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? "#101010" : "none"; (e.currentTarget as HTMLButtonElement).style.color = active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)"; (e.currentTarget as HTMLButtonElement).style.borderColor = active ? "#1f1f1f" : "transparent"; }}
            >
              <RotateCcwClockIcon size={18} />
              {expanded && "Releases"}
            </motion.button>
          );
        })()}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => (onOpenLink ? onOpenLink("https://github.com/Allegedcarrot4/Project-Unstable") : window.open("https://github.com/Allegedcarrot4/Project-Unstable", "_blank"))}
          data-tooltip="GitHub" aria-label="GitHub"
          style={{
            ...(expanded ? { ...linkBtn, padding: "0.5rem 0.7rem", gap: "0.55rem" } : iconBtn),
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f"; (e.currentTarget as HTMLButtonElement).style.color = "#fff" as const; (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          {expanded && "GitHub"}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => (onOpenLink ? onOpenLink("https://discord.gg/yD9NkcsKcw") : window.open("https://discord.gg/yD9NkcsKcw", "_blank"))}
          data-tooltip="Discord" aria-label="Discord"
          style={{
            ...(expanded ? { ...linkBtn, padding: "0.5rem 0.7rem", gap: "0.55rem" } : iconBtn),
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f"; (e.currentTarget as HTMLButtonElement).style.color = "#5865F2" as const; (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0741.0741 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
          </svg>
          {expanded && "Discord"}
        </motion.button>
        {settings && !settings.hidden && (() => {
          const active = isActive(settings.url);
          const Icon = settings.icon;
          const s = expanded ? linkBtn : iconBtn;
          return (
            <motion.button
              key={settings.url}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate(settings.url)}
              data-tooltip={settings.label} aria-label={settings.label}
              style={{
                ...s,
                background: active ? "#101010" : "none",
                borderColor: active ? "#1f1f1f" : "transparent",
                color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b"; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? "#101010" : "none"; (e.currentTarget as HTMLButtonElement).style.color = active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)"; (e.currentTarget as HTMLButtonElement).style.borderColor = active ? "#1f1f1f" : "transparent"; }}
            >
              <Icon size={18} />
              {expanded && settings.label}
            </motion.button>
          );
        })()}
      </div>
    </motion.div>
  );
}

// ─── First-run welcome ────────────────────────────────────────────────────────

const WELCOME_KEY = "unstable_welcome_complete";

interface WelcomeChoices {
  account: "signin" | "guest";
  searchEngine: string;
  newtabMode: "mue" | "legacy";
  verticalTabs: boolean;
  pinnedTabsToSidebar: boolean;
}

const welcomePrimaryBtn: React.CSSProperties = {
  background: "#e8e8e8",
  color: "#0b0b0b",
  border: "1px solid #e8e8e8",
  padding: "0.65rem 1.3rem",
  fontSize: "0.68rem",
  fontFamily: "'Space Grotesk', sans-serif",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  borderRadius: "10px",
};

const welcomeSecondaryBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(255,255,255,0.14)",
  padding: "0.65rem 1.3rem",
  fontSize: "0.68rem",
  fontFamily: "'Space Grotesk', sans-serif",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  borderRadius: "10px",
};

const welcomeLabel: React.CSSProperties = {
  margin: 0,
  fontSize: "0.58rem",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.32)",
  fontWeight: 600,
};

function WelcomeOption({ label, description, active, onClick, icon }: { label: string; description: string; active: boolean; onClick: () => void; icon?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }}
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 150,
        textAlign: "left",
        padding: "0.75rem 0.85rem",
        borderRadius: "8px",
        cursor: "pointer",
        background: active ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.02)",
        border: "1px solid",
        borderColor: active ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.07)",
        transition: "background 0.15s, border-color 0.15s",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
        {icon && <img src={icon} alt="" width={15} height={15} style={{ borderRadius: 3, opacity: active ? 1 : 0.65 }} />}
        <p style={{ margin: 0, fontSize: "0.74rem", color: active ? "#ececec" : "rgba(255,255,255,0.6)", fontWeight: 500, letterSpacing: "0.02em" }}>{label}</p>
      </div>
      <p style={{ margin: "0.22rem 0 0", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.45 }}>{description}</p>
    </motion.button>
  );
}

function WelcomeFlow({ open, user, onComplete, frontendOnly = false }: {
  open: boolean;
  user: User | null;
  onComplete: (choices: WelcomeChoices | null) => void;
  /** Static frontend-only build: no account step, no account copy. */
  frontendOnly?: boolean;
}) {
  const [step, setStep] = useState<"welcome" | "setup">("welcome");
  const [setupStep, setSetupStep] = useState(0);
  const [account, setAccount] = useState<"signin" | "guest">(user ? "signin" : "guest");
  const [searchEngine, setSearchEngine] = useState("duckduckgo");
  const [newtabMode, setNewtabMode] = useState<"mue" | "legacy">("legacy");
  const [verticalTabs, setVerticalTabs] = useState(false);
  const [pinnedTabsToSidebar, setPinnedTabsToSidebar] = useState(true);

  const setupSteps = (frontendOnly
    ? ["search engine", "home screen", "tab layout", "pinned tabs"]
    : ["account", "search engine", "home screen", "tab layout", "pinned tabs"]) as readonly string[];
  const completeSetupChoice = (applyChoice: () => void) => {
    applyChoice();
    if (setupStep < setupSteps.length - 1) {
      window.setTimeout(() => setSetupStep(current => current + 1), 180);
    } else {
      window.setTimeout(() => onComplete({ account, searchEngine, newtabMode, verticalTabs, pinnedTabsToSidebar }), 180);
    }
  };

  const screen = setupSteps[setupStep];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000000,
            background: "#050505",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Space Grotesk', sans-serif",
            padding: "1.5rem",
            overflowY: "auto",
          }}
        >
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "64px 64px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,170,255,0.10), transparent 65%)", filter: "blur(12px)", pointerEvents: "none" }} />

          <motion.div
            key={`${step}-${setupStep}`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 560,
              background: "linear-gradient(180deg, rgba(16,16,16,0.98), rgba(8,8,8,0.99))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "18px",
              padding: "2rem",
              boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
              margin: "auto",
            }}
          >
            <div style={{ marginBottom: "1.7rem" }}>
              <p style={{ ...welcomeLabel }}>{step === "welcome" ? "welcome" : `setup · ${setupStep + 1} of ${setupSteps.length}`}</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
                owner · Allegedcarrot4
              </p>
            </div>

            {step === "welcome" ? (
              <>
                <h1 style={{ margin: "0 0 0.7rem", fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.02em", color: "#ececec", lineHeight: 1.15 }}>
                  Welcome to Unstable
                </h1>
                <p style={{ margin: "0 0 0.6rem", fontSize: "0.86rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>
                  {frontendOnly
                    ? "A private browser with a built-in proxy. Browse and play — all inside one window."
                    : "A private browser with a built-in proxy. Browse, chat, and play — all inside one window."}
                </p>
                <p style={{ margin: "0 0 2rem", fontSize: "0.76rem", color: "rgba(255,255,255,0.32)", lineHeight: 1.6 }}>
                  Unstable is owned and maintained by{" "}
                  <span style={{ color: "rgba(255,255,255,0.78)", fontWeight: 600 }}>Allegedcarrot4</span>.
                </p>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }} onClick={() => { setSetupStep(0); setStep("setup"); }} style={welcomePrimaryBtn}>
                    set up
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }} onClick={() => onComplete(null)} style={welcomeSecondaryBtn}>
                    skip setup
                  </motion.button>
                </div>
                <p style={{ margin: "1rem 0 0", fontSize: "0.62rem", color: "rgba(255,255,255,0.24)", lineHeight: 1.5 }}>
                  Skipping uses the default settings. You can change everything later in Settings.
                </p>
              </>
            ) : (
              <>
                <h1 style={{ margin: "0 0 0.65rem", fontSize: "1.55rem", fontWeight: 600, letterSpacing: "-0.01em", color: "#ececec" }}>
                  {screen === "account" && "Choose how to continue"}
                  {screen === "search engine" && "Choose your search engine"}
                  {screen === "home screen" && "Choose your home screen"}
                  {screen === "tab layout" && "Choose your tab layout"}
                  {screen === "pinned tabs" && "Choose where pinned tabs live"}
                </h1>
                <p style={{ margin: "0 0 1.4rem", fontSize: "0.76rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.55 }}>
                  Select an option to continue. You can change this later in Settings.
                </p>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", minHeight: 106 }}>
                  {screen === "account" && <>
                    <WelcomeOption label="Sign in" description="Sync your profile, friends and chat." active={account === "signin"} onClick={() => completeSetupChoice(() => setAccount("signin"))} />
                    <WelcomeOption label="Continue as guest" description="Stay local. You can sign in later." active={account === "guest"} onClick={() => completeSetupChoice(() => setAccount("guest"))} />
                  </>}
                  {screen === "search engine" && <>
                    {Object.entries(SEARCH_ENGINES).map(([id, engine]) => (
                      <WelcomeOption key={id} label={engine.name} description={id === "duckduckgo" ? "Private search by default." : "Use this for searches from the address bar."} active={searchEngine === id} onClick={() => completeSetupChoice(() => setSearchEngine(id))} icon={`https://www.google.com/s2/favicons?domain=${new URL(engine.url).hostname}&sz=32`} />
                    ))}
                  </>}
                  {screen === "home screen" && <>
                    <WelcomeOption label="Mue tabs" description="A cleaner, widget-driven home." active={newtabMode === "mue"} onClick={() => completeSetupChoice(() => setNewtabMode("mue"))} />
                    <WelcomeOption label="Legacy" description="The classic Unstable new tab." active={newtabMode === "legacy"} onClick={() => completeSetupChoice(() => setNewtabMode("legacy"))} />
                  </>}
                  {screen === "tab layout" && <>
                    <WelcomeOption label="Horizontal" description="Tabs across the top." active={!verticalTabs} onClick={() => completeSetupChoice(() => setVerticalTabs(false))} />
                    <WelcomeOption label="Vertical (beta)" description="Tabs down the side." active={verticalTabs} onClick={() => completeSetupChoice(() => setVerticalTabs(true))} />
                  </>}
                  {screen === "pinned tabs" && <>
                    <WelcomeOption label="Show in sidebar" description="Pinned tabs appear on the sidebar." active={pinnedTabsToSidebar} onClick={() => completeSetupChoice(() => setPinnedTabsToSidebar(true))} />
                    <WelcomeOption label="Tab bar only" description="Keep pinned tabs in the tab bar." active={!pinnedTabsToSidebar} onClick={() => completeSetupChoice(() => setPinnedTabsToSidebar(false))} />
                  </>}
                </div>

                <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", marginTop: "1.9rem" }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 550, damping: 30, restSpeed: 10 }} onClick={() => setupStep === 0 ? setStep("welcome") : setSetupStep(current => current - 1)} style={welcomeSecondaryBtn}>
                    back
                  </motion.button>
                </div>

                <div aria-label={`Setup progress: ${setupStep + 1} of ${setupSteps.length}`} style={{ display: "flex", gap: "0.35rem", marginTop: "1.45rem" }}>
                  {setupSteps.map((item, index) => (
                    <div key={item} style={{ height: 3, flex: 1, overflow: "hidden", borderRadius: 999, background: "rgba(255,255,255,0.16)" }}>
                      <motion.div
                        initial={false}
                        animate={{ width: index <= setupStep ? "100%" : "0%", backgroundColor: index < setupStep ? "#f2f2f2" : "rgba(255,255,255,0.52)" }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                        style={{ height: "100%", borderRadius: "inherit" }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Shown for account/AI/chat routes on a static frontend-only deployment, where
 * the backend that powers those features is not available.
 */
function UnavailableFeature({ feature }: { feature: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.85rem", background: "var(--t-bg, #0d0d0d)", fontFamily: "'Space Grotesk', sans-serif", padding: "2rem", textAlign: "center" }}>
      <div style={{ padding: "0.45rem 0.9rem", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "999px", background: "rgba(255,255,255,0.04)", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
        frontend only
      </div>
      <p style={{ margin: 0, fontSize: "0.95rem", color: "#e8e8e8" }}>{feature} is unavailable in this deployment</p>
      <p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", maxWidth: 420, lineHeight: 1.6 }}>
        This build is served without the Unstable backend, so accounts, chat and AI are disabled. Proxying and every other feature still work.
      </p>
    </div>
  );
}

function BrowserApp({
  onLogout,
  session,
  user,
  profile,
  authContext,
  onAuthenticated,
}: {
  onLogout: () => void;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  authContext: AppAuthContext;
  onAuthenticated: (payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) => void;
}) {
  // cdn-gateway.svg renders this build inside an SVG document whose real URL
  // is "*.svg", not "/". The gateway injects __cdnGatewayPath = "/" so the app
  // renders the home UI instead of the 404 page while the address bar keeps
  // the CDN .svg URL. Normal deployments fall back to the real pathname.
  const pathname = (window as unknown as { __cdnGatewayPath?: string }).__cdnGatewayPath || window.location.pathname;
  const isProxyPath = pathname.startsWith("/ham/") || pathname.startsWith("/service/") || pathname.startsWith("/baremux/") || pathname.startsWith("/api/") || pathname.startsWith("/return");
  if (pathname !== "/" && !isProxyPath) {
    return <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif" }}>Loading...</div>}><NotFound /></Suspense>;
  }
  // Static frontend-only deployments have no backend, so account/AI/chat
  // features are unavailable. Everything else keeps working.
  const deployment = useDeploymentMode();
  const frontendOnly = deployment === "frontend";
  const initialTabs = useRef(loadTabs()).current;
  // Restored proxy pages wait in this payload; the tabs themselves start empty.
  const [pendingRestore, setPendingRestore] = useState<PendingRestore[]>(() => loadPendingRestore(initialTabs));
  const [restoreAccepted, setRestoreAccepted] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const pendingIds = new Set(pendingRestore.map(p => p.id));
    return initialTabs.tabs.map(t => pendingIds.has(t.id)
      ? { ...t, url: "", title: "New Tab", favicon: "", history: [], historyIndex: -1, currentUrl: undefined, loading: false }
      : t);
  });
  const [activeTabId, setActiveTabId] = useState<string>(initialTabs.activeId || initialTabs.tabs[0].id);
  // Recently used tabs, newest first. These stay mounted so going back to a tab
  // you were just on is instant instead of a cold proxy reload; everything older
  // is unmounted so a long tab strip cannot turn into "all pages running".
  const [recentTabIds, setRecentTabIds] = useState<string[]>(() => [initialTabs.activeId || initialTabs.tabs[0]?.id].filter(Boolean));
  const [urlInput, setUrlInput] = useState("");
  // Pending AI/Chat/Profile navigation waiting on sign-in; shown in a dialog.
  const [authPrompt, setAuthPrompt] = useState<{ url: string; tabId: string; feature: string } | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [adblockCount, setAdblockCount] = useState(0);
  const [split, setSplit] = useState<{ other: string; ratio: number; direction: "horizontal" | "vertical" } | null>(() => {
    try {
      const raw = localStorage.getItem("unstable_split");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.other && typeof parsed.ratio === "number") {
        return parsed;
      }
    } catch { /* ignore */ }
    return null;
  });

  useEffect(() => {
    if (split) {
      localStorage.setItem("unstable_split", JSON.stringify(split));
    } else {
      localStorage.removeItem("unstable_split");
    }
  }, [split]);
  const stageRef = useRef<HTMLDivElement>(null);
  const [splitDragging, setSplitDragging] = useState(false);

  // Keep the pending payload across launches until it is answered.
  useEffect(() => {
    try {
      if (pendingRestore.length > 0) localStorage.setItem(PENDING_RESTORE_KEY, JSON.stringify(pendingRestore));
      else localStorage.removeItem(PENDING_RESTORE_KEY);
    } catch { /* ignore */ }
  }, [pendingRestore]);

  // A restored tab that gets used for something else no longer needs restoring.
  useEffect(() => {
    setPendingRestore(prev => {
      if (prev.length === 0) return prev;
      const next = prev.filter(p => {
        const tab = tabs.find(t => t.id === p.id);
        return !!tab && !tab.url;
      });
      return next.length === prev.length ? prev : next;
    });
  }, [tabs]);

  // Newest-first list of recently active tabs; the stage keeps these mounted.
  useEffect(() => {
    setRecentTabIds(prev => (prev[0] === activeTabId ? prev : [activeTabId, ...prev.filter(id => id !== activeTabId)].slice(0, KEEP_ALIVE_TABS)));
  }, [activeTabId]);

  const [fullscreen, setFullscreen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [welcomeOpen, setWelcomeOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(WELCOME_KEY) !== "1"; } catch { return true; }
  });
  const [customShortcuts, setCustomShortcuts] = useState<Shortcut[]>(loadCustomShortcuts);
  const [devToolsOpen, setDevToolsOpen] = useState<Record<string, boolean>>({});
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [downloadsPanelOpen, setDownloadsPanelOpen] = useState(false);
  const downloadsPanelRef = useRef<HTMLDivElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrCopied, setQrCopied] = useState(false);
  const qrCopyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pendingPerm, setPendingPerm] = useState<{ id: string; permission: string; origin: string } | null>(null);
  const pendingPermResolve = useRef<((allowed: boolean) => void) | null>(null);
  // Media (music controller) state per tab, fed by inject.js postMessage
  const [mediaByTab, setMediaByTab] = useState<Record<string, MediaState>>({});
  const [mediaDismissed, setMediaDismissed] = useState<boolean>(() => localStorage.getItem(MEDIA_DISMISS_KEY) === "1");
  const navRefs = useRef({ handleNavigate: (url: string, tabId?: string) => {}, handleNewTab: () => {}, activateTab: (id: string) => {}, handleOpenLink: (url: string) => {} });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement>>({});
  const tabAbortRefs = useRef<Record<string, AbortController>>({});

  /**
   * Memory used by a tab, in MB, for the tab hover card. Proxied pages run
   * same-origin inside their iframe, so Chrome's (non-standard)
   * `performance.memory` is readable per frame. Internal pages render inside
   * the app itself, so their heap is the app's heap. Null = not reported.
   */
  const readTabMemory = useCallback((tab: Tab): number | null => {
    const readHeap = (win: Window | null): number | null => {
      try {
        const used = (win as unknown as { performance?: { memory?: { usedJSHeapSize?: number } } } | null)
          ?.performance?.memory?.usedJSHeapSize;
        return typeof used === "number" && used > 0 ? used / 1048576 : null;
      } catch { return null; }
    };
    const iframe = iframeRefs.current[tab.id];
    if (iframe) return readHeap(iframe.contentWindow);
    // Idle proxy tabs are unmounted, so there is no frame to measure — reporting
    // the app's own heap for them would be a lie.
    const internal = !tab.url || tab.url.startsWith("unstable://");
    return internal ? readHeap(window) : null;
  }, []);
  const [tabPreviews, setTabPreviews] = useState<Record<string, HTMLCanvasElement>>({});
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(-1);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suggestListRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const tooltipTimer = useRef<number | null>(null);

  /**
   * Sync a tab's live URL/title/favicon from its (same-origin) proxied iframe.
   *
   * Proxied pages navigate internally (redirects and SPA pushState), so the
   * iframe's real location drifts away from the `src` we last set. We keep the
   * frame mounted (never touch `src`) and mirror the live URL into `currentUrl`
   * so the address bar, tab title and favicon stay correct.
   */
  const syncTabFromFrame = useCallback((tabId: string) => {
    const iframe = iframeRefs.current[tabId];
    if (!iframe) return;
    let liveHref = "";
    let liveTitle = "";
    let liveIcon = "";
    try {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;
      if (!win || !doc) return;
      // `location.href` is absolute, but tab URLs and history entries are
      // same-origin paths ("/ham/…"). Strip our own origin so decodeProxyUrl
      // recognises the proxy prefix.
      const rawHref = win.location.href || "";
      liveHref = rawHref.startsWith(location.origin)
        ? rawHref.slice(location.origin.length) || "/"
        : rawHref;
      liveTitle = doc.title || "";
      const iconEl = doc.querySelector('link[rel~="icon" i]') as HTMLLinkElement | null;
      if (iconEl?.href) liveIcon = iconEl.href;
    } catch {
      // Cross-origin or mid-navigation: try again on the next tick.
      return;
    }
    if (!liveHref || liveHref === "about:blank") return;
    let domain = "";
    try { domain = new URL(decodeProxyUrl(liveHref)).hostname.replace(/^www\./i, "").toLowerCase(); } catch { /* ignore */ }
    const nextFavicon = liveIcon || (domain ? faviconUrl(domain) : "");
    setTabs(prev => {
      let changed = false;
      const next = prev.map(t => {
        if (t.id !== tabId) return t;
        if (!t.url || t.url.startsWith("unstable://")) return t;
        const sameUrl = (t.currentUrl || t.url) === liveHref;
        const sameTitle = !liveTitle || t.title === liveTitle;
        const sameFavicon = !nextFavicon || t.favicon === nextFavicon;
        if (sameUrl && sameTitle && sameFavicon) return t;
        changed = true;
        // Redirects replace the current history entry rather than adding one, so
        // Back still returns to the page before the redirect.
        let history = t.history;
        let historyIndex = t.historyIndex;
        if (historyIndex >= 0 && history[historyIndex] !== liveHref) {
          history = [...history];
          history[historyIndex] = liveHref;
        }
        return {
          ...t,
          currentUrl: liveHref,
          title: liveTitle || t.title,
          favicon: nextFavicon || t.favicon,
          history,
          historyIndex,
        };
      });
      // Returning the same array lets React skip the re-render entirely.
      return changed ? next : prev;
    });
  }, []);

  // Poll proxied iframes so redirects and client-side navigation are reflected
  // even when inject.js is not present (non-HTML responses, older caches, …).
  useEffect(() => {
    const id = window.setInterval(() => {
      for (const tabId of Object.keys(iframeRefs.current)) syncTabFromFrame(tabId);
    }, 900);
    return () => window.clearInterval(id);
  }, [syncTabFromFrame]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolMenuRef.current && !toolMenuRef.current.contains(e.target as Node)) setToolMenuOpen(false);
      if (downloadsPanelRef.current && !downloadsPanelRef.current.contains(e.target as Node)) setDownloadsPanelOpen(false);
    }
    function handleBlur() { setToolMenuOpen(false); }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("blur", handleBlur);
    return () => { document.removeEventListener("mousedown", handleClick); window.removeEventListener("blur", handleBlur); };
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
  const isNewtab = !activeTab?.url;

  // Loading progress bar state
  const loadProgress = useMotionValue(0);
  const loadProgressSpring = useSpring(loadProgress, { stiffness: 60, damping: 20, mass: 0.6 });
  const loadBarScaleX = useTransform(loadProgressSpring, [0, 100], [0, 1]);
  const [loadBarVisible, setLoadBarVisible] = useState(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    if (activeTab?.loading) {
      setLoadBarVisible(true);
      loadProgress.set(0);
      // Animate to 80% quickly then slow down, simulating real progress
      loadProgress.set(80);
    } else {
      // Complete to 100% then hide
      loadProgress.set(100);
      loadTimerRef.current = setTimeout(() => {
        setLoadBarVisible(false);
        loadProgress.set(0);
      }, 400);
    }
    return () => { if (loadTimerRef.current) clearTimeout(loadTimerRef.current); };
  }, [activeTab?.loading, activeTabId]);
  const proxyStatus = useProxyStatus();
  const { setError } = useErrorHandler();

  // Accepted + proxy ready: put the saved pages back into their tabs. Declared
  // here because it depends on the proxy engine's live phase.
  useEffect(() => {
    if (!restoreAccepted || pendingRestore.length === 0 || proxyStatus.phase !== "ready") return;
    const byId = new Map(pendingRestore.map(p => [p.id, p]));
    setTabs(prev => prev.map(t => {
      const p = byId.get(t.id);
      if (!p || t.url) return t;
      return {
        ...t,
        url: p.url,
        title: p.title || "Loading…",
        favicon: p.favicon,
        history: p.history,
        historyIndex: p.historyIndex,
        loading: true,
      };
    }));
    setPendingRestore([]);
    setRestoreAccepted(false);
  }, [restoreAccepted, pendingRestore, proxyStatus.phase]);

  // ─── Proxied downloads ─────────────────────────────────────────────────────
  // The bytes have to come from inside the proxied frame: only that frame's
  // service worker can resolve a proxy URL, so `fetch` from this window 404s on
  // /ham/ and /service/. The app registers the download, asks the frame to stream
  // it, reassembles the chunks and hands the file to the host browser.
  const frameTransfers = useRef(new Map<string, {
    chunks: BlobPart[];
    received: number;
    filename: string;
    mime: string;
    lastUpdate: number;
    lastBytes: number;
    lastTime: number;
  }>());

  const postToTabFrame = useCallback((tabId: string | undefined, message: unknown) => {
    if (!tabId) return false;
    const frame = iframeRefs.current[tabId] || (tabId === activeTabId ? iframeRef.current : null);
    const win = frame?.contentWindow;
    if (!win) return false;
    try { win.postMessage(message, "*"); return true; } catch { return false; }
  }, [activeTabId]);

  useEffect(() => {
    setDownloadTransport((entry) => {
      frameTransfers.current.set(entry.id, {
        chunks: [], received: 0, filename: entry.filename, mime: "",
        lastUpdate: 0, lastBytes: 0, lastTime: Date.now(),
      });
      const sent = postToTabFrame(entry.tabId, {
        type: "unstable-download-fetch",
        requestId: entry.id,
        url: entry.url,
        filename: entry.filename,
      });
      if (!sent) {
        frameTransfers.current.delete(entry.id);
        updateDownload(entry.id, {
          state: "error",
          errorMessage: "Open the page that started this download, then retry.",
          completedAt: Date.now(),
        });
      }
    });
    return () => setDownloadTransport(null);
  }, [postToTabFrame]);

  /**
   * Normalises a download URL reported by a proxied page (or by a service worker)
   * and registers it with the manager, which asks the frame for the bytes.
   */
  const beginProxyDownload = useCallback((rawUrl: string, rawFilename: string, source?: MessageEventSource | null) => {
    const candidate = String(rawUrl || "").trim();
    if (!candidate || /^(javascript|mailto|tel):/i.test(candidate)) return;

    let tabId = activeTabId;
    if (source) {
      for (const [id, el] of Object.entries(iframeRefs.current)) {
        if (el && el.contentWindow === source) { tabId = id; break; }
      }
    }

    // Match the engine of the frame that initiated it: a proxy URL is only
    // routable by the service worker controlling that frame's scope.
    const tabUrl = tabs.find(t => t.id === tabId)?.url ?? "";
    const engine: ProxyEngine = tabUrl.startsWith(UV_PREFIX)
      ? "uv"
      : tabUrl.startsWith(SCRAMJET_PREFIX)
        ? "scramjet"
        : getEffectiveEngine(tabUrl, settings);

    let url = candidate;
    let filename = String(rawFilename || "").trim();
    try {
      const parsed = new URL(candidate, location.origin);
      if (parsed.protocol === "blob:" || parsed.protocol === "data:") {
        url = parsed.href;
      } else if (parsed.origin === location.origin && (parsed.pathname.startsWith(SCRAMJET_PREFIX) || parsed.pathname.startsWith(UV_PREFIX))) {
        url = parsed.pathname + parsed.search + parsed.hash;
      } else {
        const decoded = decodeProxyUrl(parsed.href) || parsed.href;
        // No settings here on purpose: the engine must match this frame's service
        // worker, not the site's configured preference.
        url = encodeProxyUrl(decoded, engine);
        if (!filename) filename = deriveFilename(decoded);
      }
    } catch { /* keep the raw URL and given filename */ }

    startDownload(url, filename || deriveFilename(url), tabId);
  }, [activeTabId, settings, tabs]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "unstable-permission-request") {
        pendingPermResolve.current = (allowed: boolean) => {
          const iframe = iframeRefs.current[activeTabId];
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type: "unstable-permission-response", id: e.data.id, allowed }, "*");
          }
        };
        setPendingPerm({ id: e.data.id, permission: e.data.permission, origin: e.data.origin });
        return;
      }
      if (e.data?.type === "unstable-navigate") {
        if (e.data?.action === "newtab") {
          navRefs.current.handleNewTab();
        } else if (e.data?.action === "navigate" && e.data?.page) {
          const page = e.data.page;
          if (page.startsWith("http://") || page.startsWith("https://")) {
            try { if (new URL(page).origin === location.origin) return; } catch {}
            navRefs.current.handleNavigate(page);
          } else {
            navRefs.current.handleNavigate("unstable://" + page);
          }
        }
        return;
      }
      if (e.data?.type === "unstable-download" && e.data?.url) {
        beginProxyDownload(String(e.data.url), String(e.data.filename || ""), e.source);
        return;
      }
      // Chunked transfer from the proxied frame that owns the bytes.
      if (typeof e.data?.requestId === "string" && typeof e.data?.type === "string" && e.data.type.startsWith("unstable-download-")) {
        const requestId = e.data.requestId as string;
        const transfer = frameTransfers.current.get(requestId);
        const now = Date.now();
        if (e.data.type === "unstable-download-meta") {
          if (!transfer) return;
          transfer.filename = String(e.data.filename || transfer.filename);
          transfer.mime = String(e.data.mime || transfer.mime || "");
          const patch: Partial<DownloadEntry> = { filename: transfer.filename };
          if (transfer.mime) patch.mimeType = transfer.mime;
          if (typeof e.data.total === "number" && e.data.total > 0) patch.totalBytes = e.data.total;
          updateDownload(requestId, patch);
          return;
        }
        if (e.data.type === "unstable-download-chunk") {
          if (!transfer || !(e.data.chunk instanceof ArrayBuffer)) return;
          transfer.chunks.push(e.data.chunk);
          transfer.received += e.data.chunk.byteLength;
          if (now - transfer.lastUpdate > 200) {
            const elapsed = (now - transfer.lastTime) / 1000;
            const speed = elapsed > 0 ? Math.round((transfer.received - transfer.lastBytes) / elapsed) : 0;
            transfer.lastUpdate = now;
            transfer.lastBytes = transfer.received;
            transfer.lastTime = now;
            updateDownload(requestId, { downloadedBytes: transfer.received, speedBytesPerSec: speed });
          }
          return;
        }
        if (e.data.type === "unstable-download-end") {
          if (!transfer) return;
          frameTransfers.current.delete(requestId);
          // The user may have cancelled while the frame was still streaming.
          if (!getDownloads().some(d => d.id === requestId)) return;
          const blob = new Blob(transfer.chunks, { type: transfer.mime || undefined });
          saveBlob(blob, transfer.filename || "download");
          updateDownload(requestId, {
            state: "complete",
            downloadedBytes: blob.size,
            totalBytes: blob.size,
            speedBytesPerSec: 0,
            completedAt: Date.now(),
          });
          return;
        }
        if (e.data.type === "unstable-download-error") {
          frameTransfers.current.delete(requestId);
          updateDownload(requestId, {
            state: "error",
            errorMessage: String(e.data.message || "Download failed"),
            completedAt: Date.now(),
          });
          return;
        }
        return;
      }
      // Proxied page reported a navigation/title change. Read the live location
      // straight from the iframe (the message carries no trusted URL).
      if (e.data?.type === "unstable-location-change") {
        try {
          for (const [id, el] of Object.entries(iframeRefs.current)) {
            if (el && el.contentWindow === e.source) { syncTabFromFrame(id); break; }
          }
        } catch { /* ignore */ }
        return;
      }
      // Links / window.open() calls from proxied pages that try to escape into
      // a real browser tab are re-routed to a new in-app tab instead.
      if (e.data?.type === "unstable-open-url" && e.data?.url) {
        const url = String(e.data.url);
        if (url.startsWith("http://") || url.startsWith("https://")) {
          try { if (new URL(url).origin === location.origin) return; } catch { /* ignore */ }
          navRefs.current.handleOpenLink(url);
        }
        return;
      }
      if (e.data?.type === "unstable-media-state") {
        // Attribute the report to the tab whose iframe sent it
        let tabId = activeTabId;
        try {
          for (const [id, el] of Object.entries(iframeRefs.current)) {
            if (el && el.contentWindow === e.source) { tabId = id; break; }
          }
        } catch { /* fall back to active tab */ }
        const d = e.data as Partial<MediaState> & { type: string };
        const next: MediaState = {
          playing: Boolean(d.playing),
          hasMedia: Boolean(d.hasMedia),
          title: typeof d.title === "string" ? d.title : "",
          artist: typeof d.artist === "string" ? d.artist : "",
          album: typeof d.album === "string" ? d.album : "",
          artwork: typeof d.artwork === "string" ? d.artwork : "",
          currentTime: typeof d.currentTime === "number" ? d.currentTime : 0,
          duration: typeof d.duration === "number" ? d.duration : 0,
        };
        setMediaByTab(prev => {
          // Ignore the "idle" heartbeat from a tab we've never seen media on
          if (!next.hasMedia && !next.playing && !prev[tabId]) return prev;
          if (JSON.stringify(prev[tabId]) === JSON.stringify(next)) return prev;
          return { ...prev, [tabId]: next };
        });
        return;
      }
    }
    // Attachment responses captured by the service workers (links/redirects that
    // save a file without an `<a download>` attribute).
    function handleServiceWorkerMessage(event: MessageEvent) {
      const data = event.data as { type?: string; url?: string; filename?: string } | null;
      if (data?.type !== "unstable-download-detected" || !data.url) return;
      beginProxyDownload(data.url, data.filename || "");
    }

    window.addEventListener("message", handleMessage);
    const supportsServiceWorker = "serviceWorker" in navigator;
    if (supportsServiceWorker) navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (supportsServiceWorker) navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [activeTabId, syncTabFromFrame, settings, beginProxyDownload]);

  useEffect(() => {
    function onRetryTransport() {
      const n = parseInt(localStorage.getItem(BARE_KEY) || "1", 10) || 1;
      void switchBare(n, "auto", settings.wispServer, settings.wispRelayUrl, settings.transportEncryption, settings);
    }
    window.addEventListener("unstable-retry-transport", onRetryTransport);
    return () => window.removeEventListener("unstable-retry-transport", onRetryTransport);
  }, [settings]);


  useEffect(() => { applyCloak(settings.cloak); }, [settings.cloak]);
  useEffect(() => {
    const t = setTimeout(() => saveSettings(settings), 300);
    return () => clearTimeout(t);
  }, [settings]);
  useEffect(() => {
    const t = setTimeout(() => saveTabs(tabs, activeTabId), 300);
    return () => clearTimeout(t);
  }, [tabs, activeTabId]);

  // ─── Tab preview thumbnails ───────────────────────────────────────────────
  // Previews are built by `paintPagePreview`, our own block renderer, from the
  // tab's live iframe document (or its wrapper for internal pages). Nothing is
  // captured on a timer: a build happens when the hover card asks for one, on
  // an idle callback, and the result is cached per tab+URL. Hovering therefore
  // never blocks on rendering work.
  const previewAtRef = useRef<Record<string, number>>({});
  const previewUrlRef = useRef<Record<string, string>>({});
  const previewBusyRef = useRef<Set<string>>(new Set());

  const buildTabPreview = useCallback((tabId: string): void => {
    if (previewBusyRef.current.has(tabId)) return;
    const iframe = iframeRefs.current[tabId];
    const doc = iframe?.contentDocument;
    let target: Element | null = null;
    let win: Window | null = null;
    let width = 0;
    let height = 0;
    if (iframe && doc?.documentElement && doc.body) {
      target = doc.documentElement;
      win = doc.defaultView;
      width = iframe.clientWidth;
      height = iframe.clientHeight;
    } else {
      // Internal pages (new tab, settings, error screens) live in the tab's own
      // wrapper instead of a frame.
      const wrapper = document.querySelector<HTMLElement>(`[data-tab-content="${tabId}"]`);
      if (wrapper) {
        target = wrapper;
        win = window;
        width = wrapper.clientWidth;
        height = wrapper.clientHeight;
      }
    }
    if (!target || !width || !height) return;

    previewBusyRef.current.add(tabId);
    try {
      const { canvas, painted } = paintPagePreview(target, width, height, win);
      if (painted < 2) return;
      previewAtRef.current[tabId] = Date.now();
      setTabPreviews(prev => ({ ...prev, [tabId]: canvas }));
    } catch {
      /* A page that refuses to be measured just keeps the fallback preview. */
    } finally {
      previewBusyRef.current.delete(tabId);
    }
  }, []);

  /** Refresh a tab's preview on demand (used when the hover card opens). */
  const requestTabThumbnail = useCallback((tabId: string) => {
    if (Date.now() - (previewAtRef.current[tabId] ?? 0) < 8000) return;
    runWhenIdle(() => buildTabPreview(tabId));
  }, [buildTabPreview]);

  // A navigation gives a tab a clean slate for preview capture (and clears the
  // stale preview of a tab that has left its page behind).
  useEffect(() => {
    for (const tab of tabs) {
      if (previewUrlRef.current[tab.id] === tab.url) continue;
      previewUrlRef.current[tab.id] = tab.url;
      delete previewAtRef.current[tab.id];
      setTabPreviews(prev => {
        if (!(tab.id in prev)) return prev;
        const next = { ...prev };
        delete next[tab.id];
        return next;
      });
    }
    // Drop previews (and their canvases) for tabs that have been closed.
    const live = new Set(tabs.map(t => t.id));
    for (const id of Object.keys(previewUrlRef.current)) {
      if (live.has(id)) continue;
      delete previewUrlRef.current[id];
      delete previewAtRef.current[id];
      setTabPreviews(prev => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [tabs]);

  // Warm the active tab's preview once it has painted, so the first hover is
  // instant. Idle-scheduled, so it never lands in the middle of a tab switch.
  useEffect(() => {
    if (!activeTab) return;
    const id = activeTab.id;
    const timer = setTimeout(() => runWhenIdle(() => buildTabPreview(id)), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, activeTab?.url, activeTab?.loading, buildTabPreview]);

  useEffect(() => {
    try { localStorage.setItem(PANIC_URL_KEY, JSON.stringify({ url: settings.panicUrl })); } catch {}
  }, [settings.panicUrl]);
  useEffect(() => {
    const t = THEMES[settings.theme]?.colors ?? THEMES.dark.colors;
    const wpUrl = THEMES[settings.theme]?.wallpaper ?? settings.wallpaper;
    const props = Object.entries(t).map(([k, v]) => `--t-${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`).join(";");
    const wp = wpUrl ? `--t-wallpaper: url("${wpUrl.replace(/[\\"()\x00-\x1f]/g, "")}")` : "--t-wallpaper: none";
    let el = document.getElementById("unstable-theme");
    if (!el) { el = document.createElement("style"); el.id = "unstable-theme"; document.head.appendChild(el); }
    el.textContent = `:root{${props};${wp}}`;
  }, [settings.theme, settings.wallpaper]);

  // Global dark scrollbar style
  useEffect(() => {
    let el = document.getElementById("unstable-scrollbar-style");
    if (!el) {
      el = document.createElement("style");
      el.id = "unstable-scrollbar-style";
      document.head.appendChild(el);
    }
    el.textContent = `::-webkit-scrollbar { width: 6px; height: 6px; }::-webkit-scrollbar-track { background: #111; }::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }::-webkit-scrollbar-thumb:hover { background: #555; }* { scrollbar-width: thin; scrollbar-color: #333 #111; }`;
  }, []);

  useEffect(() => {
    const n = parseInt(localStorage.getItem(BARE_KEY) || "1", 10) || 1;
    setupProxy(n, settings.transportMode, settings.wispServer, settings.codec, settings.wispRelayUrl, settings.transportEncryption, settings).catch(err => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Proxy setup error:', message);
    });
  }, [settings.transportMode, settings.wispServer, settings.codec, settings.proxyEngine]);

  // Watch proxy phase for errors -> show our error screen
  useEffect(() => {
    if (proxyStatus.phase === "error") {
      // cdn-gateway.svg: transport failures are expected behind a file CDN
      // (no backend). The gateway answers proxy use with its own Forbidden
      // screen instead of this error screen.
      if ((window as unknown as { __cdnGatewayPath?: string }).__cdnGatewayPath) return;
      void setError(new Error(proxyStatus.message || "Proxy connection failed"), {
        url: "/proxy",
        transport: settings.transportMode,
        encoding: settings.codec,
        transportEncryption: settings.transportEncryption,
        engine: settings.proxyEngine === "uv" ? "ultraviolet" : settings.proxyEngine === "scramjet" ? "scramjet" : undefined,
      });
    }
  }, [proxyStatus.phase, proxyStatus.message, settings.transportMode, settings.codec, settings.transportEncryption, setError]);

  // Font obfuscation toggle
  useEffect(() => {
    document.documentElement.classList.toggle("unstable-font-obfuscated", settings.fontObfuscation);
  }, [settings.fontObfuscation]);

  // Sync search engine to Mue iframes
  useEffect(() => {
    const searchUrl = SEARCH_ENGINES[settings.searchEngine]?.url ?? "https://duckduckgo.com/?q=";
    for (const iframe of Object.values(iframeRefs.current)) {
      try {
        iframe.contentWindow?.postMessage({ type: "set-search-engine", searchUrl }, "*");
      } catch {}
    }
  }, [settings.searchEngine]);

  useEffect(() => {
    if (settings.magicCursorEnabled) return;
    window.dispatchEvent(new CustomEvent("iframe-hover", { detail: { hovering: false } }));
    for (const iframe of Object.values(iframeRefs.current)) {
      try {
        iframe.contentDocument?.getElementById("unstable-cursor-style")?.remove();
      } catch {}
    }
  }, [settings.magicCursorEnabled]);

  useEffect(() => {
    function onOver(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("[data-tooltip]") as HTMLElement | null;
      if (target) {
        const rect = target.getBoundingClientRect();
        setTooltip({ text: target.getAttribute("data-tooltip") || "", x: rect.left + rect.width / 2, y: rect.top - 8 });
        if (tooltipTimer.current !== null) { clearTimeout(tooltipTimer.current); tooltipTimer.current = null; }
      } else {
        tooltipTimer.current = window.setTimeout(() => setTooltip(null), 80);
      }
    }
    document.addEventListener("mouseover", onOver);
    return () => { document.removeEventListener("mouseover", onOver); if (tooltipTimer.current !== null) clearTimeout(tooltipTimer.current); };
  }, []);

  // Transport encryption toggle (sync to SWs)
  useEffect(() => {
    const msg = (type: string, data: any) => {
      if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type, data });
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) {
          if (reg.active && reg.active.scriptURL !== navigator.serviceWorker.controller?.scriptURL) {
            reg.active.postMessage({ type, data });
          }
        }
      });
    };
    msg("ENIGMA", { enabled: settings.transportEncryption, key: ENIGMA_KEY });
  }, [settings.transportEncryption]);

  // Sync adblock + codec state to service workers
  useEffect(() => {
    const msg = (type: string, data: any) => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type, data });
      }
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) {
          if (reg.active && reg.active.scriptURL !== navigator.serviceWorker.controller?.scriptURL) {
            reg.active.postMessage({ type, data });
          }
        }
      });
    };
    msg("ADBLOCK", { enabled: settings.adblockEnabled });
    msg("CODEC", { type: settings.codec });
  }, [settings.adblockEnabled, settings.codec]);

  // Poll adblock count from service worker
  useEffect(() => {
    if (!settings.adblockEnabled) { setAdblockCount(0); return; }
    let cancelled = false;
    async function poll() {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if (reg.active) {
            const channel = new MessageChannel();
            channel.port1.onmessage = (e) => {
              if (!cancelled && typeof e.data?.count === "number") setAdblockCount(e.data.count);
            };
            reg.active.postMessage({ type: "GET_ADBLOCK_COUNT" }, [channel.port2]);
          }
        }
      } catch {}
    }
    const id = setInterval(poll, 3000);
    poll();
    return () => { cancelled = true; clearInterval(id); };
  }, [settings.adblockEnabled]);

  // Confirm leave toggle
  useEffect(() => {
    if (settings.confirmLeave) {
      const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
    return;
  }, [settings.confirmLeave]);

  useEffect(() => {
    if (!activeTab) return;
    const liveUrl = activeTab.currentUrl || activeTab.url;
    const display = liveUrl ? (liveUrl.startsWith("unstable://") ? liveUrl : decodeProxyUrl(liveUrl)) : "";
    setUrlInput(display);
  }, [activeTabId, activeTab?.url, activeTab?.currentUrl]);

  useEffect(() => {
    const liveUrl = activeTab?.currentUrl || activeTab?.url;
    if (!liveUrl || liveUrl.startsWith("unstable://")) {
      setBookmarked(false);
      return;
    }
    const url = decodeProxyUrl(liveUrl);
    isBookmarked(url).then(setBookmarked);
  }, [activeTabId, activeTab?.url, activeTab?.currentUrl]);

  useEffect(() => {
    clearTimeout(suggestTimer.current);
    const q = urlInput.trim();
    if (q.length < 2 || q.includes(".") || q.includes("/") || q.includes(" ")) {
      setShowSuggestions(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/return?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = await res.json();
        const phrases = (data as { phrase: string }[]).map(d => d.phrase).filter(p => p.toLowerCase().startsWith(q.toLowerCase()));
        setSearchSuggestions(phrases);
        setShowSuggestions(phrases.length > 0);
        setSuggestIndex(-1);
      } catch {}
    }, 180);
  }, [urlInput]);

  useEffect(() => {
    if (suggestIndex < 0 || !suggestListRef.current) return;
    const el = suggestListRef.current.children[suggestIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [suggestIndex]);

  const stateRef = useRef({ tabs, activeTabId, settings, customShortcuts, split });
  useEffect(() => { stateRef.current = { tabs, activeTabId, settings, customShortcuts, split }; });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const combo = buildCombo(e);

      // Ctrl+L / Cmd+L always focuses URL bar (works even in inputs)
      if (combo === "Ctrl+L" || combo === "Meta+L") {
        e.preventDefault();
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
        return;
      }

      const el = document.activeElement;
      if (el instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "reset", "range", "color"].includes(el.type)) return;
      if (el instanceof HTMLTextAreaElement) return;
      if ((el as HTMLElement)?.isContentEditable) return;
      if (!combo) return;
      const { tabs, activeTabId, settings, customShortcuts, split } = stateRef.current;
      const s = settings.shortcuts;

      for (let i = 1; i <= 9; i++) {
        if (combo === s[`tab${i}` as keyof KeyShortcuts]) {
          e.preventDefault(); const t = tabs[i - 1]; if (t) navRefs.current.activateTab(t.id); return;
        }
      }
      if (combo === s.closeTab) {
        e.preventDefault();
        if (tabs.length === 1) { setTabs([makeTab()]); return; }
        const idx = tabs.findIndex(t => t.id === activeTabId);
        const next = tabs.filter(t => t.id !== activeTabId);
        const newActive = next[Math.min(idx, next.length - 1)].id;
        setTabs(next); setActiveTabId(newActive);
        if (split && (split.other === activeTabId || split.other === newActive)) setSplit(null);
        return;
      }
      if (combo === s.newTab) {
        e.preventDefault(); setSplit(null); const tab = makeTab(); setTabs(prev => [...prev, tab]); setActiveTabId(tab.id); return;
      }
      if (combo === s.addShortcut) {
        e.preventDefault();
        const activeTab = tabs.find(t => t.id === activeTabId);
        const liveUrl = activeTab?.currentUrl || activeTab?.url;
        if (!liveUrl || liveUrl.startsWith("unstable://")) return;
        const decoded = decodeProxyUrl(liveUrl);
        let domain = ""; try { domain = new URL(decoded).hostname; } catch { }
        const sc: Shortcut = { id: Math.random().toString(36).slice(2), name: activeTab.title || domain, url: decoded, favicon: activeTab.favicon || faviconUrl(domain) };
        const updated = [...customShortcuts, sc]; setCustomShortcuts(updated); saveCustomShortcuts(updated);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const updateTab = useCallback((id: string, u: Partial<Tab>) => setTabs(prev => prev.map(t => t.id === id ? { ...t, ...u } : t)), []);

  function completeAuthPrompt(payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) {
    const pending = authPrompt;
    setAuthPrompt(null);
    onAuthenticated(payload);
    if (pending) handleNavigate(pending.url, pending.tabId, { skipAuthGate: true });
  }

  function handleNavigate(url: string, tabId = activeTabId, opts?: { skipAuthGate?: boolean }) {
    const t = url.trim();
    if (t.startsWith("unstable://")) {
      // Aliases for the DM section. An unknown unstable:// page used to fall
      // through to the proxy, which handed a non-http scheme to an iframe and
      // made Chrome show "This site can't be reached".
      const aliases: Record<string, string> = {
        dms: "dm",
        messages: "dm",
        private: "dm",
        directmessages: "dm",
        "direct-messages": "dm",
      };
      const rawPage = t.slice("unstable://".length);
      const page = aliases[rawPage.toLowerCase()] ?? rawPage;
      const internalUrl = page === rawPage ? t : `unstable://${page}`;
      if (page === "newtab") {
        const tab = tabs.find(tb => tb.id === tabId);
        if (tab?.url.startsWith("unstable://") && tab.lastProxyUrl) {
          const restored = tab.lastProxyUrl;
          let title = "Loading…";
          let favicon = "";
          try {
            const d = new URL(decodeProxyUrl(restored)).hostname;
            title = d;
            favicon = faviconUrl(d);
          } catch { /* ignore */ }
          setTabs(prev => prev.map(tb => {
            if (tb.id !== tabId) return tb;
            const hist = [...tb.history.slice(0, tb.historyIndex + 1), restored];
            return {
              ...tb,
              url: restored,
              currentUrl: restored,
              title,
              favicon,
              history: hist,
              historyIndex: hist.length - 1,
              loading: true,
            };
          }));
          return;
        }
        updateTab(tabId, { url: "", currentUrl: "", title: "New Tab", favicon: "", loading: false, lastProxyUrl: undefined });
        return;
      }
      if (["settings", "credits", "ai", "chat", "dm", "blank", "tos", "privacy", "games", "history", "bookmarks", "downloads", "profile", "releases"].includes(page)) {
        // Signed out: prompt in place instead of opening the page, then follow
        // through to it once authentication succeeds.
        const needsAuth = page === "ai" || page === "chat" || page === "dm" || page === "profile";
        if (needsAuth && !frontendOnly && !opts?.skipAuthGate && (!user || !profile || ((page === "chat" || page === "dm") && !session))) {
          setAuthPrompt({ url: internalUrl, tabId, feature: page === "ai" ? "AI" : page === "profile" ? "Profile" : "Chat" });
          return;
        }
        const titles: Record<string, string> = {
          settings: "Settings",
          credits: "Credits",
          ai: "AI",
          chat: "Chat",
          dm: "Direct messages",
          blank: "Blank",
          tos: "ToS",
          privacy: "Privacy",
          games: "Games",
          history: "History",
          bookmarks: "Bookmarks",
          downloads: "Downloads",
          profile: "Profile",
          releases: "Releases",
        };
        const title = titles[page] ?? page.charAt(0).toUpperCase() + page.slice(1);
        setTabs(prev => prev.map(tab => {
          if (tab.id !== tabId) return tab;
          const lastProxyUrl =
            tab.url && !tab.url.startsWith("unstable://") ? tab.url : tab.lastProxyUrl;
          const hist = [...tab.history.slice(0, tab.historyIndex + 1), internalUrl];
          return {
            ...tab,
            url: internalUrl,
            currentUrl: internalUrl,
            title,
            favicon: "",
            loading: false,
            lastProxyUrl,
            history: hist,
            historyIndex: hist.length - 1,
          };
        }));
        return;
      }
      // Unknown internal route: keep it inside the app so the tab renders a
      // not-found card instead of proxying an unstable:// URL.
      setTabs(prev => prev.map(tab => {
        if (tab.id !== tabId) return tab;
        const lastProxyUrl =
          tab.url && !tab.url.startsWith("unstable://") ? tab.url : tab.lastProxyUrl;
        const hist = [...tab.history.slice(0, tab.historyIndex + 1), internalUrl];
        return {
          ...tab,
          url: internalUrl,
          currentUrl: internalUrl,
          title: "Page not found",
          favicon: "",
          loading: false,
          lastProxyUrl,
          history: hist,
          historyIndex: hist.length - 1,
        };
      }));
      return;
    }
    const normalized = normalizeUrl(t, settings.searchEngine);
    if (!normalized) return;
    let domain = "";
    try {
      domain = new URL(normalized).hostname.replace(/^www\./i, "").toLowerCase();
    } catch { /* ignore */ }
    const engine = settings.proxyEngine;
    let proxyUrl: string;
    try {
      proxyUrl = encodeProxyUrl(normalized, engine, settings);
    } catch {
      updateTab(tabId, { loading: false });
      return;
    }
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      // Cancel any in-flight navigation for this tab
      if (tabAbortRefs.current[tabId]) {
        tabAbortRefs.current[tabId].abort();
      }
      const hist = [...tab.history.slice(0, tab.historyIndex + 1), proxyUrl];
      return {
        ...tab,
        url: proxyUrl,
        currentUrl: proxyUrl,
        title: domain || "Loading…",
        favicon: domain ? faviconUrl(domain) : "",
        history: hist,
        historyIndex: hist.length - 1,
        loading: true,
        lastProxyUrl: proxyUrl,
      };
    }));
    tabAbortRefs.current[tabId] = new AbortController();
  }

  function handleBack() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.historyIndex <= 0) return;
    const idx = tab.historyIndex - 1;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: t.history[idx], currentUrl: t.history[idx], historyIndex: idx, loading: true } : t));
  }
  function handleForward() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    const idx = tab.historyIndex + 1;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: t.history[idx], currentUrl: t.history[idx], historyIndex: idx, loading: true } : t));
  }
  function handleReload() {
    if (!iframeRef.current) return;
    // Do one deliberate navigation. Clearing src first caused proxied sites
    // (especially YouTube) to bootstrap multiple times before the real page.
    iframeRef.current.src = iframeRef.current.src;
    updateTab(activeTabId, { loading: true });
  }
  function handleNewTab() { setSplit(null); const tab = makeTab(); setTabs(prev => [...prev, tab]); setActiveTabId(tab.id); }
  /** Opens an external link through the proxy in a brand-new in-app tab. */
  function handleOpenLink(url: string) {
    const normalized = normalizeUrl(url, settings.searchEngine);
    if (!normalized) return;
    let domain = "";
    try { domain = new URL(normalized).hostname.replace(/^www./i, "").toLowerCase(); } catch { /* ignore */ }
    let proxyUrl: string;
    try {
      proxyUrl = encodeProxyUrl(normalized, getEffectiveEngine(normalized, settings), settings);
    } catch { return; }
    setSplit(null);
    const tab: Tab = {
      ...makeTab(normalized),
      url: proxyUrl,
      currentUrl: proxyUrl,
      title: domain || normalized,
      favicon: domain ? faviconUrl(domain) : "",
      history: [proxyUrl],
      historyIndex: 0,
      loading: true,
      lastProxyUrl: proxyUrl,
    };
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
    tabAbortRefs.current[tab.id] = new AbortController();
  }
  function handleNewIncognitoTab() { setSplit(null); const tab = makeTab("", true); setTabs(prev => [...prev, tab]); setActiveTabId(tab.id); }
  function completeWelcome(choices: WelcomeChoices | null) {
    try { localStorage.setItem(WELCOME_KEY, "1"); } catch { /* ignore */ }
    if (choices) {
      setSettings(prev => ({
        ...prev,
        searchEngine: choices.searchEngine,
        newtabMode: choices.newtabMode,
        verticalTabs: choices.verticalTabs,
        pinnedTabsToSidebar: choices.pinnedTabsToSidebar,
      }));
      if (!frontendOnly && choices.account === "signin" && !user) {
        window.setTimeout(() => handleNavigate("unstable://profile"), 120);
      }
    } else {
      // "Skip setup" deliberately restores the shipped defaults.
      setSettings(prev => ({
        ...prev,
        newtabMode: DEFAULT_SETTINGS.newtabMode,
        verticalTabs: DEFAULT_SETTINGS.verticalTabs,
        pinnedTabsToSidebar: DEFAULT_SETTINGS.pinnedTabsToSidebar,
      }));
    }
    setWelcomeOpen(false);
  }
  navRefs.current = { handleNavigate, handleNewTab, activateTab: handleTabActivate, handleOpenLink };
  function handleCloseTab(id: string) {
    if (tabs.length === 1) { setTabs([makeTab()]); return; }
    // Cancel in-flight navigation for the closed tab
    if (tabAbortRefs.current[id]) {
      tabAbortRefs.current[id].abort();
      delete tabAbortRefs.current[id];
    }
    const idx = tabs.findIndex(t => t.id === id);
    const next = tabs.filter(t => t.id !== id); setTabs(next);
    setMediaByTab(prev => { if (!(id in prev)) return prev; const n = { ...prev }; delete n[id]; return n; });
    const newActive = activeTabId === id ? next[Math.min(idx, next.length - 1)].id : activeTabId;
    if (activeTabId === id) setActiveTabId(newActive);
    if (split?.other === id) { setSplit(null); return; }
    if (split && newActive === split.other) setSplit(null);
  }
  function handleRefreshTab(id: string) {
    const iframe = iframeRefs.current[id];
    if (!iframe) return;
    iframe.src = iframe.src;
    setTabs(prev => prev.map(t => t.id === id ? { ...t, loading: true } : t));
  }
  function handleDuplicateTab(id: string) {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    const newTab = makeTab(tab.url);
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }
  function handleCloseTabsToRight(id: string) {
    const idx = tabs.findIndex(t => t.id === id);
    const keep = tabs.slice(0, idx + 1);
    setTabs(keep);
    const newActive = keep.some(t => t.id === activeTabId) ? activeTabId : keep[keep.length - 1].id;
    if (activeTabId !== newActive) setActiveTabId(newActive);
    if (split && (newActive === split.other || !keep.some(t => t.id === split.other))) setSplit(null);
  }
  function handleCloseOtherTabs(id: string) {
    setTabs(tabs.filter(t => t.id === id));
    if (activeTabId !== id) setActiveTabId(id);
    setSplit(null);
  }
  function handleToggleMute(id: string) {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, muted: !t.muted } : t));
  }
  function handleTogglePin(id: string) {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
  }
  function handleTabActivate(id: string) {
    if (split) {
      if (id === split.other) { handleSwapSplit(); return; }
      if (id === activeTabId) return;
      setSplit(null);
    }
    // Tabs stay mounted and keep streaming while hidden, so switching must not
    // abort anything: an aborted navigation would leave the previous tab stuck
    // on its spinner until the user reloads it.
    setActiveTabId(id);
  }
  function handleSplitTab(id: string) {
    if (split && id !== activeTabId) {
      if (split.other === id) { setSplit(null); return; }
      setSplit({ ...split, other: id });
      return;
    }
    const nt = makeTab();
    setTabs(prev => [...prev, nt]);
    setSplit({ other: nt.id, ratio: 0.5, direction: "horizontal" });
  }
  function handleSplitActive() {
    if (split) { setSplit(null); return; }
    const nt = makeTab();
    setTabs(prev => [...prev, nt]);
    setSplit({ other: nt.id, ratio: 0.5, direction: "horizontal" });
  }
  function handleSwapSplit() {
    if (!split) return;
    const other = split.other;
    setSplit({ ...split, other: activeTabId });
    setActiveTabId(other);
  }
  function startSplitDrag(e: React.MouseEvent) {
    if (!split || !stageRef.current) return;
    e.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    const startRatio = split.ratio;
    const horizontal = split.direction === "horizontal";
    const startPos = horizontal ? e.clientX : e.clientY;
    const size = (horizontal ? rect.width : rect.height) || 1;
    const clampRatio = (value: number) => Math.min(0.85, Math.max(0.15, value));
    let pendingRatio: number | null = null;
    let rafId = 0;
    setSplitDragging(true);
    const move = (ev: MouseEvent) => {
      const delta = (horizontal ? ev.clientX : ev.clientY) - startPos;
      pendingRatio = clampRatio(startRatio + delta / size);
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const ratio = pendingRatio;
          pendingRatio = null;
          if (ratio != null) setSplit(s => (s ? { ...s, ratio } : s));
        });
      }
    };
    const finish = () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", finish);
      window.removeEventListener("blur", finish);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setSplitDragging(false);
      const ratio = pendingRatio;
      pendingRatio = null;
      if (ratio != null) setSplit(s => (s ? { ...s, ratio } : s));
    };
    document.body.style.cursor = horizontal ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", finish);
    window.addEventListener("blur", finish);
  }
  function isAllowedExternalUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function handleShareCurrent() {
    const liveUrl = activeTab.currentUrl || activeTab.url;
    if (!liveUrl || liveUrl.startsWith("unstable://")) return;
    const decoded = decodeProxyUrl(liveUrl);
    setQrUrl(decoded);
  }

  const copyQrUrl = async () => {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
      setQrCopied(true);
      if (qrCopyTimer.current) window.clearTimeout(qrCopyTimer.current);
      qrCopyTimer.current = setTimeout(() => setQrCopied(false), 2000);
    } catch {}
  };

  const saveQrPng = async () => {
    if (!qrUrl) return;
    try {
      const { default: QRCode } = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(qrUrl, { width: 512, margin: 1, color: { dark: "#0d0d0d", light: "#ffffff" } });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "unstable-qr.png";
      a.click();
    } catch {}
  };

  function handleOpenInNewTab() {
    if (!activeTab.url || activeTab.url.startsWith("unstable://")) return;
    if (!isAllowedExternalUrl(activeTab.url)) return;
    const safeUrl = new URL(activeTab.url).href;

    const win = window.open("about:blank", "_blank"); if (!win) return;
    const doc = win.document;
    doc.title = "Unstable";

    const html = doc.documentElement;
    const body = doc.body || doc.createElement("body");
    html.style.margin = "0";
    html.style.padding = "0";
    html.style.width = "100%";
    html.style.height = "100%";
    html.style.background = "#0d0d0d";
    body.style.margin = "0";
    body.style.padding = "0";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.background = "#0d0d0d";

    const iframe = doc.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";
    iframe.src = safeUrl;
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("allow", "fullscreen *;autoplay *;camera *;microphone *;payment *;clipboard-read *;clipboard-write *;encrypted-media *");

    body.replaceChildren(iframe);
    if (!doc.body) html.appendChild(body);
  }

  function toggleDevTools() {
    const iframe = iframeRefs.current[activeTabId] ?? iframeRef.current;
    if (!iframe) return;
    let doc: Document | null = null;
    try { doc = iframe.contentDocument; } catch {}
    let win: Window | null = null;
    try { win = iframe.contentWindow; } catch {}
    if (!doc || !win) return;
    const id = activeTabId;
    const isOpen = !!devToolsOpen[id];

    if (isOpen) {
      try { (win as any).eruda.hide(); } catch {}
      (win as any).__UNSTABLE_DEVTOOLS__ = false;
      setDevToolsOpen(prev => ({ ...prev, [id]: false }));
      return;
    }

    if ((win as any).eruda) {
      try { (win as any).eruda.show(); } catch {}
      (win as any).__UNSTABLE_DEVTOOLS__ = true;
      setDevToolsOpen(prev => ({ ...prev, [id]: true }));
      return;
    }

    try {
      doc.querySelectorAll('meta[http-equiv="Content-Security-Policy"], meta[http-equiv="content-security-policy"]').forEach(m => m.remove());
    } catch {}

    fetch("/eruda.min.js")
      .then(r => r.text())
      .then(code => {
        try {
          const s = doc!.createElement("script");
          s.textContent = code;
          (doc!.head || doc!.documentElement).appendChild(s);
        } catch (e1) {
          try {
            (win as any).eval(code);
          } catch (e2) {
            try {
              const blob = new Blob([code], { type: "application/javascript" });
              const blobUrl = URL.createObjectURL(blob);
              const s2 = doc!.createElement("script");
              s2.src = blobUrl;
              s2.onload = () => URL.revokeObjectURL(blobUrl);
              s2.onerror = () => URL.revokeObjectURL(blobUrl);
              (doc!.head || doc!.documentElement).appendChild(s2);
            } catch (_) {}
          }
        }
        if ((win as any).eruda) {
          try {
            (win as any).eruda.init({ useShadowDom: true });
            (win as any).eruda.show();
            (win as any).__UNSTABLE_DEVTOOLS__ = true;
          } catch (e) { console.error("eruda init failed", e); }
        } else {
          console.error("eruda not found after injection attempts");
        }
      })
      .catch(e => console.error("eruda fetch failed", e));
    setDevToolsOpen(prev => ({ ...prev, [id]: true }));
  }

  function handleUrlSubmit(e: React.FormEvent) { e.preventDefault(); handleNavigate(urlInput); urlInputRef.current?.blur(); }

  const canBack = (activeTab?.historyIndex ?? -1) > 0;
  const canForward = activeTab ? activeTab.historyIndex < activeTab.history.length - 1 : false;

  const btn: React.CSSProperties = { background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", padding: "0 0.35rem", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", height: 26, minWidth: 26, flexShrink: 0, transition: "color 0.1s, background 0.1s" };
  const btnOff: React.CSSProperties = { ...btn, color: "rgba(255,255,255,0.14)", cursor: "not-allowed" };
  const hov = (on: boolean) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { if (on) { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; } },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.target as HTMLButtonElement).style.color = on ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.14)"; (e.target as HTMLButtonElement).style.background = "none"; },
  });

  const renderTabContent = useCallback((tab: Tab) => {
    if (!tab.url) {
      return settings.newtabMode === "legacy" ? (
        <NewTabPage onNavigate={u => handleNavigate(u, tab.id)} customShortcuts={customShortcuts} setCustomShortcuts={setCustomShortcuts} wallpaper={settings.wallpaper} searchEngine={settings.searchEngine} showMs={settings.showMsIndicator} />
      ) : (
        <iframe ref={(el) => { if (el) iframeRefs.current[tab.id] = el; else delete iframeRefs.current[tab.id]; }} src={`/mue/index.html?searchUrl=${encodeURIComponent(SEARCH_ENGINES[settings.searchEngine]?.url ?? "https://duckduckgo.com/?q=")}`} style={{ width: "100%", height: "100%", border: "none", display: "block" }} />
      );
    }
    if (tab.url === "unstable://ai") {
      if (frontendOnly) return <UnavailableFeature feature="AI" />;
      return <AIPage user={user} profile={profile} onAuthenticated={onAuthenticated} />;
    }
    if (tab.url === "unstable://chat" || tab.url === "unstable://dm") {
      if (frontendOnly) return <UnavailableFeature feature="Chat" />;
      const dm = tab.url === "unstable://dm";
      return (
        <ChatPage
          user={user}
          profile={profile}
          session={session}
          onAuthenticated={onAuthenticated}
          chatTab={dm ? "dm" : "global"}
          onChatTabChange={next => handleNavigate(next === "dm" ? "unstable://dm" : "unstable://chat", tab.id)}
        />
      );
    }
    if (tab.url === "unstable://profile") {
      if (frontendOnly) return <UnavailableFeature feature="Accounts" />;
      if (!user || !profile) {
        return <InlineAuthScreen onAuthenticated={onAuthenticated} feature="Profile" />;
      }
      return (
        <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif" }}>Loading...</div>}>
          <ProfilePage user={user} profile={profile} onLogout={onLogout} />
        </Suspense>
      );
    }
    if (tab.url === "unstable://settings") return <SettingsPage settings={settings} onSettingsChange={setSettings} onLogout={frontendOnly ? undefined : onLogout} onNavigate={u => handleNavigate(u, tab.id)} frontendOnly={frontendOnly} />;
    if (tab.url === "unstable://games") return (
      <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif" }}>Loading Games...</div>}>
        <GamesPage onNavigate={u => handleNavigate(u, tab.id)} />
      </Suspense>
    );
    if (tab.url === "unstable://history") return <HistoryPage onNavigate={u => handleNavigate(u, tab.id)} />;
    if (tab.url === "unstable://bookmarks") return <BookmarksPage onNavigate={u => handleNavigate(u, tab.id)} />;
    if (tab.url === "unstable://downloads") return <DownloadsPage onNavigate={u => handleNavigate(u, tab.id)} />;
    if (tab.url === "unstable://releases") return (
      <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif" }}>Loading Releases...</div>}>
        <ReleasesPage />
      </Suspense>
    );
    if (tab.url === "unstable://credits") return <CreditsPage />;
    if (tab.url === "unstable://tos") return <ToSPage />;
    if (tab.url === "unstable://privacy") return <PrivacyPage />;
    if (tab.url === "unstable://blank") return <div style={{ width: "100%", height: "100%", background: "var(--t-bg)" }} />;
    // Every real internal page is handled above. Anything else on the
    // unstable:// scheme must never reach the iframe: Chrome can't load a
    // non-http scheme and renders "This site can't be reached".
    if (tab.url.startsWith("unstable://")) {
      return <UnknownPage url={tab.url} onNavigate={u => handleNavigate(u, tab.id)} />;
    }
    return (
      <iframe ref={(el) => {
        if (el) {
          iframeRefs.current[tab.id] = el;
          if (tab.id === activeTabId) iframeRef.current = el;
          (el as HTMLIFrameElement & { muted: boolean }).muted = tab.muted;
        } else {
          // Unmounted (tab went idle or closed): drop the stale frame handle.
          delete iframeRefs.current[tab.id];
          if (iframeRef.current && !document.contains(iframeRef.current)) iframeRef.current = null;
        }
      }}
        src={tab.url}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="fullscreen *;autoplay *;camera *;microphone *;payment *;clipboard-read *;clipboard-write *;encrypted-media *;gamepad *"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"
        onLoad={() => {
          // Check if this tab's navigation was cancelled
          if (tabAbortRefs.current[tab.id]?.signal.aborted) return;
          
          updateTab(tab.id, { loading: false });
          // Mirror the live location (post-redirect) into the tab immediately.
          syncTabFromFrame(tab.id);
          try {
            const iframe = iframeRefs.current[tab.id];
            if (iframe) {
              const doc = iframe.contentDocument;
              const title = doc?.title || tab.title;
              const liveHrefRaw = (() => { try { return iframe.contentWindow?.location.href || ""; } catch { return ""; } })();
              const liveHref = liveHrefRaw.startsWith(location.origin)
                ? liveHrefRaw.slice(location.origin.length) || "/"
                : liveHrefRaw;
              const historyUrl = liveHref || tab.url;
              const favicon = tab.favicon || undefined;
              if (title && historyUrl && !historyUrl.startsWith("unstable://") && !tab.incognito) {
                const originalUrl = decodeProxyUrl(historyUrl);
                addHistory(originalUrl || historyUrl, title, favicon).catch(() => {});
              }
            }
          } catch {}
          try {
            const iframe = iframeRefs.current[tab.id];
            if (!iframe) return;
            const win = iframe.contentWindow as any;
            const doc = iframe.contentDocument;
            if (win && doc) {
              doc.getElementById("unstable-cursor-style")?.remove();
              const useMagicCursor = settings.magicCursorEnabled;
              if (useMagicCursor) {
                const cursorStyle = doc.createElement("style");
                cursorStyle.id = "unstable-cursor-style";
                cursorStyle.textContent = "html, body, * { cursor: none !important; }";
                doc.head.appendChild(cursorStyle);
                win.addEventListener("mousemove", (e: MouseEvent) => {
                  const rect = iframe.getBoundingClientRect();
                  window.dispatchEvent(new CustomEvent("iframe-mousemove", { detail: { clientX: e.clientX, clientY: e.clientY, iframeRect: rect } }));
                });
                doc.addEventListener("mousemove", (e: MouseEvent) => {
                  const rect = iframe.getBoundingClientRect();
                  window.dispatchEvent(new CustomEvent("iframe-mousemove", { detail: { clientX: e.clientX, clientY: e.clientY, iframeRect: rect } }));
                });
                const handleIframeHover = (e: MouseEvent) => {
                  const target = e.target as HTMLElement;
                  if (target && (target.tagName === "BUTTON" || target.tagName === "A" || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || win.getComputedStyle(target).cursor === "pointer")) {
                    window.dispatchEvent(new CustomEvent("iframe-hover", { detail: { hovering: true } }));
                  } else {
                    window.dispatchEvent(new CustomEvent("iframe-hover", { detail: { hovering: false } }));
                  }
                };
                win.addEventListener("mouseover", handleIframeHover);
                win.addEventListener("mouseout", () => window.dispatchEvent(new CustomEvent("iframe-hover", { detail: { hovering: false } })));
              }
              doc.addEventListener("keydown", (e: KeyboardEvent) => {
                const ae = doc.activeElement;
                if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || (ae as HTMLElement).isContentEditable)) return;
                window.dispatchEvent(new KeyboardEvent("keydown", { key: e.key, code: e.code, ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey, metaKey: e.metaKey, bubbles: true, cancelable: true }));
              });
            }
          } catch {}
          const current = tab.url;
          if (!current) return;
          try {
            if (current.startsWith(SCRAMJET_PREFIX)) {
              if (settings.proxyEngine === "scramjet") { updateTab(tab.id, { loading: false }); return; }
              const original = decodeProxyUrl(current);
              const uvUrl = encodeProxyUrl(original, "uv", settings);
              if (uvUrl !== current) { updateTab(tab.id, { url: uvUrl, loading: true }); return; }
            } else if (current.startsWith(UV_PREFIX)) {
              if (settings.proxyEngine === "uv") { updateTab(tab.id, { loading: false }); return; }
              const original = decodeProxyUrl(current);
              if (original && original.startsWith("http")) {
                if (scrController) {
                  const scramjetUrl = encodeProxyUrl(original, "scramjet", settings);
                  if (scramjetUrl !== current) { updateTab(tab.id, { url: scramjetUrl, loading: true }); return; }
                }
                const retryUrl = encodeProxyUrl(original, "uv", settings);
                if (retryUrl !== current) { updateTab(tab.id, { url: retryUrl, loading: true }); return; }
              }
            }
          } catch {}
          updateTab(tab.id, { loading: false });
        }}
      />
    );
  }, [settings, customShortcuts, user, profile, session, onAuthenticated, scrController, proxyStatus.phase, syncTabFromFrame, activeTabId]);

  // ─── Floating music controller wiring ──────────────────────────────────────
  const activeMedia = useMemo(() => {
    const entries = Object.entries(mediaByTab);
    if (entries.length === 0) return null;
    const active = mediaByTab[activeTabId];
    if (active && (active.playing || active.hasMedia)) {
      return { tabId: activeTabId, state: active };
    }
    const playing = entries.find(([, m]) => m.playing);
    if (playing) return { tabId: playing[0], state: playing[1] };
    return null;
  }, [mediaByTab, activeTabId]);
  const anyMedia = Object.values(mediaByTab).some(m => m.hasMedia || m.playing);

  function sendMediaCommand(tabId: string, action: "toggle" | "next" | "prev") {
    const el = iframeRefs.current[tabId];
    try { el?.contentWindow?.postMessage({ type: "unstable-media-control", action }, "*"); } catch { /* ignore */ }
  }
  function dismissMediaController() {
    localStorage.setItem(MEDIA_DISMISS_KEY, "1");
    setMediaDismissed(true);
  }
  function reopenMediaController() {
    localStorage.removeItem(MEDIA_DISMISS_KEY);
    setMediaDismissed(false);
  }

  return (
    <>
      {settings.magicCursorEnabled ? <MagicCursor /> : null}
      <DownloadIndicator onOpen={() => handleNavigate("unstable://downloads")} />
      <AnimatePresence>
        {activeMedia && !mediaDismissed && (
          <MediaController
            key={activeMedia.tabId}
            state={activeMedia.state}
            tabId={activeMedia.tabId}
            onCommand={a => sendMediaCommand(activeMedia.tabId, a)}
            onDismiss={dismissMediaController}
          />
        )}
        {mediaDismissed && anyMedia && (
          <motion.button
            key="media-reopen"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={reopenMediaController}
            aria-label="Open music player"
            data-tooltip="Music player"
            style={{
              position: "fixed",
              bottom: 16,
              right: 16,
              zIndex: 1000001,
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.5rem 0.75rem",
              background: "radial-gradient(circle 100px at 50% 50%, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 72%), linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: "8px",
              color: "#e8e8e8",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.66rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 28px rgba(0,0,0,0.45)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <Music size={13} style={{ color: "rgba(255,255,255,0.6)" }} />
            player
          </motion.button>
        )}
      </AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", position: "relative", zIndex: 1, transform: `scale(${settings.uiScale})`, transformOrigin: "top left", width: `${100 / settings.uiScale}vw`, minHeight: `${100 / settings.uiScale}vh` }}
    >
      {!fullscreen && (
        <motion.div initial={{ y: -40 }} animate={{ y: 0 }} transition={{ type: "spring", damping: 20 }}>
          {!settings.verticalTabs && (
          <div style={{ display: "flex", alignItems: "stretch", background: "#080808", borderBottom: "1px solid #1a1a1a", height: 36, flexShrink: 0, overflow: "hidden" }}>
            <div className="tab-scroll" style={{ display: "flex", overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", msOverflowStyle: "none" }}>
              <AnimatePresence>
                {(() => {
                  const tabEls: React.ReactNode[] = [];
                  const splitTabIds = split ? new Set([activeTabId, split.other]) : null;
                  let groupPushed = false;
                  tabs.forEach(tab => {
                    if (splitTabIds?.has(tab.id)) {
                      if (groupPushed) return;
                      groupPushed = true;
                      tabEls.push(
                        <div key="split-group" style={{ display: "flex", alignItems: "stretch", height: "100%", background: "#151515", border: "1px solid #262626", borderRadius: "6px", margin: "0 2px", overflow: "hidden", flexShrink: 0 }}>
                          {tabs.filter(t => splitTabIds.has(t.id)).map(t => (
                            <BrowserTab key={t.id} tab={t} isActive={t.id === activeTabId} onActivate={() => handleTabActivate(t.id)} onClose={() => handleCloseTab(t.id)} onRefresh={() => handleRefreshTab(t.id)} onDuplicate={() => handleDuplicateTab(t.id)} onCloseRight={() => handleCloseTabsToRight(t.id)} onCloseOthers={() => handleCloseOtherTabs(t.id)} onSplit={() => handleSplitTab(t.id)} inSplit={split?.other === t.id} onToggleMute={() => handleToggleMute(t.id)} onTogglePin={() => handleTogglePin(t.id)} thumbnail={tabPreviews[t.id]} readMemory={() => readTabMemory(t)} requestPreview={() => requestTabThumbnail(t.id)} />
                          ))}
                        </div>
                      );
                      return;
                    }
                    tabEls.push(<BrowserTab key={tab.id} tab={tab} isActive={tab.id === activeTabId} onActivate={() => handleTabActivate(tab.id)} onClose={() => handleCloseTab(tab.id)} onRefresh={() => handleRefreshTab(tab.id)} onDuplicate={() => handleDuplicateTab(tab.id)} onCloseRight={() => handleCloseTabsToRight(tab.id)} onCloseOthers={() => handleCloseOtherTabs(tab.id)} onSplit={() => handleSplitTab(tab.id)} inSplit={false} onToggleMute={() => handleToggleMute(tab.id)} onTogglePin={() => handleTogglePin(tab.id)} thumbnail={tabPreviews[tab.id]} readMemory={() => readTabMemory(tab)} requestPreview={() => requestTabThumbnail(tab.id)} />);
                  });
                  return tabEls;
                })()}
              </AnimatePresence>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleNewTab} style={{ background: "none", border: "none", borderLeft: "1px solid #1a1a1a", color: "rgba(255,255,255,0.28)", cursor: "pointer", padding: "0 0.85rem", fontSize: 18, lineHeight: 1, flexShrink: 0, transition: "color 0.1s" }}
                onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"} onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)"} data-tooltip="New tab" aria-label="New tab">+</motion.button>
            </div>
          </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", padding: "0.3rem 0.55rem", background: activeTab?.incognito ? "#14121a" : "var(--t-bg)", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
            {activeTab?.incognito && <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0 0.4rem 0 0", borderRight: "1px solid #2a2a2a", marginRight: "0.15rem" }}><EyeOff size={11} style={{ opacity: 0.5 }} /><span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>incognito</span></div>}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleBack} disabled={!canBack} style={canBack ? btn : btnOff} {...hov(canBack)} data-tooltip="Back" aria-label="Back"><ArrowLeft size={16} /></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleForward} disabled={!canForward} style={canForward ? btn : btnOff} {...hov(canForward)} data-tooltip="Forward" aria-label="Forward"><ArrowRight size={16} /></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleReload} style={btn} {...hov(true)} data-tooltip="Reload" aria-label="Reload">↺</motion.button>
            {settings.adblockEnabled && adblockCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.15rem", padding: "0 0.2rem", color: "rgba(255,255,255,0.3)", fontSize: "0.55rem", flexShrink: 0 }}>
                <Shield size={10} />
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{adblockCount}</span>
              </div>
            )}
            <div style={{ width: 1, height: 16, background: "#1e1e1e", margin: "0 0.15rem", flexShrink: 0 }} />
            <div style={{ position: "relative", flex: 1, display: "flex" }}>
              <form onSubmit={handleUrlSubmit} style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input ref={urlInputRef} value={urlInput} onChange={e => { setUrlInput(e.target.value); setSuggestIndex(-1); }}
                    onFocus={e => { e.target.select(); e.target.style.borderColor = "#444"; }}
                    onBlur={e => { e.target.style.borderColor = "#1e1e1e"; setTimeout(() => setShowSuggestions(false), 200); }}
                    onKeyDown={e => {
                      if (!showSuggestions || !searchSuggestions.length) return;
                      if (e.key === "ArrowDown") { e.preventDefault(); setSuggestIndex(i => Math.min(i + 1, searchSuggestions.length - 1)); }
                      if (e.key === "ArrowUp") { e.preventDefault(); setSuggestIndex(i => Math.max(i - 1, -1)); }
                      if (e.key === "Enter" && suggestIndex >= 0) {
                        e.preventDefault();
                        const s = searchSuggestions[suggestIndex];
                        setUrlInput(s); setShowSuggestions(false); setSuggestIndex(-1);
                        handleNavigate(searchUrl(s, settings.searchEngine));
                      }
                    }}
                    placeholder="search, url, or unstable://…"
                    style={{ width: "100%", background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#e0e0e0", padding: "0.26rem 1.5rem 0.26rem 0.65rem", fontSize: "0.77rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "0", letterSpacing: "0.01em", transition: "border-color 0.15s" }}
                  />
                <button type="button" onClick={async () => {
                  const liveUrl = activeTab?.currentUrl || activeTab?.url;
                  if (!liveUrl || liveUrl.startsWith("unstable://")) return;
                  const url = decodeProxyUrl(liveUrl);
                  if (bookmarked) {
                    await removeBookmark(url);
                    setBookmarked(false);
                  } else {
                    let domain = "";
                    try { domain = new URL(url).hostname; } catch {}
                    await addBookmark(url, activeTab.title || domain, activeTab.favicon || faviconUrl(domain));
                    setBookmarked(true);
                  }
                }} style={{
                  position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", padding: "2px",
                  color: bookmarked ? "#f0c040" : "rgba(255,255,255,0.25)", transition: "color 0.15s",
                }} data-tooltip={bookmarked ? "Remove bookmark" : "Bookmark"} aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}>
                  <Star size={12} fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={bookmarked ? 1.5 : 2.5} />
                </button>
              </div>
              </form>
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div ref={suggestListRef} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000, background: "#111", border: "1px solid #222", borderRadius: "8px", marginTop: 4, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                    {searchSuggestions.map((s, i) => (
                      <motion.div key={s} whileHover={{ background: "#1e1e1e" }} onClick={() => { setUrlInput(s); setShowSuggestions(false); setSuggestIndex(-1); handleNavigate(searchUrl(s, settings.searchEngine)); }}
                        style={{ padding: "0.45rem 0.7rem", fontSize: "0.75rem", color: "#ccc", cursor: "pointer", borderBottom: "1px solid #1a1a1a", background: i === suggestIndex ? "#1e1e1e" : "transparent" }}
                        onMouseEnter={e => { setSuggestIndex(i); }}
                      >{s}</motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div style={{ width: 1, height: 16, background: "#1e1e1e", margin: "0 0.15rem", flexShrink: 0 }} />
            <div ref={toolMenuRef} style={{ position: "relative" }}>
              <button onClick={() => setToolMenuOpen(o => !o)} style={btn} {...hov(true)} data-tooltip="Tools" aria-label="Tools">
                <EllipsisVertical size={15} stroke={!!devToolsOpen[activeTabId] ? "#e8e8e8" : "currentColor"} />
              </button>
              <AnimatePresence>
                {toolMenuOpen && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 2000, background: "#111", border: "1px solid #222", borderRadius: "6px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", minWidth: 160 }}>
                    {(() => {
                      const hasIframe = !!iframeRefs.current[activeTabId] || !!iframeRef.current;
                      const dtColor = !hasIframe ? "rgba(255,255,255,0.2)" : devToolsOpen[activeTabId] ? "#e8e8e8" : "rgba(255,255,255,0.75)";
                      return <motion.button whileHover={hasIframe ? { background: "#1a1a1a" } : {}} onClick={() => { setToolMenuOpen(false); if (hasIframe) toggleDevTools(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: dtColor, fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: hasIframe ? "pointer" : "not-allowed", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><Wrench size={12} style={{ opacity: 0.7, flexShrink: 0 }} />{devToolsOpen[activeTabId] ? "Close DevTools" : hasIframe ? "DevTools" : "DevTools (open a web page)"}</motion.button>;
                    })()}
                    <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setToolMenuOpen(false); handleOpenInNewTab(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><ExternalLink size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Open in new tab</motion.button>
                    <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setToolMenuOpen(false); handleNewIncognitoTab(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><EyeOff size={12} style={{ opacity: 0.7, flexShrink: 0 }} />New incognito tab</motion.button>
                    <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setToolMenuOpen(false); handleNavigate("unstable://history"); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><HistoryIcon size={12} style={{ opacity: 0.7, flexShrink: 0 }} />History</motion.button>
                    <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setToolMenuOpen(false); handleNavigate("unstable://bookmarks"); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><Bookmark size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Bookmarks</motion.button>
                    <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setToolMenuOpen(false); setDownloadsPanelOpen(true); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><Download size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Download manager</motion.button>
                    <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setToolMenuOpen(false); handleShareCurrent(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><QrCode size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Share via QR</motion.button>
                    <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setToolMenuOpen(false); setFullscreen(f => !f); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><Maximize size={12} style={{ opacity: 0.7, flexShrink: 0 }} />{fullscreen ? "Exit fullscreen" : "Fullscreen"}</motion.button>
                    <div style={{ height: 1, background: "#222", margin: "0.2rem 0" }} />
                    <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setToolMenuOpen(false); handleSplitActive(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><Columns2 size={12} style={{ opacity: 0.7, flexShrink: 0 }} />{split ? "Close split" : "Split current tab"}</motion.button>
                    {split && <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setToolMenuOpen(false); setSplit(s => s && ({ ...s, direction: s.direction === "horizontal" ? "vertical" : "horizontal" })); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}><ArrowUpDown size={12} style={{ opacity: 0.7, flexShrink: 0 }} />Rotate split</motion.button>}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {downloadsPanelOpen && (
                  <div ref={downloadsPanelRef} style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 2001 }}>
                    <DownloadsPanel
                      onOpenManager={() => { setDownloadsPanelOpen(false); handleNavigate("unstable://downloads"); }}
                      onClose={() => setDownloadsPanelOpen(false)}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Loading progress bar */}
          <div style={{ height: 2, background: "#0d0d0d", overflow: "hidden", flexShrink: 0 }}>
            <AnimatePresence>
              {loadBarVisible && (
                <motion.div
                  key="loading-bar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ height: "100%", width: "100%", position: "relative" }}
                >
                  <motion.div
                    style={{
                      height: "100%",
                      scaleX: loadBarScaleX,
                      transformOrigin: "left",
                      background: "linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.28) 100%)",
                      boxShadow: "0 0 6px rgba(255,255,255,0.12)",
                      position: "relative",
                    }}
                  >
                    <motion.div style={{
                      position: "absolute", right: 0, top: 0, height: "100%", width: 40,
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22))",
                    }} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {!fullscreen && (
          <CollapsedSidebar
            activeUrl={activeTab?.url || ""}
            canReturnToBrowse={Boolean(activeTab?.url.startsWith("unstable://") && activeTab.lastProxyUrl)}
            onNavigate={(url) => handleNavigate(url, activeTabId)}
            tabs={tabs}
            activeTabId={activeTabId}
            onTabActivate={(id) => handleTabActivate(id)}
            onTabClose={(id) => handleCloseTab(id)}
            onNewTab={handleNewTab}
            verticalTabs={settings.verticalTabs}
            onOpenLink={handleOpenLink}
            sidebarSites={settings.sidebarSites}
            pinnedTabsToSidebar={settings.pinnedTabsToSidebar}
            frontendOnly={frontendOnly}
          />
        )}

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {fullscreen && (
            <button onClick={() => setFullscreen(false)} style={{ position: "absolute", top: 12, right: 12, zIndex: 999, background: "rgba(0,0,0,0.6)", border: "1px solid #333", color: "#e8e8e8", cursor: "pointer", padding: "6px 10px", borderRadius: "10px", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>exit fullscreen</button>
          )}
          {/* Tab stage. A tab is mounted when it is active, the other half of a
              split, still loading (so a background navigation finishes), playing
              media, or one of the few most recently used tabs — those stay warm
              so switching back to them is instant instead of a cold proxy
              reload. Everything older is unmounted: mounting every tab made the
              app crawl. Split view is inline rects over the same wrappers, so
              toggling split never remounts a tab. */}
          <div ref={stageRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
            {(() => {
              const horizontal = split ? split.direction === "horizontal" : false;
              const otherTab = split ? tabs.find(t => t.id === split.other) : undefined;
              const headerH = SPLIT_HEADER_H;
              const rects: Record<string, React.CSSProperties> = {};
              if (split && otherTab) {
                const pos = Math.round(split.ratio * 100);
                const firstMain = horizontal ? { left: 0, top: 0, width: `${pos}%`, height: "100%" } : { left: 0, top: 0, width: "100%", height: `${pos}%` };
                const secondMain = horizontal ? { left: `${pos}%`, top: 0, width: `${100 - pos}%`, height: "100%" } : { left: 0, top: `${pos}%`, width: "100%", height: `${100 - pos}%` };
                rects[activeTabId] = { ...firstMain, height: horizontal ? firstMain.height : `calc(${firstMain.height} - ${D}px)` };
                rects[split.other] = { ...secondMain, top: horizontal ? secondMain.top : `calc(${secondMain.top} + ${D}px)`, height: horizontal ? secondMain.height : `calc(${secondMain.height} - ${D}px)` };
              }
              const keepAlive = new Set(recentTabIds);
              const mounted = tabs.filter(tab =>
                tab.id === activeTabId
                || (!!split && tab.id === split.other)
                || tab.loading
                || keepAlive.has(tab.id)
                || !!mediaByTab[tab.id]?.playing,
              );
              return (
                <>
                  {mounted.map(tab => {
                    const isActive = tab.id === activeTabId;
                    const rect = rects[tab.id];
                    const visible = isActive || (split ? tab.id === split.other : false);
                    const zIndex = isActive ? 2 : visible ? 1 : 0;
                    return (
                      <div key={tab.id} aria-hidden={!visible} data-tab-content={tab.id}
                        style={{
                          position: "absolute",
                          ...(rect ?? { inset: 0 }),
                          display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0,
                          overflow: "hidden",
                          visibility: visible ? "visible" : "hidden",
                          pointerEvents: visible ? "auto" : "none",
                          zIndex,
                          background: "#0d0d0d",
                          opacity: visible ? 1 : 0,
                        }}>
                        {rect && (
                          <SplitHeader tab={tab} onSwap={handleSwapSplit} onClose={() => setSplit(null)}
                            style={{ height: headerH, flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
                          {renderTabContent(tab)}
                        </div>
                      </div>
                    );
                  })}

                  {split && otherTab && (() => {
                    const pos = Math.round(split.ratio * 100);
                    const dividerStyle: React.CSSProperties = horizontal
                      ? { left: `${pos}%`, top: 0, width: D, height: "100%", marginLeft: -D / 2, cursor: "col-resize" }
                      : { left: 0, top: `${pos}%`, width: "100%", height: D, marginTop: -D / 2, cursor: "row-resize" };
                    return (
                      <>
                        <div onMouseDown={startSplitDrag} onDoubleClick={() => setSplit(s => s && ({ ...s, ratio: 0.5 }))}
                          style={{ position: "absolute", zIndex: 6, background: splitDragging ? "#333" : "#1a1a1a", transition: "background 0.15s", ...dividerStyle }}>
                          {horizontal
                            ? <GripVertical size={10} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: splitDragging ? 0.7 : 0.3, pointerEvents: "none" }} />
                            : <GripHorizontal size={10} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: splitDragging ? 0.7 : 0.3, pointerEvents: "none" }} />}
                        </div>
                        {splitDragging && (
                          <div style={{ position: "absolute", inset: 0, zIndex: 7, cursor: dividerStyle.cursor }} />
                        )}
                      </>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <StatusBar visible={false} leftOffset={fullscreen ? 12 : 68} transportMode={settings.transportMode} wispServer={settings.wispServer} settings={settings} />

      <AnimatePresence>
        {pendingPerm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 10 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{ background: "#111", border: "1px solid #333", borderRadius: "8px", padding: "1.5rem", maxWidth: 400, width: "90%" }}>
              <p style={{ color: "#e8e8e8", margin: 0, fontSize: "0.85rem", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.5 }}>
                <strong style={{ color: "#e8e8e8" }}>{(() => { try { return new URL(pendingPerm.origin).hostname; } catch { return pendingPerm.origin; } })()}</strong> wants to access your <strong style={{ color: "#e8e8e8" }}>{pendingPerm.permission}</strong>
              </p>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.2rem" }}>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => { pendingPermResolve.current?.(false); setPendingPerm(null); }}
                  style={{ background: "#222", color: "#e8e8e8", border: "1px solid #444", padding: "0.4rem 1rem", borderRadius: "0", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>deny</motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => { pendingPermResolve.current?.(true); setPendingPerm(null); }}
                  style={{ background: "#e8e8e8", color: "#0d0d0d", border: "none", padding: "0.4rem 1rem", borderRadius: "0", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>allow</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-blocking session restore prompt, bottom right. The tabs are already
          open as plain new tabs, so browsing stays normal either way. */}
      <AnimatePresence>
        {pendingRestore.length > 0 && (
          <motion.div initial={{ opacity: 0, x: 18, y: 18 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 18, y: 18 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}
            style={{ position: "fixed", right: 18, bottom: 18, zIndex: 999999, background: "linear-gradient(180deg, #171717, #101010)", border: "1px solid #383838", borderRadius: "0", padding: "1rem", maxWidth: 360, width: "calc(100vw - 36px)", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 18px 48px rgba(0,0,0,0.55)" }}>
              <p style={{ margin: "0 0 0.35rem", fontSize: "0.6rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>session restore</p>
              <p style={{ color: "#e8e8e8", margin: "0 0 0.75rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
                Restore <strong>{pendingRestore.length}</strong> saved {pendingRestore.length === 1 ? "tab" : "tabs"} from your last visit?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: 112, overflow: "auto", marginBottom: "0.85rem" }}>
                {pendingRestore.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.55rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "0" }}>
                    {p.favicon ? <img src={p.favicon} alt="" style={{ width: 12, height: 12, borderRadius: 2, flexShrink: 0 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : null}
                    <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{decodeProxyUrl(p.url) || p.title}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    // Decline: the tabs are already new tabs, just drop the payload.
                    setPendingRestore([]);
                    setRestoreAccepted(false);
                  }}
                  style={{ background: "#222", color: "#e8e8e8", border: "1px solid #444", padding: "0.4rem 1rem", borderRadius: "0", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>no thanks</motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setRestoreAccepted(true)}
                  style={{ background: "#e8e8e8", color: "#0d0d0d", border: "none", padding: "0.4rem 1rem", borderRadius: "0", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>restore</motion.button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {qrUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ position: "fixed", inset: 0, zIndex: 999998, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setQrUrl(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 10 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "#111", border: "1px solid #333", borderRadius: "8px", padding: "1.5rem", maxWidth: 420, width: "90%", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.9rem" }}>
              <p style={{ margin: 0, color: "#e8e8e8", fontSize: "0.72rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Scan to open</p>
              <QrCodeCanvas url={qrUrl} size={180} />
              <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{qrUrl}</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={copyQrUrl}
                  style={{ background: "#e8e8e8", color: "#0d0d0d", border: "none", padding: "0.4rem 1rem", borderRadius: "0", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{qrCopied ? "✓ Copied" : "Copy URL"}</motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={saveQrPng}
                  style={{ background: "#222", color: "#e8e8e8", border: "1px solid #444", padding: "0.4rem 1rem", borderRadius: "0", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Save PNG</motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setQrUrl(null)}
                  style={{ background: "none", color: "rgba(255,255,255,0.5)", border: "1px solid #333", padding: "0.4rem 1rem", borderRadius: "0", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Close</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthDialog prompt={authPrompt} onClose={() => setAuthPrompt(null)} onAuthenticated={completeAuthPrompt} />

      <ErrorScreen />

      <WelcomeFlow open={welcomeOpen} user={user} onComplete={completeWelcome} frontendOnly={frontendOnly} />

      <div id="unstable-tooltip" className={tooltip ? "visible" : ""} style={{ left: tooltip ? tooltip.x : 0, top: tooltip ? tooltip.y : 0, transform: "translateX(-50%) translateY(-100%)" }}>{tooltip?.text ?? ""}</div>

    </motion.div>
    </>
  );
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  { at: 0, text: "Starting services…" },
  { at: 33, text: "Connecting…" },
  { at: 66, text: "Almost ready…" },
];

function LoadingSpinner() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 3500;
    // A timer rather than requestAnimationFrame: the boot screen must advance
    // even in a tab that is not compositing frames.
    const id = setInterval(() => {
      const t = Math.min((Date.now() - start) / duration, 1);
      setProgress(Math.round((1 - Math.pow(1 - t, 3)) * 100));
      if (t >= 1) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, []);
  const msg = [...LOADING_MESSAGES].reverse().find(m => progress >= m.at)?.text ?? LOADING_MESSAGES[0].text;
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
          <circle cx="70" cy="70" r={r} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset 0.1s linear" }} />
        </svg>
        <span style={{ position: "absolute", fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
          {progress}%
        </span>
      </div>
      <motion.span key={msg} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}>
        {msg}
      </motion.span>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const deployment = useDeploymentMode();
  const frontendOnly = deployment === "frontend";
  const [accountLoading, setAccountLoading] = useState(true);
  // Never leave the boot screen hanging on a slow/cold backend. The app can
  // render optimistically and fill in the session when it arrives.
  const [bootFallback, setBootFallback] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setBootFallback(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authContext, setAuthContext] = useState<AppAuthContext>({ isBanned: false, banReason: null });
  const [accountError, setAccountError] = useState("");
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [filterNotice, setFilterNotice] = useState(false);

  // Securly detection: probe the extension's web-accessible assets at boot
  // and surface a one-time notice when it is installed.
  useEffect(() => {
    let cancelled = false;
    let seen = false;
    try { seen = localStorage.getItem("unstable_filter_notice_seen") === "1"; } catch { /* storage unavailable */ }
    if (seen) return;
    void detectSecurly().then((detected) => {
      if (!cancelled && detected) setFilterNotice(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Auto-hide the notice; it is marked seen either way so it never repeats.
  useEffect(() => {
    if (!filterNotice) return;
    const timer = setTimeout(() => {
      setFilterNotice(false);
      try { localStorage.setItem("unstable_filter_notice_seen", "1"); } catch { /* ignore */ }
    }, 14000);
    return () => clearTimeout(timer);
  }, [filterNotice]);

  useEffect(() => {
    if (accountError && !errorDismissed) {
      const timer = setTimeout(() => { setAccountError(""); setErrorDismissed(false); }, 8000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [accountError, errorDismissed]);

  useEffect(() => {
    // Wait until deployment detection settles before touching Supabase.
    if (deployment === "detecting") return;
    // Static frontend-only builds have no backend: skip session restore entirely.
    if (deployment === "frontend") {
      setSession(null);
      setUser(null);
      setProfile(null);
      setAuthContext({ isBanned: false, banReason: null });
      setAccountLoading(false);
      return;
    }

    let mounted = true;

    async function syncSession(nextSession: Session | null, showLoading = true) {
      if (!mounted) return;
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setAuthContext({ isBanned: false, banReason: null });
        setAccountLoading(false);
        return;
      }

      if (showLoading) setAccountLoading(true);
      try {
        const [nextProfileResult, nextAuthContextResult] = await withTimeout(
          Promise.allSettled([
            fetchProfile(nextUser.id),
            fetchAuthContext(nextSession!.access_token),
          ]),
          ACCOUNT_BOOT_TIMEOUT_MS,
          "Account sync",
        );

        const nextProfile = nextProfileResult.status === "fulfilled" ? nextProfileResult.value : null;
        const nextAuthContext = nextAuthContextResult.status === "fulfilled" ? nextAuthContextResult.value : { isBanned: false, banReason: null };

        if (!mounted) return;

        if (nextAuthContext.isBanned) {
          setProfile(null);
          setAuthContext(nextAuthContext);
          setAccountError(nextAuthContext.banReason ? `This account is banned: ${nextAuthContext.banReason}` : "This account is banned.");
          await supabase.auth.signOut();
          return;
        }

        try {
          await withTimeout(registerCurrentDevice(nextSession!.access_token), ACCOUNT_BOOT_TIMEOUT_MS, "Device registration");
        } catch (err) {
          if (mounted) {
            setAccountError(err instanceof Error ? err.message : "Unable to register this device.");
          }
        }

        setProfile(nextProfile);
        setAuthContext(nextAuthContext);
        setAccountError(nextProfile ? "" : "Account signed in, but no profile was found.");
      } catch (err) {
        if (!mounted) return;
        setProfile(null);
        setAuthContext({ isBanned: false, banReason: null });
        setAccountError(err instanceof Error ? err.message : "Unable to load account profile.");
      } finally {
        if (mounted) setAccountLoading(false);
      }
    }

    async function loadInitialSession() {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), ACCOUNT_BOOT_TIMEOUT_MS, "Session restore");
        await syncSession(data.session);
      } catch (err) {
        console.error('Session load error:', err);
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setAuthContext({ isBanned: false, banReason: null });
        setAccountLoading(false);
      }
    }

    void loadInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession, false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [deployment]);

  async function logout() {
    if (!frontendOnly) await supabase.auth.signOut();
    swRegistered = false;
    bareConn = null;
    scrController = null;
    currentStatus = { ...defaultProxyState };
    setSession(null);
    setUser(null);
    setProfile(null);
    setAuthContext({ isBanned: false, banReason: null });
    applyCloak("none");
  }

  return (
    <>
      {accountLoading && !bootFallback ? (
        // Deliberately not animated: an AnimatePresence exit here would hold the
        // whole app back until the spinner's animation finished (and never
        // finish at all in a tab that is not compositing frames).
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          <LoadingSpinner />
        </div>
      ) : (
        <BrowserApp key="app" onLogout={() => { void logout(); }} session={session} user={user} profile={profile} authContext={authContext}
          onAuthenticated={({ session: nextSession, user: nextUser, profile: nextProfile, authContext: nextAuthContext }) => {
            setSession(nextSession);
            setUser(nextUser);
            setProfile(nextProfile);
            setAuthContext(nextAuthContext);
            setAccountError("");
          }}
        />
      )}
      <AnimatePresence>
        {accountError && !errorDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(40,15,15,0.95)", border: "1px solid rgba(235,120,120,0.3)", borderRadius: "6px", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.04em", textAlign: "center", maxWidth: 420, padding: "0.6rem 2rem 0.6rem 1rem", color: "rgba(235,120,120,0.9)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 99999 }}
          >
            {accountError}
            <button
              onClick={() => { setAccountError(""); setErrorDismissed(true); }}
              style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", color: "rgba(235,120,120,0.5)", cursor: "pointer", padding: 0, fontSize: "0.9rem", lineHeight: 1, fontFamily: "inherit" }}
              aria-label="Dismiss"
            >&#x2715;</button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {filterNotice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            role="status"
            style={{ position: "fixed", bottom: 20, right: 20, background: "rgba(17,17,17,0.96)", border: "1px solid #2a2a2a", borderRadius: "6px", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.02em", maxWidth: 340, padding: "0.7rem 2.2rem 0.7rem 1rem", color: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 99999, lineHeight: 1.5 }}
          >
            <div style={{ fontWeight: 700, color: "#fff", marginBottom: 2, letterSpacing: "0.04em" }}>Content filter detected</div>
            <div style={{ color: "rgba(255,255,255,0.55)" }}>Securly is installed in this browser — your school may be monitoring this device.</div>
            <button
              onClick={() => { setFilterNotice(false); try { localStorage.setItem("unstable_filter_notice_seen", "1"); } catch { /* ignore */ } }}
              style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 0, fontSize: "0.9rem", lineHeight: 1, fontFamily: "inherit" }}
              aria-label="Dismiss"
            >&#x2715;</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

