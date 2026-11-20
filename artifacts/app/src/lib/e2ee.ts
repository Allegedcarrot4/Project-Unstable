/**
 * End-to-end encryption for direct and group messages.
 *
 * Design (no schema changes, no extra services):
 * - Every account gets an ECDH P-256 identity. The private key stays in this
 *   browser's localStorage; only the public key is ever sent.
 * - Public keys travel as control messages (`u1:key:…`) inside a conversation.
 *   They are filtered out of the transcript, so the server relays them but
 *   never sees anything secret.
 * - A message gets a random AES-256 key. The plaintext is encrypted with it
 *   (AES-GCM), and that key is wrapped once per participant with a key derived
 *   from ECDH(sender private, recipient public). The envelope carries the
 *   ciphertext plus one wrapped key per participant.
 * - A recipient can only unwrap their own entry, so the server (and anyone
 *   else) cannot read the message.
 *
 * Limitations, surfaced in the UI: a brand-new conversation needs one key
 * announcement per participant before messages can be encrypted, so the first
 * exchange is sent in the clear until the handshake completes. Keys live in
 * localStorage, which protects against a compromised server but not against
 * code running on the same origin.
 */

const IDENTITY_PREFIX = "unstable_e2ee_identity_";
const PEERS_PREFIX = "unstable_e2ee_peers_";

export const E2EE_KEY_PREFIX = "u1:key:";
export const E2EE_MSG_PREFIX = "u1:enc:";

export interface E2eeIdentity {
  userId: string;
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
}

interface Envelope {
  v: 1;
  s: string;
  /** Sender public JWK, so a recipient can unwrap even with a stale peer cache. */
  pk?: JsonWebKey;
  iv: string;
  ct: string;
  keys: Record<string, string>;
}

function hasCrypto() {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

function toB64u(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64u(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(length));
  crypto.getRandomValues(bytes);
  return bytes;
}

async function importPrivateKey(jwk: JsonWebKey) {
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
}

async function importPublicKey(jwk: JsonWebKey) {
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
}

async function deriveWrapKey(privateKey: CryptoKey, publicKey: CryptoKey) {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function generateIdentity(userId: string): Promise<E2eeIdentity | null> {
  if (!hasCrypto()) return null;
  try {
    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveKey",
    ]);
    const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    return { userId, publicJwk, privateJwk };
  } catch {
    return null;
  }
}

const identityCache = new Map<string, E2eeIdentity>();
const identityPromises = new Map<string, Promise<E2eeIdentity | null>>();

/** Loads (or creates) this browser's identity for an account. */
export async function ensureIdentity(userId: string): Promise<E2eeIdentity | null> {
  if (!userId || !hasCrypto()) return null;
  const cached = identityCache.get(userId);
  if (cached) return cached;
  const pending = identityPromises.get(userId);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const raw = localStorage.getItem(IDENTITY_PREFIX + userId);
      if (raw) {
        const parsed = JSON.parse(raw) as E2eeIdentity;
        if (parsed?.privateJwk && parsed?.publicJwk) {
          identityCache.set(userId, parsed);
          return parsed;
        }
      }
    } catch {
      /* corrupt storage: fall through and mint a new identity */
    }

    const identity = await generateIdentity(userId);
    if (!identity) return null;
    try {
      localStorage.setItem(IDENTITY_PREFIX + userId, JSON.stringify(identity));
    } catch {
      /* storage full / blocked: keep it in memory for this session */
    }
    identityCache.set(userId, identity);
    return identity;
  })();

  identityPromises.set(userId, promise);
  const resolved = await promise;
  identityPromises.delete(userId);
  return resolved;
}

/** Control message that publishes our public key to a conversation. */
export function buildKeyAnnouncement(identity: E2eeIdentity): string {
  return (
    E2EE_KEY_PREFIX +
    toB64u(new TextEncoder().encode(JSON.stringify({ v: 1, userId: identity.userId, jwk: identity.publicJwk })))
  );
}

export function parseKeyAnnouncement(content: string): { userId: string; jwk: JsonWebKey } | null {
  if (!content.startsWith(E2EE_KEY_PREFIX)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64u(content.slice(E2EE_KEY_PREFIX.length)))) as {
      userId?: string;
      jwk?: JsonWebKey;
    };
    if (!payload?.userId || !payload?.jwk) return null;
    return { userId: payload.userId, jwk: payload.jwk };
  } catch {
    return null;
  }
}

export function isEncryptedMessage(content: string): boolean {
  return content.startsWith(E2EE_MSG_PREFIX);
}

export function isControlMessage(content: string): boolean {
  return content.startsWith(E2EE_KEY_PREFIX);
}

/** Cache of the public keys we have seen, per account. */
export function loadPeerKeys(userId: string): Record<string, JsonWebKey> {
  try {
    const raw = localStorage.getItem(PEERS_PREFIX + userId);
    return raw ? (JSON.parse(raw) as Record<string, JsonWebKey>) : {};
  } catch {
    return {};
  }
}

