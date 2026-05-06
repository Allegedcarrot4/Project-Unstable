importScripts('/eggs/scramjet.all.js');
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const sw = new ScramjetServiceWorker();
self.addEventListener('fetch', async (ev) => {
  await sw.loadConfig();
  if (sw.route(ev)) {
    ev.respondWith(sw.fetch(ev));
  }
});
