// Custom hex XOR codec matching DogeUB's makecodec()
// Used by both Scramjet and Ultraviolet for URL encoding/decoding

function getKey(): Uint8Array {
  return new TextEncoder().encode(
    btoa(new Date().toISOString().slice(0, 10) + location.host)
      .split("")
      .reverse()
      .join("")
      .slice(6.7)
  );
}

export function hexEncode(s: string): string {
  if (!s) return s;
  try {
    const k = getKey();
    const d = new TextEncoder().encode(s);
    const o = new Uint8Array(d.length);
    for (let i = 0; i < d.length; i++) o[i] = d[i] ^ k[i % 8];
    return Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return s;
  }
}

export function hexDecode(s: string): string {
  if (!s) return s;
  try {
    const k = getKey();
    const n =
      Math.min(
        s.indexOf("?") + 1 || s.length + 1,
        s.indexOf("#") + 1 || s.length + 1,
        s.indexOf("&") + 1 || s.length + 1
      ) - 1;
    let h = 0;
    for (let i = 0; i < n && i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (!((c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102))) break;
      h = i + 1;
    }
    if (h < 2 || h % 2) return decodeURIComponent(s);
    const l = h >> 1;
    const o = new Uint8Array(l);
    for (let i = 0; i < l; i++) {
      const x = i << 1;
      o[i] = parseInt(s[x] + s[x + 1], 16) ^ k[i % 8];
    }
    return new TextDecoder().decode(o) + s.slice(h);
  } catch {
    return decodeURIComponent(s);
  }
}

// String versions for Scramjet SW context
export function makeCodec() {
  return {
    encode: `(s) => {
  if (!s) return s;
  try {
    const k = new TextEncoder().encode(
      btoa(new Date().toISOString().slice(0, 10) + location.host)
        .split('')
        .reverse()
        .join('')
        .slice(6.7)
    );
    const d = new TextEncoder().encode(s),
      o = new Uint8Array(d.length);
    for (let i = 0; i < d.length; i++) o[i] = d[i] ^ k[i % 8];
    return Array.from(o, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch { return s; }
}`,
    decode: `(s) => {
  if (!s) return s;
  try {
    const k = new TextEncoder().encode(
      btoa(new Date().toISOString().slice(0, 10) + location.host)
        .split('')
        .reverse()
        .join('')
        .slice(6.7)
    );
    const n = Math.min(
      s.indexOf('?') + 1 || s.length + 1,
      s.indexOf('#') + 1 || s.length + 1,
      s.indexOf('&') + 1 || s.length + 1
    ) - 1;
    let h = 0;
    for (let i = 0; i < n && i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (!((c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102))) break;
      h = i + 1;
    }
    if (h < 2 || h % 2) return decodeURIComponent(s);
    const l = h >> 1;
    const o = new Uint8Array(l);
    for (let i = 0; i < l; i++) {
      const x = i << 1;
      o[i] = parseInt(s[x] + s[x + 1], 16) ^ k[i % 8];
    }
    return new TextDecoder().decode(o) + s.slice(h);
  } catch { return decodeURIComponent(s); }
}`,
  };
}
