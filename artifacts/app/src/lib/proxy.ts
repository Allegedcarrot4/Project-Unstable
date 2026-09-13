// ─── Proxy utility functions extracted from App.tsx ───────────────────────────

export const UV_PREFIX = "/service/";
export const SCRAMJET_PREFIX = "/ham/";

export type ProxyEngine = "auto" | "uv" | "scramjet";
export type TransportMode = "auto" | "wisp" | "bare" | "epoxy" | "drift";

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
