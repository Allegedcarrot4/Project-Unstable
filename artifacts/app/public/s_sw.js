importScripts('/eggs/scramjet.all.js');
const { ScramjetServiceWorker } = $scramjetLoadWorker();

let sw = null;
let configPromise = null;
let adblockEnabled = true;

// ─── Adblock rules (same as sw.js) ──────────────────────────────────────────

const AD_RULES = [
  "doubleclick.net/*", "googlesyndication.com/*", "googleadservices.com/*", "googletagmanager.com/gtm.js",
  "googletagmanager.com/gtag/*", "google-analytics.com/*", "googletagmanager.com/ns.html",
  "pagead2.googlesyndication.com/*", "adservice.google.com/*", "adsrvr.org/*", "adnxs.com/*",
  "ads.pubmatic.com/*", "adzerk.net/*", "advertising.com/*", "media.net/*", "amazon-adsystem.com/*",
  "casalemedia.com/*", "criteo.com/*", "criteo.net/*", "contextweb.com/*", "indexww.com/*",
  "openx.net/*", "pubmatic.com/*", "rubiconproject.com/*", "sharethrough.com/*", "sovrn.com/*",
  "taboola.com/*", "teads.tv/*", "thetradedesk.com/*", "tremorhub.com/*", "tribalfusion.com/*",
  "triplelift.com/*", "yahoo.com/ssp/*", "yahoo.com/adserver/*", "yieldmo.com/*", "yieldmanager.com/*",
  "yieldoptimizer.com/*", "yieldtraffic.com/*", "serving-sys.com/*", "adition.com/*", "admicro.vn/*",
  "adscale.de/*", "adform.net/*", "adfox.ru/*", "adriver.ru/*", "adspirit.de/*",
  "adsafeprotected.com/*", "adsafemedia.com/*",
  "facebook.com/tr/*", "facebook.net/*", "connect.facebook.net/*", "analytics.twitter.com/*",
  "ads.linkedin.com/*", "bat.bing.com/*", "pinterest.com/ct/*", "ct.pinterest.com/*",
  "tiktok.com/analytics/*", "ads.tiktok.com/*", "redditstatic.com/ads/*", "ads.reddit.com/*",
  "hotjar.com/*", "mouseflow.com/*", "fullstory.com/*", "sentry.io/*", "bugsnag.com/*",
  "scorecardresearch.com/*", "quantserve.com/*", "comscore.com/*", "outbrain.com/*",
  "amazon-adsystem.com/aax2/*", "cdn.onesignal.com/sdks/*", "onesignal.com/api/*",
  "js.hs-analytics.net/*", "ads.yahoo.com/*", "analytics.yahoo.com/*", "gemini.yahoo.com/*",
  "adserver.yahoo.com/*", "securepubads.g.doubleclick.net/*",
  "exelator.com/*", "moatads.com/*", "moat.com/*",
  "adsymptotic.com/*", "bluekai.com/*", "demdex.net/*", "krxd.net/*",
  "rlcdn.com/*", "turn.com/*",
];

function wildcardToRegex(pattern) {
  const parts = pattern.split("*").map(p => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp("^(.*)?" + parts.join("(.*)") + "(.*)?$", "i");
}

const AD_REGEXES = AD_RULES.map(wildcardToRegex);

function isAdRequest(url) {
  try {
    const u = new URL(url);
    const full = u.hostname + u.pathname;
    return AD_REGEXES.some(r => r.test(full) || r.test(u.hostname));
  } catch { return false; }
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
          if (ev.request.mode === 'navigate' || ev.request.destination === 'document') {
            stripped.set('content-type', 'text/html; charset=utf-8');
          }
          return new Response(response.body, {
            status: response.status, statusText: response.statusText, headers: stripped,
          });
        } catch (err) {
          return new Response("Scramjet SW Error: " + err, { status: 500 });
        }
      }
      return fetch(ev.request);
    })()
  );
});
