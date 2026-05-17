importScripts('/eggs/scramjet.all.js');
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const sw = new ScramjetServiceWorker();
const configPromise = sw.loadConfig();

// Allow the main page to force this SW to activate immediately
// (bypasses the default "wait for all clients to close" behavior)
self.addEventListener('message', (ev) => {
  if (ev.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (ev) => {
  ev.respondWith(
    (async () => {
      await configPromise;
      if (sw.route(ev) || ev.request.url.includes('/ham/')) {
        try {
          const response = await sw.fetch(ev);
          // Strip headers that allow proxied sites (e.g. YouTube) to install their
          // own service workers, and headers that block Scramjet's URL rewrites.
          const stripped = new Headers(response.headers);
        stripped.delete('service-worker-allowed');
        stripped.delete('service-worker');
        stripped.delete('content-security-policy');
        stripped.delete('content-security-policy-report-only');
        stripped.delete('x-frame-options');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: stripped,
        });
        } catch (err) {
          return new Response("Scramjet SW Error: " + err, { status: 500 });
        }
      }
      return fetch(ev.request);
    })()
  );
});
