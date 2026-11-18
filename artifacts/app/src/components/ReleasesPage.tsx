import * as React from "react";
import { motion } from "framer-motion";
import { ExternalLink, RefreshCw } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ReleaseNotes } from "@/components/ReleaseNotes";

const REPO = "Allegedcarrot4/Project-Unstable";
const REPO_URL = `https://github.com/${REPO}`;
const PER_PAGE = 20;
const DIRECT_URL = `https://api.github.com/repos/${REPO}/commits?per_page=${PER_PAGE}`;

type RawCommit = {
  sha?: string;
  html_url?: string;
  commit?: {
    message?: string;
    author?: { name?: string; date?: string } | null;
    verification?: { verified?: boolean } | null;
  } | null;
  author?: { login?: string; avatar_url?: string } | null;
};

type Release = {
  id: string;
  sha: string;
  shortSha: string;
  title: string;
  notes: string;
  authorName: string;
  authorLogin: string;
  authorAvatar: string;
  committedAt: string | null;
  htmlUrl: string;
  verified: boolean;
};

/**
 * One commit is one release here: the first line of the commit message is the
 * release title, everything after it is that release's notes.
 */
function normalize(raw: RawCommit, index: number): Release {
  const sha = String(raw.sha ?? "");
  const message = String(raw.commit?.message ?? "").replace(/\r\n?/g, "\n").trim();
  const newline = message.indexOf("\n");
  const title = (newline === -1 ? message : message.slice(0, newline)).trim();
  const notes = newline === -1 ? "" : message.slice(newline + 1).trim();

  return {
    id: sha || `commit-${index}`,
    sha,
    shortSha: sha.slice(0, 7),
    title: title || "Untitled commit",
    notes,
    authorName: raw.commit?.author?.name ?? "",
    authorLogin: raw.author?.login ?? "",
    authorAvatar: raw.author?.avatar_url ?? "",
    committedAt: raw.commit?.author?.date ?? null,
    htmlUrl: String(raw.html_url ?? (sha ? `${REPO_URL}/commit/${sha}` : REPO_URL)),
    verified: Boolean(raw.commit?.verification?.verified),
  };
}

type LoadResult = { releases: Release[]; fetchedAt: string; stale: boolean; hasMore: boolean };

