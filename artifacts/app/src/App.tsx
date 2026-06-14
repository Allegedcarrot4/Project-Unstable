import { useState, useEffect, useRef, useCallback, useMemo, type ComponentType } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useVelocity, useTransform, useAnimation } from "framer-motion";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Gamepad, MessageCircle, Settings, Atom, House, Zap, Brain, Mic, ThumbsUp, ThumbsDown, Flame, Laugh, Heart, Volume2, RefreshCw } from "lucide-react";
import VantaBackground from "./components/VantaBackground";
import gamesListData from "./data/games.json";
import type { CodecType } from "./lib/codec";
import { makeCodec } from "./lib/codec";

declare global {
  interface Window {
    Ultraviolet: { codec: { xor: { encode: (s: string) => string; decode: (s: string) => string } } };
    __uv$config: { prefix: string; encodeUrl: (s: string) => string; decodeUrl: (s: string) => string };
    $scramjetLoadController: () => { ScramjetController: new (cfg: any) => ScramjetCtrl };
    $scramjetLoadWorker: () => any;
  }
}

interface ScramjetCtrl {
  init(): Promise<void>;
  encodeUrl(url: string | URL): string;
  decodeUrl(url: string | URL): string;
  createFrame(frame?: HTMLIFrameElement): any;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CloakId = "none" | "google-drive" | "schoology" | "classlink" | "google-classroom";

interface KeyShortcuts {
  tab1: string; tab2: string; tab3: string; tab4: string; tab5: string;
  tab6: string; tab7: string; tab8: string; tab9: string;
  closeTab: string; newTab: string; addShortcut: string;
}

type ProxyEngine = "auto" | "uv" | "scramjet";
type TransportMode = "auto" | "wisp" | "bare" | "epoxy";
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

const THEMES: Record<ThemeId, { label: string; wallpaper?: string; backgroundEffect?: string; vantaOptions?: Record<string, any>; colors: ThemeColors }> = {
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

const VANTA_DEFAULTS: Record<string, Record<string, any>> = {
  fog: { highlightColor: 0x606080, midtoneColor: 0x303055, lowlightColor: 0x151530, baseColor: 0x0a0a1a },
  net: { color: 0xff00ff, backgroundColor: 0x0d0a1a, points: 12, maxDistance: 22, spacing: 16 },
  globe: { color: 0x44aaff, backgroundColor: 0x0a0a14, size: 1.2 },
  clouds: { color: 0x5588aa, backgroundColor: 0x0a1520, skyColor: 0x0a1520, cloudColor: 0x5588aa, cloudShadowColor: 0x2a4a6a, sunColor: 0xff8844, sunGlareColor: 0xff6633, sunlightColor: 0xff8844 },
  dots: { color: 0x00ff41, backgroundColor: 0x0a0f0a, size: 3, spacing: 25, showLines: true },
  halo: { baseColor: 0x1a0a2e, color: 0x8833ff, amplitudeFactor: 1.5, ringFactor: 2, yOffset: 0, size: 1.5 },
  rings: { color: 0xff4488, backgroundColor: 0x0a0a12, ringSize: 1.4 },
};

interface Settings {
  cloak: CloakId;
  shortcuts: KeyShortcuts;
  proxyEngine: ProxyEngine;
  transportMode: TransportMode;
  theme: ThemeId;
  wallpaper: string;
  backgroundEffect: string;
  gameModeEnabled: boolean;
  gameModeSites: string[];
  panicUrl: string;
  wispServer: string;
  vantaAdvanced: Record<string, any>;
  searchEngine: string;
  adblockEnabled: boolean;
  codec: CodecType;
  siteEngineOverrides: Record<string, ProxyEngine>;
  wispRelayUrl: string;
  transportEncryption: boolean;
  fontObfuscation: boolean;
  uiScale: number;
  confirmLeave: boolean;
}
interface Shortcut { id: string; name: string; url: string; favicon: string; }

interface Tab {
  id: string; title: string; url: string; favicon: string;
  history: string[]; historyIndex: number; loading: boolean;
  /** Last proxied page before opening an unstable:// section (games, settings, etc.) */
  lastProxyUrl?: string;
}

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type AIMode = "fast" | "think";

interface Profile {
  id: string;
  username: string;
}

interface AppAuthContext {
  isBanned: boolean;
  banReason: string | null;
}

interface AIConversationRecord {
  id: string;
  title: string | null;
  created_at: string;
}

interface ChatMessageRecord {
  id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

interface ParsedChatMessage {
  replyUsername: string | null;
  replySnippet: string | null;
  body: string;
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

const DEFAULT_KEY_SHORTCUTS: KeyShortcuts = {
  tab1: "Alt+1", tab2: "Alt+2", tab3: "Alt+3", tab4: "Alt+4", tab5: "Alt+5",
  tab6: "Alt+6", tab7: "Alt+7", tab8: "Alt+8", tab9: "Alt+9",
  closeTab: "Alt+W", newTab: "Alt+T", addShortcut: "Alt+D",
};
const DEFAULT_GAME_MODE_SITES = [
  "smashkarts.io",
  "krunker.io",
  "1v1.lol",
  "shellshock.io",
  "agar.io",
];

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
const DEFAULT_SETTINGS: Settings = {
  cloak: "none",
  shortcuts: DEFAULT_KEY_SHORTCUTS,
  proxyEngine: "auto",
  transportMode: "wisp",
  theme: "dark",
  wallpaper: "",
  backgroundEffect: "",
  gameModeEnabled: true,
  gameModeSites: [...DEFAULT_GAME_MODE_SITES],
  panicUrl: DEFAULT_PANIC_URL,
  wispServer: "",
  vantaAdvanced: {},
  searchEngine: "duckduckgo",
  adblockEnabled: true,
  codec: "xor",
  siteEngineOverrides: {},
  wispRelayUrl: "",
  transportEncryption: false,
  fontObfuscation: false,
  uiScale: 1,
  confirmLeave: false,
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

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function extractDomain(url: string) {
  try { return new URL(url).hostname; } catch { return ""; }
}

function aiMessageId() {
  return Math.random().toString(36).slice(2);
}

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

function buildConversationTitle(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function usernameToAuthEmail(username: string) {
  return `${normalizeUsername(username)}@unstableuser.com`;
}

function buildReplyPayload(message: ChatMessageRecord, content: string) {
  const snippet = message.content.trim().replace(/\s+/g, " ").slice(0, 72);
  return `[[reply:${message.username}|${snippet}]]\n${content}`;
}

function parseChatMessageContent(content: string): ParsedChatMessage {
  const match = content.match(/^\[\[reply:([^|\]]+)\|([\s\S]*?)\]\]\n([\s\S]*)$/);
  if (!match) {
    return { replyUsername: null, replySnippet: null, body: content };
  }
  return {
    replyUsername: match[1] ?? null,
    replySnippet: match[2] ?? null,
    body: match[3] ?? "",
  };
}

async function sendAiChat(messages: AIMessage[], mode: AIMode): Promise<string> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  });

  const data = await res.json().catch(() => null) as { content?: string; error?: string } | null;
  if (!res.ok) throw new Error(data?.error || "The AI request failed.");
  if (!data?.content) throw new Error("The AI response was empty.");
  return data.content;
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
  const res = await fetch("/api/auth/device-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: getDeviceId() }),
  });

  const data = await readJson<{ banned?: boolean; reason?: string | null; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error || "Unable to verify whether this device is banned.");
  }

  return {
    banned: Boolean(data?.banned),
    reason: data?.reason ?? null,
  };
}

async function fetchAuthContext(accessToken: string): Promise<AppAuthContext> {
  const res = await fetch("/api/auth/context", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await readJson<{ isBanned?: boolean; banReason?: string | null; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error || "Unable to load account access information.");
  }

  return {
    isBanned: Boolean(data?.isBanned),
    banReason: data?.banReason ?? null,
  };
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
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createProfile(userId: string, username: string): Promise<Profile> {
  const trimmed = username.trim();
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, username: trimmed })
    .select("id, username")
    .single();

  if (error) throw error;
  return data;
}

function stripTrackingParams(url: string): string {
  try {
    const u = new URL(url);
    const params = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid","mc_cid","mc_eid","_hsenc","_hsmi","hsCtaTracking"];
    let changed = false;
    for (const p of params) { if (u.searchParams.has(p)) { u.searchParams.delete(p); changed = true; } }
    return changed ? u.toString() : url;
  } catch { return url; }
}

function getEffectiveEngine(url: string, settings: Settings): ProxyEngine {
  try {
    const host = new URL(url).hostname;
    if (settings.siteEngineOverrides[host]) return settings.siteEngineOverrides[host];
  } catch {}
  return settings.proxyEngine;
}

function encodeProxyUrl(url: string, engine: ProxyEngine = "auto", settings?: Settings): string {
  const cleaned = stripTrackingParams(url);
  const effEngine = settings ? getEffectiveEngine(cleaned, settings) : engine;
  const useScramjet = (effEngine === "auto" || effEngine === "scramjet") && scrController !== null;
  if (useScramjet) {
    try { return scrController!.encodeUrl(cleaned); } catch { /* fall through */ }
  }
  if (window.Ultraviolet && window.__uv$config) return UV_PREFIX + window.__uv$config.encodeUrl(cleaned);
  return UV_PREFIX + encodeURIComponent(cleaned);
}

function normalizeUrl(input: string, searchEngine?: string): string {
  const t = input.trim();
  if (!t) return "";
  if (t.startsWith("unstable://")) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.includes(".") && !t.includes(" ")) return "https://" + t;
  return searchUrl(t, searchEngine ?? "duckduckgo");
}

function decodeProxyUrl(url: string): string {
  try {
    if (url.startsWith(SCRAMJET_PREFIX) && scrController) {
      try { return scrController.decodeUrl(location.origin + url); } catch { }
      const encoded = url.slice(SCRAMJET_PREFIX.length);
      return decodeURIComponent(encoded);
    }
    if (url.startsWith(UV_PREFIX)) {
      const enc = url.slice(UV_PREFIX.length);
      if (window.__uv$config) return window.__uv$config.decodeUrl(enc);
      return decodeURIComponent(enc);
    }
  } catch { }
  return url;
}

function hostnameFromTabUrl(tabUrl: string): string | null {
  if (!tabUrl || tabUrl.startsWith("unstable://")) return null;
  try {
    return new URL(decodeProxyUrl(tabUrl)).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function isGameModeHost(hostname: string | null, settings: Settings): boolean {
  if (!settings.gameModeEnabled || !hostname) return false;
  return settings.gameModeSites.some((raw) => {
    const site = raw.trim().toLowerCase().replace(/^www\./, "");
    if (!site) return false;
    return hostname === site || hostname.endsWith("." + site);
  });
}

function isGameModeTabUrl(tabUrl: string, settings: Settings): boolean {
  return isGameModeHost(hostnameFromTabUrl(tabUrl), settings);
}

function getDomainFromProxyUrl(url: string): string {
  try { return new URL(decodeProxyUrl(url)).hostname; } catch { return ""; }
}

function barePathForNum(n: number): string {
  return n === 1 ? "/api/cdn/" : `/api/cdn${n}/`;
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

// ─── Settings persistence ──────────────────────────────────────────────────────

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      cloak: parsed.cloak ?? "none",
      shortcuts: { ...DEFAULT_KEY_SHORTCUTS, ...(parsed.shortcuts ?? {}) },
      proxyEngine: (parsed.proxyEngine ?? "auto") as ProxyEngine,
      transportMode: (parsed.transportMode ?? "wisp") as TransportMode,
      theme: (parsed.theme ?? "dark") as ThemeId,
      wallpaper: (parsed.wallpaper ?? "") as string,
      backgroundEffect: (parsed.backgroundEffect ?? "") as string,
      gameModeEnabled: parsed.gameModeEnabled ?? true,
      gameModeSites: Array.isArray(parsed.gameModeSites) && parsed.gameModeSites.length
        ? parsed.gameModeSites
        : [...DEFAULT_GAME_MODE_SITES],
      panicUrl: typeof parsed.panicUrl === "string" && parsed.panicUrl.trim() ? parsed.panicUrl : DEFAULT_PANIC_URL,
      wispServer: typeof parsed.wispServer === "string" ? parsed.wispServer : "",
      vantaAdvanced: parsed.vantaAdvanced ?? {},
      searchEngine: parsed.searchEngine ?? "duckduckgo",
      adblockEnabled: parsed.adblockEnabled ?? true,
      codec: (parsed.codec ?? "xor") as CodecType,
      siteEngineOverrides: parsed.siteEngineOverrides ?? {},
      wispRelayUrl: typeof parsed.wispRelayUrl === "string" ? parsed.wispRelayUrl : "",
      transportEncryption: parsed.transportEncryption ?? false,
      fontObfuscation: parsed.fontObfuscation ?? false,
      uiScale: typeof parsed.uiScale === "number" ? parsed.uiScale : 1,
      confirmLeave: parsed.confirmLeave ?? false,
    };
  } catch { return DEFAULT_SETTINGS; }
}
function saveSettings(s: Settings) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

function normalizePanicUrl(input: string): string {
  const v = (input || "").trim();
  if (!v) return DEFAULT_PANIC_URL;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v;
  return "https://" + v;
}

