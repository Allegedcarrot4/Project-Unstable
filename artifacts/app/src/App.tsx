import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    Ultraviolet: {
      codec: { xor: { encode: (s: string) => string; decode: (s: string) => string } };
    };
    __uv$config: {
      prefix: string;
      encodeUrl: (s: string) => string;
      decodeUrl: (s: string) => string;
    };
  }
}

const CORRECT_PASSWORD = "ripmoonlight";
const SESSION_KEY = "unstable_auth";
const UV_PREFIX = "/service/";
const SHORTCUTS_KEY = "unstable_shortcuts";
const BARE_KEY = "unstable_bare";

// ─── URL helpers ─────────────────────────────────────────────────────────────

function encodeProxyUrl(url: string): string {
  if (window.Ultraviolet && window.__uv$config) {
    return UV_PREFIX + window.__uv$config.encodeUrl(url);
  }
  return UV_PREFIX + encodeURIComponent(url);
}

function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.includes(".") && !t.includes(" ")) return "https://" + t;
  return "https://www.google.com/search?q=" + encodeURIComponent(t);
}

function decodeProxyUrl(proxyUrl: string): string {
  try {
    if (proxyUrl.startsWith(UV_PREFIX)) {
      const encoded = proxyUrl.slice(UV_PREFIX.length);
      if (window.__uv$config) return window.__uv$config.decodeUrl(decodeURIComponent(encoded));
      return decodeURIComponent(encoded);
    }
  } catch {}
  return proxyUrl;
}

function getDomainFromProxyUrl(proxyUrl: string): string {
  try {
    return new URL(decodeProxyUrl(proxyUrl)).hostname;
  } catch { return ""; }
}

function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function barePathForNum(n: number): string {
  return n === 1 ? "/api/bare/" : `/api/bare${n}/`;
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon: string;
  history: string[];
  historyIndex: number;
  loading: boolean;
}

function makeTab(url = ""): Tab {
  let title = "New Tab";
  let favicon = "";
  if (url) {
    try {
      const domain = new URL(url.startsWith("http") ? url : "https://" + url).hostname;
      title = domain;
      favicon = faviconUrl(domain);
    } catch {}
  }
  return {
    id: Math.random().toString(36).slice(2),
    title, url, favicon,
    history: url ? [url] : [],
    historyIndex: url ? 0 : -1,
    loading: false,
  };
}

// ─── Proxy / status ───────────────────────────────────────────────────────────

export type ProxyStatus =
  | { phase: "idle" }
  | { phase: "registering-sw" }
  | { phase: "waiting-sw" }
  | { phase: "connecting-transport" }
  | { phase: "ready"; bare: number }
  | { phase: "switching"; bare: number }
  | { phase: "error"; message: string };

let swRegistered = false;
let bareConn: { setTransport: (u: string, args: string[]) => Promise<void> } | null = null;
type StatusListener = (s: ProxyStatus) => void;
const statusListeners = new Set<StatusListener>();
let currentStatus: ProxyStatus = { phase: "idle" };

function emitStatus(s: ProxyStatus) {
  currentStatus = s;
  statusListeners.forEach(l => l(s));
}

async function setupProxy(bareNum = 1): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) {
      emitStatus({ phase: "error", message: "Service workers not supported" });
      return;
    }
    if (!swRegistered) {
      emitStatus({ phase: "registering-sw" });
      const existing = await navigator.serviceWorker.getRegistrations();
      for (const reg of existing) {
        if (reg.active?.scriptURL?.includes("uv.sw.js")) await reg.unregister();
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      emitStatus({ phase: "waiting-sw" });
      await navigator.serviceWorker.ready;
      swRegistered = true;
    }
    emitStatus({ phase: "connecting-transport" });
    const { BareMuxConnection } = await import("@mercuryworkshop/bare-mux");
    if (!bareConn) bareConn = new BareMuxConnection("/baremux/worker.js");
    const origin = location.origin;
    await (bareConn as any).setTransport(origin + "/api/baremod/index.mjs", [origin + barePathForNum(bareNum)]);
    emitStatus({ phase: "ready", bare: bareNum });
    console.log(`[Unstable] Proxy ready (bare${bareNum})`);
  } catch (err: unknown) {
    let msg = "unknown error";
    if (err instanceof Error) msg = err.message + (err.cause ? ` (cause: ${err.cause})` : "");
    else { try { msg = JSON.stringify(err); } catch { msg = String(err); } }
    emitStatus({ phase: "error", message: msg });
    console.error("[Unstable] Proxy setup failed:", err);
  }
}

