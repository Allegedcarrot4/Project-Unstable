importScripts("uv.bundle.js");
importScripts("uv.config.js");
importScripts(__uv$config.sw || "uv.sw.js");
importScripts("cookie-store.js");

const uv = new UVServiceWorker();
const COOKIE_CHANNEL = "__unstable_cookie_sync";
let adblockEnabled = true;
const CUSTOM_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// ─── Adblock rules ──────────────────────────────────────────────────────────

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
  "adzerk.net/*", "exelator.com/*", "moatads.com/*", "moat.com/*",
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
    const host = u.hostname;
    const full = u.hostname + u.pathname;
    return AD_REGEXES.some(r => r.test(full) || r.test(host));
  } catch { return false; }
}

function isTrackingUrl(url) {
  try {
    const trackingKeywords = ["utm_", "gclid=", "fbclid=", "mc_cid=", "mc_eid=", "_hsenc=", "_hsmi=", "hsCtaTracking="];
    return trackingKeywords.some(k => url.includes(k));
  } catch { return false; }
}

function stripTrackingParams(url) {
  try {
    const u = new URL(url);
    const params = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "mc_cid", "mc_eid", "_hsenc", "_hsmi", "hsCtaTracking"];
    let changed = false;
    for (const p of params) { if (u.searchParams.has(p)) { u.searchParams.delete(p); changed = true; } }
    return changed ? u.toString() : url;
  } catch { return url; }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isBareRequest(url) { return url.includes("/api/cdn"); }

function isUvRequest(url) { return url.includes("/service/"); }

async function attachCookiesToBareRequest(request) {
  const bareUrl = request.headers.get("x-bare-url");
  if (!bareUrl) return request;
  const cookies = await self.__unstableCookieStore.getCookiesForUrl(bareUrl);
  const bareHeadersRaw = request.headers.get("x-bare-headers");
  let bareHeaders = {};
  try { bareHeaders = JSON.parse(bareHeadersRaw || "{}"); } catch {}
  if (cookies) bareHeaders["cookie"] = cookies;
  bareHeaders["user-agent"] = CUSTOM_UA;
  bareHeaders["sec-ch-ua"] = '"Chromium";v="125", "Google Chrome";v="125"';
  bareHeaders["sec-ch-ua-platform"] = '"Windows"';
  // Spoof referer to prevent proxy URL leakage
  if (bareHeaders["referer"]) bareHeaders["referer"] = bareUrl;
  if (bareHeaders["Referer"]) bareHeaders["Referer"] = bareUrl;
  if (isTrackingUrl(bareUrl)) { bareHeaders["x-unstable-strip-tracking"] = "1"; }
  const newHeaders = new Headers(request.headers);
  newHeaders.set("x-bare-headers", JSON.stringify(bareHeaders));
  return new Request(request, { headers: newHeaders });
}

async function processBareResponseCookies(response, requestUrl) {
  const xBareHeaders = response.headers.get("x-bare-headers");
  if (!xBareHeaders) return response;
  let parsed;
  try { parsed = JSON.parse(xBareHeaders); } catch { return response; }
  const setCookie = parsed["set-cookie"] || parsed["Set-Cookie"];
  if (!setCookie) return response;
  const setCookieArr = Array.isArray(setCookie) ? setCookie : [setCookie];
  const sourceUrl = requestUrl;
  let changed = false;
  for (const raw of setCookieArr) {
    await self.__unstableCookieStore.setCookie(raw, sourceUrl);
    changed = true;
  }
  delete parsed["set-cookie"];
  delete parsed["Set-Cookie"];
  if (changed) {
    try { const bc = new BroadcastChannel(COOKIE_CHANNEL); bc.postMessage({ type: "cookie-changed", sourceUrl }); bc.close(); } catch {}
  }
  const newHeaders = new Headers(response.headers);
  newHeaders.set("x-bare-headers", JSON.stringify(parsed));
  newHeaders.delete("set-cookie");
  return new Response(response.body, {
    status: response.status, statusText: response.statusText, headers: newHeaders,
  });
}

async function stripResponseHeaders(response) {
  try {
    const stripped = new Headers(response.headers);
    stripped.delete("service-worker-allowed");
    stripped.delete("service-worker");
    stripped.delete("content-security-policy");
    stripped.delete("content-security-policy-report-only");
    stripped.delete("x-frame-options");
    stripped.delete("etag");
    stripped.delete("last-modified");
    return new Response(response.body, {
      status: response.status, statusText: response.statusText, headers: stripped,
    });
  } catch { return response; }
}

async function injectFingerprint(response) {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;
  try {
    const body = await response.text();
    const script = '<script src="/inject.js"></script>';
    const modified = body.includes("</body>") ? body.replace("</body>", script + "</body>") : body + script;
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(modified, { status: response.status, statusText: response.statusText, headers });
  } catch { return response; }
}

async function handleRequest(event) {
  const reqUrl = event.request.url;
  let request = event.request;

  // Adblock: block known ad/tracker requests
  if (adblockEnabled && (isAdRequest(reqUrl) || reqUrl.includes("/cdn-cgi/"))) {
    return new Response(null, { status: 204 });
  }

  // Attach cookies + custom UA to bare requests
  if (isBareRequest(reqUrl)) request = await attachCookiesToBareRequest(request);

  let response;
  if (uv.route(event)) {
    response = await uv.fetch(event);
    response = await stripResponseHeaders(response);
    response = await injectFingerprint(response);
  } else {
    response = await fetch(request);
  }

  if (isBareRequest(reqUrl)) {
    const bareUrl = event.request.headers.get("x-bare-url");
    response = await processBareResponseCookies(response, bareUrl || reqUrl);
  }

  return response;
}

self.addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});

self.addEventListener("message", (event) => {
  const { type, data } = event.data || {};
  if (type === "ADBLOCK") adblockEnabled = !!data?.enabled;
  if (type === "CODEC" && data?.type && self.__uv$setCodec) {
    self.__uv$setCodec(data.type);
    // Re-register the UV config functions
    self.__uv$config.encodeUrl = function(s) { return self.__uv$codecs[data.type].encode(s); };
    self.__uv$config.decodeUrl = function(s) { return self.__uv$codecs[data.type].decode(s); };
  }
});
