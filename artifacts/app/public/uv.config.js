/*global Ultraviolet*/

// ─── Codec library ────────────────────────────────────────────────────────────

function xorKey() {
  return new TextEncoder().encode(
    btoa(new Date().toISOString().slice(0, 10) + location.host)
      .split("").reverse().join("").slice(6.7)
  );
}

function xorEncode(s) {
  if (!s) return s;
  try {
    const k = xorKey();
    const d = new TextEncoder().encode(s), o = new Uint8Array(d.length);
    for (let i = 0; i < d.length; i++) o[i] = d[i] ^ k[i % 8];
    return Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch { return s; }
}

function xorDecode(s) {
  if (!s) return s;
  try {
    const k = xorKey();
    const n = Math.min(s.indexOf("?") + 1 || s.length + 1, s.indexOf("#") + 1 || s.length + 1, s.indexOf("&") + 1 || s.length + 1) - 1;
    let h = 0;
    for (let i = 0; i < n && i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (!((c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102))) break;
      h = i + 1;
    }
    if (h < 2 || h % 2) return decodeURIComponent(s);
    const l = h >> 1, o = new Uint8Array(l);
    for (let i = 0; i < l; i++) { const x = i << 1; o[i] = parseInt(s[x] + s[x + 1], 16) ^ k[i % 8]; }
    return new TextDecoder().decode(o) + s.slice(h);
  } catch { return decodeURIComponent(s); }
}

function base64Encode(s) {
  if (!s) return s;
  try { return btoa(encodeURIComponent(s)); } catch { return s; }
}

function base64Decode(s) {
  if (!s) return s;
  try { return decodeURIComponent(atob(s)); } catch { return decodeURIComponent(s); }
}

function plainEncode(s) {
  return s ? encodeURIComponent(s) : s;
}

function plainDecode(s) {
  return s ? decodeURIComponent(s) : s;
}

// ─── Active codec (switchable at runtime) ────────────────────────────────────

let activeCodec = "xor";
const codecs = { xor: { encode: xorEncode, decode: xorDecode }, base64: { encode: base64Encode, decode: base64Decode }, plain: { encode: plainEncode, decode: plainDecode } };

function setCodec(type) { activeCodec = type; }

self.__uv$config = {
  prefix: "/service/",
  bare: "/api/cdn/",
  encodeUrl: function(s) { return codecs[activeCodec].encode(s); },
  decodeUrl: function(s) { return codecs[activeCodec].decode(s); },
  handler: "/uv.handler.js",
  client: "/uv.client.js",
  bundle: "/uv.bundle.js",
  config: "/uv.config.js",
  sw: "/uv.sw.js",
};

self.__uv$setCodec = setCodec;
self.__uv$codecs = codecs;
