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
      if (e.data?.type === "unstable-permission-response" && e.data.id && typeof pendingPerms[e.data.id] === "function") {
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
  } catch (e) { console.warn("[unstable-inject] error:", e); }
})();
