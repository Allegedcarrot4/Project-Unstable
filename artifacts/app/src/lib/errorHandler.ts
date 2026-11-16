/**
 * Error classification for the app-wide error screen.
 *
 * Errors reach here from three places: the React error boundary, proxy setup
 * failures, and `useFetch`. Browser error text is inconsistent (DOMException,
 * TypeError, "Failed to fetch", Chromium's `net::ERR_*`, service-worker
 * messages), so classification is driven by a rule table that matches the text
 * itself instead of relying on the error's constructor.
 */

export type ErrorCategory =
  | 'network'
  | 'proxy'
  | 'transport'
  | 'engine'
  | 'auth'
  | 'render'
  | 'storage'
  | 'permission'
  | 'timeout'
  | 'unknown';

export type ProxyEngineName = 'ultraviolet' | 'scramjet' | 'none';

export interface ErrorDetails {
  message: string;
  category: ErrorCategory;
  statusCode?: number;
  /** `ERR_NAME_NOT_RESOLVED`, `HTTP 404`, … when one can be pulled out of the text. */
  errorCode?: string;
  /** Proxy engine that was serving the page when the error happened. */
  engine?: ProxyEngineName;
  url?: string;
  timestamp: Date;
  userAgent: string;
  clientOnline: boolean;
  backendStatus: 'online' | 'offline' | 'unknown';
  latency?: number;
  transport?: string;
  encoding?: string;
  transportEncryption?: boolean;
  originalError?: Error;
  suggestion?: string;
  /** Short "what this means" line for the screen. */
  detail?: string;
}

interface ErrorRule {
  pattern: RegExp;
  category: ErrorCategory;
  message: string;
  suggestion: string;
  detail?: string;
}

/**
 * Ordered: the first rule whose pattern matches the error text wins, so the most
 * specific signatures come first.
 */
