/*global Ultraviolet*/

// ─── Codec library (scramjet default: encodeURIComponent/decodeURIComponent) ──

function xorEncode(s) { return s ? encodeURIComponent(s) : s; }
function xorDecode(s) { return s ? decodeURIComponent(s) : s; }

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
