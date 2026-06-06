importScripts("uv.bundle.js");
importScripts("uv.config.js");
importScripts(__uv$config.sw || "uv.sw.js");
importScripts("cookie-store.js");

const uv = new UVServiceWorker();
const COOKIE_CHANNEL = "__unstable_cookie_sync";

function isBareRequest(url) {
  return url.includes("/api/cdn");
}

function isUvRequest(url) {
  return url.includes("/service/");
}

async function attachCookiesToBareRequest(request) {
  const bareUrl = request.headers.get("x-bare-url");
  if (!bareUrl) return request;
  const cookies = await self.__unstableCookieStore.getCookiesForUrl(bareUrl);
  if (!cookies) return request;
  const bareHeadersRaw = request.headers.get("x-bare-headers");
  let bareHeaders = {};
  try { bareHeaders = JSON.parse(bareHeadersRaw || "{}"); } catch {}
  if (cookies) bareHeaders["cookie"] = cookies;
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
    try {
      const bc = new BroadcastChannel(COOKIE_CHANNEL);
      bc.postMessage({ type: "cookie-changed", sourceUrl });
      bc.close();
    } catch {}
  }
  const newHeaders = new Headers(response.headers);
  newHeaders.set("x-bare-headers", JSON.stringify(parsed));
  newHeaders.delete("set-cookie");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
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
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: stripped,
    });
  } catch {
    return response;
  }
}

async function handleRequest(event) {
  const reqUrl = event.request.url;
  let request = event.request;

  // Attach cookies to bare requests before they reach the server
  if (isBareRequest(reqUrl)) {
    request = await attachCookiesToBareRequest(request);
  }

  let response;
  if (uv.route(event)) {
    response = await uv.fetch(event);
    response = await stripResponseHeaders(response);
  } else {
    response = await fetch(request);
  }

  // Process cookies from bare responses
  if (isBareRequest(reqUrl)) {
    const bareUrl = event.request.headers.get("x-bare-url");
    response = await processBareResponseCookies(response, bareUrl || reqUrl);
  }

  return response;
}

self.addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});
