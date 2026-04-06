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
const SCRAM_PREFIX = "/scramjet/";

function encodeProxyUrl(url: string): string {
  if (window.Ultraviolet && window.__uv$config) {
    return UV_PREFIX + window.__uv$config.encodeUrl(url);
  }
  return UV_PREFIX + encodeURIComponent(url);
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    return "https://" + trimmed;
  }
  return "https://www.google.com/search?q=" + encodeURIComponent(trimmed);
}

function getDisplayUrl(proxyUrl: string): string {
  try {
    if (proxyUrl.startsWith(UV_PREFIX)) {
      const encoded = proxyUrl.slice(UV_PREFIX.length);
      if (window.__uv$config) {
        return window.__uv$config.decodeUrl(decodeURIComponent(encoded));
      }
    }
  } catch {}
  return proxyUrl;
}

type Engine = "uv" | "scramjet" | "auto";

interface Tab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
  engine: Engine;
  loading: boolean;
}

function makeTab(url = ""): Tab {
  return {
    id: Math.random().toString(36).slice(2),
    title: url ? new URL(url.startsWith("http") ? url : "https://" + url).hostname : "New Tab",
    url,
    history: url ? [url] : [],
    historyIndex: url ? 0 : -1,
    engine: "auto",
    loading: false,
  };
}

let swReady = false;

async function setupProxy(): Promise<void> {
  if (swReady) return;
  try {
    if (!("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.register("/uv.sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const { BareMuxConnection } = await import("@mercuryworkshop/bare-mux");
    const conn = new BareMuxConnection("/baremux/worker.js");
    await conn.setTransport("/api/baremod/index.mjs", ["/api/bare/"]);
    swReady = true;
    console.log("[Unstable] Proxy ready");
  } catch (err) {
    console.warn("[Unstable] Proxy setup failed:", err);
  }
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
        alignItems: "center", gap: "2.5rem", width: "100%", maxWidth: "360px", padding: "0 1.5rem",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "2px", height: "32px", background: "rgba(255,255,255,0.3)", margin: "0 auto 1.5rem" }} />
          <p style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: 0 }}>unstable</p>
        </div>
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
          {error && <p style={{ color: "#a04040", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0, textAlign: "center" }}>incorrect password</p>}
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
        <div style={{ width: "2px", height: "32px", background: "rgba(255,255,255,0.3)", margin: "0 auto" }} />
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

function NewTabPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [input, setInput] = useState("");
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(input);
    if (url) onNavigate(url);
  }
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", background: "#0d0d0d", gap: "2rem",
    }}>
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", margin: 0 }}>unstable</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0", width: "100%", maxWidth: "520px", padding: "0 2rem" }}>
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
          padding: "2px 4px", fontSize: "14px", lineHeight: 1, borderRadius: "2px",
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"}
        onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"}
      >
        ×
      </button>
    </div>
  );
}

function BrowserApp() {
  const [tabs, setTabs] = useState<Tab[]>([makeTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [urlInput, setUrlInput] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [proxyReady, setProxyReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  useEffect(() => {
    setupProxy().then(() => setProxyReady(true));
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
    const iframeSrc = activeTab.url;
    const win = window.open("about:blank", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Unstable</title>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#0d0d0d}iframe{width:100%;height:100%;border:none;display:block}</style>
</head>
<body>
<iframe src="${iframeSrc}" allowfullscreen allow="fullscreen *; autoplay *; camera *; microphone *; payment *; clipboard-read *; clipboard-write *; encrypted-media *"></iframe>
</body>
</html>`);
    win.document.close();
  }

  function handleFullscreen() {
    setFullscreen(f => !f);
  }

  const canBack = (activeTab?.historyIndex ?? -1) > 0;
  const canForward = activeTab ? activeTab.historyIndex < activeTab.history.length - 1 : false;

  const toolbarBtnStyle: React.CSSProperties = {
    background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer",
    padding: "0 0.4rem", fontSize: "16px", display: "flex", alignItems: "center",
    justifyContent: "center", borderRadius: "2px", height: "28px", minWidth: "28px",
    transition: "color 0.1s, background 0.1s",
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
                fontSize: "18px", lineHeight: 1, flexShrink: 0,
                transition: "color 0.1s",
              }}
              onMouseEnter={e => (e.target as HTMLButtonElement).style.color = "#e8e8e8"}
              onMouseLeave={e => (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)"}
              title="New tab"
            >
              +
            </button>
          </div>

          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.25rem",
            padding: "0.4rem 0.75rem", background: "#0d0d0d",
            borderBottom: "1px solid #1a1a1a", flexShrink: 0,
          }}>
            <button
              onClick={handleBack} disabled={!canBack}
              style={canBack ? toolbarBtnStyle : disabledBtnStyle}
              onMouseEnter={e => { if (canBack) { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; } }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = canBack ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)"; (e.target as HTMLButtonElement).style.background = "none"; }}
              title="Go back"
            >←</button>
            <button
              onClick={handleForward} disabled={!canForward}
              style={canForward ? toolbarBtnStyle : disabledBtnStyle}
              onMouseEnter={e => { if (canForward) { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; } }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = canForward ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)"; (e.target as HTMLButtonElement).style.background = "none"; }}
              title="Go forward"
            >→</button>
            <button
              onClick={handleReload}
              style={toolbarBtnStyle}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.target as HTMLButtonElement).style.background = "none"; }}
              title="Reload"
            >↺</button>

            <div style={{ width: "1px", height: "18px", background: "#222", margin: "0 0.25rem" }} />

            {/* URL Bar */}
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

            <div style={{ width: "1px", height: "18px", background: "#222", margin: "0 0.25rem" }} />

            <button
              onClick={handleOpenInNewTab}
              style={toolbarBtnStyle}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.target as HTMLButtonElement).style.background = "none"; }}
              title="Open in new tab (about:blank)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </button>
            <button
              onClick={handleFullscreen}
              style={toolbarBtnStyle}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "#e8e8e8"; (e.target as HTMLButtonElement).style.background = "#1a1a1a"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.target as HTMLButtonElement).style.background = "none"; }}
              title="Fullscreen"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Content */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {fullscreen && (
          <button
            onClick={handleFullscreen}
            style={{
              position: "absolute", top: "12px", right: "12px", zIndex: 999,
              background: "rgba(0,0,0,0.6)", border: "1px solid #333", color: "#e8e8e8",
              cursor: "pointer", padding: "6px 10px", borderRadius: "2px",
              fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.65rem",
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}
          >
            exit fullscreen
          </button>
        )}
        {tabs.map(tab => (
          <div
            key={tab.id}
            style={{
              position: "absolute", inset: 0,
              display: tab.id === activeTabId ? "block" : "none",
            }}
          >
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

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === "true");
  if (!authenticated) return <PasswordScreen onSuccess={() => setAuthenticated(true)} />;
  return <BrowserApp />;
}
