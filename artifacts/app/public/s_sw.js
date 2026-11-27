// Cache-busting version: bump this whenever eggs/scramjet.all.js changes so an
// installed worker re-fetches the bundle instead of reusing its HTTP cache.
importScripts('/eggs/scramjet.all.js?v=3');
const { ScramjetServiceWorker } = $scramjetLoadWorker();

let sw = null;
let configPromise = null;
let adblockEnabled = true;

// ─── Browser identity ────────────────────────────────────────────────────────
// Scramjet forwards the FetchEvent request headers to the target. Derive the
// identity from the real browser so the target never sees a UA/client-hint
// mismatch, and fill in headers the rewriter does not add (Accept-Language).
const REAL_UA = (self.navigator && self.navigator.userAgent) || "";
const REAL_LANGS = (self.navigator && self.navigator.languages && self.navigator.languages.length)
  ? Array.from(self.navigator.languages)
  : ["en-US", "en"];

function acceptLanguageHeader() {
  return REAL_LANGS.map((lang, i) => {
    if (i === 0) return lang;
    const q = Math.max(0.1, 1 - i * 0.1).toFixed(1);
    return `${lang};q=${q}`;
  }).join(",");
}

const ACCEPT_LANGUAGE = acceptLanguageHeader();

function chromiumMajor(ua) {
  const m = /(?:Chrome|Chromium)\/(\d+)/.exec(ua || "");
  return m ? m[1] : "";
}

function clientHintBrands(ua) {
  const major = chromiumMajor(ua);
  if (!major) return "";
  return `"Chromium";v="${major}", "Google Chrome";v="${major}", "Not?A_Brand";v="24"`;
}

function clientHintPlatform(ua) {
  if (/Windows/i.test(ua)) return '"Windows"';
  if (/Mac OS X|Macintosh/i.test(ua)) return '"macOS"';
  if (/Android/i.test(ua)) return '"Android"';
  if (/CrOS/i.test(ua)) return '"Chrome OS"';
  if (/Linux/i.test(ua)) return '"Linux"';
  return '""';
}

function isMobileUA(ua) {
  return /Mobile|Android|iPhone|iPad/i.test(ua || "");
}

// Mutate the headers Scramjet is about to send to the target site. The worker
// dispatches a "request" event with a plain object right before its bare fetch.
function normalizeRequestHeaders(headers) {
  try {
    if (REAL_UA && !headers["user-agent"]) headers["user-agent"] = REAL_UA;
    if (!headers["accept-language"]) headers["accept-language"] = ACCEPT_LANGUAGE;
    const major = chromiumMajor(REAL_UA);
    const existing = headers["sec-ch-ua"] || "";
    if (major && (!existing || !existing.includes(`v="${major}"`))) {
      headers["sec-ch-ua"] = clientHintBrands(REAL_UA);
      if (!headers["sec-ch-ua-mobile"]) headers["sec-ch-ua-mobile"] = isMobileUA(REAL_UA) ? "?1" : "?0";
      if (!headers["sec-ch-ua-platform"]) headers["sec-ch-ua-platform"] = clientHintPlatform(REAL_UA);
    }
  } catch { /* never block a request on a header tweak */ }
}

function initWorker() {
  if (sw) return sw;
  sw = new ScramjetServiceWorker();
  try {
    sw.addEventListener("request", (ev) => normalizeRequestHeaders(ev.requestHeaders));
  } catch { /* older worker build without the event */ }
  configPromise = sw.loadConfig();
  return sw;
}


// ─── Adblock rules ──────────────────────────────────────────────────────────
// Fast O(1) hostname Set — same logic as sw.js

