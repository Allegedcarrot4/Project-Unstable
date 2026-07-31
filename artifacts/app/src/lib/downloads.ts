const DOWNLOADS_KEY = "unstable-downloads-store";
const DOWNLOADS_EVENT = "unstable-downloads-change";

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
  controller?: AbortController;
}

export function subscribe(fn: DownloadsListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn());
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

export async function downloadFile(url: string, filename: string, mimeType?: string): Promise<void> {
  const entry = addDownload(filename, url, 0, mimeType);
  const controller = new AbortController();
  updateDownload(entry.id, { controller });

  let lastBytes = 0;
  const speedSamples: number[] = [];
  const speedInterval = setInterval(() => {
    const current = entry.downloadedBytes;
    const delta = current - lastBytes;
    lastBytes = current;
    speedSamples.push(delta);
    if (speedSamples.length > 10) speedSamples.shift();
    const avg = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
    updateDownload(entry.id, { speedBytesPerSec: Math.round(avg) });
  }, 1000);

  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) {
      updateDownload(entry.id, { state: "error", errorMessage: `HTTP ${resp.status}`, completedAt: Date.now() });
      return;
    }
    const total = parseInt(resp.headers.get("Content-Length") || "0", 10);
    if (total) updateDownload(entry.id, { totalBytes: total });

    const reader = resp.body?.getReader();
    if (!reader) {
      const blob = await resp.blob();
      triggerBlobDownload(blob, filename);
      updateDownload(entry.id, { state: "complete", downloadedBytes: blob.size, totalBytes: blob.size, completedAt: Date.now() });
      return;
    }

    const chunks: BlobPart[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        chunks.push(result.value);
        entry.downloadedBytes += result.value.length;
        updateDownload(entry.id, { downloadedBytes: entry.downloadedBytes });
      }
    }

    const blob = new Blob(chunks, { type: mimeType || resp.headers.get("Content-Type") || undefined });
    triggerBlobDownload(blob, filename);
    updateDownload(entry.id, { state: "complete", downloadedBytes: blob.size, totalBytes: blob.size, completedAt: Date.now() });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      removeDownload(entry.id);
      return;
    }
    updateDownload(entry.id, { state: "error", errorMessage: err instanceof Error ? err.message : "Download failed", completedAt: Date.now() });
  } finally {
    clearInterval(speedInterval);
  }
}

export function retryDownload(id: string): void {
  const all = getDownloads();
  const entry = all.find(d => d.id === id);
  if (!entry) return;
  removeDownload(id);
  void downloadFile(entry.url, entry.filename, entry.mimeType);
}

export function cancelDownload(id: string): void {
  const all = getDownloads();
  const entry = all.find(d => d.id === id);
  if (entry?.controller) {
    entry.controller.abort();
  } else {
    removeDownload(id);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "";
  return formatBytes(bytesPerSec) + "/s";
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
