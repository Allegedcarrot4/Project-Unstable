// ─── Proxy utility functions extracted from App.tsx ───────────────────────────

export const UV_PREFIX = "/service/";
export const SCRAMJET_PREFIX = "/ham/";
export const NOVA_PREFIX = "/nova/";
export const MOONBEAM_PREFIX = "/mb/";

export type ProxyEngine = "auto" | "uv" | "scramjet";
export type TransportMode = "auto" | "wisp" | "bare" | "epoxy" | "drift" | "nova" | "moonbeam";

// Nova Transport Mode - uses @nightnetwork/nova WASM LibCurl
// MoonBeam Transport Mode - uses @nightnetwork/moonbeam relay for multiplexed Wisp

// ScrController type for Scramjet integration
export interface ScramjetCtrl {
  init(): Promise<void>;
  encodeUrl(url: string | URL): string;
  decodeUrl(url: string | URL): string;
  createFrame(frame?: HTMLIFrameElement): any;
}

// Settings subset needed for proxy decisions
export interface ProxySettings {
  proxyEngine: ProxyEngine;
  siteEngineOverrides: Record<string, ProxyEngine>;
  searchEngine: string;
}

function searchUrl(query: string, engine: string) {
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
  const e = SEARCH_ENGINES[engine] ?? SEARCH_ENGINES.duckduckgo;
  return e.url + encodeURIComponent(query);
}

export function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

export function extractDomain(url: string) {
  try { return new URL(url).hostname; } catch { return ""; }
}

export function stripTrackingParams(url: string): string {
  try {
    const u = new URL(url);
    const params = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid","mc_cid","mc_eid","_hsenc","_hsmi","hsCtaTracking"];
    let changed = false;
    for (const p of params) { if (u.searchParams.has(p)) { u.searchParams.delete(p); changed = true; } }
    return changed ? u.toString() : url;
  } catch { return url; }
}

export function getEffectiveEngine(url: string, settings: ProxySettings): ProxyEngine {
  try {
    const host = new URL(url).hostname;
    if (settings.siteEngineOverrides[host]) return settings.siteEngineOverrides[host];
  } catch {}
  return settings.proxyEngine;
}

export function encodeProxyUrl(
  url: string,
  engine: ProxyEngine = "auto",
  settings?: ProxySettings,
  scrController?: ScramjetCtrl | null,
): string {
  const cleaned = stripTrackingParams(url);
  const effEngine = settings ? getEffectiveEngine(cleaned, settings) : engine;
  const useScramjet = (effEngine === "auto" || effEngine === "scramjet") && scrController !== null;
  if (useScramjet) {
    try { return scrController!.encodeUrl(cleaned); } catch { /* fall through */ }
  }
  if (effEngine === "scramjet" && !scrController) {
    throw new Error("Scramjet controller not ready");
  }
  if (window.Ultraviolet && window.__uv$config) return UV_PREFIX + window.__uv$config.encodeUrl(cleaned);
  return UV_PREFIX + encodeURIComponent(cleaned);
}