function loadCustomShortcuts(): Shortcut[] {
  try { const r = localStorage.getItem(SHORTCUTS_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveCustomShortcuts(s: Shortcut[]) { localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(s)); }

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

function makeTab(url = ""): Tab {
  let title = "New Tab", favicon = "";
  if (url && !url.startsWith("unstable://")) {
    try { const d = new URL(url.startsWith("http") ? url : "https://" + url).hostname; title = d; favicon = faviconUrl(d); } catch { }
  } else if (url.startsWith("unstable://")) {
    title = url.slice("unstable://".length);
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  return { id: Math.random().toString(36).slice(2), title, url, favicon, history: url ? [url] : [], historyIndex: url ? 0 : -1, loading: false };
}

// ─── Proxy state ──────────────────────────────────────────────────────────────

type EngineStatus = "pending" | "ready" | "error";

interface ProxyState {
  phase: "idle" | "loading" | "ready" | "error";
  message: string;
  uv: EngineStatus;
  scramjet: EngineStatus;
  transport: "none" | "libcurl" | "bare" | "epoxy";  // libcurl = wisp (primary), bare = fallback, epoxy = alternative
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

type SL = (s: ProxyState) => void;
const statusListeners = new Set<SL>();
let currentStatus: ProxyState = { ...defaultProxyState };

function emitStatus(patch: Partial<ProxyState>) {
  currentStatus = { ...currentStatus, ...patch };
  statusListeners.forEach(l => l(currentStatus));
}

async function setupProxy(bareNum = 1, transportMode: TransportMode = "auto", wispServer = "", codecType: CodecType = "xor", wispRelayUrl = "", useEncryption = false): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    emitStatus({ phase: "error", message: "Service workers not supported" }); return;
  }
  emitStatus({ phase: "loading" });

  try {
    if (!swRegistered) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) { if (r.active?.scriptURL?.includes("uv.sw.js")) await r.unregister(); }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      swRegistered = true;
    }
    emitStatus({ uv: "ready" });
  } catch {
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
      scrController = new ScramjetController({
        prefix: SCRAMJET_PREFIX,
        files: {
          wasm: "/eggs/scramjet.wasm.wasm",
          all: "/eggs/scramjet.all.js",
          sync: "/eggs/scramjet.sync.js",
        },
        flags: { rewriterLogs: false, cleanErrors: true },
        codec: makeCodec(codecType),
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
          const req = tx.objectStore(PSL_KEY).put({ data, expiry: Date.now() + 36e5 }, PSL_KEY);
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
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (newSW) newSW.addEventListener("statechange", () => {
          if (newSW.state === "installed" && reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    } catch { /* scope might already be claimed */ }
    emitStatus({ scramjet: "ready" });
  } catch {
    emitStatus({ scramjet: "error" });
  }

  try {
    const { BareMuxConnection } = await import("bare-mux-fork");
    if (!bareConn) bareConn = new BareMuxConnection("/baremux/worker.js");

    const origin = location.origin;
    const wispUrl = wispServer || `${location.protocol === "http:" ? "ws:" : "wss:"}//${location.host}/api/wisp/`;
    const relayUrl = wispRelayUrl || `${location.protocol === "http:" ? "ws:" : "wss:"}//${location.hostname}/api/wisp/`;

    let transportSet = false;
    const mode = transportMode || "auto";

    const trySetTransport = async (url: string, args: any[], label: string) => {
      if (useEncryption) {
        // Wrap with enigma-style encryption: add an encryption layer via SW messaging
        await bareConn.setTransport(url, args);
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "ENIGMA", data: { enabled: true, key: "Unstabl" } });
        }
      } else {
        await bareConn.setTransport(url, args);
      }
      transportSet = true;
      emitStatus({ phase: "ready", transport: label as any, bare: bareNum });
    };

    const tryWisp = async () => trySetTransport("/libcurl/index.mjs", [{ wisp: wispUrl }], "libcurl");
    const tryRelay = async () => trySetTransport("/libcurl/index.mjs", [{ wisp: relayUrl }], "libcurl");
    const tryEpoxy = async () => trySetTransport("/epoxy/index.mjs", [{ wisp: wispUrl }], "epoxy");
    const tryBare = async () => trySetTransport(origin + "/api/baremod/index.mjs", [origin + barePathForNum(bareNum)], "bare");

    if (mode === "bare") {
      try { await tryBare(); } catch { /* fall through */ }
    } else if (mode === "epoxy") {
      try { await tryEpoxy(); } catch { await tryBare(); }
    } else if (mode === "wisp") {
      try { await tryWisp(); } catch { await tryBare(); }
    } else {
      // auto: wisp → relay → epoxy → bare
      try { await tryWisp(); } catch {
        if (!transportSet) try { await tryRelay(); } catch {}
        if (!transportSet) try { await tryEpoxy(); } catch {}
        if (!transportSet) try { await tryBare(); } catch {}
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

async function switchBare(n: number, transportMode: TransportMode = "auto", wispServer = "", wispRelayUrl = "", useEncryption = false): Promise<void> {
  emitStatus({ switching: true, bare: n });
  try {
    const { BareMuxConnection } = await import("bare-mux-fork");
    if (!bareConn) bareConn = new BareMuxConnection("/baremux/worker.js");
    const wispUrl = wispServer || `${location.protocol === "http:" ? "ws:" : "wss:"}//${location.host}/api/wisp/`;
    const relayUrl = wispRelayUrl || `${location.protocol === "http:" ? "ws:" : "wss:"}//${location.hostname}/api/wisp/`;
    const mode = transportMode || "auto";
    const tryBare = async () => {
      await bareConn.setTransport(location.origin + "/api/baremod/index.mjs", [location.origin + barePathForNum(n)]);
      if (useEncryption && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: "ENIGMA", data: { enabled: true, key: "Unstabl" } });
      emitStatus({ switching: false, transport: "bare", bare: n });
    };
    const tryWisp = async () => {
      await bareConn.setTransport("/libcurl/index.mjs", [{ wisp: wispUrl }]);
      if (useEncryption && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: "ENIGMA", data: { enabled: true, key: "Unstabl" } });
      emitStatus({ switching: false, transport: "libcurl", bare: n });
    };
    const tryRelay = async () => {
      await bareConn.setTransport("/libcurl/index.mjs", [{ wisp: relayUrl }]);
      emitStatus({ switching: false, transport: "libcurl", bare: n });
    };
    const tryEpoxy = async () => {
      await bareConn.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
      if (useEncryption && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: "ENIGMA", data: { enabled: true, key: "Unstabl" } });
      emitStatus({ switching: false, transport: "epoxy", bare: n });
    };
    if (mode === "bare") {
      await tryBare();
    } else if (mode === "epoxy") {
      try { await tryEpoxy(); } catch { await tryBare(); }
    } else if (mode === "wisp") {
      try { await tryWisp(); } catch { await tryBare(); }
    } else {
      try { await tryWisp(); } catch {
        try { await tryRelay(); } catch {}
        try { await tryEpoxy(); } catch {}
        await tryBare();
      }
    }
    localStorage.setItem(BARE_KEY, String(n));
  } catch (err) {
    emitStatus({ switching: false, phase: "error", message: err instanceof Error ? err.message : String(err) });
  }
}

function useProxyStatus(): ProxyState {
  const [s, setS] = useState<ProxyState>(currentStatus);
  useEffect(() => { statusListeners.add(setS); return () => { statusListeners.delete(setS); }; }, []);
  return s;
}

// ─── Magic Cursor ─────────────────────────────────────────────────────────────

function GameModeToast({ visible, host }: { visible: boolean; host?: string | null }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 1000000,
            padding: "0.55rem 0.85rem",
            background: "radial-gradient(circle 100px at 50% 50%, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 72%), linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "2px",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "0.68rem",
            letterSpacing: "0.08em",
            color: "#e8e8e8",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 32px rgba(0,0,0,0.5)",
            backdropFilter: "blur(16px) saturate(1.1)",
            WebkitBackdropFilter: "blur(16px) saturate(1.1)",
            pointerEvents: "none",
            maxWidth: 280,
          }}
        >
          game mode on{host ? ` · ${host}` : ""}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MagicCursor({ suppressed }: { suppressed?: boolean }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 250 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

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
          x: cursorX,
          y: cursorY,
          pointerEvents: "none",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "translate(-50%, -50%)",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            transform: "translate(6px, 6px)",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
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

function EngineBadge({ label, status }: { label: string; status: EngineStatus }) {
  const color = status === "ready" ? "rgba(80,200,120,0.9)" : status === "error" ? "rgba(220,80,80,0.9)" : "rgba(255,255,255,0.2)";
  const dot = status === "ready" ? "●" : status === "error" ? "●" : "○";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.55rem", letterSpacing: "0.05em", color, textShadow: "0 1px 4px rgba(0,0,0,0.9)", fontFamily: "'Space Grotesk', sans-serif" }}>
      <span style={{ fontSize: "0.45rem" }}>{dot}</span>{label}
    </span>
  );
}

function StatusBar({ visible, leftOffset = 12, transportMode = "auto", wispServer = "", wispRelayUrl = "", transportEncryption = false }: { visible: boolean; leftOffset?: number; transportMode?: TransportMode; wispServer?: string; wispRelayUrl?: string; transportEncryption?: boolean }) {
  const s = useProxyStatus();

  const green = "rgba(80,200,120,0.9)", gray = "rgba(255,255,255,0.15)", red = "rgba(220,80,80,0.9)", amber = "rgba(200,170,80,0.85)";
  const isReady = s.phase === "ready";
  const isError = s.phase === "error";

  const phaseLabel = s.phase === "idle" ? "initializing…"
    : s.phase === "loading" ? "starting proxy…"
      : s.switching ? `switching ws${s.bare}…`
        : isReady ? (s.transport === "libcurl" ? "libcurl+wisp" : `bare ws${s.bare}`)
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
              <button key={n} onClick={() => switchBare(n, transportMode, wispServer, wispRelayUrl, transportEncryption)} title={`Switch to bare server ${n}`} style={{
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
}: {
  onAuthenticated: (payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password,
        });
        if (signUpError) throw signUpError;

        if (!data.user) throw new Error("Sign up did not return a user.");
        if (!data.session) {
          setNotice("Account created, but Supabase email confirmation is still on. Disable email confirmation for username-only instant sign-in.");
          return;
        }

        let profile = await fetchProfile(data.user.id);
        if (!profile) {
          profile = await createProfile(data.user.id, cleanUsername);
        }
        await registerCurrentDevice(data.session.access_token);
        const authContext = await fetchAuthContext(data.session.access_token);
        if (authContext.isBanned) {
          await supabase.auth.signOut();
          throw new Error(authContext.banReason ? `This account is banned: ${authContext.banReason}` : "This account is banned.");
        }
        onAuthenticated({ session: data.session, user: data.user, profile, authContext });
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });
      if (signInError) throw signInError;
      if (!data.session || !data.user) throw new Error("Sign in failed.");

      const profile = await fetchProfile(data.user.id);
      if (!profile) {
        throw new Error("No profile found for this account. Sign up again or create the profile in Supabase.");
      }

      await registerCurrentDevice(data.session.access_token);
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
    borderRadius: "2px",
    boxSizing: "border-box",
    transition: "border-color 0.18s ease",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
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
                  borderRadius: "2px",
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
            placeholder="username"
            style={inputStyle}
            whileFocus={{ borderColor: "#666" }}
          />
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
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: loading ? "#555" : "#e8e8e8", color: loading ? "#aaa" : "#0d0d0d", border: "none", padding: "0.875rem 1rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", borderRadius: "2px", transition: "background 0.15s" }}
          >
            {loading ? "working…" : mode === "signin" ? "enter account" : "create account"}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Games page ──────────────────────────────────────────────────────────────

const GAMES_LIST = gamesListData as Array<{ id: number; name: string; cover: string; url: string; author: string; authorLink: string }>;

function GamesPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? GAMES_LIST.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : GAMES_LIST;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{ padding: "1.5rem 2rem 1rem", flexShrink: 0, borderBottom: "1px solid #161616" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", margin: "0 0 1rem" }}>unstable — games</p>
        <input
          autoFocus
          placeholder="search games…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", maxWidth: 360, background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)",
            color: "#e0e0e0", padding: "0.45rem 0.9rem", fontSize: "0.78rem",
            fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "8px",
            letterSpacing: "0.01em", transition: "border-color 0.15s", boxSizing: "border-box",
          }}
          onFocus={e => (e.target.style.borderColor = "#444")}
          onBlur={e => (e.target.style.borderColor = "#222")}
        />
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.58rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
          {filtered.length} game{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "0.85rem",
        }}>
          {filtered.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} onNavigate={onNavigate} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "4rem", color: "rgba(255,255,255,0.2)", fontSize: "0.75rem", letterSpacing: "0.06em" }}>
            no games found
          </div>
        )}
      </div>

      <style>{`
        .game-card:hover .game-card-overlay { opacity: 1 !important; }
        .game-card:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
      `}</style>
    </motion.div>
  );
}

