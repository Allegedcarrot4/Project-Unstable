import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    Ultraviolet: {
      codec: {
        xor: {
          encode: (str: string) => string;
          decode: (str: string) => string;
        };
      };
    };
    __uv$config: {
      prefix: string;
      encodeUrl: (str: string) => string;
      decodeUrl: (str: string) => string;
    };
  }
}

const CORRECT_PASSWORD = "ripmoonlight";
const SESSION_KEY = "unstable_auth";
const UV_PREFIX = "/service/";

function encodeProxyUrl(url: string): string {
  if (window.Ultraviolet && window.__uv$config) {
    return UV_PREFIX + window.__uv$config.encodeUrl(url);
  }
  return UV_PREFIX + encodeURIComponent(url);
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" ")) return "https://" + trimmed;
  return "https://www.google.com/search?q=" + encodeURIComponent(trimmed);
}

function getDisplayUrl(proxyUrl: string): string {
  try {
    if (proxyUrl.startsWith(UV_PREFIX)) {
      const encoded = proxyUrl.slice(UV_PREFIX.length);
      if (window.__uv$config) return window.__uv$config.decodeUrl(decodeURIComponent(encoded));
    }
  } catch {}
  return proxyUrl;
}

interface Tab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
  loading: boolean;
}

function makeTab(url = ""): Tab {
  return {
    id: Math.random().toString(36).slice(2),
    title: url ? new URL(url.startsWith("http") ? url : "https://" + url).hostname : "New Tab",
    url,
    history: url ? [url] : [],
    historyIndex: url ? 0 : -1,
    loading: false,
  };
}

export type ProxyStatus =
  | { phase: "idle" }
  | { phase: "registering-sw" }
  | { phase: "waiting-sw" }
  | { phase: "connecting-transport" }
  | { phase: "ready" }
  | { phase: "error"; message: string };

let swReady = false;
type StatusListener = (s: ProxyStatus) => void;
const statusListeners = new Set<StatusListener>();
let currentStatus: ProxyStatus = { phase: "idle" };

function emitStatus(s: ProxyStatus) {
  currentStatus = s;
  statusListeners.forEach(l => l(s));
}

async function setupProxy(): Promise<void> {
  if (swReady) return;
  try {
    if (!("serviceWorker" in navigator)) {
      emitStatus({ phase: "error", message: "Service workers not supported in this context" });
      return;
    }

    emitStatus({ phase: "registering-sw" });
    // Unregister any stale service workers (e.g. old uv.sw.js registration)
    const existing = await navigator.serviceWorker.getRegistrations();
    for (const reg of existing) {
      if (reg.active?.scriptURL?.includes("uv.sw.js")) await reg.unregister();
    }
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    emitStatus({ phase: "waiting-sw" });
    await navigator.serviceWorker.ready;

    emitStatus({ phase: "connecting-transport" });
    const { BareMuxConnection } = await import("@mercuryworkshop/bare-mux");
    const conn = new BareMuxConnection("/baremux/worker.js");

    // Use absolute URLs so the SharedWorker's dynamic import resolves correctly
    const origin = location.origin;
    const baremodUrl = origin + "/api/baremod/index.mjs";
    const bareServerUrl = origin + "/api/bare/";

    await conn.setTransport(baremodUrl, [bareServerUrl]);

    swReady = true;
    emitStatus({ phase: "ready" });
    console.log("[Unstable] Proxy ready");
  } catch (err: unknown) {
    let msg = "unknown error";
    if (err instanceof Error) {
      msg = err.message + (err.cause ? ` (cause: ${err.cause})` : "");
    } else if (typeof err === "string") {
      msg = err;
    } else {
      try { msg = JSON.stringify(err); } catch { msg = String(err); }
    }
    emitStatus({ phase: "error", message: msg });
    console.error("[Unstable] Proxy setup failed:", err);
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

function StatusBar() {
  const status = useProxyStatus();

  const color =
    status.phase === "ready" ? "rgba(80,200,120,0.8)"
    : status.phase === "error" ? "rgba(220,80,80,0.9)"
    : "rgba(180,160,80,0.75)";

  const label =
    status.phase === "idle" ? "proxy: idle"
    : status.phase === "registering-sw" ? "registering service worker…"
    : status.phase === "waiting-sw" ? "waiting for service worker…"
    : status.phase === "connecting-transport" ? "connecting transport…"
    : status.phase === "ready" ? "proxy: ready"
    : `error: ${status.message}`;

  return (
    <div style={{
      position: "fixed", bottom: "10px", left: "10px", zIndex: 9999,
      fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.62rem",
      letterSpacing: "0.06em", color,
      maxWidth: "420px", wordBreak: "break-word",
      textShadow: "0 0 8px rgba(0,0,0,0.8)",
      pointerEvents: "none",
    }}>
      {label}
    </div>
  );
}

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
      setError(true);
      setShaking(true);
      setPassword("");
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
        <p style={{
          fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.3em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: 0,
        }}>unstable</p>

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
                outline: "none", borderRadius: "2px", transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = "#444"; }}
              onBlur={e => { if (!error) e.target.style.borderColor = "#222"; }}
            />
          </div>
          {error && (
            <p style={{
              color: "#a04040", fontSize: "0.68rem", letterSpacing: "0.15em",
              textTransform: "uppercase", margin: 0, textAlign: "center",
            }}>incorrect password</p>
          )}
          <button type="submit" style={{
            width: "100%", background: "#e8e8e8", color: "#0d0d0d", border: "none",
            padding: "0.875rem 1rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer",
            borderRadius: "2px", transition: "background 0.15s",
          }}
            onMouseEnter={e => (e.target as HTMLButtonElement).style.background = "#bbb"}
            onMouseLeave={e => (e.target as HTMLButtonElement).style.background = "#e8e8e8"}
          >
            enter
          </button>
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

