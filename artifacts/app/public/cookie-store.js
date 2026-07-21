(function () {
  const DB_NAME = "__unstable_cookies";
  const STORE_NAME = "cookies";
  const CHANNEL_NAME = "__unstable_cookie_sync";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("domain", "domain", { unique: false });
          store.createIndex("expires", "expires", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllCookies() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        resolve(req.result || []);
        db.close();
      };
      req.onerror = () => {
        reject(req.error);
        db.close();
      };
    });
  }

  async function getCookiesForDomain(domain) {
    const all = await getAllCookies();
    const now = Date.now();
    return all.filter(c => {
      if (c.expires && c.expires <= now) return false;
      return domain.endsWith(c.domain) || c.domain === domain;
    });
  }

  function cookieMatches(cookie, url) {
    try {
      const u = new URL(url);
      const host = u.hostname;
      const path = u.pathname;
      if (cookie.secure && u.protocol !== "https:") return false;
      if (cookie.domain && !host.endsWith(cookie.domain)) return false;
      if (cookie.path && !path.startsWith(cookie.path)) return false;
      return true;
    } catch { return false; }
  }

  async function getCookiesForUrl(url) {
    const all = await getAllCookies();
    const now = Date.now();
    const valid = all.filter(c => {
      if (c.expires && c.expires <= now) return false;
      return cookieMatches(c, url);
    });
    return valid.map(c => `${c.name}=${c.value}`).join("; ");
  }

  async function setCookie(rawCookie, sourceUrl) {
    try {
      const parsed = parseSetCookie(rawCookie, sourceUrl);
      if (!parsed) return;
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).put(parsed);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (e) { console.warn("cookie-store: setCookie error", e); }
  }

  async function deleteCookie(key) {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  function parseSetCookie(raw, sourceUrl) {
    try {
      let parts = raw.split(";").map(s => s.trim());
      const nv = parts[0].split("=");
      if (!nv[0]) return null;
      const name = nv[0].trim();
      const value = (nv.slice(1).join("=") || "").trim();
      let domain = "";
      let path = "/";
      let expires = 0;
      let secure = false;
      let httpOnly = false;
      for (let i = 1; i < parts.length; i++) {
        const kv = parts[i].split("=");
        const k = kv[0].toLowerCase().trim();
        const v = (kv.slice(1).join("=") || "").trim();
        if (k === "domain") domain = v.startsWith(".") ? v : "." + v;
        else if (k === "path") path = v || "/";
        else if (k === "expires") expires = new Date(v).getTime();
        else if (k === "max-age") expires = Date.now() + parseInt(v) * 1000;
        else if (k === "secure") secure = true;
        else if (k === "httponly") httpOnly = true;
      }
      try {
        if (!domain) domain = "." + new URL(sourceUrl).hostname;
      } catch { return null; }
      const key = `${domain}@${path}@${name}`;
      return { key, name, value, domain, path, expires, secure, httpOnly };
    } catch { return null; }
  }

  function notifyTabs(change) {
    try {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage(change);
      bc.close();
    } catch {}
  }

  self.__unstableCookieStore = {
    getAllCookies,
    getCookiesForDomain,
    getCookiesForUrl,
    setCookie,
    deleteCookie,
    parseSetCookie,
    notifyTabs,
  };

  // Listen for cookie sync from other tabs
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (ev) => {
      if (ev.data?.type === "cookie-changed") {
        // Force reload affected data on next request
      }
    };
  } catch {}
})();