export function decodeProxyUrl(url: string, scrController?: ScramjetCtrl | null): string {
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

export function hostnameFromTabUrl(tabUrl: string, scrController?: ScramjetCtrl | null): string | null {
  if (!tabUrl || tabUrl.startsWith("unstable://")) return null;
  try {
    return new URL(decodeProxyUrl(tabUrl, scrController)).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isGameModeHost(hostname: string | null, gameModeEnabled: boolean, gameModeSites: string[]): boolean {
  if (!gameModeEnabled || !hostname) return false;
  return gameModeSites.some((raw) => {
    const site = raw.trim().toLowerCase().replace(/^www\./, "");
    if (!site) return false;
    return hostname === site || hostname.endsWith("." + site);
  });
}

export function isGameModeTabUrl(tabUrl: string, gameModeEnabled: boolean, gameModeSites: string[], scrController?: ScramjetCtrl | null): boolean {
  return isGameModeHost(hostnameFromTabUrl(tabUrl, scrController), gameModeEnabled, gameModeSites);
}

export function getDomainFromProxyUrl(url: string, scrController?: ScramjetCtrl | null): string {
  try { return new URL(decodeProxyUrl(url, scrController)).hostname; } catch { return ""; }
}

export function barePathForNum(n: number): string {
  return n === 1 ? "/api/cdn/" : `/api/cdn${n}/`;
}

export function normalizeUrl(input: string, searchEngine?: string): string {
  const t = input.trim();
  if (!t) return "";
  if (t.startsWith("unstable://")) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.includes(".") && !t.includes(" ")) return "https://" + t;
  return searchUrl(t, searchEngine ?? "duckduckgo");
}

// Wisp transport encoding/decoding
export async function encodeWispUrl(url: string): Promise<string> {
  const cleaned = stripTrackingParams(url);
  if (window.__wispLibCurl) {
    try {
      const encoded = await window.__wispLibCurl.encodeUrl(cleaned);
      return NOVA_PREFIX + encoded;
    } catch {}
  }
  return NOVA_PREFIX + encodeURIComponent(cleaned);
}

export async function decodeWispUrl(url: string): Promise<string> {
  try {
    if (url.startsWith(NOVA_PREFIX)) {
      const enc = url.slice(NOVA_PREFIX.length);
      if (window.__wispLibCurl) return await window.__wispLibCurl.decodeUrl(enc);
      return decodeURIComponent(enc);
    }
  } catch {}
  return url;
}

// Wisp Relay transport encoding/decoding
export async function encodeRelayUrl(url: string, relay?: MessagePort | null): Promise<string> {
  const cleaned = stripTrackingParams(url);
  if (relay && window.__wispRelay) {
    try {
      const encoded = await window.__wispRelay.encodeUrl(cleaned);
      return MOONBEAM_PREFIX + encoded;
    } catch {}
  }
  return MOONBEAM_PREFIX + encodeURIComponent(cleaned);
}

export async function decodeRelayUrl(url: string): Promise<string> {
  try {
    if (url.startsWith(MOONBEAM_PREFIX)) {
      const enc = url.slice(MOONBEAM_PREFIX.length);
      if (window.__wispRelay) return await window.__wispRelay.decodeUrl(enc);
      return decodeURIComponent(enc);
    }
  } catch {}
  return url;
}

// Generic proxy URL encoding that supports all transport modes
export async function encodeProxyUrlAdvanced(
  url: string,
  transport: TransportMode = "auto",
  settings?: ProxySettings,
  scrController?: ScramjetCtrl | null,
  wispLibCurl?: any,
  wispRelay?: MessagePort | null,
): Promise<string> {
  const cleaned = stripTrackingParams(url);
  
  switch (transport) {
    case "drift":
      if (wispLibCurl) {
        try { return await wispLibCurl.encodeUrl(cleaned); } catch {}
      }
      return NOVA_PREFIX + encodeURIComponent(cleaned);
      
    case "wisp":
      if (wispRelay && window.__wispRelay) {
        try { return await window.__wispRelay.encodeUrl(cleaned); } catch {}
      }
      return MOONBEAM_PREFIX + encodeURIComponent(cleaned);
      
    case "auto":
      // For auto, try scramjet first if available
      if (scrController != null) {
        try { return await scrController.encodeUrl(cleaned); } catch { /* falls through */ }
      }
      // falls through to default - handle UV
      if (window.Ultraviolet && window.__uv$config) return UV_PREFIX + window.__uv$config.encodeUrl(cleaned);
      return UV_PREFIX + encodeURIComponent(cleaned);
    
    default:
      if (window.Ultraviolet && window.__uv$config) return UV_PREFIX + window.__uv$config.encodeUrl(cleaned);
      return UV_PREFIX + encodeURIComponent(cleaned);
  }
}

export async function decodeProxyUrlAdvanced(url: string, scrController?: ScramjetCtrl | null, wispLibCurl?: any, wispRelay?: MessagePort | null): Promise<string> {
  try {
    if (url.startsWith(SCRAMJET_PREFIX) && scrController) {
      try { return await scrController.decodeUrl(location.origin + url); } catch { }
      const encoded = url.slice(SCRAMJET_PREFIX.length);
      return decodeURIComponent(encoded);
    }
    if (url.startsWith(NOVA_PREFIX) && wispLibCurl) {
      const enc = url.slice(NOVA_PREFIX.length);
      return await wispLibCurl.decodeUrl(enc);
    }
    if (url.startsWith(MOONBEAM_PREFIX) && wispRelay && window.__wispRelay) {
      const enc = url.slice(MOONBEAM_PREFIX.length);
      return await window.__wispRelay.decodeUrl(enc);
    }
    if (url.startsWith(UV_PREFIX)) {
      const enc = url.slice(UV_PREFIX.length);
      if (window.__uv$config) return window.__uv$config.decodeUrl(enc);
      return decodeURIComponent(enc);
    }
  } catch { }
  return url;
}