const SHORTCUTS_KEY = "unstable_shortcuts";

interface Shortcut {
  id: string;
  name: string;
  url: string;
  favicon: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "google",  name: "Google",  url: "https://google.com",       favicon: "https://www.google.com/favicon.ico" },
  { id: "discord", name: "Discord", url: "https://discord.com",      favicon: "https://discord.com/assets/favicon.ico" },
  { id: "github",  name: "GitHub",  url: "https://github.com",       favicon: "https://github.com/favicon.ico" },
  { id: "spotify", name: "Spotify", url: "https://open.spotify.com", favicon: "https://open.spotify.com/favicon.ico" },
  { id: "twitch",  name: "Twitch",  url: "https://twitch.tv",        favicon: "https://static.twitchsvc.net/assets/uploads/favicon-32x32.png" },
];

function loadCustomShortcuts(): Shortcut[] {
  try {
    const raw = localStorage.getItem(SHORTCUTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomShortcuts(shortcuts: Shortcut[]) {
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
}

function NewTabPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [input, setInput] = useState("");
  const [customShortcuts, setCustomShortcuts] = useState<Shortcut[]>(loadCustomShortcuts);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const allShortcuts = [...DEFAULT_SHORTCUTS, ...customShortcuts];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(input);
    if (url) onNavigate(url);
  }

  function handleAddShortcut(e: React.FormEvent) {
    e.preventDefault();
    const trimName = newName.trim();
    const trimUrl = newUrl.trim();
    if (!trimName || !trimUrl) return;
    const normalized = normalizeUrl(trimUrl);
    let faviconBase = normalized;
    try { faviconBase = new URL(normalized).origin; } catch {}
    const shortcut: Shortcut = {
      id: Math.random().toString(36).slice(2),
      name: trimName,
      url: normalized,
      favicon: faviconBase + "/favicon.ico",
    };
    const updated = [...customShortcuts, shortcut];
    setCustomShortcuts(updated);
    saveCustomShortcuts(updated);
    setAdding(false);
    setNewName("");
    setNewUrl("");
  }

  function handleRemoveShortcut(id: string) {
    const updated = customShortcuts.filter(s => s.id !== id);
    setCustomShortcuts(updated);
    saveCustomShortcuts(updated);
  }

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", background: "#0d0d0d", gap: "2rem",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", margin: 0 }}>unstable</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", width: "100%", maxWidth: "520px", padding: "0 2rem" }}>
        <input
          autoFocus value={input}
          onChange={e => setInput(e.target.value)}
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

      {/* Shortcuts row */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", justifyContent: "center", padding: "0 2rem" }}>
        {allShortcuts.map(sc => (
          <div key={sc.id} style={{ position: "relative" }} className="shortcut-wrap">
            <button
              onClick={() => onNavigate(sc.url)}
              title={sc.name}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.45rem",
                background: "none", border: "none", cursor: "pointer", padding: "0.5rem 0.25rem",
                borderRadius: "4px", transition: "background 0.15s", minWidth: "52px",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#161616"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "none"}
            >
              <img
                src={sc.favicon}
                alt={sc.name}
                width={22} height={22}
                style={{ borderRadius: "4px", objectFit: "contain" }}
                onError={e => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const el = (e.target as HTMLImageElement).nextSibling as HTMLElement;
                  if (el) el.style.display = "flex";
                }}
              />
              <span style={{
                display: "none", width: 22, height: 22, background: "#222", borderRadius: "4px",
                alignItems: "center", justifyContent: "center", fontSize: "0.65rem",
                color: "rgba(255,255,255,0.4)",
              }}>
                {sc.name[0]?.toUpperCase()}
              </span>
              <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em", maxWidth: "56px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sc.name}
              </span>
            </button>
            {/* Remove button for custom shortcuts */}
            {!DEFAULT_SHORTCUTS.find(d => d.id === sc.id) && (
              <button
                onClick={() => handleRemoveShortcut(sc.id)}
                className="shortcut-remove"
                style={{
                  position: "absolute", top: "0", right: "0",
                  background: "#222", border: "none", color: "rgba(255,255,255,0.5)",
                  borderRadius: "50%", width: "14px", height: "14px",
                  fontSize: "9px", cursor: "pointer", display: "none",
                  alignItems: "center", justifyContent: "center", lineHeight: 1,
                }}
              >×</button>
            )}
          </div>
        ))}

        {/* Add shortcut button */}
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            title="Add shortcut"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.45rem",
              background: "none", border: "none", cursor: "pointer", padding: "0.5rem 0.25rem",
              borderRadius: "4px", transition: "background 0.15s", minWidth: "52px",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#161616"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "none"}
          >
            <div style={{
              width: 22, height: 22, borderRadius: "4px", border: "1px dashed rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: "rgba(255,255,255,0.25)",
            }}>+</div>
            <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>add</span>
          </button>
        )}
      </div>

      {/* Add shortcut inline form */}
      {adding && (
        <form onSubmit={handleAddShortcut} style={{
          display: "flex", flexDirection: "column", gap: "0.5rem",
          background: "#111", border: "1px solid #222", borderRadius: "4px",
          padding: "1rem 1.25rem", width: "100%", maxWidth: "320px",
        }}>
          <p style={{ margin: 0, fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>new shortcut</p>
          <input
            autoFocus
            placeholder="name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{
              background: "#0d0d0d", border: "1px solid #222", color: "#e8e8e8",
              padding: "0.5rem 0.75rem", fontSize: "0.8rem",
              fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "2px",
            }}
            onFocus={e => e.target.style.borderColor = "#444"}
            onBlur={e => e.target.style.borderColor = "#222"}
          />
          <input
            placeholder="url"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            style={{
              background: "#0d0d0d", border: "1px solid #222", color: "#e8e8e8",
              padding: "0.5rem 0.75rem", fontSize: "0.8rem",
              fontFamily: "'Space Grotesk', sans-serif", outline: "none", borderRadius: "2px",
            }}
            onFocus={e => e.target.style.borderColor = "#444"}
            onBlur={e => e.target.style.borderColor = "#222"}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" style={{
              flex: 1, background: "#e8e8e8", color: "#0d0d0d", border: "none",
              padding: "0.5rem", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase",
              cursor: "pointer", borderRadius: "2px",
            }}>add</button>
            <button type="button" onClick={() => { setAdding(false); setNewName(""); setNewUrl(""); }} style={{
              flex: 1, background: "none", color: "rgba(255,255,255,0.3)", border: "1px solid #222",
              padding: "0.5rem", fontSize: "0.65rem", fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px",
            }}>cancel</button>
          </div>
        </form>
      )}

      <style>{`
        .shortcut-wrap:hover .shortcut-remove { display: flex !important; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

function BrowserTab({
  tab, isActive, onActivate, onClose,
}: { tab: Tab; isActive: boolean; onActivate: () => void; onClose: () => void }) {
  const label = tab.url ? (tab.title || tab.url) : "New Tab";
  const display = label.length > 22 ? label.slice(0, 22) + "…" : label;
  return (
    <div
      onClick={onActivate}
      style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        padding: "0 0.75rem 0 1rem", height: "100%", cursor: "pointer",
        background: isActive ? "#111" : "transparent",
        borderRight: "1px solid #1a1a1a",
        minWidth: "120px", maxWidth: "180px",
        position: "relative",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#0f0f0f"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      {tab.loading && (
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "rgba(255,255,255,0.4)", flexShrink: 0, animation: "pulse 1s ease-in-out infinite" }} />
      )}
      <span style={{ flex: 1, fontSize: "0.72rem", color: isActive ? "#e8e8e8" : "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
        {display}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer",
          padding: "2px 4px", fontSize: "14px", lineHeight: 1, borderRadius: "2px", flexShrink: 0,
        }}
        onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"}
        onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"}
      >×</button>
    </div>
  );
}

function BrowserApp({ onLogout }: { onLogout: () => void }) {
  const [tabs, setTabs] = useState<Tab[]>([makeTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [urlInput, setUrlInput] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  useEffect(() => {
    setupProxy();
  }, []);

  useEffect(() => {
    if (activeTab) {
      const display = activeTab.url ? getDisplayUrl(activeTab.url) : "";
      setUrlInput(display || activeTab.url || "");
    }
  }, [activeTabId, activeTab?.url]);

  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  function handleNavigate(url: string, tabId = activeTabId) {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    const proxyUrl = encodeProxyUrl(normalized);
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      const newHistory = [...t.history.slice(0, t.historyIndex + 1), proxyUrl];
      return { ...t, url: proxyUrl, history: newHistory, historyIndex: newHistory.length - 1, loading: true, title: new URL(normalized).hostname };
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
    const url = tab.history[newIndex];
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, historyIndex: newIndex, loading: true } : t));
  }

  function handleForward() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    const newIndex = tab.historyIndex + 1;
    const url = tab.history[newIndex];
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, historyIndex: newIndex, loading: true } : t));
  }

  function handleReload() {
    if (!iframeRef.current) return;
    const currentUrl = iframeRef.current.src;
    iframeRef.current.src = "";
    setTimeout(() => {
      if (iframeRef.current) iframeRef.current.src = currentUrl;
      updateTab(activeTabId, { loading: true });
    }, 50);
  }

  function handleNewTab() {
    const tab = makeTab();
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  }

  function handleCloseTab(id: string) {
    if (tabs.length === 1) {
      setTabs([makeTab()]);
      return;
    }
    const idx = tabs.findIndex(t => t.id === id);
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      const newActive = newTabs[Math.min(idx, newTabs.length - 1)];
      setActiveTabId(newActive.id);
    }
  }

  function handleOpenInNewTab() {
    if (!activeTab.url) return;
    const win = window.open("about:blank", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Unstable</title><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#0d0d0d}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe src="${activeTab.url}" allowfullscreen allow="fullscreen *; autoplay *; camera *; microphone *; payment *; clipboard-read *; clipboard-write *; encrypted-media *"></iframe></body></html>`);
    win.document.close();
  }

  function handleFullscreen() { setFullscreen(f => !f); }

  const canBack = (activeTab?.historyIndex ?? -1) > 0;
  const canForward = activeTab ? activeTab.historyIndex < activeTab.history.length - 1 : false;

  const toolbarBtnStyle: React.CSSProperties = {
    background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer",
    padding: "0 0.4rem", fontSize: "16px", display: "flex", alignItems: "center",
    justifyContent: "center", borderRadius: "2px", height: "28px", minWidth: "28px",
    transition: "color 0.1s, background 0.1s", flexShrink: 0,
  };
  const disabledBtnStyle: React.CSSProperties = { ...toolbarBtnStyle, color: "rgba(255,255,255,0.18)", cursor: "not-allowed" };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden",
    }}>
      {!fullscreen && (
        <>
          {/* Tab bar */}
          <div style={{
            display: "flex", alignItems: "stretch", background: "#080808",
            borderBottom: "1px solid #1a1a1a", height: "36px", flexShrink: 0, overflow: "hidden",
          }}>
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {tabs.map(tab => (
                <BrowserTab
                  key={tab.id} tab={tab} isActive={tab.id === activeTabId}
                  onActivate={() => setActiveTabId(tab.id)}
                  onClose={() => handleCloseTab(tab.id)}
                />
              ))}
            </div>
            <button
              onClick={handleNewTab}
              style={{
                background: "none", border: "none", borderLeft: "1px solid #1a1a1a",
                color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: "0 1rem",
                fontSize: "18px", lineHeight: 1, flexShrink: 0, transition: "color 0.1s",
              }}
              onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"}
              onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)"}
              title="New tab"
            >+</button>

            {/* Logout button in tab bar */}
            <button
              onClick={onLogout}
              style={{
                background: "none", border: "none", borderLeft: "1px solid #1a1a1a",
                color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: "0 0.85rem",
                fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase",
                fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0, transition: "color 0.1s",
              }}
              onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "rgba(255,80,80,0.8)"}
              onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.2)"}
              title="Lock"
            >lock</button>
          </div>

          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.25rem",
            padding: "0.4rem 0.75rem", background: "#0d0d0d",
            borderBottom: "1px solid #1a1a1a", flexShrink: 0,
          }}>
            <button onClick={handleBack} disabled={!canBack} style={canBack ? toolbarBtnStyle : disabledBtnStyle}
              onMouseEnter={e => { if (canBack) { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; } }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = canBack ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)"; (e.target as HTMLButtonElement).style.background = "none"; }}
              title="Go back">←</button>
            <button onClick={handleForward} disabled={!canForward} style={canForward ? toolbarBtnStyle : disabledBtnStyle}
              onMouseEnter={e => { if (canForward) { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; } }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = canForward ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)"; (e.target as HTMLButtonElement).style.background = "none"; }}
              title="Go forward">→</button>
            <button onClick={handleReload} style={toolbarBtnStyle}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.target as HTMLButtonElement).style.background = "none"; }}
              title="Reload">↺</button>

            <div style={{ width: "1px", height: "18px", background: "#222", margin: "0 0.25rem", flexShrink: 0 }} />

            <form onSubmit={handleUrlSubmit} style={{ flex: 1, display: "flex" }}>
              <input
                ref={urlInputRef}
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onFocus={e => { e.target.select(); e.target.style.borderColor = "#444"; }}
                onBlur={e => { e.target.style.borderColor = "#222"; }}
                placeholder="search or enter a url"
                style={{
                  width: "100%", background: "#111", border: "1px solid #222",
                  color: "#e8e8e8", padding: "0.3rem 0.75rem", fontSize: "0.8rem",
                  fontFamily: "'Space Grotesk', sans-serif", outline: "none",
                  borderRadius: "2px", letterSpacing: "0.01em", transition: "border-color 0.15s",
                }}
                onMouseEnter={e => { if (document.activeElement !== e.target) (e.target as HTMLInputElement).style.borderColor = "#333"; }}
                onMouseLeave={e => { if (document.activeElement !== e.target) (e.target as HTMLInputElement).style.borderColor = "#222"; }}
              />
            </form>

            <div style={{ width: "1px", height: "18px", background: "#222", margin: "0 0.25rem", flexShrink: 0 }} />

            <button onClick={handleOpenInNewTab} style={toolbarBtnStyle}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.target as HTMLButtonElement).style.background = "none"; }}
              title="Open in new window">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </button>
            <button onClick={handleFullscreen} style={toolbarBtnStyle}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.target as HTMLButtonElement).style.background = "none"; }}
              title="Fullscreen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Content area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {fullscreen && (
          <button onClick={handleFullscreen} style={{
            position: "absolute", top: "12px", right: "12px", zIndex: 999,
            background: "rgba(0,0,0,0.6)", border: "1px solid #333", color: "#e8e8e8",
            cursor: "pointer", padding: "6px 10px", borderRadius: "2px",
            fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.65rem",
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>exit fullscreen</button>
        )}
        {tabs.map(tab => (
          <div key={tab.id} style={{ position: "absolute", inset: 0, display: tab.id === activeTabId ? "block" : "none" }}>
            {tab.url ? (
              <iframe
                ref={tab.id === activeTabId ? iframeRef : undefined}
                src={tab.url}
                style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                allow="fullscreen *; autoplay *; camera *; microphone *; payment *; clipboard-read *; clipboard-write *; encrypted-media *"
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
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === "true");

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    swReady = false;
    setAuthenticated(false);
  }

  if (!authenticated) return <PasswordScreen onSuccess={() => setAuthenticated(true)} />;
  return <BrowserApp onLogout={handleLogout} />;
}
