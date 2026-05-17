import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useVelocity, useTransform, useAnimation } from "framer-motion";

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
interface Settings { cloak: CloakId; shortcuts: KeyShortcuts; proxyEngine: ProxyEngine; }
interface Shortcut { id: string; name: string; url: string; favicon: string; }

interface Tab {
  id: string; title: string; url: string; favicon: string;
  history: string[]; historyIndex: number; loading: boolean;
}

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CORRECT_PASSWORD = "ripmoonlight";
const SESSION_KEY = "unstable_auth";
const UV_PREFIX = "/service/";
const SCRAMJET_PREFIX = "/ham/";
const SHORTCUTS_KEY = "unstable_shortcuts";
const SETTINGS_KEY = "unstable_settings";
const BARE_KEY = "unstable_bare";

const DEFAULT_KEY_SHORTCUTS: KeyShortcuts = {
  tab1: "Alt+1", tab2: "Alt+2", tab3: "Alt+3", tab4: "Alt+4", tab5: "Alt+5",
  tab6: "Alt+6", tab7: "Alt+7", tab8: "Alt+8", tab9: "Alt+9",
  closeTab: "Alt+W", newTab: "Alt+T", addShortcut: "Alt+D",
};
const DEFAULT_SETTINGS: Settings = { cloak: "none", shortcuts: DEFAULT_KEY_SHORTCUTS, proxyEngine: "auto" };

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
  { id: "github", name: "GitHub", url: "https://github.com", favicon: faviconUrl("github.com") },
  { id: "spotify", name: "Spotify", url: "https://open.spotify.com", favicon: faviconUrl("open.spotify.com") },
  { id: "twitch", name: "Twitch", url: "https://twitch.tv", favicon: faviconUrl("twitch.tv") },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function aiMessageId() {
  return Math.random().toString(36).slice(2);
}

async function sendAiChat(messages: AIMessage[]): Promise<string> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  });

  const data = await res.json().catch(() => null) as { content?: string; error?: string } | null;
  if (!res.ok) throw new Error(data?.error || "The AI request failed.");
  if (!data?.content) throw new Error("The AI response was empty.");
  return data.content;
}

function encodeProxyUrl(url: string, engine: ProxyEngine = "auto"): string {
  const useScramjet = (engine === "auto" || engine === "scramjet") && scrController !== null && !shouldForceUv(url);
  if (useScramjet) {
    try { return scrController!.encodeUrl(url); } catch { /* fall through */ }
  }
  if (window.Ultraviolet && window.__uv$config) return UV_PREFIX + window.__uv$config.encodeUrl(url);
  return UV_PREFIX + encodeURIComponent(url);
}

function shouldForceUv(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host.endsWith(".googlevideo.com") ||
      host === "smashkarts.io" ||
      host.endsWith(".smashkarts.io")
    );
  } catch {
    return false;
  }
}

function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (t.startsWith("unstable://")) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.includes(".") && !t.includes(" ")) return "https://" + t;
  return "https://www.google.com/search?q=" + encodeURIComponent(t);
}

function decodeProxyUrl(url: string): string {
  try {
    if (url.startsWith(SCRAMJET_PREFIX) && scrController) {
      try { return scrController.decodeUrl(url); } catch { }
      const encoded = url.slice(SCRAMJET_PREFIX.length);
      return decodeURIComponent(encoded);
    }
    if (url.startsWith(UV_PREFIX)) {
      const enc = url.slice(UV_PREFIX.length);
      if (window.__uv$config) return window.__uv$config.decodeUrl(decodeURIComponent(enc));
      return decodeURIComponent(enc);
    }
  } catch { }
  return url;
}

function getDomainFromProxyUrl(url: string): string {
  try { return new URL(decodeProxyUrl(url)).hostname; } catch { return ""; }
}

function barePathForNum(n: number): string {
  return n === 1 ? "/api/bare/" : `/api/bare${n}/`;
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
    };
  } catch { return DEFAULT_SETTINGS; }
}
function saveSettings(s: Settings) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

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
  transport: "none" | "libcurl" | "bare";
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

