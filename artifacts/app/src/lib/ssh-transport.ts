// SSH Transport
// Browser-native SSH over Wisp, Relay, or TCP provider

import { SSHClient, SSHWispClient } from "@nightnetwork/lunassh";

let sshClientInitialized = false;
let activeSessions: Map<string, any> = new Map();

export interface SSHConnectionOptions {
  host: string;
  port?: number;
  user: string;
  password?: string;
  privateKey?: string;
  knownHosts?: string[];
  hostKeyFingerprint?: string;
  insecureSkipHostKeyVerification?: boolean;
}

export interface SSHWispOptions extends SSHConnectionOptions {
  wispUrl: string;
}

export interface SSHRelayOptions extends SSHConnectionOptions {
  relayPort: MessagePort;
}

export interface SSHTcpOptions extends SSHConnectionOptions {
  tcpClient: {
    dialTcp(host: string, port: number): Promise<{
      send(data: Uint8Array): void;
      close(): void;
      on(event: 'data' | 'close' | 'error', listener: (...args: any[]) => void): () => void;
    }>;
  };
}

export async function initializeSSH(wasmPath: string, wasmExecPath: string): Promise<void> {
  if (sshClientInitialized) return;
  
  await SSHClient.initialize({
    wasmPath,
    wasmExecPath,
  });
  
  sshClientInitialized = true;
}

export async function connectViaWisp(options: SSHWispOptions): Promise<SSHSession> {
  if (!sshClientInitialized) {
    throw new Error("SSHClient not initialized. Call initializeSSH first.");
  }
  
  const session = await SSHWispClient.connectViaWisp({
    wispUrl: options.wispUrl,
    host: options.host,
    port: options.port ?? 22,
    user: options.user,
    password: options.password,
    knownHosts: options.knownHosts,
    hostKeyFingerprint: options.hostKeyFingerprint,
    insecureSkipHostKeyVerification: options.insecureSkipHostKeyVerification,
  });
  
  const sessionId = `${options.user}@${options.host}:${options.port ?? 22}`;
  activeSessions.set(sessionId, session);
  
  return wrapSession(session, sessionId);
}

export async function connectViaRelay(options: SSHRelayOptions): Promise<SSHSession> {
  if (!sshClientInitialized) {
    throw new Error("SSHClient not initialized. Call initializeSSH first.");
  }
  
  const session = await SSHWispClient.connectViaMoonbeam(
    {
      host: options.host,
      port: options.port ?? 22,
      user: options.user,
      password: options.password,
      knownHosts: options.knownHosts,
      hostKeyFingerprint: options.hostKeyFingerprint,
      insecureSkipHostKeyVerification: options.insecureSkipHostKeyVerification,
    },
    options.relayPort
  );
  
  const sessionId = `${options.user}@${options.host}:${options.port ?? 22}`;
  activeSessions.set(sessionId, session);
  
  return wrapSession(session, sessionId);
}

export async function connectViaTcp(options: SSHTcpOptions): Promise<SSHSession> {
  if (!sshClientInitialized) {
    throw new Error("SSHClient not initialized. Call initializeSSH first.");
  }
  
  const session = await SSHWispClient.connectViaMoonScaleTcp(
    {
      host: options.host,
      port: options.port ?? 22,
      user: options.user,
      password: options.password,
      knownHosts: options.knownHosts,
      hostKeyFingerprint: options.hostKeyFingerprint,
      insecureSkipHostKeyVerification: options.insecureSkipHostKeyVerification,
    },
    options.tcpClient
  );
  
  const sessionId = `${options.user}@${options.host}:${options.port ?? 22}`;
  activeSessions.set(sessionId, session);
  
  return wrapSession(session, sessionId);
}

function wrapSession(rawSession: any, sessionId: string): SSHSession {
  return {
    id: sessionId,
    raw: rawSession,
    
    async write(data: Uint8Array | string): Promise<void> {
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
      await rawSession.write(bytes);
    },
    
    onData(callback: (data: Uint8Array) => void): void {
      rawSession.onData(callback);
    },
    
    onClose(callback: () => void): void {
      rawSession.onClose(() => {
        activeSessions.delete(sessionId);
        callback();
      });
    },
    
    async resize(cols: number, rows: number): Promise<void> {
      await rawSession.resize(cols, rows);
    },
    
    async disconnect(): Promise<void> {
      await rawSession.disconnect();
      activeSessions.delete(sessionId);
    },
    
    isConnected(): boolean {
      return activeSessions.has(sessionId);
    },
  };
}

