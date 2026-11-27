(function() {
  // Run once per document. A second execution used to throw on the
  // `webdriver` defineProperty below and skip every later section.
  if (window.__unstableInjectLoaded) return;
  window.__unstableInjectLoaded = true;
  try {
    const PARENT = window.parent;
    const pendingPerms = {};

    // ─── 1. WebRTC Leak Blocking ──────────────────────────────────────────
    const OrigRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (OrigRTCPeerConnection) {
      function PatchedRTCPeerConnection(config) {
        const pc = new OrigRTCPeerConnection(config);
        const origAddIceCandidate = pc.addIceCandidate.bind(pc);
        pc.addEventListener("icecandidate", (e) => {
          if (e.candidate) {
            const cand = e.candidate;
            const addr = cand.address || cand.ip;
            if (addr && addr !== "0.0.0.0" && !addr.startsWith("192.168.") && !addr.startsWith("10.") && !addr.startsWith("172.16.")) {
              pc.dispatchEvent(new RTCPeerConnectionIceEvent("icecandidate", { candidate: null }));
            }
          }
        });
        return pc;
      }
      PatchedRTCPeerConnection.prototype = OrigRTCPeerConnection.prototype;
      try { window.RTCPeerConnection = PatchedRTCPeerConnection; } catch {}
      try { window.webkitRTCPeerConnection = PatchedRTCPeerConnection; } catch {}
    }

    // ─── 4. Navigator / frame consistency ─────────────────────────────────
    // A proxied page must look like the real browser running it. The previous
    // version replaced navigator.plugins, deviceMemory and hardwareConcurrency
    // with fake values and added canvas/WebGL noise. That made the page *less*
    // consistent (navigator disagreed with the network headers) and it threw
    // on `webdriver`, which skipped every later section of this file.
    // Keep the real values and only correct signals that are actually wrong.
    try {
      if (navigator.webdriver) {
        Object.defineProperty(Navigator.prototype, "webdriver", {
          configurable: true,
          enumerable: true,
          get: function () { return false; },
        });
      }
    } catch { /* non-configurable: a real browser already reports false */ }

    // Present the document as top-level. Frame-busting scripts and some bot
    // checks treat any framed page as suspicious, and document.referrer would
    // otherwise leak the Unstable origin. PARENT was captured above, so the
    // postMessage bridge keeps using the real parent window.
    try {
      if (window.top !== window) {
        Object.defineProperty(window, "top", { configurable: true, get: function () { return window; } });
      }
    } catch { /* ignore */ }
    try {
      if (window.parent !== window) {
        Object.defineProperty(window, "parent", { configurable: true, get: function () { return window; } });
      }
    } catch { /* ignore */ }
    try {
      Object.defineProperty(window, "frameElement", { configurable: true, get: function () { return null; } });
    } catch { /* ignore */ }
    try {
      Object.defineProperty(document, "referrer", { configurable: true, get: function () { return ""; } });
    } catch { /* ignore */ }
    try {
      const emptyOrigins = { length: 0, item: function () { return null; }, contains: function () { return false; } };
      Object.defineProperty(location, "ancestorOrigins", { configurable: true, get: function () { return emptyOrigins; } });
    } catch { /* ignore */ }

    // ─── 5. Permission Interceptor ────────────────────────────────────────
    try {
    const PERMISSION_MAP = {
      camera: "camera",
      microphone: "microphone",
      geolocation: "geolocation",
      notifications: "notifications",
      midi: "midi",
      clipboard: "clipboard",
    };

    function requestPermission(perm) {
      return new Promise((resolve) => {
        const id = Math.random().toString(36).slice(2);
        pendingPerms[id] = resolve;
        PARENT.postMessage({ type: "unstable-permission-request", id, permission: perm, origin: location.origin }, "*");
        setTimeout(() => { if (pendingPerms[id]) { delete pendingPerms[id]; resolve(false); } }, 30000);
      });
    }

    window.addEventListener("message", (e) => {
      if (e.data?.type === "unstable-permission-response" && Object.hasOwn(pendingPerms, e.data.id) && typeof pendingPerms[e.data.id] === "function") {
        pendingPerms[e.data.id](e.data.allowed);
        delete pendingPerms[e.data.id];
      }
    });

    // getUserMedia
    if (navigator.mediaDevices?.getUserMedia) {
      const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async function(constraints) {
        if (constraints.video && await requestPermission("camera") === false) throw new DOMException("Permission denied", "NotAllowedError");
        if (constraints.audio && await requestPermission("microphone") === false) throw new DOMException("Permission denied", "NotAllowedError");
        return origGetUserMedia(constraints);
      };
    }

    // Notification
    if (window.Notification) {
      const origReqPermission = Notification.requestPermission.bind(Notification);
      Notification.requestPermission = async function(cb) {
        const result = await requestPermission("notifications") ? "granted" : "denied";
        if (cb) cb(result);
        return result;
      };
    }

    // Geolocation
    if (navigator.geolocation) {
      const origGetCurrent = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      const origWatch = navigator.geolocation.watchPosition.bind(navigator.geolocation);
      navigator.geolocation.getCurrentPosition = async function(succ, fail, opts) {
        if (await requestPermission("geolocation") === false) { if (fail) fail({ code: 1, message: "Permission denied" }); return; }
        return origGetCurrent(succ, fail, opts);
      };
      navigator.geolocation.watchPosition = async function(succ, fail, opts) {
        if (await requestPermission("geolocation") === false) { if (fail) fail({ code: 1, message: "Permission denied" }); return; }
        return origWatch(succ, fail, opts);
      };
    }
    } catch (e) { console.warn("[unstable-inject] permission bridge error:", e); }
    // ─── 6. Download Interception ──────────────────────────────────────────
    // Downloads must be fetched *inside* the proxied page: only this frame's
    // service worker can turn a proxy URL back into the real file. The Unstable
    // window has no proxy route of its own, so fetching there 404s. Bytes are
    // streamed to the parent in chunks so the manager can show progress and
    // save the file in the browser Unstable runs in.
    function postToParent(message, transfer) {
      try { PARENT.postMessage(message, "*", transfer || []); }
      catch { try { PARENT.postMessage(message, "*"); } catch { /* ignore */ } }
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

    async function streamDownload(requestId, url, filename) {
      try {
        const resp = await fetch(url, { credentials: "include" });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const headerName = parseDispositionFilename(resp.headers.get("content-disposition"));
        const total = Number(resp.headers.get("content-length")) || 0;
        const mime = resp.headers.get("content-type") || "";
        postToParent({
          type: "unstable-download-meta", requestId,
          filename: headerName || filename || "", total, mime,
        });

        const reader = resp.body ? resp.body.getReader() : null;
        if (!reader) {
          const buffer = await resp.arrayBuffer();
          postToParent({ type: "unstable-download-chunk", requestId, chunk: buffer }, [buffer]);
        } else {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value || !value.byteLength) continue;
            // Copy out of the view: the underlying buffer may be pooled.
            const buffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
            postToParent({ type: "unstable-download-chunk", requestId, chunk: buffer }, [buffer]);
          }
        }
        postToParent({ type: "unstable-download-end", requestId });
      } catch (err) {
        postToParent({
          type: "unstable-download-error", requestId,
          message: err && err.message ? err.message : "Download failed",
        });
      }
    }

    function reportDownload(anchor) {
      const rawHref = anchor.getAttribute("href") || "";
      if (!rawHref || /^(javascript|mailto|tel|data:text)/i.test(rawHref) || rawHref === "#") return false;
      let url = anchor.href || rawHref;
      let filename = (anchor.getAttribute("download") || "").trim();
      try {
        if (!filename) filename = decodeURIComponent(new URL(url, location.href).pathname.split("/").filter(Boolean).pop() || "");
      } catch { filename = ""; }
      try { PARENT.postMessage({ type: "unstable-download", url, filename: filename || "download" }, "*"); }
      catch { return false; }
      return true;
    }

    // The parent asks for the bytes (after normalising the URL) once a download
    // is registered, so progress is tracked in one place.
    window.addEventListener("message", (e) => {
      if (e.source !== PARENT) return;
      const d = e.data;
      if (!d || d.type !== "unstable-download-fetch" || !d.url || !d.requestId) return;
      void streamDownload(String(d.requestId), String(d.url), String(d.filename || ""));
    });

    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
      if (!a || !reportDownload(a)) return;
      e.preventDefault();
    }, true);

    // ─── 7. Media Session Bridge (music controller) ─────────────────────────
    // Tracks <audio>/<video> playback + navigator.mediaSession metadata and
    // reports it to the Unstable UI so the floating controller can appear.
    // The UI sends back { type: "unstable-media-control", action } messages.
    try {
      let currentMedia = null;
      let lastPayload = "";
      let tickTimer = null;

      function collectMediaState() {
        const md = navigator.mediaSession && navigator.mediaSession.metadata;
        let title = "", artist = "", album = "", artwork = "";
        if (md) {
          title = md.title || "";
          artist = md.artist || "";
          album = md.album || "";
          try {
            if (md.artwork && md.artwork.length) {
              // Prefer the largest declared artwork size
              let best = md.artwork[0];
              for (const a of md.artwork) {
                const s = parseInt(String(a.sizes || "0"), 10) || 0;
                const bs = parseInt(String(best.sizes || "0"), 10) || 0;
                if (s > bs) best = a;
              }
              artwork = best.src || "";
            }
          } catch { /* ignore */ }
        }
        if (!title) title = document.title || "";
        const el = currentMedia;
        const state = {
          type: "unstable-media-state",
          playing: Boolean(el && !el.paused && !el.ended),
          hasMedia: Boolean(el),
          title,
          artist,
          album,
          artwork,
          currentTime: el && isFinite(el.currentTime) ? el.currentTime : 0,
          duration: el && isFinite(el.duration) ? el.duration : 0,
        };
        return state;
      }

      function postMediaState(force) {
        const state = collectMediaState();
        const payload = JSON.stringify(state);
        // Skip identical heartbeat posts (progress ticks are the only churn)
        if (!force && payload === lastPayload) return;
        lastPayload = payload;
        try { PARENT.postMessage(state, "*"); } catch { /* ignore */ }
      }

      function startTick() {
        if (tickTimer) return;
        tickTimer = setInterval(() => {
          if (currentMedia && !currentMedia.paused) postMediaState(false);
        }, 1000);
      }
      function stopTick() {
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      }

      function trackMedia(el) {
        if (!el || (el.tagName !== "AUDIO" && el.tagName !== "VIDEO")) return;
        currentMedia = el;
        postMediaState(true);
        if (!el.paused) startTick();
      }

      document.addEventListener("play", (e) => trackMedia(e.target), true);
      document.addEventListener("pause", (e) => {
        if (e.target === currentMedia) { stopTick(); postMediaState(true); }
      }, true);
      document.addEventListener("ended", (e) => {
        if (e.target === currentMedia) { stopTick(); postMediaState(true); }
      }, true);
      document.addEventListener("emptied", (e) => {
        if (e.target === currentMedia) { stopTick(); postMediaState(true); }
      }, true);
      // MediaSession metadata often lands slightly after the play event
      document.addEventListener("loadedmetadata", (e) => {
        if (e.target === currentMedia || !currentMedia) trackMedia(e.target);
      }, true);

      // Commands from the Unstable UI controller
      window.addEventListener("message", (e) => {
        if (e.data && e.data.type === "unstable-media-control" && e.source === PARENT) {
          const action = e.data.action;
          if (action === "toggle" || action === "play" || action === "pause") {
            if (!currentMedia) return;
            const shouldPlay = action === "play" || (action === "toggle" && currentMedia.paused);
            if (shouldPlay) {
              const p = currentMedia.play();
              if (p && p.catch) p.catch(() => {});
            } else {
              currentMedia.pause();
            }
            postMediaState(true);
            if (!currentMedia.paused) startTick(); else stopTick();
            return;
          }
          if (action === "next" || action === "prev") {
            const key = action === "next" ? "MediaNextTrack" : "MediaPrevTrack";
            try {
              document.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
              window.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
            } catch { /* ignore */ }
            // Sites with visible controls (YouTube, SoundCloud, Spotify…)
            const selectors = action === "next"
              ? '[data-testid="control-button-skip-forward"], .ytp-next-button, [aria-label="Next"], [aria-label="Next track"], [title="Next"]'
              : '[data-testid="control-button-skip-previous"], .ytp-prev-button, [aria-label="Previous"], [aria-label="Previous track"], [title="Previous"]';
            try {
              const btn = document.querySelector(selectors);
              if (btn && typeof btn.click === "function") btn.click();
            } catch { /* ignore */ }
          }
        }
      });
    } catch (e) { console.warn("[unstable-inject] media bridge error:", e); }

    // ─── 8. New-tab / window.open containment ────────────────────────────
    // Proxied pages sometimes call window.open() or use target="_blank" to
    // escape into a real browser tab (e.g. Google's "next steps" page). Any
    // such navigation is reported to the Unstable UI, which opens the URL as
    // a new in-app tab instead.
    try {
      function absoluteUrl(url) {
        try { return new URL(String(url), location.href).href; } catch { return String(url || ""); }
      }
      function forwardToApp(url) {
        const abs = absoluteUrl(url);
        if (!/^https?:\/\//i.test(abs)) return false;
        try { PARENT.postMessage({ type: "unstable-open-url", url: abs }, "*"); } catch { /* ignore */ }
        return true;
      }

      const origWindowOpen = window.open;
      window.open = function(url) {
        if (url && forwardToApp(url)) {
          // Return a stub so callers that read .closed/.focus() don't throw.
          try {
            return { closed: false, focus: function() {}, blur: function() {}, close: function() {}, postMessage: function() {}, location: { href: absoluteUrl(url) } };
          } catch { return null; }
        }
        return origWindowOpen.apply(this, arguments);
      };

      // Links that ask the browser for a new window/tab.
      document.addEventListener("click", function(e) {
        if (e.defaultPrevented || e.button !== 0) return;
        const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a || a.hasAttribute("download")) return;
        const target = (a.getAttribute("target") || "").toLowerCase();
        if (!target || target === "_self" || target === "_top" || target === "_parent") return;
        if (forwardToApp(a.href)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);

      // Programmatic anchor clicks (element.click()): download anchors go to the
      // manager, new-tab targets go to an in-app tab.
      const origAnchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.hasAttribute("download") && reportDownload(this)) return;
        const target = (this.getAttribute("target") || "").toLowerCase();
        if (target && target !== "_self" && target !== "_top" && target !== "_parent" && this.href) {
          if (forwardToApp(this.href)) return;
        }
        return origAnchorClick.apply(this, arguments);
      };

      // Forms that target a new window stay inside the iframe.
      document.addEventListener("submit", function(e) {
        const form = e.target;
        if (!form || !form.target) return;
        const t = String(form.target).toLowerCase();
        if (t && t !== "_self") form.target = "_self";
      }, true);
    } catch (e) { console.warn("[unstable-inject] containment error:", e); }

    // ─── 8b. Entity-encoded form actions ─────────────────────────────────
    // Sites such as Google's sign-in page write `&amp;` into URL attributes.
    // The rewriter percent-encodes that as `%26amp%3B`, which turns a valid
    // query (`...?a=1&dsh=2`) into a malformed one (`...?a=1&amp;dsh=2`) and
    // makes the POST fail (HTTP 400). The service worker repairs the served
    // HTML; this covers forms created or mutated dynamically after load.
    // Only actions that actually contain the entity text are touched.
    try {
      const fixEntityUrl = (v) =>
        typeof v === "string" && /&amp;/i.test(v) ? v.replace(/&amp;/gi, "&") : v;
      const fixForm = (form, submitter) => {
        if (!form || form.tagName !== "FORM") return;
        const action = form.getAttribute("action");
        if (action && /&amp;/i.test(action)) form.setAttribute("action", fixEntityUrl(action));
        if (submitter) {
          const fa = submitter.getAttribute("formaction");
          if (fa && /&amp;/i.test(fa)) submitter.setAttribute("formaction", fixEntityUrl(fa));
        }
      };
      document.addEventListener("submit", (e) => fixForm(e.target, e.submitter), true);
      // form.submit() does not fire a submit event, so patch it as well.
      const origFormSubmit = HTMLFormElement.prototype.submit;
      HTMLFormElement.prototype.submit = function() {
        fixForm(this, null);
        return origFormSubmit.apply(this, arguments);
      };
    } catch (e) { console.warn("[unstable-inject] form action repair error:", e); }

    // ─── 9. URL / title change reporting ─────────────────────────────────
    // Proxied pages navigate internally (server redirects, history.pushState,
    // hash changes). Tell the Unstable UI whenever the location or title
    // changes so it can update the address bar, tab title and favicon. The
    // message intentionally carries no URL: the parent reads the iframe's real
    // location itself, which cannot be spoofed by page script.
    try {
      let lastHref = "";
      let lastTitle = "";
      let navTimer = null;
      function reportLocation() {
        const href = location.href;
        const title = document.title || "";
        if (href === lastHref && title === lastTitle) return;
        lastHref = href;
        lastTitle = title;
        try { PARENT.postMessage({ type: "unstable-location-change" }, "*"); } catch { /* ignore */ }
      }
      function scheduleReport() {
        if (navTimer) return;
        navTimer = setTimeout(function() { navTimer = null; reportLocation(); }, 60);
      }
      try {
        const origPushState = history.pushState;
        const origReplaceState = history.replaceState;
        history.pushState = function() { const r = origPushState.apply(this, arguments); scheduleReport(); return r; };
        history.replaceState = function() { const r = origReplaceState.apply(this, arguments); scheduleReport(); return r; };
      } catch { /* history may be locked down */ }
      window.addEventListener("popstate", scheduleReport);
      window.addEventListener("hashchange", scheduleReport);
      document.addEventListener("DOMContentLoaded", scheduleReport);
      // SPA title updates are the most reliable "navigation settled" signal.
      try {
        const titleEl = document.querySelector("title");
        if (titleEl && typeof MutationObserver === "function") {
          new MutationObserver(scheduleReport).observe(titleEl, { childList: true, subtree: true, characterData: true });
        }
      } catch { /* ignore */ }
      // Fallback poll: catches redirects/SPA routes that skip the hooks above.
      setInterval(reportLocation, 1000);
      reportLocation();
    } catch (e) { console.warn("[unstable-inject] navigation reporting error:", e); }
  } catch (e) { console.warn("[unstable-inject] error:", e); }
})();