const AD_HOST_SET = new Set([
  "doubleclick.net", "googlesyndication.com", "googleadservices.com", "google-analytics.com",
  "pagead2.googlesyndication.com", "adservice.google.com", "adsrvr.org", "adnxs.com",
  "ads.pubmatic.com", "adzerk.net", "advertising.com", "media.net", "amazon-adsystem.com",
  "casalemedia.com", "criteo.com", "criteo.net", "contextweb.com", "indexww.com",
  "openx.net", "pubmatic.com", "rubiconproject.com", "sharethrough.com", "sovrn.com",
  "taboola.com", "teads.tv", "thetradedesk.com", "tremorhub.com", "tribalfusion.com",
  "triplelift.com", "yieldmo.com", "yieldmanager.com", "yieldoptimizer.com",
  "yieldtraffic.com", "serving-sys.com", "adition.com", "admicro.vn",
  "adscale.de", "adform.net", "adfox.ru", "adriver.ru", "adspirit.de",
  "adsafeprotected.com", "adsafemedia.com",
  "facebook.net", "connect.facebook.net", "analytics.twitter.com",
  "ads.linkedin.com", "bat.bing.com", "ct.pinterest.com",
  "ads.tiktok.com", "ads.reddit.com",
  "hotjar.com", "mouseflow.com", "fullstory.com", "sentry.io", "bugsnag.com",
  "scorecardresearch.com", "quantserve.com", "comscore.com", "outbrain.com",
  "js.hs-analytics.net", "ads.yahoo.com", "analytics.yahoo.com", "gemini.yahoo.com",
  "adserver.yahoo.com", "securepubads.g.doubleclick.net",
  "exelator.com", "moatads.com", "moat.com",
  "adsymptotic.com", "bluekai.com", "demdex.net", "krxd.net",
  "rlcdn.com", "turn.com",
]);

const AD_PATH_REGEXES = [
  /googletagmanager\.com\/(gtm\.js|gtag\/|ns\.html)/i,
  /yahoo\.com\/(ssp|adserver)\//i,
  /facebook\.com\/tr\//i,
  /pinterest\.com\/ct\//i,
  /tiktok\.com\/analytics\//i,
  /redditstatic\.com\/ads\//i,
  /amazon-adsystem\.com\/aax2\//i,
  /cdn\.onesignal\.com\/sdks\//i,
  /onesignal\.com\/api\//i,
];

function isAdRequest(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (AD_HOST_SET.has(host)) return true;
    const parts = host.split(".");
    for (let i = 1; i < parts.length - 1; i++) {
      if (AD_HOST_SET.has(parts.slice(i).join("."))) return true;
    }
    return AD_PATH_REGEXES.some(r => r.test(host + u.pathname));
  } catch { return false; }
}

// Absolute URL: proxied documents often carry a <base href="https://site/">
// (Scramjet inserts one), so a root-relative "/inject.js" resolves against the
// real site and 404s instead of loading from the proxy origin.
const INJECT_SRC = new URL("inject.js", self.location.href).href;

// The Scramjet HTML rewriter keeps raw entity text (`&amp;`) in URL attributes
// and then percent-encodes it into the proxy URL (`%26amp%3B`). Google's sign-in
// form action is built this way; the malformed query makes its identifier POST
// fail with HTTP 400, which looks like the page freezing after "Next". Repair
// the double-encoded separators before the document reaches the browser.
function repairUrlEntities(text) {
  return text.replace(/%26amp%3B/gi, "%26");
}

// ─── Download interception ───────────────────────────────────────────────────
// Same contract as sw.js: attachment navigations are reported to the download
// manager and answered with 204 so the proxied page stays where it was.

function isDocumentNavigation(request) {
  return request.mode === "navigate" || request.destination === "document";
}

function isAttachmentResponse(response) {
  try { return /attachment/i.test(response.headers.get("content-disposition") || ""); }
  catch { return false; }
}