function GameCard({ game, index, onNavigate }: { game: typeof GAMES_LIST[0]; index: number; onNavigate: (url: string) => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <motion.div
      className="game-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.4) }}
      onClick={() => onNavigate(game.url)}
      style={{
        position: "relative", borderRadius: "8px", overflow: "hidden",
        background: "var(--t-bg-secondary)", border: "1px solid var(--t-border)", cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      {/* Cover image */}
      <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#0a0a0a", overflow: "hidden", position: "relative" }}>
        {!imgErr ? (
          <img
            src={game.cover}
            alt={game.name}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>🎮</div>
        )}
        {/* Hover overlay */}
        <div className="game-card-overlay" style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0, transition: "opacity 0.2s ease",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.92)", color: "#0d0d0d",
            borderRadius: "50%", width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem", fontWeight: 700,
          }}>▶</div>
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: "0.5rem 0.6rem 0.55rem" }}>
        <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.01em" }}>{game.name}</p>
        {game.author && (
          <p style={{ margin: "0.15rem 0 0", fontSize: "0.56rem", color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.02em" }}>{game.author}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Credits page ─────────────────────────────────────────────────────────────

function CreditsPage() {
  const items = [
    ["Ultraviolet", "web proxy engine"], ["Scramjet", "web proxy engine (primary)"],
    ["bare-mux", "transport multiplexer"], ["libcurl-transport", "libcurl+wisp transport (primary)"],
    ["bare-server-node", "bare proxy backend (fallback)"], ["bare-as-module3", "bare transport module"],
    ["wisp-js", "wisp server"], ["React", "frontend library"],
    ["Vite", "build tool"], ["TypeScript", "language"],
    ["framer-motion", "animations"], ["lucide-react", "icons"],
    ["three.js", "3D engine"], ["vanta", "animated backgrounds"],
    ["Supabase", "auth, database, realtime"], ["Radix UI", "UI primitives"],
    ["Tailwind CSS", "utility CSS"], ["Space Grotesk", "typeface"],
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
        ["Service Overview", "Unstable is a web proxy and browser tool that provides access to web content through various proxying engines (Scramjet, Ultraviolet, Bare). It also includes AI chat, group chat, games, and customization features. The service is provided as-is with no guarantees of uptime or availability."],
        ["Acceptable Use", "You agree not to use Unstable to access, store, or distribute illegal content or to violate any applicable laws. Circumventing network restrictions may violate institutional policies, and you are solely responsible for your usage."],
        ["Proxy and Transport", "Unstable supports multiple proxy engines and transport modes (Wisp, Bare, custom Wisp servers). These are provided as technical tools, and the operators are not responsible for how users route traffic through them."],
        ["Accounts and Authentication", "Account creation is optional and handled via Supabase Auth. Account data includes usernames and authentication credentials managed by Supabase. Server-side secrets and API keys must never be committed to public repositories."],
        ["AI and Chat Features", "AI conversations and chat messages are stored server-side via Supabase. AI requests are forwarded to third-party providers through a server-side proxy. Chat messages are delivered across devices in real time via Supabase Realtime."],
        ["Third-Party Services", "Unstable depends on Supabase for auth, storage, and realtime functionality, and on third-party AI providers for AI responses. The operators are not responsible for the availability, content, or behavior of these services."],
        ["Modifications", "These terms may be updated at any time. Continued use after changes constitutes acceptance of the new terms."],
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
      <style>{`#pp-scroll::-webkit-scrollbar { width: 6px; }#pp-scroll::-webkit-scrollbar-track { background: #111; }#pp-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }#pp-scroll::-webkit-scrollbar-thumb:hover { background: #555; }`}</style>
      <div id="pp-scroll" style={{ height: "100%", overflowY: "auto" }}>
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginTop: 0, marginBottom: "2rem" }}>unstable — privacy policy</p>
      {[
        ["Data We Collect", "Account records (username, auth identifiers), AI conversation history, and chat messages are stored in Supabase. Local preferences such as theme, shortcuts, settings, and wallpaper are stored in your browser's localStorage. Proxy and transport configuration, including custom Wisp server URLs, are saved locally."],
        ["Authentication", "Account authentication is handled by Supabase Auth. No passwords are stored in this application's codebase. Server-side secrets and API keys must remain outside public repositories."],
        ["AI Conversations", "Messages sent to the AI page are stored in Supabase as conversation history and forwarded to a third-party AI provider via a server-side route to generate responses. Conversation history can be viewed and deleted."],
        ["Chat Messages", "Messages sent in unstable://chat are stored in Supabase and delivered in real time across devices via Supabase Realtime. Emoji reactions and message history are synced server-side."],
        ["Local Storage", "The following are stored in your browser: UI settings (theme, wallpaper, Vanta effect preferences, background effect options), keyboard shortcuts, custom bookmark shortcuts, game mode site list, panic URL, cloak selection, proxy engine, transport mode, custom Wisp server URL, and Vanta advanced options. This data does not leave your browser unless explicitly shared through app features."],
        ["Third-Party Services", "Supabase stores and processes account data, chat messages, and AI history. AI providers process messages forwarded to them for response generation. These services have their own privacy policies governing data handling. Retention and backups depend on your deployment's Supabase configuration."],
        ["Public Repository Safety", "The Supabase anon key is designed to be public client configuration. Server secrets, AI provider keys, and server-side access credentials must never be committed to a public repository. All client-side code, network requests, and browser storage should be treated as potentially inspectable."],
        ["Updates", "This policy may be updated at any time. Check unstable://privacy for the current version."],
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

function SettingsPage({ settings, onSettingsChange, vantaActive, onLogout }: { settings: Settings; onSettingsChange: (s: Settings) => void; vantaActive?: boolean; onLogout?: () => void }) {
  const [recording, setRecording] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    function onKey(e: KeyboardEvent) {
      e.preventDefault(); e.stopPropagation();
      const combo = buildCombo(e);
      if (combo && !["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
        onSettingsChange({ ...settings, shortcuts: { ...settings.shortcuts, [recording as string]: combo } });
        setRecording(null);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, settings, onSettingsChange]);

  const inputBase: React.CSSProperties = {
    background: "none", border: "1px solid #222", borderRadius: "2px",
    color: "#e0e0e0", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem",
    padding: "0.3rem 0.65rem", letterSpacing: "0.04em", outline: "none",
    transition: "border-color 0.18s ease",
  };
  const kbdStyle: React.CSSProperties = {
    fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "0.62rem",
    background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "3px",
    padding: "0.05rem 0.35rem", color: "rgba(255,255,255,0.55)",
  };
  const codeStyle: React.CSSProperties = {
    fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "0.62rem",
    background: "rgba(255,255,255,0.04)", borderRadius: "3px",
    padding: "0.05rem 0.3rem", color: "rgba(255,255,255,0.5)",
  };

  const catIds = ["appearance", "privacy", "gaming", "controls", "advanced"] as const;
  const catLabels: Record<string, string> = { appearance: "Appearance", privacy: "Privacy", gaming: "Gaming", controls: "Controls", advanced: "Advanced" };
  function scrollToCat(id: string) {
    const el = document.getElementById(`settings-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      id="settings-scroll"
      style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: vantaActive ? "transparent" : "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <div style={{ display: "flex", maxHeight: "90%", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", background: vantaActive ? "rgba(13,13,13,0.85)" : "var(--t-bg)", backdropFilter: vantaActive ? "blur(12px)" : "none", WebkitBackdropFilter: vantaActive ? "blur(12px)" : "none" }}>
      <div style={{
        width: 160, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", padding: "2.5rem 0",
        display: "flex", flexDirection: "column", gap: "0.15rem", alignItems: "stretch", overflowY: "auto",
      }}>
        <p style={{ fontSize: "0.55rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", margin: "0 1.25rem 1rem 1.25rem" }}>unstable</p>
        {catIds.map(id => (
          <motion.button key={id} whileHover={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.03)", x: 2 }} whileTap={{ scale: 0.98 }} onClick={() => scrollToCat(id)} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.3)", textAlign: "left",
            padding: "0.45rem 1.25rem", fontSize: "0.6rem", fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
          }}>{catLabels[id]}</motion.button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "2.5rem 2rem", maxWidth: 560 }}>
        <style>{`
          #settings-scroll > div > div:last-child::-webkit-scrollbar { width: 6px; }
          #settings-scroll > div > div:last-child::-webkit-scrollbar-track { background: transparent; }
          #settings-scroll > div > div:last-child::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
          #settings-scroll > div > div:last-child::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        `}</style>

      <div id="settings-appearance">
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem", marginTop: 0 }}>
        <span style={{ fontSize: "0.55rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.15)" }}>appearance</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
      </div>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>color theme</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Choose a color theme for the entire application.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {(Object.keys(THEMES) as ThemeId[]).map(id => {
            const active = settings.theme === id;
            const t = THEMES[id].colors;
            return (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={id}
                onClick={() => onSettingsChange({ ...settings, theme: id, wallpaper: THEMES[id]?.wallpaper ?? settings.wallpaper, backgroundEffect: id === "tuff" ? "" : settings.backgroundEffect })}
                style={{
                  background: active ? t.accent : t.bgSecondary,
                  color: active ? t.accentText : t.textSecondary,
                  border: `1px solid ${active ? t.accent : t.borderLight}`,
                  padding: "0.4rem 0.85rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
                  transition: "all 0.15s",
                }}
              >{THEMES[id].label}</motion.button>
            );
          })}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>background</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Set a wallpaper URL or upload an image. Optionally add a Vanta effect behind the UI.
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
          {settings.wallpaper && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSettingsChange({ ...settings, wallpaper: "" })}
              style={{
                background: "none", border: "1px solid var(--t-border-light)", color: "var(--t-text-muted)",
                padding: "0.4rem 0.85rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
              }}
            >clear</motion.button>
          )}
        </div>
        {settings.wallpaper && (
          <div style={{ marginTop: "0.75rem", width: "100%", height: 120, borderRadius: "4px", overflow: "hidden", border: "1px solid var(--t-border-light)" }}>
            <div style={{ width: "100%", height: "100%", backgroundImage: `url("${settings.wallpaper}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>vanta effect</p>
          <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
            An animated Three.js background. Pick an effect, or leave empty for none.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {(["", "fog", "net", "globe", "clouds", "dots", "halo", "rings"] as const).map(effect => {
              const active = settings.backgroundEffect === effect;
              return (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={effect}
                  onClick={() => onSettingsChange({ ...settings, backgroundEffect: effect })}
                  style={{
                    background: active ? "#e8e8e8" : "#111",
                    color: active ? "#0d0d0d" : "rgba(255,255,255,0.45)",
                    border: `1px solid ${active ? "#e8e8e8" : "#222"}`,
                    padding: "0.4rem 0.85rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
                    letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
                    transition: "all 0.15s",
                  }}
                >{effect || "none"}</motion.button>
              );
            })}
          </div>
        </div>
      </motion.section>

      {(() => {
        const effect = settings.backgroundEffect;
        if (!effect) return null;
        const adv = settings.vantaAdvanced?.[effect] ?? {};
        const defaults = VANTA_DEFAULTS[effect] ?? {};
        const allKeys = [...new Set([...Object.keys(defaults), ...Object.keys(adv)])];
        if (!allKeys.length) return null;
        return (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} style={{ marginBottom: "2.5rem" }}>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>advanced — {effect}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {allKeys.map(key => {
                const val = adv[key] ?? defaults[key];
                const defaultIsNum = typeof defaults[key] === "number";
                const isColor = (key.toLowerCase().includes("color") || key.toLowerCase().includes("light")) && defaultIsNum;
                const isNum = defaultIsNum && !isColor;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <label style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", minWidth: 120, flexShrink: 0, textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, " $1")}</label>
                    {isColor ? (
                      <input type="color" value={`#${(val ?? 0).toString(16).padStart(6, "0")}`} onChange={e => {
                        const hex = parseInt(e.target.value.slice(1), 16);
                        onSettingsChange({ ...settings, vantaAdvanced: { ...settings.vantaAdvanced, [effect]: { ...adv, [key]: hex } } });
                      }} style={{ width: 36, height: 28, padding: 0, border: "1px solid #333", borderRadius: "4px", cursor: "pointer", background: "none" }} />
                    ) : isNum ? (
                      <input type="number" value={val ?? 0} onChange={e => {
                        const n = parseFloat(e.target.value);
                        onSettingsChange({ ...settings, vantaAdvanced: { ...settings.vantaAdvanced, [effect]: { ...adv, [key]: isNaN(n) ? 0 : n } } });
                      }} style={{ width: 80, background: "#0a0a0a", border: "1px solid #222", color: "#e0e0e0", padding: "0.25rem 0.5rem", fontSize: "0.72rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "4px" }} />
                    ) : (
                      <input type="text" value={String(val ?? "")} onChange={e => {
                        onSettingsChange({ ...settings, vantaAdvanced: { ...settings.vantaAdvanced, [effect]: { ...adv, [key]: e.target.value } } });
                      }} style={{ flex: 1, background: "#0a0a0a", border: "1px solid #222", color: "#e0e0e0", padding: "0.25rem 0.5rem", fontSize: "0.72rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "4px" }} />
                    )}
                    <button onClick={() => {
                      const next = { ...adv }; delete next[key];
                      onSettingsChange({ ...settings, vantaAdvanced: { ...settings.vantaAdvanced, [effect]: next } });
                    }} style={{ background: "none", border: "1px solid #333", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "0.2rem 0.5rem", fontSize: "0.6rem", borderRadius: "4px" }}>reset</button>
                  </div>
                );
              })}
            </div>
          </motion.section>
        );
      })()}

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
                  letterSpacing: "0.06em", cursor: "pointer", borderRadius: "2px",
                  transition: "all 0.15s",
                }}
              >
                <img src={`https://www.google.com/s2/favicons?domain=${new URL(engine.url).hostname}&sz=32`} alt="" width={14} height={14} style={{ borderRadius: "2px", flexShrink: 0 }} />
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
                letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
                transition: "all 0.15s",
              }}
            >{CLOAK_PRESETS[id].label}</motion.button>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openCloakPopup("https://www.google.com")}
          style={{
            marginTop: "0.85rem", background: "none", border: "1px solid #222", color: "rgba(255,255,255,0.45)",
            padding: "0.4rem 0.85rem", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
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
          whileTap={{ scale: 0.98 }}
          onClick={() => onSettingsChange({ ...settings, panicUrl: DEFAULT_PANIC_URL })}
          style={{
            marginTop: "0.85rem", background: "none", border: "1px solid #222", color: "var(--t-text-muted)",
            padding: "0.4rem 0.85rem", fontSize: "0.6rem", fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
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

      <div id="settings-gaming">
      {/* ─── GAMING ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem", marginTop: 0 }}>
        <span style={{ fontSize: "0.55rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.15)" }}>gaming</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
      </div>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>game mode</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          On matching sites, restores the normal cursor, hides the custom cursor, and uses faster proxy settings (Scramjet + Bare).
        </p>
        <motion.label whileHover={{ color: "rgba(255,255,255,0.8)" }} style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.85rem", cursor: "pointer", fontSize: "0.72rem", color: "rgba(255,255,255,0.55)" }}>
          <motion.input
            type="checkbox"
            checked={settings.gameModeEnabled}
            onChange={e => onSettingsChange({ ...settings, gameModeEnabled: e.target.checked })}
            whileTap={{ scale: 1.2 }}
          />
          enable game mode
        </motion.label>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", margin: "0 0 0.45rem" }}>sites (one hostname per line)</p>
        <motion.textarea
          value={settings.gameModeSites.join("\n")}
          onChange={e => {
            const sites = e.target.value
              .split(/\r?\n/)
              .map(s => s.trim().toLowerCase().replace(/^www\./, ""))
              .filter(Boolean);
            onSettingsChange({ ...settings, gameModeSites: sites });
          }}
          rows={6}
          placeholder={"smashkarts.io\nkrunker.io"}
          whileFocus={{ borderColor: "#555" }}
          style={{
            ...inputBase,
            width: "100%",
            resize: "vertical",
            minHeight: 100,
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.72rem",
          }}
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => onSettingsChange({ ...settings, gameModeSites: [...DEFAULT_GAME_MODE_SITES] })}
          style={{
            marginTop: "0.65rem",
            background: "none",
            border: "1px solid #222",
            color: "rgba(255,255,255,0.35)",
            padding: "0.35rem 0.75rem",
            fontSize: "0.6rem",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: "2px",
          }}
        >
          reset site list
        </motion.button>
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
                    letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
                  }}
                >{isRec ? "cancel" : "record"}</motion.button>
              </motion.div>
            );
          })}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSettingsChange({ ...settings, shortcuts: DEFAULT_KEY_SHORTCUTS })}
          style={{
            marginTop: "1rem", background: "none", border: "1px solid #222", color: "rgba(255,255,255,0.25)",
            padding: "0.4rem 0.85rem", fontSize: "0.6rem", fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
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
                  letterSpacing: "0.04em", cursor: "pointer", borderRadius: "2px",
                  transition: "all 0.15s",
                }}
              >{Math.round(scale * 100)}%</motion.button>
            );
          })}
        </div>
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
                  letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
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
          Determines how your traffic is routed. Auto tries Wisp (libcurl) first, falls back to bare HTTP.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["auto", "wisp", "epoxy", "bare"] as TransportMode[]).map(id => {
            const labels: Record<TransportMode, string> = { auto: "Auto", wisp: "Wisp", epoxy: "Epoxy", bare: "Bare" };
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
                  letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
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
          Override the default Wisp WebSocket server. Leave empty to use the built-in server at <code style={codeStyle}>/api/wisp/</code>.
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
                  letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
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
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>settings management</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
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
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
            }}
          >export settings</motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
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
                    onSettingsChange({ ...settings, ...imported });
                  } catch { alert("Invalid settings file."); }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
            style={{
              background: "none", border: "1px solid #222", color: "rgba(255,255,255,0.45)",
              padding: "0.4rem 0.85rem", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
            }}
          >import settings</motion.button>
          {onLogout && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onLogout}
              style={{
                background: "none", border: "1px solid #333", color: "rgba(200,70,70,0.7)",
                padding: "0.4rem 0.85rem", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
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

// ─── AI page ──────────────────────────────────────────────────────────────────

function AIPage({ user, profile, onAuthenticated }: { user: User | null; profile: Profile | null; onAuthenticated: (payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) => void }) {
  if (!user || !profile) {
    return <InlineAuthScreen onAuthenticated={onAuthenticated} feature="AI" />;
  }

  return <AIPageInner user={user} profile={profile} />;
}

function AIPageInner({ user, profile }: { user: User; profile: Profile }) {
  const starterMessages = useMemo<AIMessage[]>(() => [
    { id: aiMessageId(), role: "assistant", content: "Ready when you are. Ask for quick answers, rewrites, brainstorming, or code help." },
  ], []);

  const [conversations, setConversations] = useState<AIConversationRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>(starterMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<AIMode>("fast");
  const [editMessageId, setEditMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, "like" | "dislike" | null>>({});
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const modeMeta: Record<AIMode, { label: string; hint: string }> = {
    fast: { label: "llama-3.1-8b-instant", hint: "lowest latency" },
    think: { label: "openai/gpt-oss-20b", hint: "more reasoning, slower replies" },
  };

  useEffect(() => {
    if (!modeDropdownOpen) return;
    const handler = () => setModeDropdownOpen(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modeDropdownOpen]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [input]);

  useEffect(() => {
    if (editTextareaRef.current) {
      const el = editTextareaRef.current;
      el.style.height = "0px";
      el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    }
  }, [editingContent]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBooting(true);
      try {
        const { data, error: err } = await supabase
          .from("ai_conversations")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (err) throw err;
        if (cancelled) return;
        const convs = (data ?? []) as AIConversationRecord[];
        setConversations(convs);
        if (convs.length > 0) {
          setActiveId(convs[0].id);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load conversations.");
      } finally {
        if (!cancelled) setBooting(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user.id]);

  useEffect(() => {
    if (!activeId) {
      setMessages(starterMessages);
      return;
    }
    let cancelled = false;
    async function loadMessages() {
      setBooting(true);
      try {
        const { data, error: err } = await supabase
          .from("ai_messages")
          .select("id, role, content")
          .eq("conversation_id", activeId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (err) throw err;
        if (cancelled) return;
        if (data && data.length > 0) {
          setMessages(data.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
        } else {
          setMessages(starterMessages);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load messages.");
      } finally {
        if (!cancelled) setBooting(false);
      }
    }
    loadMessages();
    return () => { cancelled = true; };
  }, [activeId, user.id, starterMessages]);

  async function newChat() {
    const { data, error: err } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, title: "New chat" })
      .select("id, title, created_at")
      .single();
    if (err) { setError(err.message); return; }
    const conv = data as AIConversationRecord;
    setConversations(prev => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages(starterMessages);
    setError("");
  }

  async function deleteChat(id: string) {
    await supabase.from("ai_messages").delete().eq("conversation_id", id).eq("user_id", user.id);
    await supabase.from("ai_conversations").delete().eq("id", id).eq("user_id", user.id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) {
      const next = conversations.find(c => c.id !== id);
      setActiveId(next ? next.id : null);
      if (!next) setMessages(starterMessages);
    }
  }

  async function updateConversationTitle(id: string, title: string) {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    await supabase.from("ai_conversations").update({ title }).eq("id", id).eq("user_id", user.id);
  }

  async function generateTitle(convId: string, userPrompt: string, aiResponse: string) {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fast",
          messages: [
            { role: "system", content: "Generate a concise title under 6 words for this conversation based on the first user message and AI response. Reply with only the title, no quotes or extra text." },
            { role: "user", content: userPrompt },
            { role: "assistant", content: aiResponse },
          ],
        }),
      });
      const data = await res.json().catch(() => null) as { content?: string } | null;
      if (data?.content) {
        const title = data.content.trim().replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 60);
        if (title) updateConversationTitle(convId, title);
      }
    } catch {}
  }

  async function sendMessage(rawPrompt?: string) {
    const prompt = (rawPrompt ?? input).trim();
    if (!prompt || loading || booting) return;

    let convId = activeId;
    if (!convId) {
      const { data, error: err } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, title: buildConversationTitle(prompt) })
        .select("id, title, created_at")
        .single();
      if (err) { setError(err.message); return; }
      const conv = data as AIConversationRecord;
      setConversations(prev => [conv, ...prev]);
      convId = conv.id;
      setActiveId(conv.id);
    }

    const userMessage: AIMessage = { id: aiMessageId(), role: "user", content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const { error: insertErr } = await supabase.from("ai_messages").insert({
        conversation_id: convId, user_id: user.id, role: "user", content: prompt,
      });
      if (insertErr) throw insertErr;

      const allMessages = [...messages, userMessage];
      const content = await sendAiChat(allMessages, mode);
      const assistantMessage: AIMessage = { id: aiMessageId(), role: "assistant", content };
      setMessages(prev => [...prev, assistantMessage]);

      const { error: aiInsertErr } = await supabase.from("ai_messages").insert({
        conversation_id: convId, user_id: user.id, role: "assistant", content,
      });
      if (aiInsertErr) throw aiInsertErr;

      const conv = conversations.find(c => c.id === convId);
      if (conv && conv.title === "New chat") {
        const tempTitle = buildConversationTitle(prompt);
        updateConversationTitle(convId, tempTitle);
        generateTitle(convId, prompt, content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to get a response right now.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit(messageId: string) {
    const newContent = editingContent.trim();
    if (!newContent) return;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent } : m));
    setEditMessageId(null);
    setEditingContent("");
    await supabase.from("ai_messages").update({ content: newContent }).eq("id", messageId).eq("user_id", user.id);
  }

  function startEdit(msg: AIMessage) {
    setEditMessageId(msg.id);
    setEditingContent(msg.content);
    setTimeout(() => editTextareaRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditMessageId(null);
    setEditingContent("");
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content).catch(() => {});
  }

  function speakMessage(id: string, content: string) {
    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  }

  async function regenerateMessage() {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (!lastUserMsg || regenerating) return;
    setRegenerating(true);
    const lastAiIndex = messages.map(m => m.role).lastIndexOf("assistant");
    if (lastAiIndex !== -1) {
      const removed = messages[lastAiIndex];
      setMessages(prev => prev.filter(m => m.id !== removed.id));
      if (activeId) {
        try { await supabase.from("ai_messages").delete().eq("id", removed.id).eq("user_id", user.id); } catch {}
      }
    }
    setLoading(true);
    try {
      const history = messages.slice(0, lastAiIndex > 0 ? lastAiIndex - 1 : 0);
      const content = await sendAiChat([...history, lastUserMsg], mode);
      const assistantMessage: AIMessage = { id: aiMessageId(), role: "assistant", content };
      setMessages(prev => [...prev, assistantMessage]);
      if (activeId) {
        try { await supabase.from("ai_messages").insert({ conversation_id: activeId, user_id: user.id, role: "assistant", content }); } catch {}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate.");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  const sidebarWidth = 260;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ height: "100%", overflow: "hidden", background: "radial-gradient(circle at top left, rgba(120,170,255,0.14), transparent 28%), radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 22%), #0d0d0d", fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <div style={{ height: "100%", maxWidth: 1200, margin: "0 auto", padding: "1.4rem", display: "flex", gap: "0.75rem" }}>
        {/* ── Sidebar ── */}
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ width: sidebarWidth, flexShrink: 0, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, rgba(15,15,15,0.96), rgba(9,9,9,0.96))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}
        >
          {/* New chat button */}
          <div style={{ padding: "0.85rem" }}>
            <motion.button
              whileHover={{ scale: 1.02, background: "rgba(255,255,255,0.06)" }}
              whileTap={{ scale: 0.98 }}
              onClick={newChat}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "0.65rem 0", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.68rem", letterSpacing: "0.08em" }}
            >
              + New chat
            </motion.button>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 0.4rem" }}>
            {conversations.length === 0 && !booting && (
              <p style={{ textAlign: "center", fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", padding: "1.5rem 0", margin: 0 }}>No conversations yet</p>
            )}
            <AnimatePresence>
              {conversations.map((conv) => {
                const active = conv.id === activeId;
                return (
                  <motion.div
                    key={conv.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8, height: 0, marginBottom: 0 }}
                    onClick={() => setActiveId(conv.id)}
                    style={{
                      cursor: "pointer", borderRadius: "10px", padding: "0.6rem 0.7rem",
                      marginBottom: "0.2rem", position: "relative",
                      background: active ? "rgba(255,255,255,0.06)" : "transparent",
                      border: active ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                    }}
                    onMouseEnter={() => setHoveredMsgId(conv.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "#e0e0e0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: active ? 170 : 200 }}>
                      {conv.title || "Untitled"}
                    </p>
                    {hoveredMsgId === conv.id && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={(e) => { e.stopPropagation(); deleteChat(conv.id); }}
                        style={{ position: "absolute", right: "0.4rem", top: "50%", transform: "translateY(-50%)", background: "rgba(220,80,80,0.15)", border: "1px solid rgba(220,80,80,0.3)", borderRadius: "6px", color: "rgba(220,80,80,0.8)", fontSize: "0.55rem", cursor: "pointer", padding: "0.15rem 0.4rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.04em" }}
                      >delete</motion.button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* User info */}
          <div style={{ padding: "0.75rem 0.85rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
              {profile.username}
            </p>
          </div>
        </motion.aside>

        {/* ── Main chat area ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(7,7,7,0.98))", borderRadius: "22px", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.2rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.88rem", color: "#eceff4", fontWeight: 500 }}>
                {activeId ? (conversations.find(c => c.id === activeId)?.title || "Chat") : "AI"}
              </p>
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.58rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
                {modeMeta[mode].label}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {activeId && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => deleteChat(activeId)}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(200,80,80,0.6)", borderRadius: "999px", padding: "0.35rem 0.75rem", fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}
                >delete</motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={newChat}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.55)", borderRadius: "999px", padding: "0.35rem 0.75rem", fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}
              >+ new</motion.button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollerRef} style={{ flex: 1, overflowY: "auto", padding: "1.4rem 1.4rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {booting ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem" }}>Loading…</p>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.8rem" }}>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.2)", fontSize: "0.68rem", letterSpacing: "0.04em" }}>Send a message to start chatting</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((message, index) => {
                  const isUser = message.role === "user";
                  const isEditing = editMessageId === message.id;
                  const isHovered = hoveredMsgId === message.id;
                  return (
                    <motion.div
                      key={message.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.015 }}
                      style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}
                    >
                      <div
                        style={{ maxWidth: "min(100%, 780px)", width: "100%" }}
                        onMouseEnter={() => setHoveredMsgId(message.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                            <textarea
                              ref={editTextareaRef}
                              value={editingContent}
                              onChange={e => setEditingContent(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(message.id); }
                                if (e.key === "Escape") cancelEdit();
                              }}
                              style={{ width: "100%", resize: "none", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "14px", color: "#e0e0e0", padding: "0.75rem 0.9rem", fontSize: "0.79rem", lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif", outline: "none", minHeight: 80 }}
                            />
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => saveEdit(message.id)} style={{ background: "#e8ecf8", border: "none", borderRadius: "8px", color: "#0d0d0d", padding: "0.35rem 0.8rem", fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", fontWeight: 600 }}>Save</motion.button>
                              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={cancelEdit} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", padding: "0.35rem 0.8rem", fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer" }}>Cancel</motion.button>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              borderRadius: isUser ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
                              background: isUser ? "rgba(232,236,248,0.1)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${isUser ? "rgba(232,236,248,0.15)" : "rgba(255,255,255,0.06)"}`,
                              padding: "0.85rem 1rem",
                              position: "relative",
                            }}
                          >
                            <p style={{ margin: 0, color: isUser ? "rgba(232,236,248,0.75)" : "rgba(255,255,255,0.4)", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                              {isUser ? "You" : "AI"}
                            </p>
                            <p style={{ margin: 0, color: "#e0e0e0", fontSize: "0.8rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                              {message.content}
                            </p>
                            {isUser && isHovered && !isEditing && (
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ display: "flex", gap: "0.3rem", marginTop: "0.55rem", justifyContent: "flex-end" }}
                              >
                                <button onClick={() => copyMessage(message.content)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "rgba(255,255,255,0.45)", fontSize: "0.58rem", cursor: "pointer", padding: "0.2rem 0.5rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.04em" }}>copy</button>
                                <button onClick={() => startEdit(message)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "rgba(255,255,255,0.45)", fontSize: "0.58rem", cursor: "pointer", padding: "0.2rem 0.5rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.04em" }}>edit</button>
                              </motion.div>
                            )}
                            {!isUser && isHovered && !isEditing && (
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ display: "flex", gap: "0.3rem", marginTop: "0.55rem", alignItems: "center" }}
                              >
                                <button onClick={() => speakMessage(message.id, message.content)} style={{ background: speakingMessageId === message.id ? "rgba(120,170,255,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${speakingMessageId === message.id ? "rgba(120,170,255,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: "6px", color: speakingMessageId === message.id ? "rgba(120,170,255,0.8)" : "rgba(255,255,255,0.45)", fontSize: "0.58rem", cursor: "pointer", padding: "0.2rem 0.5rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                  <Volume2 size={12} />
                                  {speakingMessageId === message.id ? "stop" : "read"}
                                </button>
                                <button onClick={regenerateMessage} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "rgba(255,255,255,0.45)", fontSize: "0.58rem", cursor: "pointer", padding: "0.2rem 0.5rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                                  <RefreshCw size={11} />
                                  regenerate
                                </button>
                                <span style={{ width: "1px", height: 12, background: "rgba(255,255,255,0.1)" }} />
                                <button onClick={() => setFeedback(prev => ({ ...prev, [message.id]: prev[message.id] === "like" ? null : "like" }))} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.15rem", color: feedback[message.id] === "like" ? "rgba(120,200,120,0.8)" : "rgba(255,255,255,0.35)", display: "inline-flex", alignItems: "center" }}>
                                  <ThumbsUp size={12} />
                                </button>
                                <button onClick={() => setFeedback(prev => ({ ...prev, [message.id]: prev[message.id] === "dislike" ? null : "dislike" }))} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.15rem", color: feedback[message.id] === "dislike" ? "rgba(220,100,100,0.8)" : "rgba(255,255,255,0.35)", display: "inline-flex", alignItems: "center" }}>
                                  <ThumbsDown size={12} />
                                </button>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ borderRadius: "20px 20px 20px 6px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "0.85rem 1rem", maxWidth: "min(100%, 780px)" }}>
                  <p style={{ margin: "0 0 0.35rem", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>AI</p>
                  <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", minHeight: 20 }}>
                    {[0, 1, 2].map((dot) => (
                      <motion.span key={dot} animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }} transition={{ duration: 1, repeat: Infinity, delay: dot * 0.12 }} style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.5)", display: "block" }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input area */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.1rem 1.1rem", background: "linear-gradient(180deg, rgba(11,11,11,0.96), rgba(8,8,8,0.98))" }}>
            {error && <p style={{ margin: "0 0 0.7rem", color: "rgba(235,120,120,0.9)", fontSize: "0.68rem", letterSpacing: "0.04em" }}>{error}</p>}
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px", padding: "0.6rem 0.8rem" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={activeId ? "Ask anything..." : "Start a new chat..."}
                rows={1}
                style={{ flex: 1, resize: "none", background: "transparent", border: "none", color: "#eef2f7", fontSize: "0.78rem", lineHeight: 1.6, outline: "none", fontFamily: "'Space Grotesk', sans-serif", minHeight: 24, maxHeight: 220, overflowY: "auto" }}
              />
              {/* Mode dropdown */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); setModeDropdownOpen(!modeDropdownOpen); }}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "0.4rem 0.65rem", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "0.58rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.06em", whiteSpace: "nowrap" }}
                >
                  {mode === "fast" ? <><Zap size={12} style={{ marginRight: "0.2rem" }} />fast</> : <><Brain size={12} style={{ marginRight: "0.2rem" }} />think</>}
                </motion.button>
                <AnimatePresence>
                  {modeDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      style={{ position: "absolute", bottom: "calc(100% + 6px)", right: 0, background: "#181818", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "0.3rem", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", minWidth: 120, zIndex: 10 }}
                    >
                      {(["fast", "think"] as AIMode[]).map((opt) => (
                        <motion.button
                          key={opt}
                          whileHover={{ background: "rgba(255,255,255,0.06)" }}
                          onClick={() => { setMode(opt); setModeDropdownOpen(false); }}
                          style={{ display: "block", width: "100%", textAlign: "left", background: mode === opt ? "rgba(255,255,255,0.08)" : "transparent", border: "none", borderRadius: "8px", padding: "0.45rem 0.7rem", cursor: "pointer", color: mode === opt ? "#e8e8e8" : "rgba(255,255,255,0.5)", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.04em" }}
                        >
                          <span style={{ marginRight: "0.4rem", display: "inline-flex", verticalAlign: "middle" }}>{opt === "fast" ? <Zap size={13} /> : <Brain size={13} />}</span>
                          {opt === "fast" ? "Fast" : "Think"}
                          <span style={{ display: "block", fontSize: "0.52rem", color: "rgba(255,255,255,0.25)", marginTop: "0.1rem" }}>
                            {opt === "fast" ? "Low latency" : "More reasoning"}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Voice button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (listening) return;
                  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SpeechRecognition) return;
                  const recognition = new SpeechRecognition();
                  recognition.interimResults = false;
                  recognition.lang = "en-US";
                  setListening(true);
                  recognition.onresult = (event: any) => {
                    const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
                    setInput(transcript);
                  };
                  recognition.onend = () => setListening(false);
                  recognition.onerror = () => setListening(false);
                  try { recognition.start(); } catch { setListening(false); }
                }}
                style={{ flexShrink: 0, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: listening ? "rgba(220,80,80,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${listening ? "rgba(220,80,80,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: "50%", cursor: "pointer", color: listening ? "rgba(220,80,80,0.9)" : "rgba(255,255,255,0.4)", padding: 0, position: "relative" }}
              >
                {listening ? <><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc4444", display: "block", position: "absolute" }} /><Mic size={16} /></> : <Mic size={16} />}
              </motion.button>
              {/* Send button */}
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.03 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                type="submit"
                disabled={loading || !input.trim()}
                style={{ flexShrink: 0, alignSelf: "stretch", minWidth: 80, background: loading || !input.trim() ? "#1b1b1b" : "#e8ecf8", color: loading || !input.trim() ? "rgba(255,255,255,0.25)" : "#0d0d0d", border: "none", borderRadius: "999px", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, padding: "0 1rem" }}
              >
                {loading ? "sending" : "send"}
              </motion.button>
            </form>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}

function ChatPage({ user, profile, session, onAuthenticated }: { user: User | null; profile: Profile | null; session: Session | null; onAuthenticated: (payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) => void }) {
  if (!user || !profile || !session) {
    return <InlineAuthScreen onAuthenticated={onAuthenticated} feature="Chat" />;
  }

  return <ChatPageInner user={user} profile={profile} session={session} />;
}

function ChatPageInner({ user, profile, session }: { user: User; profile: Profile; session: Session }) {
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [replyTarget, setReplyTarget] = useState<ChatMessageRecord | null>(null);
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
  const [recentOwnMessageId, setRecentOwnMessageId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(`unstable_chat_reactions_${user.id}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(`unstable_chat_reactions_${user.id}`, JSON.stringify(reactions));
  }, [reactions, user.id]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let mounted = true;

    async function loadMessages() {
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, user_id, username, content, created_at")
        .order("created_at", { ascending: true })
        .limit(150);

      if (!mounted) return;
      if (error) setError(error.message);
      else setMessages(data ?? []);
      setLoading(false);
    }

    loadMessages();

    const channel = supabase
      .channel("unstable-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const incoming = payload.new as ChatMessageRecord;
          setMessages((prev) => (prev.some((msg) => msg.id === incoming.id) ? prev : [...prev, incoming]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          const deletedId = String((payload.old as { id?: string } | null)?.id ?? "");
          if (!deletedId) return;
          setMessages((prev) => prev.filter((message) => message.id !== deletedId));
          setReactionPickerId((prev) => (prev === deletedId ? null : prev));
          setReplyTarget((prev) => (prev?.id === deletedId ? null : prev));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setError("");
    try {
      const payload = replyTarget ? buildReplyPayload(replyTarget, content) : content;
      const { data, error } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        username: profile.username,
        content: payload,
      }).select("id").single();
      if (error) throw error;
      setInput("");
      setReplyTarget(null);
      setRecentOwnMessageId(data?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  const reactionIconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    like: ThumbsUp,
    fire: Flame,
    laugh: Laugh,
    heart: Heart,
  };

  async function undoLastMessage() {
    if (!recentOwnMessageId) return;
    setError("");
    try {
      const { error } = await supabase.from("chat_messages").delete().eq("id", recentOwnMessageId).eq("user_id", user.id);
      if (error) throw error;
      setMessages((prev) => prev.filter((message) => message.id !== recentOwnMessageId));
      setRecentOwnMessageId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to undo that message.");
    }
  }

  function toggleReaction(messageId: string, emoji: string) {
    setReactions((prev) => {
      const current = prev[messageId] ?? [];
      const exists = current.includes(emoji);
      return {
        ...prev,
        [messageId]: exists ? current.filter((item) => item !== emoji) : [...current, emoji],
      };
    });
    setReactionPickerId(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top right, rgba(120,170,255,0.1), transparent 24%), radial-gradient(circle at bottom left, rgba(255,255,255,0.05), transparent 22%), #0d0d0d",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{ height: "100%", maxWidth: 1000, margin: "0 auto", padding: "1.4rem", display: "grid", gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)", gap: "1rem" }}>
        <aside style={{ border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(15,15,15,0.96), rgba(9,9,9,0.96))", borderRadius: "18px", padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
          <div>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: 0 }}>unstable — chat</p>
            <p style={{ fontSize: "1.45rem", color: "#f3f4f6", margin: "0.55rem 0 0.35rem", lineHeight: 1.05 }}>Realtime room across devices.</p>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.42)", margin: 0, lineHeight: 1.6 }}>
              Messages sync through Supabase Realtime. Everyone signed into this app sees the same room.
            </p>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.9rem" }}>
            <p style={{ margin: "0 0 0.25rem", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)" }}>Signed in as</p>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#eef2f7" }}>{profile.username}</p>
          </div>
        </aside>

        <section style={{ minWidth: 0, display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(7,7,7,0.98))", borderRadius: "22px", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#eceff4", fontWeight: 500 }}>Global chat</p>
              <p style={{ margin: "0.22rem 0 0", fontSize: "0.65rem", color: "rgba(255,255,255,0.34)", letterSpacing: "0.08em", textTransform: "uppercase" }}>type unstable://chat in the url bar</p>
            </div>
          </div>

          <div ref={scrollerRef} style={{ flex: 1, overflowY: "auto", padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {loading ? (
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.74rem" }}>loading chat…</div>
            ) : messages.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.74rem" }}>No messages yet. Say hi.</div>
            ) : (
              messages.map((message, idx) => {
                const isOwn = message.user_id === user.id;
                const parsed = parseChatMessageContent(message.content);
                const messageReactions = reactions[message.id] ?? [];
                return (
                  <motion.div key={message.id} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(idx * 0.03, 0.4) }} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "min(100%, 700px)", display: "flex", flexDirection: isOwn ? "row-reverse" : "row", gap: "0.7rem", alignItems: "flex-end" }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", fontSize: "0.56rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, flexShrink: 0 }}>
                        {message.username.slice(0, 2)}
                      </div>
                      <div style={{ position: "relative" }}>
                        <div style={{ borderRadius: isOwn ? "22px 22px 8px 22px" : "22px 22px 22px 8px", background: "linear-gradient(180deg, rgba(25,25,25,0.98), rgba(18,18,18,0.98))", border: "1px solid rgba(255,255,255,0.07)", padding: "0.9rem 1rem", boxShadow: "0 10px 26px rgba(0,0,0,0.18)" }}>
                          <p style={{ margin: "0 0 0.36rem", fontSize: "0.56rem", letterSpacing: "0.16em", textTransform: "uppercase", color: isOwn ? "rgba(255,255,255,0.84)" : "rgba(255,255,255,0.3)" }}>
                            {isOwn ? "you" : message.username}
                          </p>
                          {parsed.replySnippet && (
                            <button
                              onClick={() => {
                                const el = document.getElementById(`chat-message-${message.id}`);
                                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                              }}
                              style={{ display: "block", width: "100%", textAlign: "left", margin: "0 0 0.55rem", padding: "0.55rem 0.65rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", color: "rgba(255,255,255,0.62)", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.67rem", cursor: "pointer" }}
                            >
                              <span style={{ display: "block", fontSize: "0.54rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: "0.22rem" }}>
                                replying to {parsed.replyUsername}
                              </span>
                              {parsed.replySnippet}
                            </button>
                          )}
                          <p id={`chat-message-${message.id}`} style={{ margin: 0, color: "rgba(255,255,255,0.84)", fontSize: "0.79rem", lineHeight: 1.72, whiteSpace: "pre-wrap" }}>{parsed.body}</p>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem", alignItems: "center", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
                          <button onClick={() => setReplyTarget(message)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.34)", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>reply</button>
                          <button onClick={() => setReactionPickerId((prev) => prev === message.id ? null : message.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.34)", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>react</button>
                          {recentOwnMessageId === message.id && isOwn && (
                            <button onClick={undoLastMessage} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.34)", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>undo</button>
                          )}
                        </div>
                        {reactionPickerId === message.id && (
                          <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.45rem", padding: "0.35rem 0.45rem", borderRadius: "999px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", width: "fit-content", marginLeft: isOwn ? "auto" : 0 }}>
                            {[
                              { icon: ThumbsUp, label: "like" },
                              { icon: Flame, label: "fire" },
                              { icon: Laugh, label: "laugh" },
                              { icon: Heart, label: "heart" },
                            ].map(({ icon: Icon, label }) => (
                              <button key={label} onClick={() => toggleReaction(message.id, label)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.92rem", padding: "0.2rem", color: "rgba(255,255,255,0.5)", display: "inline-flex", alignItems: "center" }}><Icon size={16} /></button>
                            ))}
                          </div>
                        )}
                        {messageReactions.length > 0 && (
                          <div style={{ display: "flex", gap: "0.32rem", flexWrap: "wrap", marginTop: "0.45rem", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
                            {messageReactions.map((reaction, index) => {
                              const Icon = reactionIconMap[reaction] || null;
                              return Icon ? (
                                <span key={`${message.id}-${reaction}-${index}`} style={{ padding: "0.18rem 0.45rem", borderRadius: "999px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "inline-flex", alignItems: "center", color: "rgba(255,255,255,0.5)" }}>
                                  <Icon size={14} />
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.1rem 1.1rem" }}>
            {error && <p style={{ margin: "0 0 0.7rem", color: "rgba(235,120,120,0.9)", fontSize: "0.68rem" }}>{error}</p>}
            {replyTarget && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.7rem", padding: "0.65rem 0.8rem", borderRadius: "14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: "0 0 0.18rem", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.34)" }}>replying to {replyTarget.user_id === user.id ? "yourself" : replyTarget.username}</p>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.62)", fontSize: "0.68rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {parseChatMessageContent(replyTarget.content).body}
                  </p>
                </div>
                <button onClick={() => setReplyTarget(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.38)", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", padding: 0 }}>cancel</button>
              </div>
            )}
            <form onSubmit={sendMessage} style={{ display: "flex", gap: "0.8rem", alignItems: "flex-end", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px", padding: "0.8rem" }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Send a message to everyone signed in..."
                rows={1}
                style={{ flex: 1, resize: "none", background: "transparent", border: "none", color: "#eef2f7", fontSize: "0.78rem", lineHeight: 1.6, outline: "none", fontFamily: "'Space Grotesk', sans-serif", minHeight: 24, maxHeight: 180, overflowY: "auto" }}
              />
              <motion.button
                whileHover={{ scale: sending ? 1 : 1.03 }}
                whileTap={{ scale: sending ? 1 : 0.98 }}
                type="submit"
                disabled={sending || !input.trim()}
                style={{ alignSelf: "stretch", minWidth: 104, background: sending || !input.trim() ? "#1b1b1b" : "#e8ecf8", color: sending || !input.trim() ? "rgba(255,255,255,0.25)" : "#0d0d0d", border: "none", borderRadius: "999px", cursor: sending || !input.trim() ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, padding: "0 1rem" }}
              >
                {sending ? "sending" : "send"}
              </motion.button>
            </form>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

// ─── New tab page ─────────────────────────────────────────────────────────────

function NewTabPage({ onNavigate, customShortcuts, setCustomShortcuts, wallpaper, vantaActive, searchEngine }: {
  onNavigate: (url: string) => void;
  customShortcuts: Shortcut[];
  setCustomShortcuts: (s: Shortcut[]) => void;
  wallpaper?: string;
  vantaActive?: boolean;
  searchEngine?: string;
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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

  const inputSt: React.CSSProperties = { background: "var(--t-bg)", border: "1px solid var(--t-border-light)", color: "var(--t-text)", padding: "0.5rem 0.75rem", fontSize: "0.8rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "2px" };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: vantaActive ? "transparent" : wallpaper ? `var(--t-bg) url(${wallpaper}) center/cover no-repeat` : "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif" 
      }}
    >
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "1.75rem", padding: "2.5rem 3rem",
        background: (wallpaper || vantaActive) ? "color-mix(in srgb, var(--t-bg) 45%, transparent)" : "transparent",
        backdropFilter: (wallpaper || vantaActive) ? "blur(20px) saturate(1.3)" : "none",
        WebkitBackdropFilter: (wallpaper || vantaActive) ? "blur(20px) saturate(1.3)" : "none",
        borderRadius: "12px", border: (wallpaper || vantaActive) ? "1px solid var(--t-border-light)" : "none",
        boxShadow: (wallpaper || vantaActive) ? "0 8px 48px rgba(0,0,0,0.5)" : "none",
      }}>
      <motion.p
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--t-text-muted)", margin: 0 }}
      >unstable</motion.p>

      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
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
          {showNtSuggestions && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000, background: "var(--t-bg-secondary)", border: "1px solid var(--t-border)", borderRadius: "0 0 8px 8px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
              <div ref={ntSuggestListRef} style={{ maxHeight: 160, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "var(--t-border) var(--t-bg-secondary)" }}>
                {ntSuggestions.map((s, i) => (
                  <div key={s} onClick={() => { setInput(s); setShowNtSuggestions(false); setNtSuggestIndex(-1); onNavigate(searchUrl(s, searchEngine ?? "duckduckgo")); }}
                    style={{ padding: "0.6rem 0.9rem", fontSize: "0.8rem", color: "var(--t-text-secondary)", cursor: "pointer", borderBottom: "1px solid var(--t-border-light)", background: i === ntSuggestIndex ? "var(--t-bg-tertiary)" : "transparent", transition: "background 0.1s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--t-bg-tertiary)"; setNtSuggestIndex(i); }}
                    onMouseLeave={e => { if (ntSuggestIndex !== i) e.currentTarget.style.background = "transparent"; }}
                  >{s}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        <motion.button
          whileHover={{ background: "var(--t-accent-hover)" }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          style={{ background: "var(--t-accent)", color: "var(--t-accent-text)", border: "none", padding: "0.75rem 1.25rem", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", borderRadius: "0 2px 2px 0" }}
        >go</motion.button>
      </motion.form>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", justifyContent: "center", padding: "0 2rem", maxWidth: 600 }}
      >
        {all.map((sc, i) => (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            key={sc.id}
            style={{ position: "relative" }}
            className="sc-wrap"
          >
            <motion.button
              whileHover={{ y: -4, background: "var(--t-bg-tertiary)" }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onNavigate(sc.url)}
              title={sc.name}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", padding: "0.55rem 0.4rem", borderRadius: "6px", transition: "background 0.15s", minWidth: "52px" }}
            >
              <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={sc.favicon} alt={sc.name} width={24} height={24} style={{ borderRadius: "4px", objectFit: "contain" }}
                  onError={e => { const img = e.target as HTMLImageElement; img.style.display = "none"; const fb = img.nextSibling as HTMLElement; if (fb) fb.style.display = "flex"; }}
                />
                <span style={{ display: "none", width: 24, height: 24, background: "var(--t-bg-tertiary)", borderRadius: "4px", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "var(--t-text-secondary)", fontWeight: 600 }}>{sc.name[0]?.toUpperCase()}</span>
              </div>
              <span style={{ fontSize: "0.57rem", color: "var(--t-text-muted)", letterSpacing: "0.03em", maxWidth: "56px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.name}</span>
            </motion.button>
            <button onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === sc.id ? null : sc.id); }} className="sc-menu-btn" style={{ position: "absolute", top: 0, right: 0, background: "var(--t-bg-hover)", border: "none", color: "var(--t-text-muted)", borderRadius: "4px", width: 18, height: 18, fontSize: 11, cursor: "pointer", display: "none", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>⋮</button>
            {menuOpenId === sc.id && (
              <div ref={menuRef} style={{ position: "absolute", top: 22, right: 0, zIndex: 1000, background: "var(--t-bg-secondary)", border: "1px solid var(--t-border)", borderRadius: "4px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", minWidth: 100 }}>
                <button onClick={() => { setMenuOpenId(null); setEditingShortcut(sc); setNewName(sc.name); setNewUrl(sc.url); setNewImg(sc.favicon === faviconUrl(extractDomain(sc.url)) ? "" : sc.favicon); setAdding(true); }} style={{ display: "block", width: "100%", background: "none", border: "none", color: "var(--t-text)", fontSize: "0.68rem", padding: "0.5rem 0.8rem", cursor: "pointer", textAlign: "left", fontFamily: "'Space Grotesk', sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>Edit</button>
                <button onClick={() => { setMenuOpenId(null); removeShortcut(sc.id); }} style={{ display: "block", width: "100%", background: "none", border: "none", color: "rgba(235,120,120,0.9)", fontSize: "0.68rem", padding: "0.5rem 0.8rem", cursor: "pointer", textAlign: "left", fontFamily: "'Space Grotesk', sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>Delete</button>
              </div>
            )}
          </motion.div>
        ))}
        {!adding && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + all.length * 0.05 }}
            whileHover={{ scale: 1.1, background: "var(--t-bg-tertiary)" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setAdding(true)}
            title="Add shortcut"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", padding: "0.55rem 0.4rem", borderRadius: "6px", transition: "background 0.15s", minWidth: "52px" }}
          >
            <div style={{ width: 28, height: 28, borderRadius: "6px", border: "1px dashed var(--t-border-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "var(--t-text-muted)" }}>+</div>
            <span style={{ fontSize: "0.57rem", color: "var(--t-text-muted)", letterSpacing: "0.03em" }}>add</span>
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>
        {adding && (
          <motion.form
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            onSubmit={handleAdd}
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem", background: "var(--t-bg-secondary)", border: "1px solid var(--t-border-light)", borderRadius: "4px", padding: "1rem 1.25rem", width: "100%", maxWidth: "300px" }}
          >
            <p style={{ margin: 0, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--t-text-muted)" }}>{editingShortcut ? "edit shortcut" : "new shortcut"}</p>
            <input autoFocus placeholder="name" value={newName} onChange={e => setNewName(e.target.value)} style={inputSt} onFocus={e => e.target.style.borderColor = "var(--t-border)"} onBlur={e => e.target.style.borderColor = "var(--t-border-light)"} />
            <input placeholder="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={inputSt} onFocus={e => e.target.style.borderColor = "var(--t-border)"} onBlur={e => e.target.style.borderColor = "var(--t-border-light)"} />
            <input placeholder="image url (optional)" value={newImg} onChange={e => setNewImg(e.target.value)} style={inputSt} onFocus={e => e.target.style.borderColor = "var(--t-border)"} onBlur={e => e.target.style.borderColor = "var(--t-border-light)"} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" style={{ flex: 1, background: "var(--t-accent)", color: "var(--t-accent-text)", border: "none", padding: "0.5rem", fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px" }}>{editingShortcut ? "save" : "add"}</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => { setAdding(false); setEditingShortcut(null); setNewName(""); setNewUrl(""); setNewImg(""); }} style={{ flex: 1, background: "none", color: "var(--t-text-muted)", border: "1px solid var(--t-border-light)", padding: "0.5rem", fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px" }}>cancel</motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ display: "flex", gap: "1.5rem" }}>
        {[["credits", "unstable://credits"], ["tos", "unstable://tos"], ["privacy", "unstable://privacy"]].map(([label, url]) => (
          <motion.button
            whileHover={{ color: "var(--t-text-secondary)" }}
            key={label}
            onClick={() => onNavigate(url)}
            style={{ background: "none", border: "none", color: "var(--t-text-muted)", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
          >{label}</motion.button>
        ))}
      </motion.div>

      <style>{`.sc-wrap:hover .sc-menu-btn{display:flex!important} input::placeholder{color:rgba(255,255,255,0.2)}`}</style>
      </div>
    </motion.div>
  );
}

// ─── Browser tab ──────────────────────────────────────────────────────────────

function BrowserTab({ tab, isActive, onActivate, onClose, onRefresh, onDuplicate, onCloseRight, onCloseOthers }: {
  tab: Tab; isActive: boolean; onActivate: () => void; onClose: () => void;
  onRefresh?: () => void; onDuplicate?: () => void; onCloseRight?: () => void; onCloseOthers?: () => void;
}) {
  const rawLabel = tab.url ? (tab.title || getDomainFromProxyUrl(tab.url) || "Loading…") : "New Tab";
  const label = rawLabel.length > 20 ? rawLabel.slice(0, 20) + "…" : rawLabel;
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });
  const ctxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <motion.div layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12, width: 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onActivate} onMouseDown={e => { if (e.button === 1) { e.preventDefault(); onClose(); } }} onContextMenu={e => { e.preventDefault(); setCtxPos({ x: e.clientX, y: e.clientY }); setCtxOpen(true); }}
      style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0 0.5rem 0 0.7rem", height: "100%", cursor: "pointer", background: isActive ? "#111" : "transparent", borderRight: "1px solid #1a1a1a", minWidth: 110, maxWidth: 180, flexShrink: 0, transition: "background 0.1s", position: "relative", overflow: "hidden" }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#0f0f0f"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      <div style={{ width: 14, height: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {tab.loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.6)" }} />
          : tab.favicon ? <img src={tab.favicon} alt="" width={14} height={14} style={{ borderRadius: "2px", objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
            : <div style={{ width: 10, height: 10, borderRadius: "2px", background: "#2a2a2a" }} />
        }
      </div>
      <motion.span layout style={{ flex: 1, fontSize: "0.7rem", color: isActive ? "#e0e0e0" : "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>{label}</motion.span>
      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={e => { e.stopPropagation(); onClose(); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.22)", cursor: "pointer", padding: "1px 3px", fontSize: 13, lineHeight: 1, borderRadius: "2px", flexShrink: 0 }}
        onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"}
        onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.22)"}
      >×</motion.button>
      <AnimatePresence>
        {ctxOpen && (
          <motion.div ref={ctxRef} initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ position: "fixed", top: ctxPos.y, left: ctxPos.x, zIndex: 2000, background: "#111", border: "1px solid #222", borderRadius: "6px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", minWidth: 160 }}>
            <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onClose(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}>Close tab</motion.button>
            {tab.url && <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onRefresh?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}>Refresh tab</motion.button>}
            {tab.url && <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onDuplicate?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}>Duplicate tab</motion.button>}
            <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onCloseRight?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}>Close tabs to right</motion.button>
            <motion.button whileHover={{ background: "#1a1a1a" }} onClick={() => { setCtxOpen(false); onCloseOthers?.(); }} style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}>Close other tabs</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Browser app ──────────────────────────────────────────────────────────────

function CollapsedSidebar({
  activeUrl,
  onNavigate,
  canReturnToBrowse,
}: {
  activeUrl: string;
  onNavigate: (url: string) => void;
  canReturnToBrowse?: boolean;
}) {
  const items: Array<{
    label: string;
    url: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    hidden?: boolean;
  }> = [
    { label: canReturnToBrowse ? "Browse" : "Home", url: "unstable://newtab", icon: House },
    { label: "Games", url: "unstable://games", icon: Gamepad },
    { label: "AI", url: "unstable://ai", icon: Atom },
    { label: "Chat", url: "unstable://chat", icon: MessageCircle },
    { label: "Settings", url: "unstable://settings", icon: Settings },
  ];

  const currentPage = activeUrl.startsWith("unstable://") ? activeUrl : "";

  function isActive(url: string) {
    if (url === "unstable://newtab") return !activeUrl;
    return currentPage === url;
  }

  const games = items.find(i => i.url === "unstable://games");
  const settings = items.find(i => i.url === "unstable://settings");
  const middle = items.filter(i => i.url !== "unstable://games" && i.url !== "unstable://settings");

  const buttonBase: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid transparent",
    background: "none",
    color: "rgba(255,255,255,0.28)",
    cursor: "pointer",
    transition: "background 0.12s, color 0.12s, border-color 0.12s",
  };

  return (
    <div
      style={{
        width: 56,
        flexShrink: 0,
        background: "#080808",
        borderRight: "1px solid #1a1a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0.65rem 0",
        gap: "0.55rem",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.55rem" }}>
        {games && !games.hidden && (() => {
          const active = isActive(games.url);
          const Icon = games.icon;
          return (
            <motion.button
              key={games.url}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate(games.url)}
              title={games.label}
              style={{
                ...buttonBase,
                background: active ? "#101010" : "none",
                borderColor: active ? "#1f1f1f" : "transparent",
                color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = active ? "#101010" : "none";
                (e.currentTarget as HTMLButtonElement).style.color = active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = active ? "#1f1f1f" : "transparent";
              }}
            >
              <Icon size={18} />
            </motion.button>
          );
        })()}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.55rem" }}>
        {middle.filter(i => !i.hidden).map(({ label, url, icon: Icon }) => {
          const active = isActive(url);
          return (
            <motion.button
              key={url}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate(url)}
              title={label}
              style={{
                ...buttonBase,
                background: active ? "#101010" : "none",
                borderColor: active ? "#1f1f1f" : "transparent",
                color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = active ? "#101010" : "none";
                (e.currentTarget as HTMLButtonElement).style.color = active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = active ? "#1f1f1f" : "transparent";
              }}
            >
              <Icon size={18} />
            </motion.button>
          );
        })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.55rem" }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => window.open("https://github.com/Allegedcarrot4/Project-Unstable", "_blank")}
          title="GitHub"
          style={{
            ...buttonBase,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f";
            (e.currentTarget as HTMLButtonElement).style.color = "#fff";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => window.open("https://discord.gg/yD9NkcsKcw", "_blank")}
          title="Discord"
          style={{
            ...buttonBase,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f";
            (e.currentTarget as HTMLButtonElement).style.color = "#5865F2";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0741.0741 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
          </svg>
        </motion.button>
        {settings && !settings.hidden && (() => {
          const active = isActive(settings.url);
          const Icon = settings.icon;
          return (
            <motion.button
              key={settings.url}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate(settings.url)}
              title={settings.label}
              style={{
                ...buttonBase,
                background: active ? "#101010" : "none",
                borderColor: active ? "#1f1f1f" : "transparent",
                color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#0f0f0f";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b1b1b";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = active ? "#101010" : "none";
                (e.currentTarget as HTMLButtonElement).style.color = active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = active ? "#1f1f1f" : "transparent";
              }}
            >
              <Icon size={18} />
            </motion.button>
          );
        })()}
      </div>
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
  const [tabs, setTabs] = useState<Tab[]>([makeTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [urlInput, setUrlInput] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [customShortcuts, setCustomShortcuts] = useState<Shortcut[]>(loadCustomShortcuts);
  const [devToolsOpen, setDevToolsOpen] = useState<Record<string, boolean>>({});
  const [pendingPerm, setPendingPerm] = useState<{ id: string; permission: string; origin: string } | null>(null);
  const pendingPermResolve = useRef<((allowed: boolean) => void) | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement>>({});
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(-1);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suggestListRef = useRef<HTMLDivElement>(null);
  const [urlEngineOpen, setUrlEngineOpen] = useState(false);
  const urlEngineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (urlEngineRef.current && !urlEngineRef.current.contains(e.target as Node)) setUrlEngineOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
  const isNewtab = !activeTab?.url;
  const proxyStatus = useProxyStatus();
  const gameModeActive = Boolean(activeTab?.url && isGameModeTabUrl(activeTab.url, settings));
  const activeBgEffect = settings.backgroundEffect;
  const vantaOptions = useMemo(() => {
    return { ...(VANTA_DEFAULTS[activeBgEffect] ?? {}), ...(settings.vantaAdvanced?.[activeBgEffect] ?? {}) };
  }, [activeBgEffect, JSON.stringify(settings.vantaAdvanced?.[activeBgEffect] ?? {})]);
  const [gameModeToast, setGameModeToast] = useState(false);
  const lastGameToastHost = useRef<string | null>(null);

  useEffect(() => {
    if (!gameModeActive) {
      lastGameToastHost.current = null;
      return;
    }
    const host = hostnameFromTabUrl(activeTab!.url);
    if (!host || lastGameToastHost.current === host) return;
    lastGameToastHost.current = host;
    setGameModeToast(true);
    const timer = window.setTimeout(() => setGameModeToast(false), 3200);
    return () => window.clearTimeout(timer);
  }, [gameModeActive, activeTab?.url]);

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
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeTabId]);

  useEffect(() => {
    if (!gameModeActive || proxyStatus.phase !== "ready") return;
    const n = parseInt(localStorage.getItem(BARE_KEY) || "1", 10) || 1;
    if (proxyStatus.transport !== "bare") {
      void switchBare(n, "bare", settings.wispServer, settings.wispRelayUrl, settings.transportEncryption);
    }
  }, [gameModeActive, proxyStatus.phase, proxyStatus.transport]);

  useEffect(() => { applyCloak(settings.cloak); }, [settings.cloak]);
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => {
    try { localStorage.setItem(PANIC_URL_KEY, JSON.stringify({ url: settings.panicUrl })); } catch {}
  }, [settings.panicUrl]);
  useEffect(() => {
    const t = THEMES[settings.theme]?.colors ?? THEMES.dark.colors;
    const wpUrl = THEMES[settings.theme]?.wallpaper ?? settings.wallpaper;
    const props = Object.entries(t).map(([k, v]) => `--t-${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`).join(";");
    const wp = wpUrl ? `--t-wallpaper: url("${wpUrl.replace(/"/g, '\\"')}")` : "--t-wallpaper: none";
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
    setupProxy(n, settings.transportMode, settings.wispServer, settings.codec, settings.wispRelayUrl, settings.transportEncryption);
  }, [settings.transportMode, settings.wispServer]);

  // Font obfuscation toggle
  useEffect(() => {
    document.documentElement.classList.toggle("unstable-font-obfuscated", settings.fontObfuscation);
  }, [settings.fontObfuscation]);

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
    msg("ENIGMA", { enabled: settings.transportEncryption, key: "Unstabl" });
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
    const display = activeTab.url ? (activeTab.url.startsWith("unstable://") ? activeTab.url : decodeProxyUrl(activeTab.url)) : "";
    setUrlInput(display);
  }, [activeTabId, activeTab?.url]);

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

  const stateRef = useRef({ tabs, activeTabId, settings, customShortcuts });
  useEffect(() => { stateRef.current = { tabs, activeTabId, settings, customShortcuts }; });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "reset", "range", "color"].includes(el.type)) return;
      if (el instanceof HTMLTextAreaElement) return;
      if ((el as HTMLElement)?.isContentEditable) return;
      const combo = buildCombo(e);
      if (!combo) return;
      const { tabs, activeTabId, settings, customShortcuts } = stateRef.current;
      const s = settings.shortcuts;

      for (let i = 1; i <= 9; i++) {
        if (combo === s[`tab${i}` as keyof KeyShortcuts]) {
          e.preventDefault(); const t = tabs[i - 1]; if (t) setActiveTabId(t.id); return;
        }
      }
      if (combo === s.closeTab) {
        e.preventDefault();
        if (tabs.length === 1) { setTabs([makeTab()]); return; }
        const idx = tabs.findIndex(t => t.id === activeTabId);
        const next = tabs.filter(t => t.id !== activeTabId);
        setTabs(next); setActiveTabId(next[Math.min(idx, next.length - 1)].id); return;
      }
      if (combo === s.newTab) {
        e.preventDefault(); const tab = makeTab(); setTabs(prev => [...prev, tab]); setActiveTabId(tab.id); return;
      }
      if (combo === s.addShortcut) {
        e.preventDefault();
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab?.url || activeTab.url.startsWith("unstable://")) return;
        const decoded = decodeProxyUrl(activeTab.url);
        let domain = ""; try { domain = new URL(decoded).hostname; } catch { }
        const sc: Shortcut = { id: Math.random().toString(36).slice(2), name: activeTab.title || domain, url: decoded, favicon: activeTab.favicon || faviconUrl(domain) };
        const updated = [...customShortcuts, sc]; setCustomShortcuts(updated); saveCustomShortcuts(updated);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const updateTab = useCallback((id: string, u: Partial<Tab>) => setTabs(prev => prev.map(t => t.id === id ? { ...t, ...u } : t)), []);

  function handleNavigate(url: string, tabId = activeTabId) {
    const t = url.trim();
    if (t.startsWith("unstable://")) {
      const page = t.slice("unstable://".length);
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
              title,
              favicon,
              history: hist,
              historyIndex: hist.length - 1,
              loading: true,
            };
          }));
          return;
        }
        updateTab(tabId, { url: "", title: "New Tab", favicon: "", loading: false, lastProxyUrl: undefined });
        return;
      }
      if (["settings", "credits", "ai", "chat", "blank", "tos", "privacy", "games"].includes(page)) {
        const title = page.charAt(0).toUpperCase() + page.slice(1);
        setTabs(prev => prev.map(tab => {
          if (tab.id !== tabId) return tab;
          const lastProxyUrl =
            tab.url && !tab.url.startsWith("unstable://") ? tab.url : tab.lastProxyUrl;
          const hist = [...tab.history.slice(0, tab.historyIndex + 1), t];
          return {
            ...tab,
            url: t,
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
    }
    const normalized = normalizeUrl(t, settings.searchEngine);
    if (!normalized) return;
    let domain = "";
    try {
      domain = new URL(normalized).hostname.replace(/^www\./i, "").toLowerCase();
    } catch { /* ignore */ }
    const engine = isGameModeHost(domain, settings) ? "scramjet" : settings.proxyEngine;
    const proxyUrl = encodeProxyUrl(normalized, engine, settings);
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      const hist = [...tab.history.slice(0, tab.historyIndex + 1), proxyUrl];
      return {
        ...tab,
        url: proxyUrl,
        title: domain || "Loading…",
        favicon: domain ? faviconUrl(domain) : "",
        history: hist,
        historyIndex: hist.length - 1,
        loading: true,
        lastProxyUrl: proxyUrl,
      };
    }));
  }

  function handleBack() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.historyIndex <= 0) return;
    const idx = tab.historyIndex - 1;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: t.history[idx], historyIndex: idx, loading: true } : t));
  }
  function handleForward() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    const idx = tab.historyIndex + 1;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: t.history[idx], historyIndex: idx, loading: true } : t));
  }
  function handleReload() {
    if (!iframeRef.current) return;
    const src = iframeRef.current.src; iframeRef.current.src = "";
    setTimeout(() => { if (iframeRef.current) iframeRef.current.src = src; updateTab(activeTabId, { loading: true }); }, 50);
  }
  function handleNewTab() { const tab = makeTab(); setTabs(prev => [...prev, tab]); setActiveTabId(tab.id); }
  function handleCloseTab(id: string) {
    if (tabs.length === 1) { setTabs([makeTab()]); return; }
    const idx = tabs.findIndex(t => t.id === id);
    const next = tabs.filter(t => t.id !== id); setTabs(next);
    if (activeTabId === id) setActiveTabId(next[Math.min(idx, next.length - 1)].id);
  }
  function handleRefreshTab(id: string) {
    const iframe = iframeRefs.current[id];
    if (!iframe) return;
    const src = iframe.src; iframe.src = "";
    setTimeout(() => { iframe.src = src; setTabs(prev => prev.map(t => t.id === id ? { ...t, loading: true } : t)); }, 50);
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
    if (!keep.find(t => t.id === activeTabId)) setActiveTabId(keep[keep.length - 1].id);
  }
  function handleCloseOtherTabs(id: string) {
    setTabs(tabs.filter(t => t.id === id));
  }
  function handleOpenInNewTab() {
    if (!activeTab.url || activeTab.url.startsWith("unstable://")) return;
    const win = window.open("about:blank", "_blank"); if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Unstable</title><style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#0d0d0d}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe src="${activeTab.url}" allowfullscreen allow="fullscreen *;autoplay *;camera *;microphone *;payment *;clipboard-read *;clipboard-write *;encrypted-media *"></iframe></body></html>`);
    win.document.close();
  }

  function toggleDevTools() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    const win = iframe.contentWindow;
    if (!win) return;
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

    fetch("https://cdn.jsdelivr.net/npm/eruda")
      .then(r => r.text())
      .then(code => {
        const s = doc.createElement("script");
        s.textContent = code;
        doc.head.appendChild(s);
        try {
          (win as any).eruda.init({ useShadowDom: false });
          (win as any).eruda.show();
          (win as any).__UNSTABLE_DEVTOOLS__ = true;
          const nukeLauncher = () => {
            try {
              doc.querySelectorAll("*").forEach((el: Element) => {
                const cn = (el.className || "").toString();
                if (cn.includes("launcher") || cn.includes("Launcher")) {
                  (el as HTMLElement).style.cssText = "display:none!important";
                }
              });
            } catch {}
          };
          nukeLauncher();
          for (let i = 1; i <= 50; i++) setTimeout(nukeLauncher, i * 50);
          const obs = new MutationObserver(() => nukeLauncher());
          obs.observe(doc.body, { childList: true, subtree: true, attributes: true });
          setTimeout(() => obs.disconnect(), 10000);
        } catch (e) { console.error("eruda init failed", e); }
      })
      .catch(e => console.error("eruda fetch failed", e));
    setDevToolsOpen(prev => ({ ...prev, [id]: true }));
  }

  function handleUrlSubmit(e: React.FormEvent) { e.preventDefault(); handleNavigate(urlInput); urlInputRef.current?.blur(); }

  const canBack = (activeTab?.historyIndex ?? -1) > 0;
  const canForward = activeTab ? activeTab.historyIndex < activeTab.history.length - 1 : false;

  const btn: React.CSSProperties = { background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", padding: "0 0.35rem", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "2px", height: 26, minWidth: 26, flexShrink: 0, transition: "color 0.1s, background 0.1s" };
  const btnOff: React.CSSProperties = { ...btn, color: "rgba(255,255,255,0.14)", cursor: "not-allowed" };
  const hov = (on: boolean) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { if (on) { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; } },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.target as HTMLButtonElement).style.color = on ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.14)"; (e.target as HTMLButtonElement).style.background = "none"; },
  });

  return (
    <>
      <MagicCursor suppressed={gameModeActive} />
      <GameModeToast visible={gameModeToast} host={hostnameFromTabUrl(activeTab?.url ?? "")} />
      {activeBgEffect && (!activeTab?.url || activeTab.url === "unstable://settings") ? <VantaBackground effect={activeBgEffect} options={vantaOptions} /> : null}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: activeBgEffect ? "transparent" : "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", position: "relative", zIndex: 1, transform: `scale(${settings.uiScale})`, transformOrigin: "top left", width: `${100 / settings.uiScale}vw`, minHeight: `${100 / settings.uiScale}vh` }}
    >
      {!fullscreen && (
        <motion.div initial={{ y: -40 }} animate={{ y: 0 }} transition={{ type: "spring", damping: 20 }}>
          <div style={{ display: "flex", alignItems: "stretch", background: "#080808", borderBottom: "1px solid #1a1a1a", height: 36, flexShrink: 0, overflow: "hidden" }}>
            <div className="tab-scroll" style={{ display: "flex", overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", msOverflowStyle: "none" }}>
              <AnimatePresence>
                {tabs.map(tab => <BrowserTab key={tab.id} tab={tab} isActive={tab.id === activeTabId} onActivate={() => setActiveTabId(tab.id)} onClose={() => handleCloseTab(tab.id)} onRefresh={() => handleRefreshTab(tab.id)} onDuplicate={() => handleDuplicateTab(tab.id)} onCloseRight={() => handleCloseTabsToRight(tab.id)} onCloseOthers={() => handleCloseOtherTabs(tab.id)} />)}
              </AnimatePresence>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleNewTab} style={{ background: "none", border: "none", borderLeft: "1px solid #1a1a1a", color: "rgba(255,255,255,0.28)", cursor: "pointer", padding: "0 0.85rem", fontSize: 18, lineHeight: 1, flexShrink: 0, transition: "color 0.1s" }}
                onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"} onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)"} title="New tab">+</motion.button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", padding: "0.3rem 0.55rem", background: "var(--t-bg)", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleBack} disabled={!canBack} style={canBack ? btn : btnOff} {...hov(canBack)} title="Back">←</motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleForward} disabled={!canForward} style={canForward ? btn : btnOff} {...hov(canForward)} title="Forward">→</motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleReload} style={btn} {...hov(true)} title="Reload">↺</motion.button>
            <div style={{ width: 1, height: 16, background: "#1e1e1e", margin: "0 0.15rem", flexShrink: 0 }} />
            <div style={{ position: "relative", flex: 1, display: "flex" }}>
              <form onSubmit={handleUrlSubmit} style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div ref={urlEngineRef} style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center" }}>
                <button type="button" onClick={() => { setUrlEngineOpen(!urlEngineOpen); setShowSuggestions(false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", height: 26, width: 26, padding: 0, borderRadius: "2px", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                  title={`Search: ${SEARCH_ENGINES[settings.searchEngine]?.name ?? "DuckDuckGo"}`}>
                  <img src={`https://www.google.com/s2/favicons?domain=${new URL(SEARCH_ENGINES[settings.searchEngine]?.url ?? "https://duckduckgo.com").hostname}&sz=32`} alt="" width={16} height={16} style={{ borderRadius: "2px", flexShrink: 0, opacity: 0.6 }} />
                </button>
                <AnimatePresence>
                  {urlEngineOpen && (
                    <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 1000, background: "#111", border: "1px solid #222", borderRadius: "6px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", minWidth: 160 }}>
                      {Object.entries(SEARCH_ENGINES).map(([id, engine]) => (
                        <motion.button key={id} type="button" whileHover={{ background: "#1a1a1a" }} onClick={() => { setSettings({ ...settings, searchEngine: id }); setUrlEngineOpen(false); }}
                          style={{ display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", background: id === settings.searchEngine ? "#1a1a1a" : "transparent", border: "none", color: id === settings.searchEngine ? "#e8e8e8" : "rgba(255,255,255,0.55)", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", padding: "0.45rem 0.7rem", textAlign: "left", letterSpacing: "0.02em" }}>
                          <img src={`https://www.google.com/s2/favicons?domain=${new URL(engine.url).hostname}&sz=32`} alt="" width={14} height={14} style={{ borderRadius: "2px", flexShrink: 0 }} />
                          {engine.name}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
                  style={{ width: "100%", background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#e0e0e0", padding: "0.26rem 0.65rem", fontSize: "0.77rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "12px", letterSpacing: "0.01em", transition: "border-color 0.15s" }}
                />
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
            <button onClick={toggleDevTools} style={btn} {...hov(true)} title="DevTools">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={!!devToolsOpen[activeTabId] ? "#e8e8e8" : "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
            </button>
            <button onClick={handleOpenInNewTab} style={btn} {...hov(true)} title="Open in new window">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </button>
            <button onClick={() => setFullscreen(f => !f)} style={btn} {...hov(true)} title="Fullscreen">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
            </button>
          </div>
        </motion.div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {!fullscreen && (
          <CollapsedSidebar
            activeUrl={activeTab?.url || ""}
            canReturnToBrowse={Boolean(activeTab?.url.startsWith("unstable://") && activeTab.lastProxyUrl)}
            onNavigate={(url) => handleNavigate(url, activeTabId)}
          />
        )}

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {fullscreen && (
            <button onClick={() => setFullscreen(false)} style={{ position: "absolute", top: 12, right: 12, zIndex: 999, background: "rgba(0,0,0,0.6)", border: "1px solid #333", color: "#e8e8e8", cursor: "pointer", padding: "6px 10px", borderRadius: "2px", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>exit fullscreen</button>
          )}
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <AnimatePresence mode="wait">
              {tabs.filter(t => t.id === activeTabId).map(tab => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  style={{ position: "absolute", inset: 0 }}
                >
              {!tab.url ? (
                <NewTabPage onNavigate={u => handleNavigate(u, tab.id)} customShortcuts={customShortcuts} setCustomShortcuts={setCustomShortcuts} wallpaper={THEMES[settings.theme]?.wallpaper ?? settings.wallpaper} vantaActive={!!activeBgEffect} searchEngine={settings.searchEngine} />
              ) : tab.url === "unstable://ai" ? (
                <AIPage user={user} profile={profile} onAuthenticated={onAuthenticated} />
              ) : tab.url === "unstable://chat" ? (
                <ChatPage user={user} profile={profile} session={session} onAuthenticated={onAuthenticated} />
              ) : tab.url === "unstable://settings" ? (
                <SettingsPage settings={settings} onSettingsChange={setSettings} vantaActive={!!activeBgEffect} onLogout={onLogout} />
              ) : tab.url === "unstable://games" ? (
                <GamesPage onNavigate={u => handleNavigate(u, tab.id)} />
              ) : tab.url === "unstable://credits" ? (
                <CreditsPage />
              ) : tab.url === "unstable://tos" ? (
                <ToSPage />
              ) : tab.url === "unstable://privacy" ? (
                <PrivacyPage />
              ) : tab.url === "unstable://blank" ? (
                <div style={{ width: "100%", height: "100%", background: "var(--t-bg)" }} />
              ) : (
                <iframe ref={(el) => { if (el) iframeRefs.current[tab.id] = el; if (tab.id === activeTabId) iframeRef.current = el; }}
                  src={tab.url}
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                  allow="fullscreen *;autoplay *;camera *;microphone *;payment *;clipboard-read *;clipboard-write *;encrypted-media *;gamepad *"
                  onLoad={() => {
                    updateTab(tab.id, { loading: false });
                    const gameMode = isGameModeTabUrl(tab.url, settings);
                    try {
                      const iframe = iframeRefs.current[tab.id];
                      if (!iframe) return;
                      const win = iframe.contentWindow as any;
                      const doc = iframe.contentDocument;
                      if (win && doc) {
                        doc.getElementById("unstable-cursor-style")?.remove();
                        const cursorStyle = doc.createElement("style");
                        cursorStyle.id = "unstable-cursor-style";
                        cursorStyle.textContent = gameMode
                          ? "html, body, * { cursor: auto !important; }"
                          : "html, body, * { cursor: none !important; }";
                        doc.head.appendChild(cursorStyle);

                        if (!gameMode) {
                          win.addEventListener("mousemove", (e: MouseEvent) => {
                            const rect = iframe.getBoundingClientRect();
                            window.dispatchEvent(new CustomEvent("iframe-mousemove", {
                              detail: { clientX: e.clientX, clientY: e.clientY, iframeRect: rect }
                            }));
                          });
                          doc.addEventListener("mousemove", (e: MouseEvent) => {
                            const rect = iframe.getBoundingClientRect();
                            window.dispatchEvent(new CustomEvent("iframe-mousemove", {
                              detail: { clientX: e.clientX, clientY: e.clientY, iframeRect: rect }
                            }));
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
                          window.dispatchEvent(new KeyboardEvent("keydown", {
                            key: e.key, code: e.code, ctrlKey: e.ctrlKey, altKey: e.altKey,
                            shiftKey: e.shiftKey, metaKey: e.metaKey, bubbles: true, cancelable: true,
                          }));
                        });
                      }
                    } catch {
                      // ignore cross-origin errors if any
                    }
                  }}
                  onError={() => {
                    const current = tab.url;
                    if (current.startsWith(SCRAMJET_PREFIX)) {
                      const original = decodeProxyUrl(current);
                      const uvUrl = encodeProxyUrl(original, "uv", settings);
                      if (uvUrl !== current) {
                        updateTab(tab.id, { url: uvUrl, loading: true });
                        return;
                      }
                    } else if (current.startsWith(UV_PREFIX)) {
                      const original = decodeProxyUrl(current);
                      if (original && original.startsWith("http")) {
                        const retryUrl = encodeProxyUrl(original, "uv", settings);
                        if (retryUrl !== current) {
                          updateTab(tab.id, { url: retryUrl, loading: true });
                          return;
                        }
                      }
                      if (scrController) {
                        const scramjetUrl = encodeProxyUrl(original || current, "scramjet", settings);
                        if (scramjetUrl !== current) {
                          updateTab(tab.id, { url: scramjetUrl, loading: true });
                          return;
                        }
                      }
                    }
                    updateTab(tab.id, { loading: false });
                  }}
                />
              )}
            </motion.div>
          ))}
          </AnimatePresence>
          </div>
        </div>
      </div>

      <StatusBar visible={isNewtab} leftOffset={fullscreen ? 12 : 68} transportMode={settings.transportMode} wispServer={settings.wispServer} />

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
                  style={{ background: "#222", color: "#e8e8e8", border: "1px solid #444", padding: "0.4rem 1rem", borderRadius: "4px", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>deny</motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => { pendingPermResolve.current?.(true); setPendingPerm(null); }}
                  style={{ background: "#e8e8e8", color: "#0d0d0d", border: "none", padding: "0.4rem 1rem", borderRadius: "4px", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>allow</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}} input::placeholder{color:rgba(255,255,255,0.18)} .tab-scroll::-webkit-scrollbar{display:none}`}</style>
    </motion.div>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [accountLoading, setAccountLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authContext, setAuthContext] = useState<AppAuthContext>({ isBanned: false, banReason: null });
  const [accountError, setAccountError] = useState("");

  useEffect(() => {
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
        const [nextProfile, nextAuthContext] = await withTimeout(
          Promise.all([
            fetchProfile(nextUser.id),
            fetchAuthContext(nextSession!.access_token),
          ]),
          ACCOUNT_BOOT_TIMEOUT_MS,
          "Account sync",
        );
        if (!mounted) return;

        if (nextAuthContext.isBanned) {
          setProfile(null);
          setAuthContext(nextAuthContext);
          setAccountError(nextAuthContext.banReason ? `This account is banned: ${nextAuthContext.banReason}` : "This account is banned.");
          await supabase.auth.signOut();
          return;
        }

        try {
          await registerCurrentDevice(nextSession!.access_token);
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
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setAuthContext({ isBanned: false, banReason: null });
        setAccountError(err instanceof Error ? `${err.message} Continuing locally.` : "Account sync unavailable. Continuing locally.");
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
  }, []);

  async function logout() {
    await supabase.auth.signOut();
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
      <AnimatePresence mode="wait">
        {accountLoading ? (
          <motion.div key="account-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--t-bg)", color: "rgba(255,255,255,0.55)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.68rem" }}>
            syncing account…
          </motion.div>
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
      </AnimatePresence>
      {accountError && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", color: "rgba(235,120,120,0.9)", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.72rem", letterSpacing: "0.04em", textAlign: "center", maxWidth: 420, padding: "0 1rem" }}>
          {accountError}
        </div>
      )}
    </>
  );
}

