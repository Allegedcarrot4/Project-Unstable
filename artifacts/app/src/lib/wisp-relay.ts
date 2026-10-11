// Wisp Relay Integration
// In-browser Wisp relay with MessagePort multiplexing, local TCP listeners, and virtual IP assignment

import { MoonbeamRelay, WispClient, type MoonbeamRelayOptions, type MoonbeamAttachmentMetadata, type MoonbeamLocalConnectionHandler, type MoonbeamLocalSocket } from "@nightnetwork/moonbeam";

let relayInstance: MoonbeamRelay | null = null;
let wispClientInstance: WispClient | null = null;
const attachedPorts = new Map<string, MessagePort>();

export interface RelayConfig {
  wispUrl: string;
  allowV1?: boolean;
  injectWebSocket?: WebSocket;
}

export interface AttachedClient {
  port: MessagePort;
  label: string;
  virtualIp: string;
  connectedAt: number;
}

export async function createRelay(config: RelayConfig): Promise<MoonbeamRelay> {
  if (relayInstance) {
    await relayInstance.close();
  }
  
  const options: MoonbeamRelayOptions = {
    wispUrl: config.wispUrl,
  };
  
  if (config.injectWebSocket) {
    options._injectWebSocket = config.injectWebSocket;
  }
  
  relayInstance = await MoonbeamRelay.create(options);
  return relayInstance;
}

export async function createWispClient(url: string, allowV1 = true): Promise<WispClient> {
  if (wispClientInstance) {
    await wispClientInstance.close();
  }
  
  wispClientInstance = new WispClient({ url, allowV1 });
  await wispClientInstance.ready();
  return wispClientInstance;
}

export function attachClient(metadata?: MoonbeamAttachmentMetadata): MessagePort {
  if (!relayInstance) {
    throw new Error("Relay not initialized. Call createRelay first.");
  }
  
  const port = relayInstance.attach(metadata);
  const label = metadata?.label || `client-${Date.now()}`;
  attachedPorts.set(label, port);
  return port;
}

export function detachClient(port: MessagePort): void {
  if (!relayInstance) return;
  
  for (const [label, p] of attachedPorts) {
    if (p === port) {
      attachedPorts.delete(label);
      break;
    }
  }
  
  relayInstance.detach(port);
}

export function registerLocalListener(
  host: string,
  port: number,
  handler: MoonbeamLocalConnectionHandler
): () => void {
  if (!relayInstance) {
    throw new Error("Relay not initialized");
  }
  
  return relayInstance.registerListener(host, port, handler);
}

export function getRelayStats() {
  if (!relayInstance) return null;
  
  return {
    clientCount: relayInstance.clientCount(),
    streamCount: relayInstance.streamCount(),
    listenerCount: relayInstance.listenerCount(),
    clientsSnapshot: relayInstance.clientsSnapshot(),
    listenersSnapshot: relayInstance.listenersSnapshot(),
    isClosed: relayInstance.isClosed(),
  };
}

export async function closeRelay(): Promise<void> {
  if (relayInstance) {
    await relayInstance.close();
    relayInstance = null;
    attachedPorts.clear();
  }
  
  if (wispClientInstance) {
    await wispClientInstance.close();
    wispClientInstance = null;
  }
}

export function getRelay(): MoonbeamRelay | null {
  return relayInstance;
}

export function getWispClient(): WispClient | null {
  return wispClientInstance;
}

// Helper to create a local HTTP server handler for registerListener
export function createHttpHandler(
  respond: (request: Uint8Array) => Uint8Array | Promise<Uint8Array>
): MoonbeamLocalConnectionHandler {
  return (socket: MoonbeamLocalSocket) => {
    socket.onData(async (data: Uint8Array) => {
      try {
        const response = await respond(data);
        socket.send(response);
      } catch (error) {
        console.error("Local handler error:", error);
        const errorResponse = new TextEncoder().encode(
          "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\n\r\n"
        );
        socket.send(errorResponse);
      } finally {
        socket.close();
      }
    });
  };
}

// Parse HTTP request from raw bytes
export function parseHttpRequest(data: Uint8Array): { method: string; path: string; headers: Record<string, string>; body: Uint8Array } | null {
  const text = new TextDecoder().decode(data);
  const lines = text.split("\r\n");
  
  if (lines.length === 0) return null;
  
  const requestLine = lines[0].split(" ");
  if (requestLine.length !== 3) return null;
  
  const [method, path] = requestLine;
  const headers: Record<string, string> = {};
  let bodyStart = 1;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "") {
      bodyStart = i + 1;
      break;
    }
    const colonIndex = lines[i].indexOf(":");
    if (colonIndex > 0) {
      const key = lines[i].slice(0, colonIndex).trim().toLowerCase();
      const value = lines[i].slice(colonIndex + 1).trim();
      headers[key] = value;
    }
  }
  
  const bodyText = lines.slice(bodyStart).join("\r\n");
  const body = new TextEncoder().encode(bodyText);
  
  return { method, path, headers, body };
}

// Build HTTP response
export function buildHttpResponse(
  status: number,
  headers: Record<string, string> = {},
  body: string | Uint8Array = ""
): Uint8Array {
  const statusText = status === 200 ? "OK" : status === 404 ? "Not Found" : "Internal Server Error";
  const bodyBytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
  
  const responseHeaders = {
    "Content-Length": bodyBytes.length.toString(),
    ...headers,
  };
  
  let response = `HTTP/1.1 ${status} ${statusText}\r\n`;
  for (const [key, value] of Object.entries(responseHeaders)) {
    response += `${key}: ${value}\r\n`;
  }
  response += "\r\n";
  
  const headerBytes = new TextEncoder().encode(response);
  const result = new Uint8Array(headerBytes.length + bodyBytes.length);
  result.set(headerBytes);
  result.set(bodyBytes, headerBytes.length);
  
  return result;
}