async function loadCommits(signal: AbortSignal, page: number, refresh: boolean): Promise<LoadResult> {
  // The server route caches pages for every visitor and can use a token, so it
  // is preferred. Static frontend-only deploys have no API, hence the direct
  // GitHub fallback below.
  try {
    const res = await fetch(
      `/api/releases?page=${page}&per_page=${PER_PAGE}${refresh ? "&refresh=1" : ""}`,
      { signal, cache: "no-store", headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const data = (await res.json()) as {
        commits?: RawCommit[];
        fetchedAt?: string;
        stale?: boolean;
        hasMore?: boolean;
      };
      if (Array.isArray(data.commits)) {
        return {
          releases: data.commits.map(normalize),
          fetchedAt: data.fetchedAt ?? new Date().toISOString(),
          stale: Boolean(data.stale),
          hasMore: data.hasMore ?? data.commits.length === PER_PAGE,
        };
      }
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    // fall through to the direct request
  }

  const res = await fetch(`${DIRECT_URL}&page=${page}`, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error(
      res.status === 403 || res.status === 429
        ? "GitHub rate limit reached. Try again in a few minutes."
        : `GitHub responded ${res.status}.`
    );
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error("GitHub returned an unexpected payload.");

  // GitHub advertises the next page in a Link header; fall back to "this page
  // was full" when the header is absent.
  const link = res.headers.get("link") ?? "";

  return {
    releases: (data as RawCommit[]).map(normalize),
    fetchedAt: new Date().toISOString(),
    stale: false,
    hasMore: link ? /rel="next"/.test(link) : data.length === PER_PAGE,
  };
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const minutes = Math.round((Date.now() - then) / 60_000);
  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(minutes) < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relative.format(-days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return relative.format(-months, "month");
  return relative.format(-Math.round(months / 12), "year");
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
}

const monoFont = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const eyebrowStyle: React.CSSProperties = {
  fontSize: "0.62rem",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.18)",
  margin: 0,
};

const actionBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  padding: "0.45rem 0.7rem",
  borderRadius: 8,
  border: "1px solid var(--t-border, #1e1e1e)",
  background: "var(--t-bg-secondary, #111)",
  color: "var(--t-text-secondary, rgba(255,255,255,0.55))",
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "0.64rem",
  letterSpacing: "0.04em",
  cursor: "pointer",
  textDecoration: "none",
};

function ReleaseCard({ release, index }: { release: Release; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.24) }}
      style={{
        border: "1px solid var(--t-border, #1e1e1e)",
        borderRadius: 10,
        background: "var(--t-bg-secondary, #111)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", padding: "0.85rem 0.95rem 0.55rem" }}>
        <span
          title={release.sha}
          style={{
            padding: "0.16rem 0.45rem",
            borderRadius: 5,
            border: "1px solid var(--t-border-light, #222)",
            background: "rgba(255,255,255,0.04)",
            fontSize: "0.62rem",
            fontFamily: monoFont,
            color: "var(--t-text, #e0e0e0)",
            letterSpacing: "0.02em",
          }}
        >
          {release.shortSha || "commit"}
        </span>
        {release.verified && (
          <span
            style={{
              padding: "0.14rem 0.42rem",
              borderRadius: 5,
              border: "1px solid rgba(120,220,150,0.28)",
              background: "rgba(120,220,150,0.08)",
              fontSize: "0.56rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(150,230,175,0.85)",
            }}
          >
            verified
          </span>
        )}
        <span
          title={formatDate(release.committedAt)}
          style={{ marginLeft: "auto", fontSize: "0.6rem", color: "var(--t-text-muted, rgba(255,255,255,0.3))" }}
        >
          {formatWhen(release.committedAt)}
        </span>
      </div>

      <h3
        style={{
          margin: 0,
          padding: "0 0.95rem 0.6rem",
          fontSize: "0.88rem",
          fontWeight: 600,
          color: "var(--t-text, #e0e0e0)",
          letterSpacing: "0.01em",
          wordBreak: "break-word",
        }}
      >
        {release.title}
      </h3>

      <ScrollArea
        style={{
          height: 210,
          margin: "0 0.95rem",
          borderRadius: 8,
          border: "1px solid var(--t-border-light, #222)",
          background: "var(--t-bg, #0d0d0d)",
        }}
      >
        <div style={{ padding: "0.8rem 0.9rem" }}>
          {release.notes ? (
            <ReleaseNotes source={release.notes} />
          ) : (
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--t-text-muted, rgba(255,255,255,0.3))" }}>
              This commit has no further notes beyond its title.
            </p>
          )}
        </div>
      </ScrollArea>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          flexWrap: "wrap",
          padding: "0.7rem 0.95rem 0.85rem",
          fontSize: "0.6rem",
          color: "var(--t-text-muted, rgba(255,255,255,0.3))",
        }}
      >
        {release.authorAvatar && (
          <img
            src={release.authorAvatar}
            alt=""
            width={16}
            height={16}
            style={{ borderRadius: "50%", opacity: 0.75 }}
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        {(release.authorLogin || release.authorName) && (
          <span>{release.authorLogin || release.authorName}</span>
        )}
        <a
          href={release.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "var(--t-accent, #e8e8e8)", textDecoration: "none" }}
        >
          View commit
          <ExternalLink size={11} />
        </a>
      </div>
    </motion.article>
  );
}

