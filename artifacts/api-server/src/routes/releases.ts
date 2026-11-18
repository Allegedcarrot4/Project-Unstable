import type { FastifyPluginAsync } from "fastify";
import { logger } from "../lib/logger";

// ─── "Releases" are commits ───────────────────────────────────────────────────
//
// This project doesn't cut GitHub Releases: every commit on main is shipped as
// a release, so the Releases page lists commits newest-first and uses each
// commit message as that release's notes.
//
// The page fetches this route instead of api.github.com directly so a whole
// workspace shares one cached response: unauthenticated GitHub calls are
// limited to 60/hour per IP, which a classroom on one NAT address would
// exhaust in minutes. Set GITHUB_TOKEN to raise that to 5000/hour.

const REPO = "Allegedcarrot4/Project-Unstable";
const COMMITS_URL = `https://api.github.com/repos/${REPO}/commits`;
const MAX_PER_PAGE = 100;

const CACHE_TTL_MS = 5 * 60_000; // serve a cached page for five minutes
const STALE_TTL_MS = 60 * 60_000; // keep serving it for an hour if GitHub fails

type CachedPayload = {
  commits: unknown[];
  etag: string | null;
  hasMore: boolean;
  fetchedAt: number;
};

// Keyed by `page:perPage` so different page sizes don't overwrite each other.
const cache = new Map<string, CachedPayload>();
const inflight = new Map<string, Promise<CachedPayload>>();

function githubHeaders(previous: CachedPayload | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "unstable-releases",
  };
  const token = (process.env.GITHUB_TOKEN || process.env.GITHUB_RELEASES_TOKEN || "").trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (previous?.etag) headers["If-None-Match"] = previous.etag;
  return headers;
}

async function fetchCommits(page: number, perPage: number, previous: CachedPayload | null): Promise<CachedPayload> {
  const res = await fetch(`${COMMITS_URL}?per_page=${perPage}&page=${page}`, {
    headers: githubHeaders(previous),
  });

  // Nothing changed upstream: reuse the page but restart its cache window.
  if (res.status === 304 && previous) {
    return { ...previous, fetchedAt: Date.now() };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`GitHub responded ${res.status}`) as Error & { status?: number; detail?: string };
    err.status = res.status;
    err.detail = detail.slice(0, 200);
    throw err;
  }

  const commits = (await res.json()) as unknown;
  if (!Array.isArray(commits)) throw new Error("GitHub returned an unexpected payload");

  // GitHub advertises the next page in a Link header; fall back to "this page
  // was full" when the header is absent.
  const link = res.headers.get("link") ?? "";

  return {
    commits,
    etag: res.headers.get("etag"),
    hasMore: link ? /rel="next"/.test(link) : commits.length === perPage,
    fetchedAt: Date.now(),
  };
}

function toPositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
}

const releasesRoute: FastifyPluginAsync = async (app) => {
  app.get("/releases", async (req, reply) => {
    const query = (req.query ?? {}) as { page?: string; per_page?: string; refresh?: string };
    const page = toPositiveInt(query.page, 1, 500);
    const perPage = toPositiveInt(query.per_page, 20, MAX_PER_PAGE);
    const force = query.refresh === "1" || query.refresh === "true";
    const key = `${page}:${perPage}`;

    const now = Date.now();
    let payload = cache.get(key) ?? null;
    let source: "cache" | "github" | "stale" = "cache";

    const isFresh = Boolean(payload) && now - (payload?.fetchedAt ?? 0) < CACHE_TTL_MS;

    if (!isFresh || force) {
      try {
        let pending = inflight.get(key);
        if (!pending) {
          pending = fetchCommits(page, perPage, payload).finally(() => {
            inflight.delete(key);
          });
          inflight.set(key, pending);
        }
        payload = await pending;
        cache.set(key, payload);
        source = "github";
      } catch (err) {
        const status = (err as { status?: number }).status;
        logger.warn({ err, status, page }, "GitHub commits request failed");

        const stillUsable = payload && now - payload.fetchedAt < STALE_TTL_MS;
        if (!stillUsable) {
          return reply.status(502).send({
            error: status === 403 || status === 429
              ? "GitHub rate limit reached. Try again later."
              : "Unable to load commits from GitHub right now.",
          });
        }
        source = "stale";
      }
    }

    if (!payload) {
      return reply.status(502).send({ error: "Unable to load commits from GitHub right now." });
    }

    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    reply.header("X-Releases-Source", source);

    return reply.send({
      repo: REPO,
      commits: payload.commits,
      page,
      perPage,
      hasMore: payload.hasMore,
      fetchedAt: new Date(payload.fetchedAt).toISOString(),
      stale: source === "stale",
    });
  });
};

export default releasesRoute;
