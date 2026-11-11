// ─── Securly content-filter detection ─────────────────────────────────────────
//
// Detects whether the Securly filter / Classroom monitoring extension is
// installed in the browser.
//
// How it works: Securly's extensions declare
//
//     "web_accessible_resources": [{ "resources": ["fonts/*", "*.svg"],
//                                    "matches": ["<all_urls>"] }]
//
// in their manifests (verified directly against Securly's production CRX
// packages: "Securly for Chrome browser" and "Securly for Chromebooks").
// That flag means ANY website may fetch their logo/fonts through
//   chrome-extension://<id>/logo.svg
// and that request only succeeds while the extension is installed — a
// reliable, passive detection channel (the asset loads as an image, so no
// CORS cooperation from the extension is required).
//
// Known extension IDs come from Securly's official update feed
// (https://extensions.securly.com/extensions.xml) plus the legacy
// Securly Classroom ID documented at support.securly.com.
//
// Two secondary signals back the asset probes up for browsers where the
// chrome-extension scheme is unavailable (e.g. Firefox):
//   - network requests to *securly* hosts (the injected badge iframe)
//   - DOM markers (injected iframes/elements carrying a securly id/class)

/** Every Securly-published extension ID we know about. */
const SECURLY_EXTENSION_IDS: string[] = [
  // Production (Chrome)
  "lcgajdcbmhepemmlpemkkpgagieehmjp", // Securly for Chrome browser
  "kagdohglfkeomlhbbmmnnnnllifokngl", // Securly for Chromebooks (MV3)
  "khfcjmoagjdbcchabenkohfbllefkbei", // Securly for Chromebooks (MV3 build 2)
  "joflmkccibkooplaeoinecjbmdebglab", // Securly for Chromebooks (legacy)
  "jfbecfmiegcjddenjhlbhlikcbfmnafd", // Securly Classroom (documented ID)
  // Beta / staged Chrome builds
  "ehpfmanenigliflmbaiihbppncilhaha",
  "hgmfginomehjpgpacpjnjaijecknnaog",
  "pmjdkmdfhcbecicgaenammmpamphljpe",
  "knneimmpeamikmjijmnhjmmobddleohj",
  // "Think Twice" extensions
  "nldffgleokocdcddeocjmdgneoinbhfb",
  "hgpppmjalkmcmloikkbmonbpdakcklfp",
  // Edge builds (harmless to probe from Chrome; caught if user is on Edge)
  "bjnmaaglmedeickpbmlhmjkndenggend",
  "adncfiefnfjddkdlfcckejoefaoehcdf",
  "cppgiodhimhhljofjomebpcgliegpddd",
  // QA build (rarely deployed, but free to probe)
  "bemnimicbokkfdkgbghbpaelcagifglp",
];

/** Web-accessible assets to probe (fonts/* + *.svg per their manifests). */
const PROBE_ASSETS: string[] = [
  "logo.svg",
  "tt-alert.svg",
  "fonts/Metropolis-Regular.woff",
];

const PROBE_TIMEOUT_MS = 2500;
const SIGNAL_DELAY_MS = 3000;
const OVERALL_TIMEOUT_MS = 6000;

function isChromiumBrowser(): boolean {
  // chrome-extension: URLs only exist in Chromium browsers. CriOS (Chrome on
  // iOS) is deliberately excluded — iOS cannot load extension resources.
  return /Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent);
}

/** Resolve true if a single chrome-extension asset loads, false otherwise. */
function probeAsset(id: string, asset: string): Promise<boolean> {
  const url = `chrome-extension://${id}/${asset}`;
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => done(false), PROBE_TIMEOUT_MS);

    if (/\.(woff2?|ttf|otf)$/i.test(asset)) {
      // Fonts are CORS-mode fetches; if the extension doesn't cooperate the
      // probe simply fails and the SVG probes carry the detection instead.
      try {
        const face = new FontFace("SecurlyProbe", `url("${url}")`);
        face.load().then(() => done(true)).catch(() => done(false));
      } catch {
        done(false);
      }
      return;
    }

    const img = new Image();
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}

/** True if any known Securly extension is installed (any asset loads). */
async function probeAllExtensions(): Promise<boolean> {
  // Sequential across IDs with early exit: a detected machine stops at the
  // first installed extension instead of firing every probe.
  for (const id of SECURLY_EXTENSION_IDS) {
    const results = await Promise.all(PROBE_ASSETS.map((asset) => probeAsset(id, asset)));
    if (results.some(Boolean)) return true;
  }
  return false;
}

/** Requests to *securly* hosts (badge iframe, filter callbacks). */
function hasSecurlyNetworkSignal(): boolean {
  try {
    const entries = performance.getEntriesByType("resource");
    return entries.some((e) => {
      try {
        return new URL(e.name).hostname.includes("securly");
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/** Injected DOM markers (badge iframe, filter elements). */
function hasSecurlyDomSignal(): boolean {
  try {
    // Attributes only — the toast's own text never matches this.
    return !!document.querySelector(
      'iframe[src*="securly" i], [id*="securly" i], [class*="securly" i]',
    );
  } catch {
    return false;
  }
}

/** Resolve true as soon as any signal is true; false only when all are false. */
function anyTrue(promises: Promise<boolean>[]): Promise<boolean> {
  return new Promise((resolve) => {
    let remaining = promises.length;
    let settled = false;
    if (remaining === 0) {
      resolve(false);
      return;
    }
    for (const p of promises) {
      p.then((ok) => {
        if (settled) return;
        if (ok) {
          settled = true;
          resolve(true);
        } else if (--remaining === 0) {
          settled = true;
          resolve(false);
        }
      });
    }
  });
}

let inflight: Promise<boolean> | null = null;

/**
 * Detect Securly. Runs asset probes immediately and side signals after a
 * short delay (injected badges need a moment to appear). Resolves within
 * ~OVERALL_TIMEOUT_MS. The result is cached per page load.
 */
export function detectSecurly(): Promise<boolean> {
  if (inflight) return inflight;

  const signals: Promise<boolean>[] = [];
  if (isChromiumBrowser()) {
    signals.push(probeAllExtensions());
  }
  signals.push(
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(hasSecurlyNetworkSignal() || hasSecurlyDomSignal()), SIGNAL_DELAY_MS);
    }),
  );

  inflight = Promise.race([
    anyTrue(signals),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), OVERALL_TIMEOUT_MS)),
  ]);
  return inflight;
}
