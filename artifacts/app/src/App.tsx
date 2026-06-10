import { useState, useEffect, useRef, useCallback, useMemo, type ComponentType } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useVelocity, useTransform, useAnimation } from "framer-motion";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Gamepad, MessageCircle, Settings, Shield, Atom, House } from "lucide-react";
import VantaBackground from "./components/VantaBackground";
import gamesListData from "./data/games.json";
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
type TransportMode = "auto" | "wisp" | "bare";
type ThemeId = "dark" | "midnight" | "ocean" | "sunset" | "cyberpunk" | "matrix" | "tuff" | "vanta-fog" | "vanta-waves" | "vanta-birds" | "vanta-net" | "vanta-stars" | "vanta-globe" | "vanta-clouds" | "vanta-dots" | "vanta-halo" | "vanta-rings" | "vanta-topology";

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
    label: "Tuff",
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
  "vanta-fog": {
    label: "Vanta Fog",
    backgroundEffect: "fog",
    vantaOptions: {
      highlightColor: 0x606080,
      midtoneColor: 0x303055,
      lowlightColor: 0x151530,
      baseColor: 0x0a0a1a,
    },
    colors: {
      bg: "#0a0a1a", bgSecondary: "#101028", bgTertiary: "#161636", bgHover: "#1c1c42",
      text: "#c8c8e0", textSecondary: "rgba(200,200,224,0.6)", textMuted: "rgba(200,200,224,0.35)",
      border: "#1e1e3a", borderLight: "#2a2a4a",
      accent: "#7799ff", accentHover: "#99bbff", accentText: "#fff",
      inputBg: "#0e0e22", inputBorder: "#2a2a4a", inputText: "#c8c8e0",
      btnBg: "#161636", btnHover: "#1e1e42", btnText: "rgba(200,200,224,0.5)",
      scrollbar: "#1e1e3a", scrollbarThumb: "#3a3a5a",
      tabActive: "#101028", tabInactive: "#08081a", tabBorder: "#1a1a3a",
      cardBg: "#101028", cardBorder: "#2a2a4a",
    },
  },
  "vanta-waves": {
    label: "Vanta Waves",
    backgroundEffect: "waves",
    vantaOptions: {
      color: 0x0055aa,
      shininess: 60,
      waveHeight: 25,
      zoom: 1.2,
    },
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
  "vanta-birds": {
    label: "Vanta Birds",
    backgroundEffect: "birds",
    vantaOptions: {
      color1: 0xff6633,
      color2: 0xff4400,
      colorMode: "variance",
      birdSize: 1.5,
      wingSpan: 30,
      speedLimit: 5,
      separation: 60,
      alignment: 50,
      cohesion: 30,
    },
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
  "vanta-net": {
    label: "Vanta Net",
    backgroundEffect: "net",
    vantaOptions: {
      color: 0xff00ff,
      backgroundColor: 0x0d0a1a,
      points: 12,
      maxDistance: 22,
      spacing: 16,
    },
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
  "vanta-stars": {
    label: "Vanta Stars",
    backgroundEffect: "stars",
    vantaOptions: {
      color: 0xffffff,
      backgroundColor: 0x0a0a0a,
      starSize: 1.8,
      starDensity: 0.8,
    },
    colors: {
      bg: "#0a0a0a", bgSecondary: "#111", bgTertiary: "#161616", bgHover: "#1a1a1a",
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
  "vanta-globe": {
    label: "Vanta Globe",
    backgroundEffect: "globe",
    vantaOptions: {
      color: 0x44aaff,
      backgroundColor: 0x0a0a14,
      size: 1.2,
    },
    colors: {
      bg: "#0a0a14", bgSecondary: "#10101e", bgTertiary: "#161628", bgHover: "#1c1c32",
      text: "#c0d0e0", textSecondary: "rgba(192,208,224,0.6)", textMuted: "rgba(192,208,224,0.35)",
      border: "#1a1a2e", borderLight: "#262642",
      accent: "#44aaff", accentHover: "#66ccff", accentText: "#fff",
      inputBg: "#0e0e1c", inputBorder: "#262642", inputText: "#c0d0e0",
      btnBg: "#161628", btnHover: "#1e1e36", btnText: "rgba(192,208,224,0.5)",
      scrollbar: "#1a1a2e", scrollbarThumb: "#2e2e4e",
      tabActive: "#10101e", tabInactive: "#080810", tabBorder: "#1a1a2e",
      cardBg: "#10101e", cardBorder: "#262642",
    },
  },
  "vanta-clouds": {
    label: "Vanta Clouds",
    backgroundEffect: "clouds",
    vantaOptions: {
      color: 0x5588aa,
      backgroundColor: 0x0a1520,
      skyColor: 0x0a1520,
      cloudColor: 0x5588aa,
      cloudShadowColor: 0x2a4a6a,
      sunColor: 0xff8844,
      sunGlareColor: 0xff6633,
      sunlightColor: 0xff8844,
    },
    colors: {
      bg: "#0a1520", bgSecondary: "#0e1e2c", bgTertiary: "#122535", bgHover: "#16303f",
      text: "#b0d0e0", textSecondary: "rgba(176,208,224,0.6)", textMuted: "rgba(176,208,224,0.35)",
      border: "#1a3040", borderLight: "#243e50",
      accent: "#5588aa", accentHover: "#77aacc", accentText: "#fff",
      inputBg: "#0c1a26", inputBorder: "#243e50", inputText: "#b0d0e0",
      btnBg: "#122535", btnHover: "#1a3545", btnText: "rgba(176,208,224,0.5)",
      scrollbar: "#1a3040", scrollbarThumb: "#2a5060",
      tabActive: "#0e1e2c", tabInactive: "#081018", tabBorder: "#1a3040",
      cardBg: "#0e1e2c", cardBorder: "#243e50",
    },
  },
  "vanta-dots": {
    label: "Vanta Dots",
    backgroundEffect: "dots",
    vantaOptions: {
      color: 0x00ff41,
      backgroundColor: 0x0a0f0a,
      size: 3,
      spacing: 25,
      showLines: true,
    },
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
  "vanta-halo": {
    label: "Vanta Halo",
    backgroundEffect: "halo",
    vantaOptions: {
      baseColor: 0x1a0a2e,
      color: 0x8833ff,
      amplitudeFactor: 1.5,
      ringFactor: 2,
      yOffset: 0.3,
      size: 1.5,
    },
    colors: {
      bg: "#0d0a1a", bgSecondary: "#15102a", bgTertiary: "#1c1536", bgHover: "#241a42",
      text: "#d0b0e8", textSecondary: "rgba(208,176,232,0.6)", textMuted: "rgba(208,176,232,0.35)",
      border: "#2a1e44", borderLight: "#3a2858",
      accent: "#8833ff", accentHover: "#aa55ff", accentText: "#fff",
      inputBg: "#120e22", inputBorder: "#2a1e44", inputText: "#d0b0e8",
      btnBg: "#1c1536", btnHover: "#2a1e44", btnText: "rgba(208,176,232,0.5)",
      scrollbar: "#2a1e44", scrollbarThumb: "#4a2e6e",
      tabActive: "#15102a", tabInactive: "#0a0816", tabBorder: "#2a1e44",
      cardBg: "#15102a", cardBorder: "#2a1e44",
    },
  },
  "vanta-rings": {
    label: "Vanta Rings",
    backgroundEffect: "rings",
    vantaOptions: {
      color: 0xff4488,
      backgroundColor: 0x0a0a12,
      ringSize: 1.4,
    },
    colors: {
      bg: "#0a0a12", bgSecondary: "#111118", bgTertiary: "#16161e", bgHover: "#1c1c26",
      text: "#e0c0c8", textSecondary: "rgba(224,192,200,0.6)", textMuted: "rgba(224,192,200,0.35)",
      border: "#1e1e28", borderLight: "#2a2a36",
      accent: "#ff4488", accentHover: "#ff66aa", accentText: "#fff",
      inputBg: "#0e0e16", inputBorder: "#2a2a36", inputText: "#e0c0c8",
      btnBg: "#16161e", btnHover: "#1e1e28", btnText: "rgba(224,192,200,0.5)",
      scrollbar: "#1e1e28", scrollbarThumb: "#36364a",
      tabActive: "#111118", tabInactive: "#08080e", tabBorder: "#1a1a22",
      cardBg: "#111118", cardBorder: "#2a2a36",
    },
  },
  "vanta-topology": {
    label: "Vanta Topology",
    backgroundEffect: "topology",
    vantaOptions: {
      color: 0x2266aa,
      backgroundColor: 0x0a0e14,
    },
    colors: {
      bg: "#0a0e14", bgSecondary: "#0e141e", bgTertiary: "#121a28", bgHover: "#162032",
      text: "#b0c8d8", textSecondary: "rgba(176,200,216,0.6)", textMuted: "rgba(176,200,216,0.35)",
      border: "#1a2430", borderLight: "#24303e",
      accent: "#3388cc", accentHover: "#55aaee", accentText: "#fff",
      inputBg: "#0c121c", inputBorder: "#24303e", inputText: "#b0c8d8",
      btnBg: "#121a28", btnHover: "#1a2430", btnText: "rgba(176,200,216,0.5)",
      scrollbar: "#1a2430", scrollbarThumb: "#2a3a4a",
      tabActive: "#0e141e", tabInactive: "#080a10", tabBorder: "#1a2430",
      cardBg: "#0e141e", cardBorder: "#24303e",
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
  backgroundEffect: string;
  gameModeEnabled: boolean;
  gameModeSites: string[];
  panicUrl: string;
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
  isAdmin: boolean;
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

interface AdminUserSummary {
  id: string;
  username: string;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string | null;
  bannedUntil: string | null;
  deviceCount: number;
}

interface AdminOverview {
  warnings?: string[];
  users: AdminUserSummary[];
  messages: ChatMessageRecord[];
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

  const data = await readJson<{ isAdmin?: boolean; isBanned?: boolean; banReason?: string | null; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error || "Unable to load account access information.");
  }

  return {
    isAdmin: Boolean(data?.isAdmin),
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

async function fetchAdminOverview(accessToken: string): Promise<AdminOverview> {
  const res = await fetch("/api/admin/overview", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await readJson<AdminOverview & { error?: string }>(res);
  if (!res.ok || !data) {
    throw new Error(data?.error || "Unable to load admin overview.");
  }

  return {
    warnings: data.warnings ?? [],
    users: data.users ?? [],
    messages: data.messages ?? [],
  };
}

async function deleteAdminMessage(accessToken: string, messageId: string) {
  const res = await fetch(`/api/admin/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await readJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error || "Unable to delete message.");
  }
}

async function banAdminUser(accessToken: string, userId: string, reason: string) {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ reason }),
  });

  const data = await readJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error || "Unable to ban user.");
  }
}

async function unbanAdminUser(accessToken: string, userId: string) {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/unban`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await readJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error || "Unable to unban user.");
  }
}

async function deleteAdminUser(accessToken: string, userId: string) {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await readJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error || "Unable to delete user.");
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

function encodeProxyUrl(url: string, engine: ProxyEngine = "auto"): string {
  const useScramjet = (engine === "auto" || engine === "scramjet") && scrController !== null;
  if (useScramjet) {
    try { return scrController!.encodeUrl(url); } catch { /* fall through */ }
  }
  if (window.Ultraviolet && window.__uv$config) return UV_PREFIX + window.__uv$config.encodeUrl(url);
  return UV_PREFIX + encodeURIComponent(url);
}

function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (t.startsWith("unstable://")) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.includes(".") && !t.includes(" ")) return "https://" + t;
  return "https://duckduckgo.com/?q=" + encodeURIComponent(t);
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
  transport: "none" | "libcurl" | "bare";  // libcurl = wisp (primary), bare = fallback
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

async function setupProxy(bareNum = 1, transportMode: TransportMode = "auto"): Promise<void> {
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
        codec: makeCodec(),
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
    const wispUrl = `${location.protocol === "http:" ? "ws:" : "wss:"}//${location.host}/api/wisp/`;

    let transportSet = false;
    const mode = transportMode || "auto";

    if (mode === "bare") {
      try {
        await bareConn.setTransport(origin + "/api/baremod/index.mjs", [origin + barePathForNum(bareNum)]);
        transportSet = true;
        emitStatus({ phase: "ready", transport: "bare", bare: bareNum });
      } catch { /* fall through */ }
    } else if (mode === "wisp") {
      try {
        await bareConn.setTransport("/libcurl/index.mjs", [{ wisp: wispUrl }]);
        transportSet = true;
        emitStatus({ phase: "ready", transport: "libcurl", bare: bareNum });
      } catch { /* fall through */ }
    } else {
      // auto: try wisp first (faster via WebSocket), fallback to bare HTTP
      try {
        await bareConn.setTransport("/libcurl/index.mjs", [{ wisp: wispUrl }]);
        transportSet = true;
        emitStatus({ phase: "ready", transport: "libcurl", bare: bareNum });
      } catch { /* fall through */ }
      if (!transportSet) {
        try {
          await bareConn.setTransport(origin + "/api/baremod/index.mjs", [origin + barePathForNum(bareNum)]);
          transportSet = true;
          emitStatus({ phase: "ready", transport: "bare", bare: bareNum });
        } catch { /* fall through */ }
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

async function switchBare(n: number, transportMode: TransportMode = "auto"): Promise<void> {
  emitStatus({ switching: true, bare: n });
  try {
    const { BareMuxConnection } = await import("bare-mux-fork");
    if (!bareConn) bareConn = new BareMuxConnection("/baremux/worker.js");
    const wispUrl = `${location.protocol === "http:" ? "ws:" : "wss:"}//${location.host}/api/wisp/`;
    const mode = transportMode || "auto";
    const tryBare = async () => {
      await bareConn.setTransport(location.origin + "/api/baremod/index.mjs", [location.origin + barePathForNum(n)]);
      emitStatus({ switching: false, transport: "bare", bare: n });
    };
    const tryWisp = async () => {
      await bareConn.setTransport("/libcurl/index.mjs", [{ wisp: wispUrl }]);
      emitStatus({ switching: false, transport: "libcurl", bare: n });
    };
    if (mode === "bare") {
      await tryBare();
    } else if (mode === "wisp") {
      await tryWisp();
    } else {
      try { await tryWisp(); } catch { await tryBare(); }
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
        ? ":root, body, body * { cursor: auto !important; }"
        : ":root, body, body * { cursor: none !important; }";
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
        <motion.div
          animate={{
            scale: isHovering ? 1.2 : 1,
            opacity: isHovering ? 0.8 : 0.4,
          }}
          transition={{ duration: 0.2 }}
          style={{
            position: "absolute",
            width: "120px",
            height: "120px",
            background: "radial-gradient(circle, rgba(100,150,255,0.4) 0%, rgba(150,100,255,0.2) 40%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(10px)",
          }}
        />

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

function StatusBar({ visible, leftOffset = 12, transportMode = "auto" }: { visible: boolean; leftOffset?: number; transportMode?: TransportMode }) {
  const s = useProxyStatus();
  if (!visible) return null;

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
    <div style={{ position: "fixed", bottom: 10, left: leftOffset, zIndex: 9999, display: "flex", alignItems: "center", gap: "0.55rem", fontFamily: "'Space Grotesk', sans-serif", pointerEvents: "none" }}>
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
              <button key={n} onClick={() => switchBare(n, transportMode)} title={`Switch to bare server ${n}`} style={{
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
    </div>
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

        <div style={{ display: "flex", gap: "0.45rem", width: "100%" }}>
          {(["signin", "signup"] as const).map((currentMode) => {
            const active = mode === currentMode;
            return (
              <button
                key={currentMode}
                onClick={() => { setMode(currentMode); setError(""); setNotice(""); }}
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
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            value={username}
            autoFocus
            onChange={e => { setUsername(e.target.value); setError(""); setNotice(""); }}
            placeholder="username"
            style={inputStyle}
          />
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); setNotice(""); }}
            placeholder="password"
            style={inputStyle}
          />

          {error && <p style={{ color: "#b94a4a", fontSize: "0.68rem", letterSpacing: "0.04em", margin: 0, textAlign: "center" }}>{error}</p>}
          {notice && <p style={{ color: "rgba(200,200,200,0.7)", fontSize: "0.68rem", letterSpacing: "0.04em", margin: 0, textAlign: "center", lineHeight: 1.5 }}>{notice}</p>}
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
    ["wisp-js", "wisp server"], ["React + Vite", "frontend"],
    ["Space Grotesk", "typeface"],
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
      style={{ height: "100%", overflowY: "auto", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif", padding: "2.5rem 2rem", maxWidth: 560, margin: "0 auto" }}
    >
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginTop: 0, marginBottom: "2rem" }}>unstable — terms of service</p>
      {[
        ["Use at your own risk", "Unstable is provided as-is, with no guarantees of uptime, security, reliability, or fitness for any particular purpose. You accept all responsibility for how you use this tool."],
        ["Acceptable use", "You agree not to use Unstable to access, distribute, or transmit content that is illegal in your jurisdiction. Circumventing network restrictions may violate your school, employer, or ISP policies, and you are solely responsible for compliance."],
        ["Public codebase", "Parts of this project may be published in a public repository. Public client code, build output, and documentation should be treated as inspectable by anyone. Do not assume any client-side value, request, or browser-stored setting is secret."],
        ["Accounts and AI", "This app uses Supabase for account authentication, synced AI history, and chat. AI requests are proxied through a server-side route, and the server-side AI provider key must never be committed to a public repository."],
        ["Third-party content", "Unstable acts as a transparent proxy and also depends on third-party services, including Supabase and external AI providers. The operators of this service are not responsible for the availability, content, or behavior of third-party systems."],
        ["Changes", "These terms may be updated at any time without prior notice. Continued use of the service constitutes acceptance of the updated terms."],
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
      style={{ height: "100%", overflowY: "auto", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif", padding: "2.5rem 2rem", maxWidth: 560, margin: "0 auto" }}
    >
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginTop: 0, marginBottom: "2rem" }}>unstable — privacy policy</p>
      {[
        ["What we collect", "This app stores account records, usernames, AI conversation history, and chat messages in Supabase. The browser also stores local UI preferences such as shortcuts, settings, lightweight reaction state, and temporary remembered access/account sessions."],
        ["Access and account auth", "The access password should be verified server-side only. Account authentication is handled by Supabase Auth. Passwords are not stored directly in this repository or in client-side code and should never be committed to a public repository."],
        ["AI data", "Messages you send to the AI page are stored in Supabase as conversation history and are also forwarded to the configured AI provider through a server-side route in order to generate responses."],
        ["Chat data", "Messages sent in unstable://chat are stored in Supabase and delivered across devices using Supabase Realtime. Local emoji reactions may be stored in your browser even when they are not yet synced server-side."],
        ["Public repo safety", "The Supabase anon key is designed to be public client configuration, but server secrets such as the AI provider key and server-side access password must remain outside the public repository. Client-side code, requests, and browser storage should be treated as inspectable."],
        ["Third parties and retention", "Supabase and any configured AI provider process the data needed to provide accounts, sync, chat, and AI responses. Retention, backups, and operational logging may depend on those services and your deployment configuration."],
        ["Changes", "This policy may be updated at any time. The current version is always available at unstable://privacy."],
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
    </motion.div>
  );
}

// ─── Settings page ────────────────────────────────────────────────────────────

function SettingsPage({ settings, onSettingsChange }: { settings: Settings; onSettingsChange: (s: Settings) => void }) {
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
    padding: "0.3rem 0.65rem", letterSpacing: "0.04em",
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ height: "100%", overflowY: "auto", background: "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif", padding: "2.5rem 2rem", maxWidth: 560, margin: "0 auto" }}
    >
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--t-text-muted)", marginTop: 0, marginBottom: "2.5rem" }}>unstable — settings</p>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>theme</p>
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
                onClick={() => onSettingsChange({ ...settings, theme: id })}
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
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.85rem", marginTop: 0 }}>wallpaper</p>
        <p style={{ fontSize: "0.68rem", color: "var(--t-text-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Set a background image behind all UI panels. Leave empty for none.
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
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>background effect</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          An animated Three.js background behind the UI. Pick an effect, or leave empty to use the theme default.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {(["", "fog", "waves", "birds", "net", "stars", "globe", "clouds", "dots", "halo", "rings", "topology"] as const).map(effect => {
            const themeEffect = THEMES[settings.theme]?.backgroundEffect ?? "";
            const active = (settings.backgroundEffect || themeEffect) === effect;
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
              >{effect || "theme default"}</motion.button>
            );
          })}
        </div>
      </motion.section>

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
          {(["auto", "wisp", "bare"] as TransportMode[]).map(id => {
            const labels: Record<TransportMode, string> = { auto: "Auto", wisp: "Wisp", bare: "Bare" };
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

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>game mode</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          On matching sites, restores the normal cursor, hides the custom cursor, and uses faster proxy settings (Scramjet + Bare).
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.85rem", cursor: "pointer", fontSize: "0.72rem", color: "rgba(255,255,255,0.55)" }}>
          <input
            type="checkbox"
            checked={settings.gameModeEnabled}
            onChange={e => onSettingsChange({ ...settings, gameModeEnabled: e.target.checked })}
          />
          enable game mode
        </label>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", margin: "0 0 0.45rem" }}>sites (one hostname per line)</p>
        <textarea
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
        <input
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

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>keyboard shortcuts</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {Object.keys(SHORTCUT_LABELS).map(key => {
            const isRec = recording === key;
            const val = settings.shortcuts[key as keyof KeyShortcuts] ?? "";
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0", borderBottom: "1px solid #111" }}>
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
              </div>
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

      <p style={{ marginTop: "2rem", fontSize: "0.58rem", color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em" }}>type unstable://settings in the url bar</p>
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
    {
      id: aiMessageId(),
      role: "assistant",
      content: "Ready when you are. Ask for quick answers, rewrites, brainstorming, or code help.",
    },
  ], []);

  const suggestions = useMemo(() => [
    "Write a clean apology email for a late assignment.",
    "Summarize the differences between UV and Scramjet here.",
    "Brainstorm a stealthy tab-cloak landing page concept.",
    "Explain a TypeScript error in plain English.",
  ], []);

  const [messages, setMessages] = useState<AIMessage[]>(starterMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<AIMode>("fast");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    let cancelled = false;

    async function loadConversation() {
      setBooting(true);
      setError("");

      if (localStorage.getItem("unstable_ai_cleared") === "true") {
        if (!cancelled) {
          setConversationId(null);
          setMessages(starterMessages);
          setBooting(false);
        }
        return;
      }

      try {
        const { data: conversations, error: convoError } = await supabase
          .from("ai_conversations")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (convoError) throw convoError;
        const latest = (conversations?.[0] ?? null) as AIConversationRecord | null;

        if (!latest) {
          if (!cancelled) {
            setConversationId(null);
            setMessages(starterMessages);
          }
          return;
        }

        const { data: storedMessages, error: messageError } = await supabase
          .from("ai_messages")
          .select("id, role, content")
          .eq("conversation_id", latest.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (messageError) throw messageError;
        if (cancelled) return;

        setConversationId(latest.id);
        if (storedMessages && storedMessages.length > 0) {
          setMessages(
            storedMessages.map((message) => ({
              id: message.id,
              role: message.role as "user" | "assistant",
              content: message.content,
            })),
          );
        } else {
          setMessages(starterMessages);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load AI history.");
          setMessages(starterMessages);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    loadConversation();
    return () => {
      cancelled = true;
    };
  }, [starterMessages, user.id]);

  async function submitPrompt(rawPrompt?: string) {
    const prompt = (rawPrompt ?? input).trim();
    if (!prompt || loading || booting) return;

    const userMessage: AIMessage = { id: aiMessageId(), role: "user", content: prompt };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const { data: conversation, error: conversationError } = await supabase
          .from("ai_conversations")
          .insert({
            user_id: user.id,
            title: buildConversationTitle(prompt),
          })
          .select("id")
          .single();

        if (conversationError) throw conversationError;
        activeConversationId = conversation.id;
        setConversationId(activeConversationId);
        localStorage.removeItem("unstable_ai_cleared");
      }

      const { error: userInsertError } = await supabase.from("ai_messages").insert({
        conversation_id: activeConversationId,
        user_id: user.id,
        role: "user",
        content: prompt,
      });
      if (userInsertError) throw userInsertError;

      const content = await sendAiChat(nextMessages, mode);
      const assistantMessage = { id: aiMessageId(), role: "assistant" as const, content };
      setMessages(prev => [...prev, assistantMessage]);

      const { error: assistantInsertError } = await supabase.from("ai_messages").insert({
        conversation_id: activeConversationId,
        user_id: user.id,
        role: "assistant",
        content,
      });
      if (assistantInsertError) throw assistantInsertError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to get a response right now.");
    } finally {
      setLoading(false);
    }
  }

  const modeMeta: Record<AIMode, { label: string; hint: string }> = {
    fast: { label: "llama-3.1-8b-instant", hint: "lowest latency" },
    think: { label: "openai/gpt-oss-20b", hint: "more reasoning, slower replies" },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top left, rgba(120,170,255,0.14), transparent 28%), radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 22%), #0d0d0d",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{ height: "100%", maxWidth: 1120, margin: "0 auto", padding: "1.4rem", display: "grid", gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)", gap: "1rem" }}>
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(15,15,15,0.96), rgba(9,9,9,0.96))",
            borderRadius: "18px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          }}
        >
          <div>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: 0 }}>unstable — ai</p>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "0.9rem" }}>
            <p style={{ margin: "0 0 0.55rem", fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>Mode</p>
            <div style={{ display: "flex", gap: "0.45rem" }}>
              {(["fast", "think"] as AIMode[]).map((currentMode) => {
                const active = mode === currentMode;
                return (
                  <button
                    key={currentMode}
                    onClick={() => setMode(currentMode)}
                    style={{
                      flex: 1,
                      background: active ? "#e8e8e8" : "#111",
                      color: active ? "#0d0d0d" : "rgba(255,255,255,0.52)",
                      border: `1px solid ${active ? "#e8e8e8" : "#222"}`,
                      padding: "0.65rem 0.8rem",
                      fontSize: "0.64rem",
                      fontFamily: "'Space Grotesk', sans-serif",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      borderRadius: "10px",
                    }}
                  >
                    {currentMode}
                  </button>
                );
              })}
            </div>
            <p style={{ margin: "0.65rem 0 0", fontSize: "0.67rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.55 }}>
              {modeMeta[mode].label} · {modeMeta[mode].hint}
            </p>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "0.9rem" }}>
            <p style={{ margin: "0 0 0.55rem", fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>Quick starts</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => submitPrompt(suggestion)}
                  style={{
                    textAlign: "left",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.74)",
                    borderRadius: "12px",
                    padding: "0.7rem 0.75rem",
                    fontSize: "0.7rem",
                    lineHeight: 1.45,
                    cursor: "pointer",
                    transition: "border-color 0.15s, transform 0.15s, background 0.15s",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                  onMouseEnter={e => {
                    const target = e.currentTarget;
                    target.style.borderColor = "rgba(120,170,255,0.32)";
                    target.style.background = "rgba(120,170,255,0.08)";
                    target.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    const target = e.currentTarget;
                    target.style.borderColor = "rgba(255,255,255,0.07)";
                    target.style.background = "rgba(255,255,255,0.02)";
                    target.style.transform = "translateY(0)";
                  }}
                >{suggestion}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.9rem" }}>
            <p style={{ margin: "0 0 0.25rem", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)" }}>Signed in as</p>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.55)" }}>{profile.username}</p>
            <p style={{ margin: "0 0 0.25rem", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)" }}>Active model</p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)" }}>{modeMeta[mode].label}</p>
          </div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(7,7,7,0.98))",
            borderRadius: "22px",
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#eceff4", fontWeight: 500 }}>AI console</p>
              <p style={{ margin: "0.22rem 0 0", fontSize: "0.65rem", color: "rgba(255,255,255,0.34)", letterSpacing: "0.08em", textTransform: "uppercase" }}>type unstable://ai in the url bar</p>
            </div>
            <button
              onClick={async () => {
                if (conversationId) {
                  try {
                    const { error: msgErr } = await supabase.from("ai_messages").delete().eq("conversation_id", conversationId).eq("user_id", user.id);
                    if (msgErr) console.error("AI messages delete error:", msgErr);
                    const { error: convoErr } = await supabase.from("ai_conversations").delete().eq("id", conversationId).eq("user_id", user.id);
                    if (convoErr) console.error("AI conversation delete error:", convoErr);
                  } catch (e) {
                    console.error("AI reset error:", e);
                  }
                }
                localStorage.setItem("unstable_ai_cleared", "true");
                setMessages(starterMessages);
                setConversationId(null);
                setError("");
              }}
              style={{
                background: "none",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.45)",
                borderRadius: "999px",
                padding: "0.45rem 0.8rem",
                fontSize: "0.62rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >reset</button>
          </div>

          <div ref={scrollerRef} style={{ flex: 1, overflowY: "auto", padding: "1.2rem 1.2rem 1rem", display: "flex", flexDirection: "column", gap: "0.95rem", background: "linear-gradient(180deg, rgba(255,255,255,0.01), transparent 12%)" }}>
            {booting ? (
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.74rem", padding: "0.4rem 0.2rem" }}>loading synced history…</div>
            ) : messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                style={{
                  display: "flex",
                  justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div style={{ display: "flex", flexDirection: message.role === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: "0.7rem", width: "min(100%, 820px)" }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "0.56rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    {message.role === "user" ? "you" : "ai"}
                  </div>
                  <div
                    style={{
                      maxWidth: "min(100%, 680px)",
                      borderRadius: message.role === "user" ? "22px 22px 8px 22px" : "22px 22px 22px 8px",
                      background: "linear-gradient(180deg, rgba(25,25,25,0.98), rgba(18,18,18,0.98))",
                      border: "1px solid rgba(255,255,255,0.07)",
                      padding: "0.9rem 1rem",
                      boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
                    }}
                  >
                    <p style={{ margin: "0 0 0.36rem", fontSize: "0.56rem", letterSpacing: "0.16em", textTransform: "uppercase", color: message.role === "user" ? "rgba(255,255,255,0.84)" : "rgba(255,255,255,0.3)" }}>
                      {message.role === "user" ? "you" : "unstable ai"}
                    </p>
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.84)", fontSize: "0.79rem", lineHeight: 1.72, whiteSpace: "pre-wrap" }}>
                      {message.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.7rem", width: "min(100%, 820px)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>ai</div>
                  <div style={{ borderRadius: "22px 22px 22px 8px", background: "linear-gradient(180deg, rgba(25,25,25,0.98), rgba(18,18,18,0.98))", border: "1px solid rgba(255,255,255,0.07)", padding: "0.9rem 1rem", boxShadow: "0 10px 26px rgba(0,0,0,0.18)" }}>
                    <p style={{ margin: "0 0 0.36rem", fontSize: "0.56rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>unstable ai</p>
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", minHeight: 20 }}>
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: dot * 0.12 }}
                          style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.6)", display: "block" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.1rem 1.1rem", background: "linear-gradient(180deg, rgba(11,11,11,0.96), rgba(8,8,8,0.98))" }}>
            {error && (
              <p style={{ margin: "0 0 0.7rem", color: "rgba(235,120,120,0.9)", fontSize: "0.68rem", letterSpacing: "0.04em" }}>
                {error}
              </p>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); submitPrompt(); }}
              style={{
                display: "flex",
                gap: "0.8rem",
                alignItems: "flex-end",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "18px",
                padding: "0.8rem",
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitPrompt();
                  }
                }}
                placeholder="Ask anything..."
                rows={1}
                style={{
                  flex: 1,
                  resize: "none",
                  background: "transparent",
                  border: "none",
                  color: "#eef2f7",
                  fontSize: "0.78rem",
                  lineHeight: 1.6,
                  outline: "none",
                  fontFamily: "'Space Grotesk', sans-serif",
                  minHeight: 24,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              />
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.03 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  alignSelf: "stretch",
                  minWidth: 104,
                  background: loading || !input.trim() ? "#1b1b1b" : "#e8ecf8",
                  color: loading || !input.trim() ? "rgba(255,255,255,0.25)" : "#0d0d0d",
                  border: "none",
                  borderRadius: "999px",
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "0.68rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  padding: "0 1rem",
                }}
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

function AdminPage({
  session,
  currentUser,
  isAdmin,
}: {
  session: Session;
  currentUser: User;
  isAdmin: boolean;
}) {
  const [overview, setOverview] = useState<AdminOverview>({ users: [], messages: [] });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  const accessToken = session.access_token;

  const loadOverview = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const next = await fetchAdminOverview(accessToken);
      setOverview(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load admin data.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAdmin]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleDeleteMessage(messageId: string) {
    if (!window.confirm("Delete this message for everyone?")) return;
    setWorking(`message:${messageId}`);
    setError("");
    try {
      await deleteAdminMessage(accessToken, messageId);
      setOverview((prev) => ({
        ...prev,
        messages: prev.messages.filter((message) => message.id !== messageId),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete message.");
    } finally {
      setWorking(null);
    }
  }

  async function handleBanToggle(user: AdminUserSummary) {
    const actionKey = `user:${user.id}:${user.isBanned ? "unban" : "ban"}`;
    setWorking(actionKey);
    setError("");
    try {
      if (user.isBanned) {
        await unbanAdminUser(accessToken, user.id);
      } else {
        const reason = window.prompt(`Ban ${user.username}. Optional reason:`) ?? "";
        await banAdminUser(accessToken, user.id, reason);
      }
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update that user.");
    } finally {
      setWorking(null);
    }
  }

  async function handleDeleteUser(user: AdminUserSummary) {
    if (user.id === currentUser.id) {
      setError("You cannot delete the account you are currently using.");
      return;
    }
    if (!window.confirm(`Delete ${user.username} permanently?`)) return;
    setWorking(`delete-user:${user.id}`);
    setError("");
    try {
      await deleteAdminUser(accessToken, user.id);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete that user.");
    } finally {
      setWorking(null);
    }
  }

  if (!isAdmin) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--t-bg)", color: "#e8e8e8", fontFamily: "'Space Grotesk', sans-serif" }}>
        <div style={{ maxWidth: 480, padding: "2rem", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "0.64rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)" }}>unstable admin</p>
          <p style={{ margin: "0.9rem 0 0", fontSize: "1.2rem" }}>Admin role required.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        height: "100%",
        overflow: "auto",
        background:
          "radial-gradient(circle at top left, rgba(255,120,120,0.1), transparent 24%), radial-gradient(circle at bottom right, rgba(255,255,255,0.05), transparent 22%), var(--t-bg)",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "1.4rem", display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)", gap: "1rem" }}>
        <aside style={{ border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(18,12,12,0.96), rgba(10,8,8,0.98))", borderRadius: "22px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.8rem", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.62rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)" }}>unstable admin</p>
            <p style={{ margin: "0.6rem 0 0.35rem", color: "#f5f5f5", fontSize: "1.4rem", lineHeight: 1.05 }}>Moderation controls for real admin accounts.</p>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", lineHeight: 1.6 }}>
              Bans are stored in Supabase. Device bans are best-effort and follow the browser installation id saved on the device.
            </p>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.8rem", display: "grid", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#eef2f7", fontSize: "0.78rem" }}>
              <span>Users</span>
              <span>{overview.users.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#eef2f7", fontSize: "0.78rem" }}>
              <span>Banned</span>
              <span>{overview.users.filter((user) => user.isBanned).length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#eef2f7", fontSize: "0.78rem" }}>
              <span>Recent messages</span>
              <span>{overview.messages.length}</span>
            </div>
          </div>
          <button
            onClick={() => void loadOverview()}
            disabled={loading}
            style={{ marginTop: "auto", background: loading ? "#231919" : "#f0e7e7", color: loading ? "rgba(255,255,255,0.35)" : "#140e0e", border: "none", borderRadius: "999px", padding: "0.8rem 1rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}
          >
            {loading ? "loading…" : "refresh admin data"}
          </button>
          {error && <p style={{ margin: 0, color: "rgba(235,120,120,0.92)", fontSize: "0.7rem", lineHeight: 1.5 }}>{error}</p>}
          {!error && (overview.warnings?.length ?? 0) > 0 && (
            <div style={{ display: "grid", gap: "0.45rem" }}>
              {overview.warnings!.map((warning) => (
                <p key={warning} style={{ margin: 0, color: "rgba(255,210,140,0.92)", fontSize: "0.7rem", lineHeight: 1.5 }}>{warning}</p>
              ))}
            </div>
          )}
        </aside>

        <section style={{ minWidth: 0, display: "grid", gap: "1rem" }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(15,15,15,0.96), rgba(8,8,8,0.98))", borderRadius: "22px", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
            <div style={{ padding: "1rem 1.1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ margin: 0, color: "#eceff4", fontSize: "0.92rem", fontWeight: 500 }}>Users</p>
              <p style={{ margin: "0.22rem 0 0", fontSize: "0.65rem", color: "rgba(255,255,255,0.34)", letterSpacing: "0.08em", textTransform: "uppercase" }}>type unstable://admin in the url bar</p>
            </div>
            <div style={{ display: "grid", gap: "0.7rem", padding: "1rem" }}>
              {overview.users.map((user) => (
                <div key={user.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "0.8rem", alignItems: "center", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "0.85rem 0.95rem", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <p style={{ margin: 0, color: "#f4f6fb", fontSize: "0.84rem" }}>{user.username}</p>
                      {user.isAdmin && <span style={{ padding: "0.18rem 0.45rem", borderRadius: "999px", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>admin</span>}
                      {user.isBanned && <span style={{ padding: "0.18rem 0.45rem", borderRadius: "999px", background: "rgba(200,70,70,0.16)", color: "#ffb3b3", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>banned</span>}
                    </div>
                    <p style={{ margin: "0.28rem 0 0", color: "rgba(255,255,255,0.42)", fontSize: "0.67rem", lineHeight: 1.6 }}>
                      {user.id === currentUser.id ? "Current account" : `Devices seen: ${user.deviceCount}`}
                      {user.banReason ? ` • ${user.banReason}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => void handleBanToggle(user)}
                      disabled={working === `user:${user.id}:${user.isBanned ? "unban" : "ban"}` || user.id === currentUser.id}
                      style={{ background: user.isBanned ? "rgba(255,255,255,0.08)" : "rgba(200,70,70,0.14)", color: user.isBanned ? "#f2f2f2" : "#ffb4b4", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "0.5rem 0.8rem", cursor: user.id === currentUser.id ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" }}
                    >
                      {user.isBanned ? "unban" : "ban"}
                    </button>
                    <button
                      onClick={() => void handleDeleteUser(user)}
                      disabled={working === `delete-user:${user.id}` || user.id === currentUser.id}
                      style={{ background: "transparent", color: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "0.5rem 0.8rem", cursor: user.id === currentUser.id ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" }}
                    >
                      delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(7,7,7,0.98))", borderRadius: "22px", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
            <div style={{ padding: "1rem 1.1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ margin: 0, color: "#eceff4", fontSize: "0.92rem", fontWeight: 500 }}>Recent chat messages</p>
            </div>
            <div style={{ display: "grid", gap: "0.7rem", padding: "1rem" }}>
              {overview.messages.map((message) => {
                const parsed = parseChatMessageContent(message.content);
                return (
                  <div key={message.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "0.8rem", alignItems: "start", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "0.85rem 0.95rem", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: "#f4f6fb", fontSize: "0.8rem" }}>{message.username}</p>
                      <p style={{ margin: "0.3rem 0 0", color: "rgba(255,255,255,0.72)", fontSize: "0.72rem", lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{parsed.body}</p>
                    </div>
                    <button
                      onClick={() => void handleDeleteMessage(message.id)}
                      disabled={working === `message:${message.id}`}
                      style={{ background: "rgba(200,70,70,0.14)", color: "#ffb4b4", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "0.5rem 0.8rem", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" }}
                    >
                      delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function ChatPage({ user, profile, session, isAdmin, onAuthenticated }: { user: User | null; profile: Profile | null; session: Session | null; isAdmin: boolean; onAuthenticated: (payload: { session: Session; user: User; profile: Profile; authContext: AppAuthContext }) => void }) {
  if (!user || !profile || !session) {
    return <InlineAuthScreen onAuthenticated={onAuthenticated} feature="Chat" />;
  }

  return <ChatPageInner user={user} profile={profile} session={session} isAdmin={isAdmin} />;
}

function ChatPageInner({ user, profile, session, isAdmin }: { user: User; profile: Profile; session: Session; isAdmin: boolean }) {
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

  async function adminDeleteMessage(messageId: string) {
    if (!isAdmin) return;
    if (!window.confirm("Delete this message for everyone?")) return;
    setError("");
    try {
      await deleteAdminMessage(session.access_token, messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
      if (recentOwnMessageId === messageId) {
        setRecentOwnMessageId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete that message.");
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
              messages.map((message) => {
                const isOwn = message.user_id === user.id;
                const parsed = parseChatMessageContent(message.content);
                const messageReactions = reactions[message.id] ?? [];
                return (
                  <div key={message.id} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
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
                          {isAdmin && (
                            <button onClick={() => void adminDeleteMessage(message.id)} style={{ background: "none", border: "none", color: "rgba(255,160,160,0.72)", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>delete</button>
                          )}
                        </div>
                        {reactionPickerId === message.id && (
                          <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.45rem", padding: "0.35rem 0.45rem", borderRadius: "999px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", width: "fit-content", marginLeft: isOwn ? "auto" : 0 }}>
                            {["👍", "🔥", "😂", "😮", "🖤"].map((emoji) => (
                              <button key={emoji} onClick={() => toggleReaction(message.id, emoji)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.92rem", padding: 0 }}>{emoji}</button>
                            ))}
                          </div>
                        )}
                        {messageReactions.length > 0 && (
                          <div style={{ display: "flex", gap: "0.32rem", flexWrap: "wrap", marginTop: "0.45rem", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
                            {messageReactions.map((emoji, index) => (
                              <span key={`${message.id}-${emoji}-${index}`} style={{ padding: "0.18rem 0.45rem", borderRadius: "999px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", fontSize: "0.8rem" }}>{emoji}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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

function NewTabPage({ onNavigate, customShortcuts, setCustomShortcuts, wallpaper }: {
  onNavigate: (url: string) => void;
  customShortcuts: Shortcut[];
  setCustomShortcuts: (s: Shortcut[]) => void;
  wallpaper?: string;
}) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState(""); const [newUrl, setNewUrl] = useState(""); const [newImg, setNewImg] = useState("");

  const all = [...DEFAULT_SHORTCUTS, ...customShortcuts];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(input); if (url) onNavigate(url);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim(), rawUrl = newUrl.trim(); if (!name || !rawUrl) return;
    const url = normalizeUrl(rawUrl);
    let domain = ""; try { domain = new URL(url).hostname; } catch { }
    const sc: Shortcut = { id: Math.random().toString(36).slice(2), name, url, favicon: newImg.trim() || faviconUrl(domain) };
    const updated = [...customShortcuts, sc]; setCustomShortcuts(updated); saveCustomShortcuts(updated);
    setAdding(false); setNewName(""); setNewUrl(""); setNewImg("");
  }

  function removeCustom(id: string) {
    const updated = customShortcuts.filter(s => s.id !== id); setCustomShortcuts(updated); saveCustomShortcuts(updated);
  }

  const inputSt: React.CSSProperties = { background: "var(--t-bg)", border: "1px solid var(--t-border-light)", color: "#e8e8e8", padding: "0.5rem 0.75rem", fontSize: "0.8rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "2px" };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: wallpaper ? `#0d0d0d url(${wallpaper}) center/cover no-repeat` : "#0d0d0d", gap: "1.75rem", fontFamily: "'Space Grotesk', sans-serif" 
      }}
    >
      <motion.p
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", margin: 0 }}
      >unstable</motion.p>

      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSearch}
        style={{ display: "flex", width: "100%", maxWidth: "520px", padding: "0 2rem" }}
      >
        <input autoFocus value={input} onChange={e => setInput(e.target.value)} placeholder="search or enter a url"
          style={{ flex: 1, background: "radial-gradient(circle 150px at var(--glass-x, 50%) var(--glass-y, 50%), rgba(255,255,255,var(--glass-glow, 0)), rgba(255,255,255,0) 72%), linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.045))", border: "1px solid rgba(255,255,255,0.24)", borderRight: "none", color: "#e8e8e8", padding: "0.75rem 1rem", fontSize: "0.85rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "0", backdropFilter: "blur(calc(22px + var(--glass-hover, 0) * 18px)) saturate(calc(1.18 + var(--glass-hover, 0) * 0.42))", WebkitBackdropFilter: "blur(calc(22px + var(--glass-hover, 0) * 18px)) saturate(calc(1.18 + var(--glass-hover, 0) * 0.42))", boxShadow: "inset 0 1px 0 rgba(255,255,255,calc(0.2 + var(--glass-hover, 0) * 0.2)), inset 0 -1px 0 rgba(255,255,255,0.06), 0 16px 48px rgba(0,0,0,calc(0.2 + var(--glass-hover, 0) * 0.08))", transition: "border-color 0.18s ease, box-shadow 0.18s ease, backdrop-filter 0.18s ease, -webkit-backdrop-filter 0.18s ease" } as React.CSSProperties}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--glass-x", `${e.clientX - rect.left}px`);
            e.currentTarget.style.setProperty("--glass-y", `${e.clientY - rect.top}px`);
            e.currentTarget.style.setProperty("--glass-hover", "1");
            e.currentTarget.style.setProperty("--glass-glow", "0.22");
          }}
          onMouseLeave={e => {
            e.currentTarget.style.setProperty("--glass-hover", "0");
            e.currentTarget.style.setProperty("--glass-glow", "0");
          }}
          onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.46)"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.28)"}
        />
        <motion.button
          whileHover={{ background: "#fff" }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          style={{ background: "#e8e8e8", color: "#0d0d0d", border: "none", padding: "0.75rem 1.25rem", fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", borderRadius: "0 2px 2px 0" }}
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
              whileHover={{ y: -4, background: "#161616" }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onNavigate(sc.url)}
              title={sc.name}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", padding: "0.55rem 0.4rem", borderRadius: "6px", transition: "background 0.15s", minWidth: "52px" }}
            >
              <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={sc.favicon} alt={sc.name} width={24} height={24} style={{ borderRadius: "4px", objectFit: "contain" }}
                  onError={e => { const img = e.target as HTMLImageElement; img.style.display = "none"; const fb = img.nextSibling as HTMLElement; if (fb) fb.style.display = "flex"; }}
                />
                <span style={{ display: "none", width: 24, height: 24, background: "#1e1e1e", borderRadius: "4px", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{sc.name[0]?.toUpperCase()}</span>
              </div>
              <span style={{ fontSize: "0.57rem", color: "rgba(255,255,255,0.32)", letterSpacing: "0.03em", maxWidth: "56px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.name}</span>
            </motion.button>
            {!DEFAULT_SHORTCUTS.find(d => d.id === sc.id) && (
              <button onClick={() => removeCustom(sc.id)} className="sc-remove" style={{ position: "absolute", top: 2, right: 2, background: "#1a1a1a", border: "none", color: "rgba(255,255,255,0.4)", borderRadius: "50%", width: 14, height: 14, fontSize: 9, cursor: "pointer", display: "none", alignItems: "center", justifyContent: "center" }}>×</button>
            )}
          </motion.div>
        ))}
        {!adding && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + all.length * 0.05 }}
            whileHover={{ scale: 1.1, background: "#161616" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setAdding(true)}
            title="Add shortcut"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", padding: "0.55rem 0.4rem", borderRadius: "6px", transition: "background 0.15s", minWidth: "52px" }}
          >
            <div style={{ width: 28, height: 28, borderRadius: "6px", border: "1px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "rgba(255,255,255,0.2)" }}>+</div>
            <span style={{ fontSize: "0.57rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.03em" }}>add</span>
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
            <p style={{ margin: 0, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>new shortcut</p>
            <input autoFocus placeholder="name" value={newName} onChange={e => setNewName(e.target.value)} style={inputSt} onFocus={e => e.target.style.borderColor = "#444"} onBlur={e => e.target.style.borderColor = "#222"} />
            <input placeholder="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={inputSt} onFocus={e => e.target.style.borderColor = "#444"} onBlur={e => e.target.style.borderColor = "#222"} />
            <input placeholder="image url (optional)" value={newImg} onChange={e => setNewImg(e.target.value)} style={inputSt} onFocus={e => e.target.style.borderColor = "#444"} onBlur={e => e.target.style.borderColor = "#222"} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" style={{ flex: 1, background: "#e8e8e8", color: "#0d0d0d", border: "none", padding: "0.5rem", fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px" }}>add</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => { setAdding(false); setNewName(""); setNewUrl(""); setNewImg(""); }} style={{ flex: 1, background: "none", color: "rgba(255,255,255,0.3)", border: "1px solid #222", padding: "0.5rem", fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px" }}>cancel</motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ display: "flex", gap: "1.5rem" }}>
        {[["credits", "unstable://credits"], ["tos", "unstable://tos"], ["privacy", "unstable://privacy"]].map(([label, url]) => (
          <motion.button
            whileHover={{ color: "rgba(255,255,255,0.7)" }}
            key={label}
            onClick={() => onNavigate(url)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
          >{label}</motion.button>
        ))}
      </motion.div>

      <style>{`.sc-wrap:hover .sc-remove{display:flex!important} input::placeholder{color:rgba(255,255,255,0.2)}`}</style>
    </motion.div>
  );
}

// ─── Browser tab ──────────────────────────────────────────────────────────────

function BrowserTab({ tab, isActive, onActivate, onClose }: { tab: Tab; isActive: boolean; onActivate: () => void; onClose: () => void }) {
  const rawLabel = tab.url ? (tab.title || getDomainFromProxyUrl(tab.url) || "Loading…") : "New Tab";
  const label = rawLabel.length > 20 ? rawLabel.slice(0, 20) + "…" : rawLabel;
  return (
    <div onClick={onActivate} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0 0.5rem 0 0.7rem", height: "100%", cursor: "pointer", background: isActive ? "#111" : "transparent", borderRight: "1px solid #1a1a1a", minWidth: 110, maxWidth: 180, flexShrink: 0, transition: "background 0.1s" }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#0f0f0f"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      <div style={{ width: 14, height: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {tab.loading ? <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.3)", animation: "pulse 1s ease-in-out infinite" }} />
          : tab.favicon ? <img src={tab.favicon} alt="" width={14} height={14} style={{ borderRadius: "2px", objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
            : <div style={{ width: 10, height: 10, borderRadius: "2px", background: "#2a2a2a" }} />
        }
      </div>
      <span style={{ flex: 1, fontSize: "0.7rem", color: isActive ? "#e0e0e0" : "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>{label}</span>
      <button onClick={e => { e.stopPropagation(); onClose(); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.22)", cursor: "pointer", padding: "1px 3px", fontSize: 13, lineHeight: 1, borderRadius: "2px", flexShrink: 0 }}
        onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"}
        onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.22)"}
      >×</button>
    </div>
  );
}

// ─── Browser app ──────────────────────────────────────────────────────────────

function CollapsedSidebar({
  activeUrl,
  isAdmin,
  onNavigate,
  canReturnToBrowse,
}: {
  activeUrl: string;
  isAdmin: boolean;
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
    { label: "Admin", url: "unstable://admin", icon: Shield, hidden: !isAdmin },
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement>>({});
  const urlInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
  const isNewtab = !activeTab?.url;
  const proxyStatus = useProxyStatus();
  const gameModeActive = Boolean(activeTab?.url && isGameModeTabUrl(activeTab.url, settings));
  const themeEffect = THEMES[settings.theme]?.backgroundEffect ?? "";
  const activeBgEffect = settings.backgroundEffect || themeEffect;
  const vantaOptions = THEMES[settings.theme]?.vantaOptions ?? {};
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
    if (!gameModeActive || proxyStatus.phase !== "ready") return;
    const n = parseInt(localStorage.getItem(BARE_KEY) || "1", 10) || 1;
    if (proxyStatus.transport !== "bare") {
      void switchBare(n, "bare");
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
  useEffect(() => {
    const n = parseInt(localStorage.getItem(BARE_KEY) || "1", 10) || 1;
    setupProxy(n, settings.transportMode);
  }, [settings.transportMode]);

  useEffect(() => {
    if (!activeTab) return;
    const display = activeTab.url ? (activeTab.url.startsWith("unstable://") ? activeTab.url : decodeProxyUrl(activeTab.url)) : "";
    setUrlInput(display);
  }, [activeTabId, activeTab?.url]);

  const stateRef = useRef({ tabs, activeTabId, settings, customShortcuts });
  useEffect(() => { stateRef.current = { tabs, activeTabId, settings, customShortcuts }; });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
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
      if (["settings", "credits", "ai", "chat", "blank", "tos", "privacy", "admin", "games"].includes(page)) {
        if (page === "admin" && !authContext.isAdmin) {
          updateTab(tabId, { url: "unstable://settings", title: "Settings", favicon: "", loading: false });
          return;
        }
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
    const normalized = normalizeUrl(t);
    if (!normalized) return;
    let domain = "";
    try {
      domain = new URL(normalized).hostname.replace(/^www\./i, "").toLowerCase();
    } catch { /* ignore */ }
    const engine = isGameModeHost(domain, settings) ? "scramjet" : settings.proxyEngine;
    const proxyUrl = encodeProxyUrl(normalized, engine);
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
      {activeBgEffect ? <VantaBackground effect={activeBgEffect} options={vantaOptions} /> : null}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: activeBgEffect ? "transparent" : "var(--t-bg)", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", position: "relative", zIndex: 1 }}
    >
      {!fullscreen && (
        <motion.div initial={{ y: -40 }} animate={{ y: 0 }} transition={{ type: "spring", damping: 20 }}>
          <div style={{ display: "flex", alignItems: "stretch", background: "#080808", borderBottom: "1px solid #1a1a1a", height: 36, flexShrink: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {tabs.map(tab => <BrowserTab key={tab.id} tab={tab} isActive={tab.id === activeTabId} onActivate={() => setActiveTabId(tab.id)} onClose={() => handleCloseTab(tab.id)} />)}
            </div>
            <button onClick={handleNewTab} style={{ background: "none", border: "none", borderLeft: "1px solid #1a1a1a", color: "rgba(255,255,255,0.28)", cursor: "pointer", padding: "0 0.85rem", fontSize: 18, lineHeight: 1, flexShrink: 0, transition: "color 0.1s" }}
              onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"} onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)"} title="New tab">+</button>
            <button onClick={onLogout} style={{ background: "none", border: "none", borderLeft: "1px solid #1a1a1a", color: "rgba(255,255,255,0.16)", cursor: "pointer", padding: "0 0.8rem", fontSize: "0.57rem", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0, transition: "color 0.1s" }}
              onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "rgba(200,70,70,0.8)"} onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.16)"} title="Lock">lock</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", padding: "0.3rem 0.55rem", background: "var(--t-bg)", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
            <button onClick={handleBack} disabled={!canBack} style={canBack ? btn : btnOff} {...hov(canBack)} title="Back">←</button>
            <button onClick={handleForward} disabled={!canForward} style={canForward ? btn : btnOff} {...hov(canForward)} title="Forward">→</button>
            <button onClick={handleReload} style={btn} {...hov(true)} title="Reload">↺</button>
            <div style={{ width: 1, height: 16, background: "#1e1e1e", margin: "0 0.15rem", flexShrink: 0 }} />
            <form onSubmit={handleUrlSubmit} style={{ flex: 1, display: "flex" }}>
              <input ref={urlInputRef} value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onFocus={e => { e.target.select(); e.target.style.borderColor = "#444"; }} onBlur={e => e.target.style.borderColor = "#1e1e1e"}
                placeholder="search, url, or unstable://…"
                style={{ width: "100%", background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#e0e0e0", padding: "0.26rem 0.65rem", fontSize: "0.77rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "12px", letterSpacing: "0.01em", transition: "border-color 0.15s" }}
              />
            </form>
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
            isAdmin={authContext.isAdmin}
            canReturnToBrowse={Boolean(activeTab?.url.startsWith("unstable://") && activeTab.lastProxyUrl)}
            onNavigate={(url) => handleNavigate(url, activeTabId)}
          />
        )}

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {fullscreen && (
            <button onClick={() => setFullscreen(false)} style={{ position: "absolute", top: 12, right: 12, zIndex: 999, background: "rgba(0,0,0,0.6)", border: "1px solid #333", color: "#e8e8e8", cursor: "pointer", padding: "6px 10px", borderRadius: "2px", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>exit fullscreen</button>
          )}
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {tabs.map(tab => (
              <div
                key={tab.id}
                style={{
                  position: "absolute", inset: 0,
                  visibility: tab.id === activeTabId ? "visible" : "hidden",
                  zIndex: tab.id === activeTabId ? 1 : 0,
                  pointerEvents: tab.id === activeTabId ? "auto" : "none",
                }}
              >
              {!tab.url ? (
                <NewTabPage onNavigate={u => handleNavigate(u, tab.id)} customShortcuts={customShortcuts} setCustomShortcuts={setCustomShortcuts} wallpaper={THEMES[settings.theme]?.wallpaper ?? settings.wallpaper} />
              ) : tab.url === "unstable://ai" ? (
                <AIPage user={user} profile={profile} onAuthenticated={onAuthenticated} />
              ) : tab.url === "unstable://chat" ? (
                <ChatPage user={user} profile={profile} session={session} isAdmin={authContext.isAdmin} onAuthenticated={onAuthenticated} />
              ) : tab.url === "unstable://settings" ? (
                <SettingsPage settings={settings} onSettingsChange={setSettings} />
              ) : tab.url === "unstable://admin" ? (
                session && user ? (
                  <AdminPage session={session} currentUser={user} isAdmin={authContext.isAdmin} />
                ) : (
                  <InlineAuthScreen onAuthenticated={onAuthenticated} feature="Admin" />
                )
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
                      const uvUrl = encodeProxyUrl(original, "uv");
                      if (uvUrl !== current) {
                        updateTab(tab.id, { url: uvUrl, loading: true });
                        return;
                      }
                    } else if (current.startsWith(UV_PREFIX)) {
                      const original = decodeProxyUrl(current);
                      if (original && original.startsWith("http")) {
                        const retryUrl = encodeProxyUrl(original, "uv");
                        if (retryUrl !== current) {
                          updateTab(tab.id, { url: retryUrl, loading: true });
                          return;
                        }
                      }
                      if (scrController) {
                        const scramjetUrl = encodeProxyUrl(original || current, "scramjet");
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
              </div>
            ))}
          </div>
        </div>
      </div>

      <StatusBar visible={isNewtab} leftOffset={fullscreen ? 12 : 68} transportMode={settings.transportMode} />

      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}} input::placeholder{color:rgba(255,255,255,0.18)}`}</style>
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
  const [authContext, setAuthContext] = useState<AppAuthContext>({ isAdmin: false, isBanned: false, banReason: null });
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
        setAuthContext({ isAdmin: false, isBanned: false, banReason: null });
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
        setAuthContext({ isAdmin: false, isBanned: false, banReason: null });
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
        setAuthContext({ isAdmin: false, isBanned: false, banReason: null });
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
    setAuthContext({ isAdmin: false, isBanned: false, banReason: null });
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

