import init, { LibCurl, LibCurlWebSocket } from "./drift_wasm_browser.mjs";

var driftWasmUrl = new URL("./drift_wasm_bg.wasm", import.meta.url).href;

var wasmReady = false;
var wasmInitPromise = null;

function ensureWasmReady() {
  if (!wasmInitPromise) {
    wasmInitPromise = init(driftWasmUrl).then(() => {
      wasmReady = true;
    });
  }
  return wasmInitPromise;
}

class DriftClient {
  wisp;
  proxy;
  transport;
  connections;
  client;

  constructor(options) {
    this.wisp = options.wisp ?? options.websocket;
    this.transport = options.transport;
    this.proxy = options.proxy;
    this.connections = options.connections;
    if (!this.wisp.startsWith("ws://") && !this.wisp.startsWith("wss://")) {
      throw new TypeError("The Websocket URL must use the ws:// or wss:// protocols.");
    }
  }

  async init() {
    await ensureWasmReady();
    this.client = new LibCurl();
    this.client.set_websocket(this.wisp);
  }

  async meta() {
  }

  async request(remote, method, body, headers, signal) {
    let payload = await this.client.fetch(remote.href, {
      method,
      headers,
      body,
      redirect: "manual",
      signal,
    });
    let respheaders = {};
    for (let [key, value] of payload.headers) {
      if (!respheaders[key]) {
        respheaders[key] = [value];
      } else {
        respheaders[key].push(value);
      }
    }
    return {
      body: payload.body,
      headers: respheaders,
      status: payload.status,
      statusText: payload.statusText,
    };
  }

  connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
    let socket = new LibCurlWebSocket(url.toString(), protocols);
    socket.binaryType = "arraybuffer";
    socket.onopen = () => onopen("");
    socket.onclose = (event) => onclose(event.code, event.reason);
    socket.onerror = () => onerror("");
    socket.onmessage = (event) => onmessage(event.data);
    return [
      (data) => { socket.send(data); },
      (code, reason) => { socket.close(code, reason); },
    ];
  }
}

export { DriftClient as default };