async function switchBare(n: number): Promise<void> {
  emitStatus({ phase: "switching", bare: n });
  try {
    const { BareMuxConnection } = await import("@mercuryworkshop/bare-mux");
    if (!bareConn) bareConn = new BareMuxConnection("/baremux/worker.js");
    const origin = location.origin;
    await (bareConn as any).setTransport(origin + "/api/baremod/index.mjs", [origin + barePathForNum(n)]);
    localStorage.setItem(BARE_KEY, String(n));
    emitStatus({ phase: "ready", bare: n });
    console.log(`[Unstable] Switched to bare${n}`);
  } catch (err: unknown) {
    let msg = "switch failed";
    if (err instanceof Error) msg = err.message;
    emitStatus({ phase: "error", message: msg });
  }
}

function useProxyStatus(): ProxyStatus {
  const [status, setStatus] = useState<ProxyStatus>(currentStatus);
  useEffect(() => {
    statusListeners.add(setStatus);
    return () => { statusListeners.delete(setStatus); };
  }, []);
  return status;
}

// ─── StatusBar ───────────────────────────────────────────────────────────────

function StatusBar() {
  const status = useProxyStatus();

  const activeColor = "rgba(80,200,120,0.9)";
  const inactiveColor = "rgba(255,255,255,0.18)";
  const errorColor = "rgba(220,80,80,0.9)";
  const pendingColor = "rgba(180,160,80,0.8)";

  const isReady = status.phase === "ready" || status.phase === "switching";
  const currentBare = status.phase === "ready" ? status.bare : status.phase === "switching" ? status.bare : 0;

  const statusColor =
    status.phase === "ready" ? activeColor
    : status.phase === "error" ? errorColor
    : pendingColor;

  const label =
    status.phase === "idle" ? "proxy: idle"
    : status.phase === "registering-sw" ? "registering service worker…"
    : status.phase === "waiting-sw" ? "waiting for service worker…"
    : status.phase === "connecting-transport" ? "connecting transport…"
    : status.phase === "switching" ? `switching to bare${status.bare}…`
    : status.phase === "ready" ? `proxy: ready`
    : `error: ${status.message}`;

  return (
    <div style={{
      position: "fixed", bottom: "8px", left: "10px", zIndex: 9999,
      display: "flex", alignItems: "center", gap: "0.6rem",
      fontFamily: "'Space Grotesk', sans-serif",
      pointerEvents: "none",
    }}>
      <span style={{
        fontSize: "0.58rem", letterSpacing: "0.06em", color: statusColor,
        textShadow: "0 0 8px rgba(0,0,0,0.9)", maxWidth: "300px",
        wordBreak: "break-word",
      }}>
        {label}
      </span>

      {/* Bare server selector */}
      <span style={{ display: "flex", gap: "0.3rem", pointerEvents: "all" }}>
        {[1, 2, 3, 4].map(n => (
          <button
            key={n}
            onClick={() => switchBare(n)}
            title={`Switch to bare server ${n}`}
            style={{
              background: "none", border: "none", padding: "0 2px",
              cursor: "pointer", fontSize: "0.55rem", letterSpacing: "0.06em",
              color: currentBare === n && isReady ? activeColor : inactiveColor,
              fontFamily: "'Space Grotesk', sans-serif",
              transition: "color 0.15s",
              textShadow: "0 0 6px rgba(0,0,0,0.9)",
            }}
            onMouseEnter={e => { if (currentBare !== n) (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = currentBare === n && isReady ? activeColor : inactiveColor; }}
          >
            ws{n}
          </button>
        ))}
      </span>
    </div>
  );
}

// ─── Shortcuts ────────────────────────────────────────────────────────────────

interface Shortcut {
  id: string;
  name: string;
  url: string;
  favicon: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "google",  name: "Google",  url: "https://google.com",       favicon: faviconUrl("google.com") },
  { id: "discord", name: "Discord", url: "https://discord.com",      favicon: faviconUrl("discord.com") },
  { id: "github",  name: "GitHub",  url: "https://github.com",       favicon: faviconUrl("github.com") },
  { id: "spotify", name: "Spotify", url: "https://open.spotify.com", favicon: faviconUrl("open.spotify.com") },
  { id: "twitch",  name: "Twitch",  url: "https://twitch.tv",        favicon: faviconUrl("twitch.tv") },
];

