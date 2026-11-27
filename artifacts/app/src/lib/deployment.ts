/**
 * Deployment detection.
 *
 * A build can be served two ways:
 *   - "fullstack": the Node API/proxy service is reachable under `/api/*`.
 *   - "frontend": only the static frontend is deployed (dev server or static
 *     host). There is no backend, so AI, accounts and chat are unavailable and
 *     the proxy has to talk to public Wisp relays directly.
 *
 * The backend exposes `GET /api/healthz` -> `{ "status": "ok" }`. A static host
 * either 404s that path or answers with its SPA fallback (HTML), so a JSON
 * `status: "ok"` response is a reliable "full-stack" signal.
 */

export type DeploymentMode = "fullstack" | "frontend";

/** Public Wisp relays used by frontend-only builds (no backend available). */
export const WISPS = [
  "wss://wisp.mercurywork.shop/",
  "wss://anura.pro/",
  "wss://wisp.terbiumon.top/wisp/",
];

let resolved: DeploymentMode | null = null;
let probe: Promise<DeploymentMode> | null = null;
const listeners = new Set<(mode: DeploymentMode) => void>();

function resolve(mode: DeploymentMode): DeploymentMode {
  resolved = mode;
  listeners.forEach((fn) => {
    try { fn(mode); } catch { /* ignore */ }
  });
  return mode;
}

/** Returns the cached mode if detection has finished, otherwise null. */
export function getDeploymentMode(): DeploymentMode | null {
  return resolved;
}

/** Detect (once) whether the backend is present. */
export function detectDeployment(): Promise<DeploymentMode> {
  if (resolved) return Promise.resolve(resolved);
  if (probe) return probe;

  const probeHealth = async (timeoutMs: number): Promise<"ok" | "bad" | "unreachable"> => {
    try {
      const res = await fetch("/api/healthz", {
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = (await res.json().catch(() => null)) as { status?: string } | null;
      return res.ok && data?.status === "ok" ? "ok" : "bad";
    } catch {
      return "unreachable";
    }
  };

  probe = (async () => {
    // CDN-gateway builds render the UI from a file CDN with no backend at all.
    if ((window as unknown as { __cdnGatewayPath?: string }).__cdnGatewayPath) {
      return resolve("frontend");
    }

    const first = await probeHealth(5000);
    if (first === "ok") return resolve("fullstack");
    // A static host answers immediately (404 or its SPA HTML), which is a
    // definite "no backend".
    if (first === "bad") return resolve("frontend");

    // Unreachable is ambiguous: a static host on a broken network and a
    // sleeping/cold Railway container both time out. Retry with a longer
    // budget, then assume fullstack — concluding "frontend" here would
    // disable accounts and chat for the rest of the session after a cold start.
    const second = await probeHealth(15000);
    if (second === "bad") return resolve("frontend");
    return resolve("fullstack");
  })();

  return probe;
}

/** Subscribe to detection results. Returns an unsubscribe function. */
export function subscribeDeployment(fn: (mode: DeploymentMode) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/**
 * Resolve the list of Wisp endpoints to try, in order.
 * An explicit override always wins; frontend-only builds use the public
 * relay list, full-stack builds use the bundled `/api/wisp/` endpoint.
 */
export function resolveWispUrls(wispServer: string, mode: DeploymentMode): string[] {
  const override = wispServer.trim();
  if (override) return [override];
  if (mode === "frontend") return [...WISPS];
  return [`${location.protocol === "http:" ? "ws:" : "wss:"}//${location.host}/api/wisp/`];
}
