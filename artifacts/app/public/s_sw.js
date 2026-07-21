importScripts('/eggs/scramjet.all.js');
const { ScramjetServiceWorker } = $scramjetLoadWorker();

let sw = null;
let configPromise = null;
let adblockEnabled = true;

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

function injectFingerprint(response) {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html") || !response.body) return response;
  try {
    const INJECT = '<script src="/inject.js"></script></body>';
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let injected = false;
    let tail = "";

    const transformed = new TransformStream({
      transform(chunk, controller) {
        let text = tail + decoder.decode(chunk, { stream: true });
        const idx = text.lastIndexOf("</body>");
        if (!injected && idx !== -1) {
          injected = true;
          text = text.slice(0, idx) + INJECT + text.slice(idx + 7);
          tail = "";
        } else {
          tail = text.slice(-14);
          text = text.slice(0, -14);
        }
        if (text) controller.enqueue(encoder.encode(text));
      },
      flush(controller) {
        let text = tail;
        if (!injected) text += INJECT;
        if (text) controller.enqueue(encoder.encode(text));
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
      sw = new ScramjetServiceWorker();
      configPromise = sw.loadConfig();
    })()
  );
});

self.addEventListener('fetch', (ev) => {
  ev.respondWith(
    (async () => {
      const reqUrl = ev.request.url;

      // Adblock check
      if (adblockEnabled && (isAdRequest(reqUrl) || reqUrl.includes('/cdn-cgi/'))) {
        return new Response(null, { status: 204 });
      }

      if (!sw) { sw = new ScramjetServiceWorker(); configPromise = sw.loadConfig(); }
      await configPromise;
      if (sw.route(ev) || ev.request.url.includes('/ham/')) {
        try {
          const response = await sw.fetch(ev);
          const stripped = new Headers(response.headers);
          stripped.delete('service-worker-allowed');
          stripped.delete('service-worker');
          stripped.delete('content-security-policy');
          stripped.delete('content-security-policy-report-only');
          stripped.delete('x-frame-options');
          stripped.delete('etag');
          stripped.delete('last-modified');
          if (ev.request.mode === 'navigate' || ev.request.destination === 'document') {
            stripped.set('content-type', 'text/html; charset=utf-8');
          }
          let finalResponse = new Response(response.body, {
            status: response.status, statusText: response.statusText, headers: stripped,
          });
          finalResponse = await injectFingerprint(finalResponse);
          return finalResponse;
        } catch (err) {
          return new Response("Scramjet SW Error: " + err, { status: 500 });
        }
      }
      return fetch(ev.request);
    })()
  );
});
