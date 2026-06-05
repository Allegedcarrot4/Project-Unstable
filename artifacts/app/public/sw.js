/*global UVServiceWorker,__uv$config*/
/*
 * Stock service worker script.
 * Users can provide their own sw.js if they need to extend the functionality of the service worker.
 * Ideally, this will be registered under the scope in uv.config.js so it will not need to be modified.
 * However, if a user changes the location of uv.bundle.js/uv.config.js or sw.js is not relative to them, they will need to modify this script locally.
 */
importScripts("uv.bundle.js");
importScripts("uv.config.js");
importScripts(__uv$config.sw || "uv.sw.js");

const uv = new UVServiceWorker();

async function handleRequest(event) {
	if (uv.route(event)) {
		const response = await uv.fetch(event);
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
		} catch (e) {
			return response;
		}
	}

	return await fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});