function loadCustomShortcuts(): Shortcut[] {
  try { const r = localStorage.getItem(SHORTCUTS_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveCustomShortcuts(s: Shortcut[]) { localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(s)); }

// ─── Password screen ──────────────────────────────────────────────────────────

function PasswordScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      onSuccess();
    } else {
      setError(true); setShaking(true); setPassword("");
      setTimeout(() => setShaking(false), 500);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
        backgroundSize: "60px 60px", pointerEvents: "none",
      }} />
      <div style={{
        position: "relative", zIndex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", gap: "2rem", width: "100%", maxWidth: "360px", padding: "0 1.5rem",
      }}>
        <p style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: 0 }}>unstable</p>
        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ animation: shaking ? "shake 0.5s ease-in-out" : "none" }}>
            <input
              type="password" value={password} autoFocus
              onChange={e => { setPassword(e.target.value); setError(false); }}
              placeholder="enter password"
              style={{
                width: "100%", background: "#111", border: `1px solid ${error ? "#8b2b2b" : "#222"}`,
                color: "#e8e8e8", padding: "0.875rem 1rem", fontSize: "0.9rem",
                fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.04em",
                outline: "none", borderRadius: "2px", transition: "border-color 0.2s", boxSizing: "border-box",
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = "#444"; }}
              onBlur={e => { if (!error) e.target.style.borderColor = "#222"; }}
            />
          </div>
          {error && <p style={{ color: "#a04040", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0, textAlign: "center" }}>incorrect password</p>}
          <button type="submit" style={{
            width: "100%", background: "#e8e8e8", color: "#0d0d0d", border: "none",
            padding: "0.875rem 1rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer",
            borderRadius: "2px", transition: "background 0.15s",
          }}
            onMouseEnter={e => (e.target as HTMLButtonElement).style.background = "#bbb"}
            onMouseLeave={e => (e.target as HTMLButtonElement).style.background = "#e8e8e8"}
          >enter</button>
        </form>
      </div>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)} 30%{transform:translateX(8px)}
          45%{transform:translateX(-6px)} 60%{transform:translateX(6px)} 75%{transform:translateX(-3px)} 90%{transform:translateX(3px)}
        }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

// ─── New tab page ─────────────────────────────────────────────────────────────

function NewTabPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [input, setInput] = useState("");
  const [customShortcuts, setCustomShortcuts] = useState<Shortcut[]>(loadCustomShortcuts);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newImg, setNewImg] = useState("");

  const allShortcuts = [...DEFAULT_SHORTCUTS, ...customShortcuts];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(input);
    if (url) onNavigate(url);
  }

  function handleAddShortcut(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim(), rawUrl = newUrl.trim();
    if (!name || !rawUrl) return;
    const url = normalizeUrl(rawUrl);
    let domain = "";
    try { domain = new URL(url).hostname; } catch {}
    const favicon = newImg.trim() || faviconUrl(domain);
    const sc: Shortcut = { id: Math.random().toString(36).slice(2), name, url, favicon };
    const updated = [...customShortcuts, sc];
    setCustomShortcuts(updated);
    saveCustomShortcuts(updated);
    setAdding(false); setNewName(""); setNewUrl(""); setNewImg("");
  }

  function handleRemove(id: string) {
    const updated = customShortcuts.filter(s => s.id !== id);
    setCustomShortcuts(updated); saveCustomShortcuts(updated);
  }

  const inputStyle: React.CSSProperties = {
    background: "#0d0d0d", border: "1px solid #222", color: "#e8e8e8",
    padding: "0.5rem 0.75rem", fontSize: "0.8rem",
    fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "2px",
  };

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", background: "#0d0d0d", gap: "2rem",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", margin: 0 }}>unstable</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", width: "100%", maxWidth: "520px", padding: "0 2rem" }}>
        <input
          autoFocus value={input} onChange={e => setInput(e.target.value)}
          placeholder="search or enter a url"
          style={{
            flex: 1, background: "#111", border: "1px solid #222", borderRight: "none",
            color: "#e8e8e8", padding: "0.75rem 1rem", fontSize: "0.85rem",
            fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "2px 0 0 2px",
          }}
          onFocus={e => e.target.style.borderColor = "#444"}
          onBlur={e => e.target.style.borderColor = "#222"}
        />
        <button type="submit" style={{
          background: "#e8e8e8", color: "#0d0d0d", border: "none", padding: "0.75rem 1.25rem",
          fontSize: "0.7rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
          letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", borderRadius: "0 2px 2px 0",
        }}>go</button>
      </form>

      {/* Shortcuts */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center", padding: "0 2rem", maxWidth: "600px" }}>
        {allShortcuts.map(sc => (
          <div key={sc.id} style={{ position: "relative" }} className="sc-wrap">
            <button
              onClick={() => onNavigate(sc.url)}
              title={sc.name}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
                background: "none", border: "none", cursor: "pointer", padding: "0.6rem 0.5rem",
                borderRadius: "6px", transition: "background 0.15s", minWidth: "56px",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#161616"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "none"}
            >
              <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={sc.favicon}
                  alt={sc.name}
                  width={24} height={24}
                  style={{ borderRadius: "4px", objectFit: "contain" }}
                  onError={e => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                    const fb = img.nextSibling as HTMLElement;
                    if (fb) fb.style.display = "flex";
                  }}
                />
                <span style={{
                  display: "none", width: 24, height: 24, background: "#1e1e1e",
                  borderRadius: "4px", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", fontWeight: 600,
                }}>
                  {sc.name[0]?.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.03em", maxWidth: "60px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sc.name}
              </span>
            </button>
            {!DEFAULT_SHORTCUTS.find(d => d.id === sc.id) && (
              <button
                onClick={() => handleRemove(sc.id)}
                className="sc-remove"
                style={{
                  position: "absolute", top: "2px", right: "2px",
                  background: "#1a1a1a", border: "none", color: "rgba(255,255,255,0.45)",
                  borderRadius: "50%", width: "15px", height: "15px",
                  fontSize: "9px", cursor: "pointer", display: "none",
                  alignItems: "center", justifyContent: "center",
                }}
              >×</button>
            )}
          </div>
        ))}

        {!adding && (
          <button
            onClick={() => setAdding(true)}
            title="Add shortcut"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
              background: "none", border: "none", cursor: "pointer", padding: "0.6rem 0.5rem",
              borderRadius: "6px", transition: "background 0.15s", minWidth: "56px",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#161616"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "none"}
          >
            <div style={{
              width: 28, height: 28, borderRadius: "6px", border: "1px dashed rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", color: "rgba(255,255,255,0.2)",
            }}>+</div>
            <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.03em" }}>add</span>
          </button>
        )}
      </div>

      {/* Add shortcut form */}
      {adding && (
        <form onSubmit={handleAddShortcut} style={{
          display: "flex", flexDirection: "column", gap: "0.5rem",
          background: "#111", border: "1px solid #222", borderRadius: "4px",
          padding: "1rem 1.25rem", width: "100%", maxWidth: "300px",
        }}>
          <p style={{ margin: 0, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>new shortcut</p>
          <input autoFocus placeholder="name" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#444"} onBlur={e => e.target.style.borderColor = "#222"} />
          <input placeholder="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#444"} onBlur={e => e.target.style.borderColor = "#222"} />
          <input placeholder="image url (optional — auto-fetches favicon)" value={newImg} onChange={e => setNewImg(e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#444"} onBlur={e => e.target.style.borderColor = "#222"} />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" style={{
              flex: 1, background: "#e8e8e8", color: "#0d0d0d", border: "none", padding: "0.5rem",
              fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
              letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
            }}>add</button>
            <button type="button" onClick={() => { setAdding(false); setNewName(""); setNewUrl(""); setNewImg(""); }} style={{
              flex: 1, background: "none", color: "rgba(255,255,255,0.3)", border: "1px solid #222",
              padding: "0.5rem", fontSize: "0.62rem", fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
            }}>cancel</button>
          </div>
        </form>
      )}

      <style>{`
        .sc-wrap:hover .sc-remove { display: flex !important; }
      `}</style>
    </div>
  );
}

// ─── Browser tab ──────────────────────────────────────────────────────────────

