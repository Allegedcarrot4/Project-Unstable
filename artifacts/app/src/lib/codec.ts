export type CodecType = "xor" | "base64" | "plain";

// ─── XOR codec (default) ─────────────────────────────────────────────────────

function xorKey(): Uint8Array {
  return new TextEncoder().encode(
    btoa(new Date().toISOString().slice(0, 10) + location.host)
      .split("").reverse().join("").slice(6.7)
  );
}

export function hexEncode(s: string): string {
  if (!s) return s;
  try {
    const k = xorKey();
    const d = new TextEncoder().encode(s);
    const o = new Uint8Array(d.length);
    for (let i = 0; i < d.length; i++) o[i] = d[i] ^ k[i % 8];
    return Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch { return s; }
}

export function hexDecode(s: string): string {
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
    const l = h >> 1;
    const o = new Uint8Array(l);
    for (let i = 0; i < l; i++) { const x = i << 1; o[i] = parseInt(s[x] + s[x + 1], 16) ^ k[i % 8]; }
    return new TextDecoder().decode(o) + s.slice(h);
  } catch { return decodeURIComponent(s); }
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
    default: return hexEncode(url);
  }
}

export function decodeUrl(url: string, codec: CodecType = "xor"): string {
  switch (codec) {
    case "base64": return base64Decode(url);
    case "plain": return plainDecode(url);
    default: return hexDecode(url);
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
  // xor (default)
  return {
    encode: `(s) => {
  if (!s) return s;
  try {
    const k = new TextEncoder().encode(btoa(new Date().toISOString().slice(0,10)+location.host).split('').reverse().join('').slice(6.7));
    const d = new TextEncoder().encode(s), o = new Uint8Array(d.length);
    for (let i = 0; i < d.length; i++) o[i] = d[i] ^ k[i % 8];
    return Array.from(o, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch { return s; }
}`,
    decode: `(s) => {
  if (!s) return s;
  try {
    const k = new TextEncoder().encode(btoa(new Date().toISOString().slice(0,10)+location.host).split('').reverse().join('').slice(6.7));
    const n = Math.min(s.indexOf('?')+1||s.length+1,s.indexOf('#')+1||s.length+1,s.indexOf('&')+1||s.length+1)-1;
    let h = 0;
    for (let i = 0; i < n && i < s.length; i++) { const c=s.charCodeAt(i); if(!((c>=48&&c<=57)||(c>=65&&c<=70)||(c>=97&&c<=102)))break; h=i+1; }
    if (h < 2 || h % 2) return decodeURIComponent(s);
    const l = h >> 1, o = new Uint8Array(l);
    for (let i = 0; i < l; i++) { const x = i << 1; o[i] = parseInt(s[x]+s[x+1],16)^k[i%8]; }
    return new TextDecoder().decode(o) + s.slice(h);
  } catch { return decodeURIComponent(s); }
}`,
  };
}