const RULES: ErrorRule[] = [
  // ─── DNS ───────────────────────────────────────────────────────────────────
  {
    pattern: /ERR_NAME_NOT_RESOLVED|ERR_DNS_FAIL|DNS_PROBE|NAME_NOT_RESOLVED|getaddrinfo/i,
    category: 'network',
    message: 'That domain could not be resolved',
    suggestion: 'Check the address for typos. If it is correct, DNS may be blocked on this network — try another DNS or your normal browser.',
    detail: 'The proxy could not find an IP address for the hostname.',
  },
  // ─── Local connectivity ────────────────────────────────────────────────────
  {
    pattern: /ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|ERR_NETWORK_ACCESS_DENIED|navigator\.onLine is false/i,
    category: 'network',
    message: 'This device appears to be offline',
    suggestion: 'Reconnect to Wi-Fi or Ethernet and try again.',
    detail: 'The browser reported no usable network connection.',
  },
  {
    pattern: /ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_CONNECTION_TIMED_OUT|ERR_EMPTY_RESPONSE|ECONNREFUSED|ECONNRESET/i,
    category: 'proxy',
    message: 'The connection was reset or refused',
    suggestion: 'Reload the page. If it keeps failing, switch transport in Settings — the Wisp or bare server may be down.',
    detail: 'The request was accepted but the remote side dropped it.',
  },
  {
    pattern: /ERR_SSL|ERR_CERT|SSL_ERROR|certificate/i,
    category: 'network',
    message: 'The site\'s TLS certificate failed',
    suggestion: 'This site cannot be proxied safely right now. Try HTTP, or open it in a normal browser.',
    detail: 'Certificate validation failed while connecting upstream.',
  },
  {
    pattern: /ERR_BLOCKED_BY_CLIENT|blocked by an extension|adblock|ad ?blocker/i,
    category: 'proxy',
    message: 'The request was blocked before it left the browser',
    suggestion: 'An extension or the built-in adblocker stopped it. Disable adblock in Settings and reload.',
    detail: 'A client-side blocker dropped the request.',
  },
  {
    pattern: /ERR_TOO_MANY_REDIRECTS|redirect loop/i,
    category: 'proxy',
    message: 'The page is stuck in a redirect loop',
    suggestion: 'Clear cookies for this site (or all site data) and try again.',
    detail: 'The site kept redirecting back to itself.',
  },
  {
    pattern: /ERR_ABORTED|aborted by the browser/i,
    category: 'network',
    message: 'The request was cancelled',
    suggestion: 'Reload to try again.',
    detail: 'The navigation was aborted before it completed.',
  },
  {
    pattern: /Mixed Content/i,
    category: 'network',
    message: 'The page mixes secure and insecure content',
    suggestion: 'Retry — insecure subresources are blocked on HTTPS pages.',
    detail: 'An HTTPS page requested a plain HTTP resource.',
  },
  {
    pattern: /blocked by CORS policy|No 'Access-Control-Allow-Origin'|cross-origin request blocked/i,
    category: 'network',
    message: 'A cross-origin request was blocked',
    suggestion: 'Reload the page. If this keeps happening the site is rejecting proxied requests.',
    detail: 'The upstream server refused the browser\'s origin.',
  },
  // ─── Proxy transport (bare-mux / Wisp / WebSocket) ──────────────────────────
  {
    pattern: /invalid MessagePort|Illegal invocation|All clients returned an invalid MessagePort|bare-mux|baremux|getPort/i,
    category: 'transport',
    message: 'The proxy transport lost its bare-mux connection',
    suggestion: 'Reload the page. If it recurs, open Settings → transport and pick another one.',
    detail: 'bare-mux could not get a working MessagePort from the service worker.',
  },
  {
    pattern: /wisp/i,
    category: 'transport',
    message: 'The Wisp relay could not be reached',
    suggestion: 'The Wisp websocket may be down or blocked. Reload, or switch to the bare transport in Settings.',
    detail: 'Wisp is the websocket transport used for proxied requests.',
  },
  {
    pattern: /websocket|WebSocket (is )?closed|ws error/i,
    category: 'transport',
    message: 'The proxy websocket closed unexpectedly',
    suggestion: 'Reload the page. Networks that block websockets will keep failing — try another transport.',
    detail: 'The transport socket dropped mid-session.',
  },
  {
    pattern: /Service ?Worker|service worker/i,
    category: 'engine',
    message: 'The proxy service worker is unavailable',
    suggestion: 'Reload the page. In private windows or with strict site-data settings, service workers are blocked and the proxy cannot run.',
    detail: 'Proxying requires a registered service worker for this origin.',
  },
  // ─── Engines ───────────────────────────────────────────────────────────────
  {
    pattern: /\$scramerr|Scramjet SW Error|scramjet/i,
    category: 'engine',
    message: 'Scramjet failed to serve this page',
    suggestion: 'Reload. If this site keeps failing on Scramjet, open Settings and force the Ultraviolet engine for it.',
    detail: 'Scramjet rewrites the page inside its service worker.',
  },
  {
    pattern: /ultraviolet|__uv\$|uv\.sw|uv\.bundle/i,
    category: 'engine',
    message: 'Ultraviolet failed to serve this page',
    suggestion: 'Reload. If this site keeps failing, switch its engine to Scramjet in Settings.',
    detail: 'Ultraviolet failed while rewriting or fetching the page.',
  },
  {
    pattern: /DataCloneError|could not be cloned/i,
    category: 'engine',
    message: 'A message could not be transferred to the proxy',
    suggestion: 'Reload the page. Persistent failures usually mean a stale service worker — clear cache.',
    detail: 'Structured data could not be cloned between the page and the worker.',
  },
  // ─── Build / rendering ─────────────────────────────────────────────────────
  {
    pattern: /Failed to fetch dynamically imported module|ChunkLoadError|Importing a module script failed|Outdated Optimize Dep/i,
    category: 'render',
    message: 'A script chunk failed to load',
    suggestion: 'Reload. This usually means the app was updated (or is mid-build) and an old chunk is gone.',
    detail: 'A lazily loaded bundle 404ed or was replaced.',
  },
  {
    pattern: /forwardRef|Cannot read properties of undefined \(reading 'forwardRef'\)/i,
    category: 'render',
    message: 'A UI bundle was loaded incorrectly',
    suggestion: 'Reload the page. If it persists, clear cache so the vendor chunk is rebuilt.',
    detail: 'This signature usually means React was split across chunks.',
  },
  {
    pattern: /Content Security Policy|CSP/i,
    category: 'render',
    message: 'A Content Security Policy blocked part of the page',
    suggestion: 'Reload; if the site relies on inline scripts, try the other proxy engine.',
    detail: 'The upstream CSP survived and blocked a resource.',
  },
  {
    pattern: /Unexpected token|is not valid JSON|JSON at position|SyntaxError/i,
    category: 'render',
    message: 'A response could not be parsed',
    suggestion: 'The server returned unexpected data (often an HTML error page). Clear cache and retry.',
    detail: 'Parsing failed on the response body.',
  },
  {
    pattern: /maximum call stack|out of memory|RangeError/i,
    category: 'render',
    message: 'The page ran out of resources',
    suggestion: 'Close other tabs and reload. Very large pages can exceed the worker\'s memory.',
    detail: 'A recursion or allocation limit was hit.',
  },
  // ─── Storage & permissions ────────────────────────────────────────────────
  {
    pattern: /QuotaExceededError|quota exceeded|IndexedDB|localStorage|storage is (full|disabled)/i,
    category: 'storage',
    message: 'Local storage is full or unavailable',
    suggestion: 'Clear site data (cache button below) — history, downloads and settings are stored locally.',
    detail: 'The proxy keeps cookies and settings in this origin\'s storage.',
  },
  {
    pattern: /NotAllowedError|Permission denied|permission policy/i,
    category: 'permission',
    message: 'The browser denied a permission',
    suggestion: 'Allow the requested permission for this site, or reload and answer the prompt.',
    detail: 'Camera, microphone, notifications or clipboard access was refused.',
  },
  {
    pattern: /SecurityError|NotSameOrigin|insecure operation/i,
    category: 'permission',
    message: 'The browser blocked an insecure operation',
    suggestion: 'Serve the app over HTTPS (or localhost). Some APIs are unavailable on plain HTTP.',
    detail: 'A security restriction rejected the call.',
  },
  // ─── Timeouts & cancellations ──────────────────────────────────────────────
  {
    pattern: /TimeoutError|timed out|timeout/i,
    category: 'timeout',
    message: 'The request took too long',
    suggestion: 'Retry, or check whether the backend is up (status panel on the right).',
    detail: 'The proxy or upstream server did not answer in time.',
  },
  {
    pattern: /AbortError|cancelled|canceled/i,
    category: 'timeout',
    message: 'The request was cancelled',
    suggestion: 'Nothing was lost — try again.',
    detail: 'The operation was aborted before it finished.',
  },
  // ─── Generic network ──────────────────────────────────────────────────────
  {
    pattern: /Failed to fetch|NetworkError|Load failed|fetch failed|network error/i,
    category: 'network',
    message: 'The request never reached the server',
    suggestion: 'Check your connection and retry. If only proxied pages fail, the transport is likely down.',
    detail: 'The fetch rejected before any status code came back.',
  },
];