function BrowserTab({ tab, isActive, onActivate, onClose }: {
  tab: Tab; isActive: boolean; onActivate: () => void; onClose: () => void;
}) {
  const label = tab.url ? (tab.title || getDomainFromProxyUrl(tab.url) || "Loading…") : "New Tab";
  const display = label.length > 20 ? label.slice(0, 20) + "…" : label;

  return (
    <div
      onClick={onActivate}
      style={{
        display: "flex", alignItems: "center", gap: "0.4rem",
        padding: "0 0.6rem 0 0.75rem", height: "100%", cursor: "pointer",
        background: isActive ? "#111" : "transparent",
        borderRight: "1px solid #1a1a1a",
        minWidth: "110px", maxWidth: "180px", flexShrink: 0,
        transition: "background 0.1s", position: "relative",
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#0f0f0f"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      {/* Favicon or spinner */}
      <div style={{ width: 14, height: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {tab.loading ? (
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.35)", animation: "pulse 1s ease-in-out infinite" }} />
        ) : tab.favicon ? (
          <img
            src={tab.favicon}
            alt=""
            width={14} height={14}
            style={{ borderRadius: "2px", objectFit: "contain" }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }}
          />
        ) : (
          <div style={{ width: 10, height: 10, borderRadius: "2px", background: "#333" }} />
        )}
      </div>

      <span style={{
        flex: 1, fontSize: "0.7rem",
        color: isActive ? "#e0e0e0" : "rgba(255,255,255,0.38)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        letterSpacing: "0.01em",
      }}>
        {display}
      </span>

      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.25)",
          cursor: "pointer", padding: "1px 3px", fontSize: "13px", lineHeight: 1,
          borderRadius: "2px", flexShrink: 0,
        }}
        onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"}
        onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"}
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  useEffect(() => {
    const savedBare = parseInt(localStorage.getItem(BARE_KEY) || "1", 10) || 1;
    setupProxy(savedBare);
  }, []);

  useEffect(() => {
    if (activeTab) {
      const display = activeTab.url ? decodeProxyUrl(activeTab.url) : "";
      setUrlInput(display || "");
    }
  }, [activeTabId, activeTab?.url]);

  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  function handleNavigate(url: string, tabId = activeTabId) {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    const proxyUrl = encodeProxyUrl(normalized);
    let domain = "";
    try { domain = new URL(normalized).hostname; } catch {}
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      const newHistory = [...t.history.slice(0, t.historyIndex + 1), proxyUrl];
      return {
        ...t, url: proxyUrl,
        title: domain || "Loading…",
        favicon: domain ? faviconUrl(domain) : "",
        history: newHistory, historyIndex: newHistory.length - 1, loading: true,
      };
    }));
  }

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleNavigate(urlInput);
    urlInputRef.current?.blur();
  }

  function handleBack() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.historyIndex <= 0) return;
    const newIndex = tab.historyIndex - 1;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: t.history[newIndex], historyIndex: newIndex, loading: true } : t));
  }

  function handleForward() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    const newIndex = tab.historyIndex + 1;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: t.history[newIndex], historyIndex: newIndex, loading: true } : t));
  }

  function handleReload() {
    if (!iframeRef.current) return;
    const src = iframeRef.current.src;
    iframeRef.current.src = "";
    setTimeout(() => { if (iframeRef.current) iframeRef.current.src = src; updateTab(activeTabId, { loading: true }); }, 50);
  }

  function handleNewTab() {
    const tab = makeTab();
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  }

  function handleCloseTab(id: string) {
    if (tabs.length === 1) { setTabs([makeTab()]); return; }
    const idx = tabs.findIndex(t => t.id === id);
    const next = tabs.filter(t => t.id !== id);
    setTabs(next);
    if (activeTabId === id) setActiveTabId(next[Math.min(idx, next.length - 1)].id);
  }

  function handleOpenInNewTab() {
    if (!activeTab.url) return;
    const win = window.open("about:blank", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Unstable</title><style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#0d0d0d}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe src="${activeTab.url}" allowfullscreen allow="fullscreen *;autoplay *;camera *;microphone *;payment *;clipboard-read *;clipboard-write *;encrypted-media *"></iframe></body></html>`);
    win.document.close();
  }

  const canBack = (activeTab?.historyIndex ?? -1) > 0;
  const canForward = activeTab ? activeTab.historyIndex < activeTab.history.length - 1 : false;

  const btnBase: React.CSSProperties = {
    background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer",
    padding: "0 0.35rem", fontSize: "16px", display: "flex", alignItems: "center",
    justifyContent: "center", borderRadius: "2px", height: "28px", minWidth: "26px",
    transition: "color 0.1s, background 0.1s", flexShrink: 0,
  };
  const btnDisabled: React.CSSProperties = { ...btnBase, color: "rgba(255,255,255,0.16)", cursor: "not-allowed" };

  const onHover = (active: boolean) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (active) { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      (e.target as HTMLButtonElement).style.color = active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.16)";
      (e.target as HTMLButtonElement).style.background = "none";
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden" }}>
      {!fullscreen && (
        <>
          {/* Tab bar */}
          <div style={{ display: "flex", alignItems: "stretch", background: "#080808", borderBottom: "1px solid #1a1a1a", height: "36px", flexShrink: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {tabs.map(tab => (
                <BrowserTab
                  key={tab.id} tab={tab} isActive={tab.id === activeTabId}
                  onActivate={() => setActiveTabId(tab.id)}
                  onClose={() => handleCloseTab(tab.id)}
                />
              ))}
            </div>
            <button onClick={handleNewTab}
              style={{ background: "none", border: "none", borderLeft: "1px solid #1a1a1a", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "0 0.9rem", fontSize: "18px", lineHeight: 1, flexShrink: 0, transition: "color 0.1s" }}
              onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"}
              onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"}
              title="New tab">+</button>
            <button onClick={onLogout}
              style={{ background: "none", border: "none", borderLeft: "1px solid #1a1a1a", color: "rgba(255,255,255,0.18)", cursor: "pointer", padding: "0 0.8rem", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0, transition: "color 0.1s" }}
              onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "rgba(220,80,80,0.8)"}
              onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.18)"}
              title="Lock">lock</button>
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", padding: "0.35rem 0.6rem", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
            <button onClick={handleBack} disabled={!canBack} style={canBack ? btnBase : btnDisabled} {...onHover(canBack)} title="Back">←</button>
            <button onClick={handleForward} disabled={!canForward} style={canForward ? btnBase : btnDisabled} {...onHover(canForward)} title="Forward">→</button>
            <button onClick={handleReload} style={btnBase} {...onHover(true)} title="Reload">↺</button>

            <div style={{ width: "1px", height: "16px", background: "#1e1e1e", margin: "0 0.2rem", flexShrink: 0 }} />

            <form onSubmit={handleUrlSubmit} style={{ flex: 1, display: "flex" }}>
              <input
                ref={urlInputRef} value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onFocus={e => { e.target.select(); e.target.style.borderColor = "#444"; }}
                onBlur={e => e.target.style.borderColor = "#1e1e1e"}
                placeholder="search or enter a url"
                style={{
                  width: "100%", background: "#0a0a0a", border: "1px solid #1e1e1e",
                  color: "#e0e0e0", padding: "0.28rem 0.65rem", fontSize: "0.78rem",
                  fontFamily: "'Space Grotesk', sans-serif", outline: "none",
                  borderRadius: "12px", letterSpacing: "0.01em", transition: "border-color 0.15s",
                }}
              />
            </form>

            <div style={{ width: "1px", height: "16px", background: "#1e1e1e", margin: "0 0.2rem", flexShrink: 0 }} />

            <button onClick={handleOpenInNewTab} style={btnBase} {...onHover(true)} title="Open in new window">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </button>
            <button onClick={() => setFullscreen(f => !f)} style={btnBase} {...onHover(true)} title="Fullscreen">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Content */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {fullscreen && (
          <button onClick={() => setFullscreen(false)} style={{
            position: "absolute", top: "12px", right: "12px", zIndex: 999,
            background: "rgba(0,0,0,0.6)", border: "1px solid #333", color: "#e8e8e8",
            cursor: "pointer", padding: "6px 10px", borderRadius: "2px",
            fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase",
          }}>exit fullscreen</button>
        )}
        {tabs.map(tab => (
          <div key={tab.id} style={{ position: "absolute", inset: 0, display: tab.id === activeTabId ? "block" : "none" }}>
            {tab.url ? (
              <iframe
                ref={tab.id === activeTabId ? iframeRef : undefined}
                src={tab.url}
                style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                allow="fullscreen *;autoplay *;camera *;microphone *;payment *;clipboard-read *;clipboard-write *;encrypted-media *"
                onLoad={() => updateTab(tab.id, { loading: false })}
                onError={() => updateTab(tab.id, { loading: false })}
              />
            ) : (
              <NewTabPage onNavigate={url => handleNavigate(url, tab.id)} />
            )}
          </div>
        ))}
      </div>

      <StatusBar />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.35} 50%{opacity:1} }
        input::placeholder { color: rgba(255,255,255,0.18); }
      `}</style>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === "true");

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    swRegistered = false;
    bareConn = null;
    setAuthenticated(false);
  }

  if (!authenticated) return <PasswordScreen onSuccess={() => setAuthenticated(true)} />;
  return <BrowserApp onLogout={handleLogout} />;
}