export interface SSHSession {
  id: string;
  raw: any;
  write(data: Uint8Array | string): Promise<void>;
  onData(callback: (data: Uint8Array) => void): void;
  onClose(callback: () => void): void;
  resize(cols: number, rows: number): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export function getActiveSessions(): SSHSession[] {
  return Array.from(activeSessions.values()).map(s => wrapSession(s, s.id));
}

export function getSession(sessionId: string): SSHSession | undefined {
  const raw = activeSessions.get(sessionId);
  return raw ? wrapSession(raw, sessionId) : undefined;
}

export async function closeAllSessions(): Promise<void> {
  for (const session of activeSessions.values()) {
    try {
      await session.disconnect();
    } catch {}
  }
  activeSessions.clear();
}

// Terminal emulator helpers
export interface TerminalSize {
  cols: number;
  rows: number;
}

export function createTerminalSizeListener(
  session: SSHSession,
  element: HTMLElement
): () => void {
  const resizeObserver = new ResizeObserver(() => {
    const { clientWidth, clientHeight } = element;
    const charWidth = 8; // Approximate character width in pixels
    const charHeight = 16; // Approximate line height in pixels
    const cols = Math.max(1, Math.floor(clientWidth / charWidth));
    const rows = Math.max(1, Math.floor(clientHeight / charHeight));
    
    session.resize(cols, rows).catch(console.error);
  });
  
  resizeObserver.observe(element);
  return () => resizeObserver.disconnect();
}

// ANSI escape sequence parser for terminal output
export class ANSITerminalParser {
  private buffer = "";
  private callbacks: {
    onText: (text: string) => void;
    onCursorMove: (row: number, col: number) => void;
    onClear: (mode: number) => void;
    onScroll: (lines: number) => void;
  } | null = null;
  
  setCallbacks(callbacks: typeof this.callbacks) {
    this.callbacks = callbacks;
  }
  
  parse(data: Uint8Array): void {
    const text = new TextDecoder().decode(data);
    this.buffer += text;
    
    let i = 0;
    while (i < this.buffer.length) {
      if (this.buffer[i] === "\x1b") {
        // Escape sequence
        if (i + 1 < this.buffer.length && this.buffer[i + 1] === "[") {
          // CSI sequence
          let j = i + 2;
          let params = "";
          while (j < this.buffer.length && /[\d;]/.test(this.buffer[j])) {
            params += this.buffer[j];
            j++;
          }
          if (j < this.buffer.length) {
            const cmd = this.buffer[j];
            this.handleCSI(params, cmd);
            i = j + 1;
            continue;
          }
        } else if (i + 1 < this.buffer.length && this.buffer[i + 1] === "]") {
          // OSC sequence
          let j = i + 2;
          while (j < this.buffer.length && this.buffer[j] !== "\x07" && this.buffer[j] !== "\x1b") {
            j++;
          }
          i = j + 1;
          continue;
        }
      }
      
      // Regular text
      const nextEscape = this.buffer.indexOf("\x1b", i + 1);
      const textChunk = nextEscape > 0 ? this.buffer.slice(i, nextEscape) : this.buffer.slice(i);
      if (textChunk && this.callbacks?.onText) {
        this.callbacks.onText(textChunk);
      }
      i = nextEscape > 0 ? nextEscape : this.buffer.length;
    }
    
    this.buffer = "";
  }
  
  private handleCSI(params: string, cmd: string): void {
    const args = params.split(";").map(n => parseInt(n, 10) || 0);
    
    switch (cmd) {
      case "H": // Cursor position
      case "f": // Cursor position
        if (this.callbacks?.onCursorMove) {
          const row = args[0] || 1;
          const col = args[1] || 1;
          this.callbacks.onCursorMove(row - 1, col - 1);
        }
        break;
      case "J": // Erase in display
        if (this.callbacks?.onClear) {
          this.callbacks.onClear(args[0] || 0);
        }
        break;
      case "K": // Erase in line
        // Handle line erase
        break;
      case "S": // Scroll up
        if (this.callbacks?.onScroll) {
          this.callbacks.onScroll(args[0] || 1);
        }
        break;
      case "T": // Scroll down
        if (this.callbacks?.onScroll) {
          this.callbacks.onScroll(-(args[0] || 1));
        }
        break;
    }
  }
}