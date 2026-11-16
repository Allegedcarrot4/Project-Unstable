const DOWNLOADS_KEY = "unstable-downloads-store";

type DownloadsListener = () => void;
const listeners = new Set<DownloadsListener>();

export interface DownloadEntry {
  id: string;
  filename: string;
  url: string;
  totalBytes: number;
  downloadedBytes: number;
  state: "in-progress" | "complete" | "error";
  startedAt: number;
  completedAt?: number;
  mimeType?: string;
  speedBytesPerSec?: number;
  errorMessage?: string;
  /** Tab whose proxied frame owns the transfer (needed to resume/retry). */
  tabId?: string;
  controller?: AbortController;
}

export function subscribe(fn: DownloadsListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notify() {
  listeners.forEach(fn => fn());
}

// Placeholder names that carry no information: prefer the URL or the response
// headers over these.
const GENERIC_FILENAMES = new Set(["download", "file", "unnamed", "blob", "attachment", "index"]);

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(INVALID_FILENAME_CHARS, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 120)
    .trim();
  return cleaned;
}

/**
 * Best-effort filename for a URL. Proxy URLs (`/ham/https%3A%2F%2Fsite%2Fa.zip`)
 * decode back to the remote path, so the encoded segment is unwrapped first.
 */
export function deriveFilename(rawUrl: string, fallback = "download"): string {
  let path = "";
  try {
    path = new URL(rawUrl, location.href).pathname;
  } catch {
    path = rawUrl;
  }

  let segment = path.split("/").filter(Boolean).pop() ?? "";
  try { segment = decodeURIComponent(segment); } catch { /* keep raw */ }

  // A decoded proxy path is the full remote URL — take its last segment.
  if (segment.includes("/")) {
    const inner = segment.split(/[?#]/)[0].split("/").filter(Boolean);
    segment = inner[inner.length - 1] ?? segment;
  }

  const cleaned = sanitizeFilename(segment);
  return cleaned || fallback;
}

/** Parses `filename` / RFC 5987 `filename*=UTF-8''…` out of a Content-Disposition header. */
export function filenameFromContentDisposition(header: string | null): string {
  if (!header) return "";
  const extended = /filename\*\s*=\s*([^;]+)/i.exec(header);
  if (extended) {
    const raw = extended[1].trim().replace(/^["']|["']$/g, "");
    const encoded = /^[^']*'[^']*'(.*)$/.exec(raw);
    const value = encoded ? encoded[1] : raw;
    try { return sanitizeFilename(decodeURIComponent(value)); } catch { return sanitizeFilename(value); }
  }
  const plain = /filename\s*=\s*("([^"]*)"|([^;]+))/i.exec(header);
  if (plain) return sanitizeFilename((plain[2] ?? plain[3] ?? "").trim());
  return "";
}

/**
 * How a started download actually gets its bytes. The app installs a transport
 * that forwards the request to the proxied frame, because only that frame's
 * service worker can resolve a proxy URL.
 */
export type DownloadTransport = (entry: DownloadEntry) => void;

let transport: DownloadTransport | null = null;

export function setDownloadTransport(fn: DownloadTransport | null): void {
  transport = fn;
}

export function addDownload(filename: string, url: string, totalBytes = 0, mimeType?: string): DownloadEntry {
  const entry: DownloadEntry = {
    id: crypto.randomUUID(),
    filename,
    url,
    totalBytes,
    downloadedBytes: 0,
    state: "in-progress",
    startedAt: Date.now(),
    mimeType,
  };
  const all = getDownloads();
  all.unshift(entry);
  saveDownloads(all);
  notify();
  return entry;
}

/** Registers a download and hands it to the transport. */
export function startDownload(url: string, filename: string, tabId?: string): DownloadEntry {
  const requested = (filename || "").trim();
  const name = requested && !GENERIC_FILENAMES.has(requested.toLowerCase())
    ? sanitizeFilename(requested) || deriveFilename(url)
    : deriveFilename(url);

  const entry = addDownload(name, url, 0);
  if (tabId) updateDownload(entry.id, { tabId });
  transport?.({ ...entry, tabId });
  return entry;
}

export function updateDownload(id: string, upd: Partial<DownloadEntry>): void {
  const all = getDownloads().map(d => d.id === id ? { ...d, ...upd } : d);
  saveDownloads(all);
  notify();
}

export function removeDownload(id: string): void {
  const all = getDownloads();
  const entry = all.find(d => d.id === id);
  if (entry?.controller) entry.controller.abort();
  saveDownloads(all.filter(d => d.id !== id));
  notify();
}

export function clearDownloads(): void {
  getDownloads().forEach(d => d.controller?.abort());
  localStorage.removeItem(DOWNLOADS_KEY);
  notify();
}

export function getDownloads(): DownloadEntry[] {
  try { return JSON.parse(localStorage.getItem(DOWNLOADS_KEY) || "[]") as DownloadEntry[]; }
  catch { return []; }
}

function saveDownloads(downloads: DownloadEntry[]): void {
  downloads.forEach(d => delete d.controller);
  localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
}

/**
 * A transfer only lives inside its page, so anything left "in-progress" by a
 * previous page load can never resume — mark it interrupted instead of leaving
 * a permanently stuck row in the manager.
 */
function markInterruptedDownloads(): void {
  const all = getDownloads();
  let changed = false;
  for (const entry of all) {
    if (entry.state !== "in-progress") continue;
    entry.state = "error";
    entry.errorMessage = "Interrupted (page reloaded)";
    entry.completedAt = entry.completedAt ?? Date.now();
    changed = true;
  }
  if (changed) saveDownloads(all);
}

markInterruptedDownloads();

export function retryDownload(id: string): void {
  const entry = getDownloads().find(d => d.id === id);
  if (!entry) return;

  updateDownload(id, {
    state: "in-progress",
    downloadedBytes: 0,
    totalBytes: 0,
    speedBytesPerSec: 0,
    errorMessage: undefined,
    completedAt: undefined,
    startedAt: Date.now(),
  });

  if (!transport) {
    updateDownload(id, { state: "error", errorMessage: "Retry is unavailable on this page.", completedAt: Date.now() });
    return;
  }
  transport({ ...entry, state: "in-progress", downloadedBytes: 0, totalBytes: 0 });
}

export function cancelDownload(id: string): void {
  removeDownload(id);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "";
  return formatBytes(bytesPerSec) + "/s";
}

/** Hands a finished file to the browser Unstable is running in. */
export function saveBlob(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}
