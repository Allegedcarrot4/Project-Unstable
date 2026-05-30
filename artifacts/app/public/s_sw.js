importScripts('/eggs/scramjet.all.js');
const { ScramjetServiceWorker } = $scramjetLoadWorker();

let sw = null;
let configPromise = null;

// Allow the main page to force this SW to activate immediately
self.addEventListener('message', (ev) => {
  if (ev.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Defer SW initialization until activate — at this point clients are available
// so BareClient port discovery via self.clients.matchAll() will succeed.
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
      if (!sw) {
        sw = new ScramjetServiceWorker();
        configPromise = sw.loadConfig();
      }
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
