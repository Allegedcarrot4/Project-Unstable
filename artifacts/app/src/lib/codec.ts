export type CodecType = "xor" | "base64" | "plain";

// ─── XOR codec (scramjet default: encodeURIComponent/decodeURIComponent) ──────

export function xorEncode(s: string): string {
  return s ? encodeURIComponent(s) : s;
}

export function xorDecode(s: string): string {
  return s ? decodeURIComponent(s) : s;
}

// ─── Base64 codec ────────────────────────────────────────────────────────────

function base64Encode(s: string): string {
  if (!s) return s;
  try { return btoa(encodeURIComponent(s)); } catch { return s; }
}

function base64Decode(s: string): string {
  if (!s) return s;
  try { return decodeURIComponent(atob(s)); } catch { return decodeURIComponent(s); }
}

// ─── Plain codec ─────────────────────────────────────────────────────────────

function plainEncode(s: string): string {
  return s ? encodeURIComponent(s) : s;
}

function plainDecode(s: string): string {
  return s ? decodeURIComponent(s) : s;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function encodeUrl(url: string, codec: CodecType = "xor"): string {
  switch (codec) {
    case "base64": return base64Encode(url);
    case "plain": return plainEncode(url);
    default: return xorEncode(url);
  }
}

export function decodeUrl(url: string, codec: CodecType = "xor"): string {
  switch (codec) {
    case "base64": return base64Decode(url);
    case "plain": return plainDecode(url);
    default: return xorDecode(url);
  }
}

// ─── String versions for Scramjet SW context ─────────────────────────────────

export function makeCodec(codecType: CodecType = "xor") {
  if (codecType === "base64") return {
    encode: "(s) => { if(!s)return s; try{return btoa(encodeURIComponent(s))}catch{return s} }",
    decode: "(s) => { if(!s)return s; try{return decodeURIComponent(atob(s))}catch{return decodeURIComponent(s)} }",
  };
  if (codecType === "plain") return {
    encode: "(s) => s ? encodeURIComponent(s) : s",
    decode: "(s) => s ? decodeURIComponent(s) : s",
  };
  // xor (scramjet default: encodeURIComponent)
  return {
    encode: "(s) => s ? encodeURIComponent(s) : s",
    decode: "(s) => s ? decodeURIComponent(s) : s",
  };
}
