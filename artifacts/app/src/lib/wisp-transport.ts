// Wisp Transport for bare-mux
// Wraps @nightnetwork/nova LibCurl API as a bare-mux compatible transport

import type { BareTransport, BareHeaders, TransferrableResponse } from "bare-mux-fork";

interface WispTransportOptions {
  wisp: string;
  relayPort?: MessagePort;
  proxy?: string;
  proxyChain?: string[];
}

let wispModule: any = null;
let libCurlInstance: any = null;

async function loadWispClient(): Promise<void> {
  if (wispModule) return;
  
  // Dynamic import to avoid SSR issues
  const mod = await import("@nightnetwork/nova");
  await mod.init();
  wispModule = mod;
}

export async function createWispTransport(options: WispTransportOptions): Promise<BareTransport> {
  await loadWispClient();
  
  const { LibCurl } = wispModule;
  const lc = new LibCurl();
  
  if (options.relayPort) {
    lc.set_moonbeam_relay(options.relayPort);
  } else {
    lc.set_websocket(options.wisp);
  }
  
  if (options.proxy) {
    lc.set_proxy(options.proxy);
  }
  if (options.proxyChain) {
    lc.set_proxy_chain(options.proxyChain);
  }

  const transport: BareTransport = {
    ready: true,
    
    async init() {
      // Client is initialized in loadWispClient()
    },
    
    connect(url: URL, protocols: string[], requestHeaders: BareHeaders, onopen: (protocol: string) => void, onmessage: (data: Blob | ArrayBuffer | string) => void, onclose: (code: number, reason: string) => void, onerror: (error: string) => void) {
      // For WebSocket connections, initiate asynchronously
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(requestHeaders)) {
        headers[key] = Array.isArray(value) ? value.join(", ") : value;
      }
      headers["Upgrade"] = "websocket";
      headers["Connection"] = "Upgrade";
      if (protocols.length > 0) {
        headers["Sec-WebSocket-Protocol"] = protocols.join(", ");
      }
      
      // Initiate WebSocket connection asynchronously
      lc.fetch(url.toString(), {
        method: "GET",
        headers,
      }).then((response: any) => {
        if (!response.ok) {
          onerror(`WebSocket upgrade failed: ${response.status}`);
          return;
        }
        onopen(protocols[0] || "");
      }).catch((err: any) => {
        onerror(err.message);
      });
      
      // Return send/close functions immediately
      let closed = false;
      return [
        (data: Blob | ArrayBuffer | string) => {
          if (closed) return;
          // Send WebSocket frame
        },
        (code: number, reason: string) => {
          if (closed) return;
          closed = true;
          onclose(code, reason);
        }
      ];
    },
    
    async request(remote: URL, method: string, body: BodyInit | null, headers: BareHeaders, signal: AbortSignal | undefined) {
      const requestHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        requestHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
      }
      
      let requestBody: string | Uint8Array | undefined;
      if (body instanceof ReadableStream) {
        const chunks: Uint8Array[] = [];
        for await (const chunk of body) {
          chunks.push(chunk);
        }
        requestBody = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          requestBody.set(chunk, offset);
          offset += chunk.length;
        }
      } else if (body instanceof ArrayBuffer) {
        requestBody = new Uint8Array(body);
      } else if (body instanceof Blob) {
        requestBody = new Uint8Array(await body.arrayBuffer());
      } else if (typeof body === "string") {
        requestBody = body;
      }
      
      const response = await lc.fetch(remote.toString(), {
        method,
        headers: requestHeaders,
        body: requestBody,
      });
      
      let responseBody: ReadableStream | ArrayBuffer | Blob | string;
      if (response.body) {
        responseBody = response.body;
      } else {
        responseBody = new ArrayBuffer(0);
      }
      
      const responseHeaders: BareHeaders = {};
      for (const [key, value] of response.headers.entries()) {
        responseHeaders[key] = value;
      }
      
      return {
        body: responseBody,
        headers: responseHeaders,
        status: response.status,
        statusText: response.statusText,
      } as TransferrableResponse;
    },
    
    meta() {
      return {};
    },
  };
  
  libCurlInstance = lc;
  return transport;
}

export function getLibCurlInstance() {
  return libCurlInstance;
}

export async function createWispHTTPSession(options?: { proxy?: string }) {
  await loadWispClient();
  const { LibCurl } = wispModule;
  const lc = new LibCurl();
  
  if (options?.proxy) {
    lc.set_proxy(options.proxy);
  }
  
  const Session = lc.HTTPSession;
  return new Session();
}