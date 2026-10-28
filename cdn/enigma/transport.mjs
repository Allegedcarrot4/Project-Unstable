// Enigma transport wrapper — encrypts URLs before sending through the inner transport
// Implements the bare-mux transport interface

import { BareMuxConnection } from "./baremux/worker.js";

const XOR_KEY = [0x4e, 0x75, 0x6e, 0x73, 0x74, 0x61, 0x62, 0x6c]; // "Unstabl"

function xorEncode(s) {
  const d = new TextEncoder().encode(s);
  const o = new Uint8Array(d.length);
  for (let i = 0; i < d.length; i++) o[i] = d[i] ^ XOR_KEY[i % 8];
  return btoa(String.fromCharCode(...o));
}

function xorDecode(s) {
  try {
    const d = Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const o = new Uint8Array(d.length);
    for (let i = 0; i < d.length; i++) o[i] = d[i] ^ XOR_KEY[i % 8];
    return new TextDecoder().decode(o);
  } catch { return s; }
}

export default class EnigmaTransport {
  constructor(innerTransport, innerArgs) {
    this.name = "enigma";
    this.innerTransport = innerTransport;
    this.innerArgs = innerArgs;
    this.inner = null;
  }

  async init() {
    const conn = new BareMuxConnection("/baremux/worker.js");
    await conn.setTransport(this.innerTransport, this.innerArgs);
    return this;
  }

  async fetch(request) {
    if (request.url) {
      request = new Request(xorEncode(request.url), request);
    }
    const response = await fetch(request);
    if (response.url) {
      return new Response(response.body, {
        ...response,
        url: xorDecode(response.url),
      });
    }
    return response;
  }

  async connectWebsocket(url, protocols) {
    return fetch(new Request(xorEncode(url), { headers: { "Upgrade": "websocket" } }));
  }
}