export function ReleasesPage() {
  const [releases, setReleases] = React.useState<Release[] | null>(null);
  const [meta, setMeta] = React.useState<{ fetchedAt: string; stale: boolean } | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [refreshTick, setRefreshTick] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    if (page === 1) {
      setLoading(true);
      setError("");
    } else {
      setLoadingMore(true);
    }

    loadCommits(controller.signal, page, refreshTick > 0)
      .then((result) => {
        if (cancelled) return;
        setReleases((previous) =>
          page === 1 ? result.releases : [...(previous ?? []), ...result.releases]
        );
        setMeta({ fetchedAt: result.fetchedAt, stale: result.stale });
        setHasMore(result.hasMore);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelled || (err as Error)?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load commits.");
        if (page === 1) setReleases((previous) => previous ?? []);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setLoadingMore(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, refreshTick]);

  const count = releases?.length ?? 0;

  function refresh() {
    setPage(1);
    setRefreshTick((tick) => tick + 1);
  }

  function loadMore() {
    if (loading || loadingMore || !hasMore) return;
    setPage((current) => current + 1);
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--t-bg, #0d0d0d)",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 780, margin: "0 auto", padding: "2rem 2rem 1rem", boxSizing: "border-box" }}>
        <p style={eyebrowStyle}>unstable — releases</p>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.9rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--t-text, #e0e0e0)" }}>
            Releases
          </h1>
          {count > 0 && (
            <span style={{ fontSize: "0.62rem", color: "var(--t-text-muted, rgba(255,255,255,0.3))", paddingBottom: "0.25rem" }}>
              {count} loaded
            </span>
          )}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={refresh}
              disabled={loading}
              style={{ ...actionBtnStyle, opacity: loading ? 0.5 : 1, cursor: loading ? "default" : "pointer" }}
            >
              <motion.span
                animate={loading ? { rotate: 360 } : { rotate: 0 }}
                transition={loading ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.2 }}
                style={{ display: "inline-flex" }}
              >
                <RefreshCw size={12} />
              </motion.span>
              Refresh
            </motion.button>
            <a href={`${REPO_URL}/commits`} target="_blank" rel="noopener noreferrer" style={actionBtnStyle}>
              GitHub
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <p style={{ margin: "0.6rem 0 0", fontSize: "0.7rem", lineHeight: 1.6, color: "var(--t-text-secondary, rgba(255,255,255,0.55))" }}>
          Every commit to {REPO.split("/")[1]} ships as a release — newest first, with the commit message as its notes.
        </p>

        {meta && (
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.58rem", letterSpacing: "0.04em", color: "var(--t-text-muted, rgba(255,255,255,0.3))" }}>
            {meta.stale ? "GitHub is unreachable — showing the last cached list" : `Updated ${formatWhen(meta.fetchedAt)}`}
          </p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 2rem 2.5rem" }}>
        <div style={{ width: "100%", maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.85rem" }}>

          {loading && count === 0 && (
            <>
              {[0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="animate-pulse"
                  style={{
                    height: 300,
                    borderRadius: 10,
                    border: "1px solid var(--t-border, #1e1e1e)",
                    background: "var(--t-bg-secondary, #111)",
                  }}
                />
              ))}
            </>
          )}

          {error && (
            <div
              style={{
                padding: "1rem 1.1rem",
                borderRadius: 10,
                border: "1px solid rgba(255,120,120,0.25)",
                background: "rgba(255,80,80,0.06)",
                fontSize: "0.72rem",
                lineHeight: 1.6,
                color: "rgba(255,170,170,0.9)",
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && count === 0 && (
            <div
              style={{
                padding: "2.5rem 1.5rem",
                borderRadius: 10,
                border: "1px dashed var(--t-border, #1e1e1e)",
                background: "var(--t-bg-secondary, #111)",
                textAlign: "center",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--t-text, #e0e0e0)" }}>No commits yet</p>
              <p style={{ margin: "0.45rem 0 0", fontSize: "0.7rem", lineHeight: 1.6, color: "var(--t-text-secondary, rgba(255,255,255,0.55))" }}>
                The first commit to the repository will show up here as the first release.
              </p>
              <a
                href={`${REPO_URL}/commits`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.9rem", fontSize: "0.66rem", color: "var(--t-accent, #e8e8e8)", textDecoration: "none" }}
              >
                Open the commit history
                <ExternalLink size={11} />
              </a>
            </div>
          )}

          {releases?.map((release, index) => (
            <ReleaseCard key={release.id} release={release} index={index} />
          ))}

          {count > 0 && hasMore && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                ...actionBtnStyle,
                alignSelf: "center",
                marginTop: "0.4rem",
                padding: "0.6rem 1.1rem",
                fontSize: "0.66rem",
                opacity: loadingMore ? 0.55 : 1,
                cursor: loadingMore ? "default" : "pointer",
              }}
            >
              {loadingMore && (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  style={{ display: "inline-flex" }}
                >
                  <RefreshCw size={12} />
                </motion.span>
              )}
              {loadingMore ? "Loading…" : "Load more"}
            </motion.button>
          )}

          {count > 0 && !hasMore && !loading && (
            <p style={{ margin: "0.6rem 0 0", textAlign: "center", fontSize: "0.6rem", letterSpacing: "0.06em", color: "var(--t-text-muted, rgba(255,255,255,0.3))" }}>
              End of history — {count} release{count === 1 ? "" : "s"} loaded
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