function parseDispositionFilename(header) {
  if (!header) return "";
  const extended = /filename\*\s*=\s*([^;]+)/i.exec(header);
  if (extended) {
    const raw = extended[1].trim().replace(/^["']|["']$/g, "");
    const encoded = /^[^']*'[^']*'(.*)$/.exec(raw);
    const value = encoded ? encoded[1] : raw;
    try { return decodeURIComponent(value); } catch { return value; }
  }
  const plain = /filename\s*=\s*("([^"]*)"|([^;]+))/i.exec(header);
  if (plain) return (plain[2] ?? plain[3] ?? "").trim();
  return "";
}

async function reportDownloadToClients(url, response) {
  const info = {
    type: "unstable-download-detected",
    url,
    filename: parseDispositionFilename(response.headers.get("content-disposition") || ""),
    size: Number(response.headers.get("content-length")) || 0,
    mimeType: response.headers.get("content-type") || "",
  };
  try {
    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      try { client.postMessage(info); } catch { /* client gone */ }
    }
  } catch { /* ignore */ }
}

function injectFingerprint(response) {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html") || !response.body) return response;
  try {
    const INJECT = `<script src="${INJECT_SRC}"></script>`;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Appended at the end of the stream, not spliced in before `</body>`: that
    // string also occurs inside inline scripts and comments (Google's installer
    // page embeds `"</body></html>"` in its DOMPurify bundle), and a streamed
    // transform only sees the current chunk, so the splice landed inside the
    // script — its `</script>` cut the element short and the remaining script
    // was rendered as visible page text.
    const transformed = new TransformStream({
      transform(chunk, controller) {
        const text = repairUrlEntities(decoder.decode(chunk, { stream: true }));
        if (text) controller.enqueue(encoder.encode(text));
      },
      flush(controller) {
        const text = repairUrlEntities(decoder.decode());
        controller.enqueue(encoder.encode(text + INJECT));
      },
    });

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(response.body.pipeThrough(transformed), {
      status: response.status, statusText: response.statusText, headers,
    });
  } catch { return response; }
}

// Allow the main page to force this SW to activate immediately
self.addEventListener('message', (ev) => {
  if (ev.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (ev.data?.type === 'ADBLOCK') adblockEnabled = !!ev.data?.data?.enabled;
});

// Defer SW initialization until activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      initWorker();
    })()
  );
});

self.addEventListener('fetch', (ev) => {
  // Requests that are neither proxied nor blockable are left entirely to the
  // browser: no service-worker round trip and no bypass of the HTTP cache.
  //
  // The rewriter injects <script src="/eggs/scramjet.wasm.wasm"> into every
  // document. Scramjet answers that request from this worker with a JS payload
  // that sets self.WASM; if the worker ignores it, the browser executes the
  // raw wasm as a script and throws "Invalid or unexpected token".
  const reqUrl = ev.request.url;
  const isProxied = reqUrl.includes('/ham/') || reqUrl.includes('/eggs/scramjet.wasm.wasm');
  const isBlockable = adblockEnabled && (isAdRequest(reqUrl) || reqUrl.includes('/cdn-cgi/'));
  if (!isProxied && !isBlockable) return;

  ev.respondWith(
    (async () => {
      // A thrown error here rejects the respondWith promise, which the browser
      // reports as an opaque ERR_FAILED with no detail. Answer with a readable
      // 500 instead so a misconfigured proxy is diagnosable.
      try {
        // Adblock check
        if (adblockEnabled && (isAdRequest(reqUrl) || reqUrl.includes('/cdn-cgi/'))) {
          return new Response(null, { status: 204 });
        }

        if (!sw) initWorker();
        await configPromise;
        if (sw.route(ev) || reqUrl.includes('/ham/')) {
          const response = await sw.fetch(ev);
          if (isDocumentNavigation(ev.request) && isAttachmentResponse(response)) {
            await reportDownloadToClients(ev.request.url, response);
            try { response.body?.cancel(); } catch { /* already consumed */ }
            return new Response(null, { status: 204 });
          }
          const stripped = new Headers(response.headers);
          stripped.delete('service-worker-allowed');
          stripped.delete('service-worker');
          stripped.delete('content-security-policy');
          stripped.delete('content-security-policy-report-only');
          stripped.delete('x-frame-options');
          stripped.delete('etag');
          stripped.delete('last-modified');
          const isDocument = ev.request.mode === 'navigate' || ev.request.destination === 'document';
          if (isDocument) {
            // Only repair a missing/opaque type. Forcing every document to
            // text/html breaks XML, plain-text and PDF navigations.
            const ct = (stripped.get('content-type') || '').toLowerCase();
            if (!ct || ct === 'application/octet-stream') {
              stripped.set('content-type', 'text/html; charset=utf-8');
            }
          }
          let finalResponse = new Response(response.body, {
            status: response.status, statusText: response.statusText, headers: stripped,
          });
          // Never append the client script to an HTML fragment fetched by page
          // script; only real documents get it.
          if (isDocument) finalResponse = await injectFingerprint(finalResponse);
          return finalResponse;
        }
        return fetch(ev.request);
      } catch (err) {
        return new Response("Scramjet SW Error: " + err, {
          status: 500,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
    })()
  );
});
