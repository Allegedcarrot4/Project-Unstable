const DOWNLOADS_KEY = "unstable-downloads-store";

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
}

export function removeDownload(id: string): void {
  saveDownloads(getDownloads().filter(d => d.id !== id));
}

export function clearDownloads(): void {
  localStorage.removeItem(DOWNLOADS_KEY);
}

export function getDownloads(): DownloadEntry[] {
  try { return JSON.parse(localStorage.getItem(DOWNLOADS_KEY) || "[]") as DownloadEntry[]; }
  catch { return []; }
}

function saveDownloads(downloads: DownloadEntry[]): void {
  localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
}
