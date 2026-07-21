import { supabase } from "../supabase";

const BOOKMARKS_KEY = "unstable-bookmarks-store";

export interface BookmarkEntry {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: number;
}

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch { return null; }
}

export async function addBookmark(url: string, title: string, favicon?: string): Promise<void> {
  const userId = await getUserId();
  if (userId) {
    try {
      const { data } = await supabase.from("bookmarks").select("id").eq("user_id", userId).eq("url", url).maybeSingle();
      if (data) return;
      await supabase.from("bookmarks").insert({
        user_id: userId,
        url,
        title,
        favicon: favicon || null,
        created_at: new Date().toISOString(),
      });
      return;
    } catch { /* fallback */ }
  }
  try {
    const existing = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]") as BookmarkEntry[];
    if (existing.some(e => e.url === url)) return;
    existing.unshift({ id: crypto.randomUUID(), url, title, favicon, createdAt: Date.now() });
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

export async function removeBookmark(urlOrId: string): Promise<void> {
  const userId = await getUserId();
  if (userId) {
    try {
      await supabase.from("bookmarks").delete().eq("user_id", userId).eq("url", urlOrId);
      return;
    } catch { /* fallback */ }
  }
  try {
    const existing = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]") as BookmarkEntry[];
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(existing.filter(e => e.url !== urlOrId && e.id !== urlOrId)));
  } catch { /* ignore */ }
}

export async function getBookmarks(): Promise<BookmarkEntry[]> {
  const userId = await getUserId();
  if (userId) {
    try {
      const { data } = await supabase
        .from("bookmarks")
        .select("id, url, title, favicon, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (data) return data.map((d: any) => ({ id: d.id, url: d.url, title: d.title || d.url, favicon: d.favicon, createdAt: new Date(d.created_at).getTime() }));
    } catch { /* fallback */ }
  }
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]") as BookmarkEntry[];
  } catch { return []; }
}

export async function searchBookmarks(q: string): Promise<BookmarkEntry[]> {
  const all = await getBookmarks();
  const lower = q.toLowerCase();
  return all.filter(e => e.title.toLowerCase().includes(lower) || e.url.toLowerCase().includes(lower));
}

export async function isBookmarked(url: string): Promise<boolean> {
  const all = await getBookmarks();
  return all.some(e => e.url === url);
}