export function savePeerKey(userId: string, peerId: string, jwk: JsonWebKey): void {
  try {
    const keys = loadPeerKeys(userId);
    keys[peerId] = jwk;
    localStorage.setItem(PEERS_PREFIX + userId, JSON.stringify(keys));
  } catch {
    /* ignore quota / private mode */
  }
}

export function forgetPeerKey(userId: string, peerId: string): void {
  try {
    const keys = loadPeerKeys(userId);
    delete keys[peerId];
    localStorage.setItem(PEERS_PREFIX + userId, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

/**
 * Encrypts `text` for every participant with a known public key. Returns null
 * when encryption is not possible yet (no identity, no keys, or a browser
 * without WebCrypto) so callers can fall back to plaintext deliberately.
 */
export async function encryptMessage(
  text: string,
  identity: E2eeIdentity,
  recipientKeys: Record<string, JsonWebKey | undefined>
): Promise<string | null> {
  if (!hasCrypto()) return null;
  const entries = Object.entries(recipientKeys).filter(
    (entry): entry is [string, JsonWebKey] => !!entry[1] && entry[0] !== identity.userId
  );
  // Without a peer key the envelope would only be readable by us, which looks
  // encrypted but is useless to everyone else. Wait for the handshake instead.
  if (entries.length === 0) return null;

  try {
    const messageKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
      "encrypt",
      "decrypt",
    ]);
    const rawKey = await crypto.subtle.exportKey("raw", messageKey);
    const iv = randomBytes(12);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      messageKey,
      new TextEncoder().encode(text)
    );

    const privateKey = await importPrivateKey(identity.privateJwk);
    const wrapped: Record<string, string> = {};

    const wrapFor = async (userId: string, jwk: JsonWebKey) => {
      const publicKey = await importPublicKey(jwk);
      const wrapKey = await deriveWrapKey(privateKey, publicKey);
      const wrapIv = randomBytes(12);
      const keyBytes = await crypto.subtle.encrypt({ name: "AES-GCM", iv: wrapIv }, wrapKey, rawKey);
      wrapped[userId] = `${toB64u(wrapIv)}.${toB64u(keyBytes)}`;
    };

    await Promise.all([
      wrapFor(identity.userId, identity.publicJwk),
      ...entries.map(([userId, jwk]) => wrapFor(userId, jwk)),
    ]);

    const envelope: Envelope = {
      v: 1,
      s: identity.userId,
      pk: identity.publicJwk,
      iv: toB64u(iv),
      ct: toB64u(ciphertext),
      keys: wrapped,
    };
    return E2EE_MSG_PREFIX + toB64u(new TextEncoder().encode(JSON.stringify(envelope)));
  } catch {
    return null;
  }
}

/**
 * Decrypts a message for this account. Returns:
 * - `{ kind: "plain" }` for messages that were never encrypted,
 * - `{ kind: "text" }` for a successful decrypt,
 * - `{ kind: "locked" }` when we do not have the sender's public key yet.
 * Ciphertext is never returned for display.
 */
export type DecodeResult =
  | { kind: "plain"; text: string }
  | { kind: "text"; text: string }
  | { kind: "locked" };

export async function decryptMessage(
  content: string,
  identity: E2eeIdentity,
  senderPublicJwk?: JsonWebKey
): Promise<DecodeResult> {
  if (!isEncryptedMessage(content)) return { kind: "plain", text: content };
  if (!hasCrypto()) return { kind: "locked" };

  try {
    const envelope = JSON.parse(
      new TextDecoder().decode(fromB64u(content.slice(E2EE_MSG_PREFIX.length)))
    ) as Envelope;
    if (envelope?.v !== 1 || !envelope.keys?.[identity.userId] || !envelope.ct) {
      return { kind: "locked" };
    }
    const senderJwk = envelope.s === identity.userId ? identity.publicJwk : (envelope.pk ?? senderPublicJwk);
    if (!senderJwk) return { kind: "locked" };

    const [wrapIv, wrappedKey] = envelope.keys[identity.userId].split(".");
    if (!wrapIv || !wrappedKey) return { kind: "locked" };

    const privateKey = await importPrivateKey(identity.privateJwk);
    const senderKey = await importPublicKey(senderJwk);
    const wrapKey = await deriveWrapKey(privateKey, senderKey);
    const rawKey = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64u(wrapIv) },
      wrapKey,
      fromB64u(wrappedKey)
    );
    const messageKey = await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, [
      "decrypt",
    ]);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64u(envelope.iv) },
      messageKey,
      fromB64u(envelope.ct)
    );
    return { kind: "text", text: new TextDecoder().decode(plaintext) };
  } catch {
    return { kind: "locked" };
  }
}

/** True when every participant except us has a cached public key. */
export function conversationIsSecured(
  participants: string[],
  selfId: string,
  peerKeys: Record<string, JsonWebKey>
): boolean {
  const others = participants.filter(id => id !== selfId);
  return others.length > 0 && others.every(id => !!peerKeys[id]);
}
