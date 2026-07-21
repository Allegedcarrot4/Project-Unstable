import { supabase } from "../supabase";

const HISTORY_KEY = "unstable-history-store";
const MAX_LOCAL = 500;

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  visitedAt: number;
}

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch { return null; }
}

export async function addHistory(url: string, title: string, favicon?: string): Promise<void> {
  const userId = await getUserId();
  if (userId) {
    try {
      await supabase.from("browsing_history").insert({
        user_id: userId,
        url,
        title,
        favicon: favicon || null,
        visited_at: new Date().toISOString(),
      });
      return;
    } catch { /* fallback to localStorage */ }
  }
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as HistoryEntry[];
    existing.unshift({ id: crypto.randomUUID(), url, title, favicon, visitedAt: Date.now() });
    if (existing.length > MAX_LOCAL) existing.length = MAX_LOCAL;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
  } catch { /* ignore storage errors */ }
}

export async function getHistory(limit = 100, offset = 0): Promise<HistoryEntry[]> {
  const userId = await getUserId();
  if (userId) {
    try {
      const { data } = await supabase
        .from("browsing_history")
        .select("id, url, title, favicon, visited_at")
        .eq("user_id", userId)
        .order("visited_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (data) return data.map((d: any) => ({ id: d.id, url: d.url, title: d.title || d.url, favicon: d.favicon, visitedAt: new Date(d.visited_at).getTime() }));
    } catch { /* fallback */ }
  }
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as HistoryEntry[];
    return existing.slice(offset, offset + limit);
  } catch { return []; }
}

export async function searchHistory(q: string): Promise<HistoryEntry[]> {
  const all = await getHistory(MAX_LOCAL, 0);
  const lower = q.toLowerCase();
  return all.filter(e => e.title.toLowerCase().includes(lower) || e.url.toLowerCase().includes(lower));
}

export async function clearHistory(): Promise<void> {
  const userId = await getUserId();
  if (userId) {
    try { await supabase.from("browsing_history").delete().eq("user_id", userId); return; }
    catch { /* fallback */ }
  }
  localStorage.removeItem(HISTORY_KEY);
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const userId = await getUserId();
  if (userId) {
    try { await supabase.from("browsing_history").delete().eq("id", id); return; }
    catch { /* fallback */ }
  }
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as HistoryEntry[];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.filter(e => e.id !== id)));
  } catch { /* ignore */ }
}
