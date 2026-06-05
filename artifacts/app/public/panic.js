(function () {
  "use strict";
  var STORAGE_KEY = "unstable_panic_url";
  var DEFAULT_URL = "https://google.com";

  function normalize(u) {
    if (!u) return DEFAULT_URL;
    var v = String(u).trim();
    if (!v) return DEFAULT_URL;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v;
    return "https://" + v;
  }

  function readPanic() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_URL;
      var v = JSON.parse(raw);
      if (v && typeof v.url === "string" && v.url.trim()) return normalize(v.url);
    } catch (e) {}
    return DEFAULT_URL;
  }

  function panic() {
    var url = readPanic();
    try { history.replaceState(null, "", url); } catch (e) {}
    try { location.replace(url); } catch (e) {
      try { location.href = url; } catch (e2) { window.open(url, "_self"); }
    }
  }

  function isEditable(el) {
    if (!el) return false;
    var tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.defaultPrevented) return;
    if (isEditable(document.activeElement) && !e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    panic();
  }, true);

  window.unstablePanic = { trigger: panic, read: readPanic, normalize: normalize };
})();
