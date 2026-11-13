(function() {
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

    // ─── 4. Navigator Spoofing ────────────────────────────────────────────
    Object.defineProperty(navigator, "webdriver", { get: () => false, configurable: false });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"], configurable: false });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8, configurable: false });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8, configurable: false });
    try {
      Object.defineProperty(navigator, "plugins", {
        get: () => {
          const arr = [
            { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer" },
            { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai" },
            { name: "Native Client", filename: "internal-nacl-plugin" },
          ];
          arr.item = (i) => arr[i];
          arr.namedItem = (n) => arr.find(p => p.name === n) || null;
          arr.length = arr.length;
          return arr;
        }, configurable: false
      });
    } catch {}

    // ─── 2. Canvas Fingerprinting Protection ──────────────────────────────
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      const img = origToDataURL.apply(this, args);
      return addCanvasNoise(img);
    };
    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(cb, ...args) {
      origToBlob.call(this, function(blob) {
        if (!blob) return cb(blob);
        const reader = new FileReader();
        reader.onload = () => {
          const noisy = addCanvasNoise(reader.result);
          fetch(noisy).then(r => r.blob()).then(cb).catch(() => cb(blob));
        };
        reader.onerror = () => cb(blob);
        reader.readAsDataURL(blob);
      }, ...args);
    };

    function addCanvasNoise(dataUrl) {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return dataUrl;
        const img = new Image();
        img.src = dataUrl;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < d.data.length; i += 4) {
          d.data[i] ^= 1;
          if (i % 8 === 0) d.data[i + 1] ^= 1;
        }
        ctx.putImageData(d, 0, 0);
        return canvas.toDataURL();
      } catch { return dataUrl; }
    }

    // ─── 3. WebGL Fingerprinting Protection ───────────────────────────────
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const origGetParameter = gl.getParameter.bind(gl);
      gl.getParameter = function(p) {
        if (p === 37445) return "Intel Inc.";
        if (p === 37446) return "Intel Iris OpenGL Engine";
        return origGetParameter(p);
      };
    }

    // ─── 5. Permission Interceptor ────────────────────────────────────────
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
    // ─── 6. Download Interception ──────────────────────────────────────────
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a || !a.download) return;
      e.preventDefault();
      PARENT.postMessage({
        type: "unstable-download",
        url: a.href,
        filename: a.download || a.href.split("/").pop() || "download",
      }, "*");
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

      // Programmatic anchor clicks (element.click()) with a new-tab target.
      const origAnchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
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