async function setupProxy(bareNum = 1): Promise<void> {
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
    const { BareMuxConnection } = await import("@mercuryworkshop/bare-mux");
    if (!bareConn) bareConn = new BareMuxConnection("/baremux/worker.js");

    const origin = location.origin;
    const wispUrl = `${location.protocol === "http:" ? "ws:" : "wss:"}//${location.host}/api/wisp/`;

    let transportSet = false;

    try {
      await bareConn.setTransport(origin + "/api/baremod/index.mjs", [origin + barePathForNum(bareNum)]);
      transportSet = true;
      emitStatus({ phase: "ready", transport: "bare", bare: bareNum });
    } catch { /* fall through */ }

    if (!transportSet) {
      try {
        await bareConn.setTransport("/libcurl/index.mjs", [{ wisp: wispUrl }]);
        transportSet = true;
        emitStatus({ phase: "ready", transport: "libcurl", bare: bareNum });
      } catch { /* fall through */ }
    }

    if (!transportSet) {
      emitStatus({ phase: "error", message: "No transport available" });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    emitStatus({ phase: "error", message: msg });
  }
}

async function switchBare(n: number): Promise<void> {
  emitStatus({ switching: true, bare: n });
  try {
    const { BareMuxConnection } = await import("@mercuryworkshop/bare-mux");
    if (!bareConn) bareConn = new BareMuxConnection("/baremux/worker.js");
    const wispUrl = `${location.protocol === "http:" ? "ws:" : "wss:"}//${location.host}/api/wisp/`;
    try {
      await bareConn.setTransport(location.origin + "/api/baremod/index.mjs", [location.origin + barePathForNum(n)]);
      emitStatus({ switching: false, transport: "bare", bare: n });
    } catch {
      await bareConn.setTransport("/libcurl/index.mjs", [{ wisp: wispUrl }]);
      emitStatus({ switching: false, transport: "libcurl", bare: n });
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

function MagicCursor() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 250 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  const spinControls = useAnimation();
  const [isHovering, setIsHovering] = useState(false);

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

  // Only spin once when hovered over a button
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

function StatusBar({ visible }: { visible: boolean }) {
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
    <div style={{ position: "fixed", bottom: 10, left: 12, zIndex: 9999, display: "flex", alignItems: "center", gap: "0.55rem", fontFamily: "'Space Grotesk', sans-serif", pointerEvents: "none" }}>
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
              <button key={n} onClick={() => switchBare(n)} title={`Switch to bare server ${n}`} style={{
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

// ─── Server-side password check ───────────────────────────────────────────────

async function verifyPassword(pw: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) return true;
    if (res.status === 401) return false;
    return pw === CORRECT_PASSWORD;
  } catch {
    return pw === CORRECT_PASSWORD;
  }
}

// ─── Password screen ──────────────────────────────────────────────────────────

function PasswordScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(false); const [shaking, setShaking] = useState(false);
  const [checking, setChecking] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    const ok = await verifyPassword(pw);
    setChecking(false);
    if (ok) { sessionStorage.setItem(SESSION_KEY, "true"); onSuccess(); }
    else { setErr(true); setShaking(true); setPw(""); setTimeout(() => setShaking(false), 500); }
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", width: "100%", maxWidth: "360px", padding: "0 1.5rem" }}
      >
        <p style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: 0 }}>unstable</p>
        <form onSubmit={submit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ animation: shaking ? "shake 0.5s ease-in-out" : "none" }}>
            <input type="password" value={pw} autoFocus onChange={e => { setPw(e.target.value); setErr(false); }} placeholder="enter password"
              style={{ width: "100%", background: "#111", border: `1px solid ${err ? "#8b2b2b" : "#222"}`, color: "#e8e8e8", padding: "0.875rem 1rem", fontSize: "0.9rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.04em", outline: "none", borderRadius: "2px", transition: "border-color 0.2s", boxSizing: "border-box" }}
              onFocus={e => { if (!err) e.target.style.borderColor = "#444"; }} onBlur={e => { if (!err) e.target.style.borderColor = "#222"; }}
            />
          </div>
          {err && <p style={{ color: "#a04040", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0, textAlign: "center" }}>incorrect password</p>}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={checking}
            style={{ width: "100%", background: checking ? "#555" : "#e8e8e8", color: checking ? "#aaa" : "#0d0d0d", border: "none", padding: "0.875rem 1rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", cursor: checking ? "not-allowed" : "pointer", borderRadius: "2px", transition: "background 0.15s" }}
          >{checking ? "checking…" : "enter"}</motion.button>
        </form>
      </motion.div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}30%{transform:translateX(8px)}45%{transform:translateX(-6px)}60%{transform:translateX(6px)}75%{transform:translateX(-3px)}90%{transform:translateX(3px)}} input::placeholder{color:rgba(255,255,255,0.2)}`}</style>
    </motion.div>
  );
}

// ─── Credits page ─────────────────────────────────────────────────────────────

function CreditsPage() {
  const items = [
    ["Ultraviolet", "web proxy engine"], ["Scramjet", "web proxy engine (primary)"],
    ["bare-mux", "transport multiplexer"], ["libcurl-transport", "libcurl+wisp transport"],
    ["bare-server-node", "bare proxy backend"], ["bare-as-module3", "bare transport (fallback)"],
    ["wisp-js", "wisp server"], ["React + Vite", "frontend"],
    ["Space Grotesk", "typeface"],
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", gap: "2rem" }}
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
      style={{ height: "100%", overflowY: "auto", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", padding: "2.5rem 2rem", maxWidth: 560, margin: "0 auto" }}
    >
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginTop: 0, marginBottom: "2rem" }}>unstable — terms of service</p>
      {[
        ["Use at your own risk", "Unstable is provided as-is, with no guarantees of uptime, reliability, or fitness for any particular purpose. You accept all responsibility for how you use this tool."],
        ["Acceptable use", "You agree not to use Unstable to access, distribute, or transmit content that is illegal in your jurisdiction. Circumventing network restrictions may violate your school, employer, or ISP's acceptable-use policy — you are solely responsible for compliance."],
        ["No logging", "This instance does not store logs of sites you visit, passwords you enter, or any other personally identifiable information beyond what is necessary for the proxy connection to function."],
        ["Third-party content", "Unstable acts as a transparent proxy. The operators of this service are not responsible for the content of third-party websites accessed through it."],
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
      style={{ height: "100%", overflowY: "auto", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", padding: "2.5rem 2rem", maxWidth: 560, margin: "0 auto" }}
    >
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginTop: 0, marginBottom: "2rem" }}>unstable — privacy policy</p>
      {[
        ["What we collect", "Nothing beyond what is strictly required for a WebSocket proxy connection to function. We do not store browsing history, search queries, usernames, or passwords on any server we control."],
        ["Session storage", "Your authentication session is stored in your browser's sessionStorage and is erased when you close the tab. Shortcut and settings preferences are stored in localStorage on your device only."],
        ["Proxy traffic", "Network requests made through the Unstable proxy pass through our bare servers. We do not log request URLs, response bodies, or IP addresses beyond the lifetime of a single connection."],
        ["Cookies", "We do not set any tracking or analytics cookies. Third-party sites you visit through the proxy may set their own cookies in the proxied context."],
        ["Third parties", "We do not share, sell, or transmit any data to third-party analytics, advertising, or data-broker services."],
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ height: "100%", overflowY: "auto", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", padding: "2.5rem 2rem", maxWidth: 560, margin: "0 auto" }}
    >
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginTop: 0, marginBottom: "2.5rem" }}>unstable — settings</p>

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

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.85rem", marginTop: 0 }}>tab cloak</p>
        <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
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

// ─── AI page ──────────────────────────────────────────────────────────────────

function AIPage() {
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
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function submitPrompt(rawPrompt?: string) {
    const prompt = (rawPrompt ?? input).trim();
    if (!prompt || loading) return;

    const userMessage: AIMessage = { id: aiMessageId(), role: "user", content: prompt };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const content = await sendAiChat(nextMessages);
      setMessages(prev => [...prev, { id: aiMessageId(), role: "assistant", content }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to get a response right now.");
    } finally {
      setLoading(false);
    }
  }

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
            <p style={{ fontSize: "1.45rem", color: "#f3f4f6", margin: "0.55rem 0 0.35rem", lineHeight: 1.05 }}>Fast Groq chat, styled to live here.</p>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.42)", margin: 0, lineHeight: 1.6 }}>
              Powered by `llama-3.1-8b-instant` for low-latency replies without breaking the Unstable aesthetic.
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
            <p style={{ margin: "0 0 0.25rem", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)" }}>Model</p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)" }}>Groq · llama-3.1-8b-instant</p>
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
              onClick={() => { setMessages(starterMessages); setError(""); }}
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

          <div ref={scrollerRef} style={{ flex: 1, overflowY: "auto", padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                style={{
                  alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                  width: "min(100%, 760px)",
                  borderRadius: message.role === "user" ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                  background: message.role === "user"
                    ? "linear-gradient(135deg, rgba(116,164,255,0.95), rgba(91,125,224,0.95))"
                    : "linear-gradient(180deg, rgba(23,23,23,0.98), rgba(16,16,16,0.98))",
                  border: message.role === "user" ? "1px solid rgba(142,184,255,0.45)" : "1px solid rgba(255,255,255,0.07)",
                  padding: "0.9rem 1rem",
                  boxShadow: message.role === "user" ? "0 10px 30px rgba(91,125,224,0.2)" : "none",
                }}
              >
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.57rem", letterSpacing: "0.14em", textTransform: "uppercase", color: message.role === "user" ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.28)" }}>
                  {message.role === "user" ? "you" : "unstable ai"}
                </p>
                <p style={{ margin: 0, color: message.role === "user" ? "#ffffff" : "rgba(255,255,255,0.82)", fontSize: "0.76rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {message.content}
                </p>
              </motion.div>
            ))}

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ alignSelf: "flex-start", borderRadius: "18px 18px 18px 6px", background: "linear-gradient(180deg, rgba(23,23,23,0.98), rgba(16,16,16,0.98))", border: "1px solid rgba(255,255,255,0.07)", padding: "0.9rem 1rem" }}>
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.57rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>unstable ai</p>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.62)", fontSize: "0.76rem" }}>thinking fast…</p>
              </motion.div>
            )}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.1rem 1.1rem" }}>
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
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything..."
                rows={3}
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
                }}
              />
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.03 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  alignSelf: "stretch",
                  minWidth: 120,
                  background: loading || !input.trim() ? "#1b1b1b" : "#e8ecf8",
                  color: loading || !input.trim() ? "rgba(255,255,255,0.25)" : "#0d0d0d",
                  border: "none",
                  borderRadius: "14px",
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "0.68rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {loading ? "sending" : "launch"}
              </motion.button>
            </form>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}

// ─── New tab page ─────────────────────────────────────────────────────────────

function NewTabPage({ onNavigate, customShortcuts, setCustomShortcuts }: {
  onNavigate: (url: string) => void;
  customShortcuts: Shortcut[];
  setCustomShortcuts: (s: Shortcut[]) => void;
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

  const inputSt: React.CSSProperties = { background: "#0d0d0d", border: "1px solid #222", color: "#e8e8e8", padding: "0.5rem 0.75rem", fontSize: "0.8rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "2px" };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0d0d0d", gap: "1.75rem", fontFamily: "'Space Grotesk', sans-serif" }}
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
          style={{ flex: 1, background: "#111", border: "1px solid #222", borderRight: "none", color: "#e8e8e8", padding: "0.75rem 1rem", fontSize: "0.85rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "2px 0 0 2px" }}
          onFocus={e => e.target.style.borderColor = "#444"} onBlur={e => e.target.style.borderColor = "#222"}
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
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem", background: "#111", border: "1px solid #222", borderRadius: "4px", padding: "1rem 1.25rem", width: "100%", maxWidth: "300px" }}
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
        {[["credits", "unstable://credits"], ["ai", "unstable://ai"], ["settings", "unstable://settings"], ["tos", "unstable://tos"], ["privacy", "unstable://privacy"]].map(([label, url]) => (
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

function BrowserApp({ onLogout }: { onLogout: () => void }) {
  const [tabs, setTabs] = useState<Tab[]>([makeTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [urlInput, setUrlInput] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [customShortcuts, setCustomShortcuts] = useState<Shortcut[]>(loadCustomShortcuts);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
  const isNewtab = !activeTab?.url;

  useEffect(() => { applyCloak(settings.cloak); }, [settings.cloak]);
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => {
    const n = parseInt(localStorage.getItem(BARE_KEY) || "1", 10) || 1;
    setupProxy(n);
  }, []);

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
      if (page === "newtab") { updateTab(tabId, { url: "", title: "New Tab", favicon: "", loading: false }); return; }
      if (["settings", "credits", "ai", "blank", "tos", "privacy"].includes(page)) {
        const title = page.charAt(0).toUpperCase() + page.slice(1);
        updateTab(tabId, { url: t, title, favicon: "", loading: false });
        setTabs(prev => prev.map(tab => { if (tab.id !== tabId) return tab; const hist = [...tab.history.slice(0, tab.historyIndex + 1), t]; return { ...tab, url: t, title, favicon: "", loading: false, history: hist, historyIndex: hist.length - 1 }; }));
        return;
      }
    }
    const normalized = normalizeUrl(t);
    if (!normalized) return;
    const proxyUrl = encodeProxyUrl(normalized, settings.proxyEngine);
    let domain = ""; try { domain = new URL(normalized).hostname; } catch { }
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      const hist = [...tab.history.slice(0, tab.historyIndex + 1), proxyUrl];
      return { ...tab, url: proxyUrl, title: domain || "Loading…", favicon: domain ? faviconUrl(domain) : "", history: hist, historyIndex: hist.length - 1, loading: true };
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden" }}
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

          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", padding: "0.3rem 0.55rem", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
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
            <button onClick={handleOpenInNewTab} style={btn} {...hov(true)} title="Open in new window">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </button>
            <button onClick={() => setFullscreen(f => !f)} style={btn} {...hov(true)} title="Fullscreen">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
            </button>
          </div>
        </motion.div>
      )}

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {fullscreen && (
          <button onClick={() => setFullscreen(false)} style={{ position: "absolute", top: 12, right: 12, zIndex: 999, background: "rgba(0,0,0,0.6)", border: "1px solid #333", color: "#e8e8e8", cursor: "pointer", padding: "6px 10px", borderRadius: "2px", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>exit fullscreen</button>
        )}
        <AnimatePresence mode="wait">
          {tabs.map(tab => tab.id === activeTabId && (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              style={{ position: "absolute", inset: 0 }}
            >
              {!tab.url ? (
                <NewTabPage onNavigate={u => handleNavigate(u, tab.id)} customShortcuts={customShortcuts} setCustomShortcuts={setCustomShortcuts} />
              ) : tab.url === "unstable://ai" ? (
                <AIPage />
              ) : tab.url === "unstable://settings" ? (
                <SettingsPage settings={settings} onSettingsChange={setSettings} />
              ) : tab.url === "unstable://credits" ? (
                <CreditsPage />
              ) : tab.url === "unstable://tos" ? (
                <ToSPage />
              ) : tab.url === "unstable://privacy" ? (
                <PrivacyPage />
              ) : tab.url === "unstable://blank" ? (
                <div style={{ width: "100%", height: "100%", background: "#0d0d0d" }} />
              ) : (
                <iframe ref={iframeRef} src={tab.url}
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                  allow="fullscreen *;autoplay *;camera *;microphone *;payment *;clipboard-read *;clipboard-write *;encrypted-media *;gamepad *"
                  onLoad={() => {
                    updateTab(tab.id, { loading: false });
                    try {
                      const iframe = iframeRef.current;
                      if (!iframe) return;
                      const win = iframe.contentWindow as any;
                      const doc = iframe.contentDocument;
                      if (win && doc) {
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
                          if (target && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || win.getComputedStyle(target).cursor === 'pointer')) {
                            window.dispatchEvent(new CustomEvent("iframe-hover", { detail: { hovering: true } }));
                          } else {
                            window.dispatchEvent(new CustomEvent("iframe-hover", { detail: { hovering: false } }));
                          }
                        };
                        win.addEventListener("mouseover", handleIframeHover);
                        win.addEventListener("mouseout", () => window.dispatchEvent(new CustomEvent("iframe-hover", { detail: { hovering: false } })));

                        const style = doc.createElement("style");
                        style.textContent = "html, body, * { cursor: none !important; }";
                        doc.head.appendChild(style);
                      }
                    } catch (e) {
                      // ignore cross-origin errors if any
                    }
                  }}
                  onError={() => {
                    if (tab.url.startsWith(SCRAMJET_PREFIX)) {
                      const original = decodeProxyUrl(tab.url);
                      const uvUrl = encodeProxyUrl(original, "uv");
                      if (uvUrl !== tab.url) {
                        updateTab(tab.id, { url: uvUrl, loading: true });
                        return;
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

      <StatusBar visible={isNewtab} />

      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}} input::placeholder{color:rgba(255,255,255,0.18)}`}</style>
    </motion.div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth] = useState(() => sessionStorage.getItem(SESSION_KEY) === "true");
  function logout() { sessionStorage.removeItem(SESSION_KEY); swRegistered = false; bareConn = null; scrController = null; currentStatus = { ...defaultProxyState }; setAuth(false); applyCloak("none"); }
  return (
    <>
      <MagicCursor />
      <AnimatePresence mode="wait">
        {!auth ? (
          <PasswordScreen key="auth" onSuccess={() => setAuth(true)} />
        ) : (
          <BrowserApp key="app" onLogout={logout} />
        )}
      </AnimatePresence>
    </>
  );
}