function textFromError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Response) return `${error.status} ${error.statusText || ''}`.trim();
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return '';
}

function extractStatusCode(text: string, error: unknown): number | undefined {
  if (error instanceof Response) return error.status;
  const explicit = /\b(?:HTTP|status(?:\s*code)?|error)\s*[:#]?\s*(\d{3})\b/i.exec(text);
  const bare = /\b([45]\d{2})\b/.exec(text);
  const value = Number((explicit ?? bare)?.[1]);
  return Number.isFinite(value) && value >= 100 && value <= 599 ? value : undefined;
}

function describeStatus(status: number): Pick<ErrorRule, 'category' | 'message' | 'suggestion' | 'detail'> | undefined {
  if (status === 401) return { category: 'auth', message: 'Authentication failed', suggestion: 'Your session expired. Sign in again.', detail: 'The server rejected the credentials.' };
  if (status === 403) return { category: 'proxy', message: 'Access denied', suggestion: 'The site refused the proxied request. It may require a login or block this region.', detail: 'The upstream server returned 403.' };
  if (status === 404) return { category: 'proxy', message: 'Resource not found', suggestion: 'Check the address. If the page works normally, the site may be blocking the proxy.', detail: 'The upstream server returned 404.' };
  if (status === 408 || status === 504) return { category: 'timeout', message: 'The upstream server timed out', suggestion: 'Retry; if it persists the site is slow or blocking this route.', detail: `The request timed out (${status}).` };
  if (status === 429) return { category: 'proxy', message: 'Rate limited', suggestion: 'Wait a moment and try again — the site (or the AI backend) is throttling requests.', detail: 'Too many requests were sent in a short window.' };
  if (status >= 500) return { category: 'proxy', message: 'The upstream server errored', suggestion: 'This is the site\'s problem, not yours. Retry in a moment.', detail: `The server returned ${status}.` };
  if (status >= 400) return { category: 'proxy', message: `Request failed (${status})`, suggestion: 'An error occurred while processing the request.', detail: `The server returned ${status}.` };
  return undefined;
}

export function parseError(error: unknown, url?: string): ErrorDetails {
  const clientOnline = navigator.onLine;
  const timestamp = new Date();
  const userAgent = navigator.userAgent;

  const text = textFromError(error);
  const rule = RULES.find(entry => entry.pattern.test(text));
  const statusCode = extractStatusCode(text, error);
  const statusInfo = !rule && statusCode ? describeStatus(statusCode) : undefined;

  // Only identifier-style codes land here; a bare status is already reported
  // through `statusCode`, so it would otherwise show up twice.
  const errCode = /\b(ERR_[A-Z0-9_]+)\b/.exec(text)?.[1];

  let message = rule?.message ?? statusInfo?.message ?? '';
  if (!message) {
    if (error instanceof TypeError) message = 'Failed to connect to the server';
    else if (error instanceof Error && error.message) message = error.message;
    else message = 'An unexpected error occurred';
  }

  const originalError = error instanceof Error ? error : undefined;

  return {
    message,
    category: rule?.category ?? statusInfo?.category ?? (error instanceof TypeError ? 'network' : 'unknown'),
    statusCode,
    errorCode: errCode,
    url,
    timestamp,
    userAgent,
    clientOnline,
    backendStatus: 'unknown',
    suggestion: rule?.suggestion ?? statusInfo?.suggestion,
    detail: rule?.detail ?? statusInfo?.detail,
    originalError,
  };
}

/** Generate a detailed error report. */
export function generateErrorReport(errorDetails: ErrorDetails): string {
  return `
Error Report - ${errorDetails.timestamp.toISOString()}

Message: ${errorDetails.message}
Category: ${errorDetails.category}
${errorDetails.detail ? `Detail: ${errorDetails.detail}` : ''}
${errorDetails.errorCode ? `Error Code: ${errorDetails.errorCode}` : ''}
${errorDetails.statusCode ? `Status Code: ${errorDetails.statusCode}` : ''}
${errorDetails.url ? `URL: ${errorDetails.url}` : ''}
${errorDetails.suggestion ? `Suggestion: ${errorDetails.suggestion}` : ''}

Proxy: ${errorDetails.engine === 'scramjet' ? 'Scramjet' : errorDetails.engine === 'ultraviolet' ? 'Ultraviolet' : 'Unknown'}
Transport: ${errorDetails.transport || 'unknown'}
Encoding: ${errorDetails.encoding || 'unknown'}
Transport Encryption: ${errorDetails.transportEncryption ? 'Enabled' : 'Disabled'}

Client Status:
- Online: ${errorDetails.clientOnline ? 'Yes' : 'No'}
- Backend: ${errorDetails.backendStatus}
- Latency: ${errorDetails.latency ? `${errorDetails.latency}ms` : 'Unknown'}

User Agent: ${errorDetails.userAgent}

Original Error: ${errorDetails.originalError?.message || 'N/A'}
  `.trim();
}

/** Check if backend is online. */
export async function checkBackendStatus(): Promise<{
  online: boolean;
  latency: number;
}> {
  const startTime = performance.now();
  try {
    const response = await fetch('/api/healthz', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    const latency = Math.round(performance.now() - startTime);
    return {
      online: response.ok,
      latency,
    };
  } catch {
    return {
      online: false,
      latency: Math.round(performance.now() - startTime),
    };
  }
}

/** Check internet connectivity. */
export async function checkInternetConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('/api/healthz', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Retry a function with exponential backoff. */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, i), maxDelay);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
