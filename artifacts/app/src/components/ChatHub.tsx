"use client"

import * as React from "react"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Copy,
  Globe2,
  Lock,
  MessageSquarePlus,
  Pencil,
  Plus,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  Users,
  X,
} from "lucide-react"

import { supabase } from "../supabase"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import { useMotionTokens, useShouldReduceMotion } from "@animate-ui/react/utils/motion"
import {
  buildKeyAnnouncement,
  conversationIsSecured,
  decryptMessage,
  encryptMessage,
  ensureIdentity,
  isControlMessage,
  isEncryptedMessage,
  loadPeerKeys,
  parseKeyAnnouncement,
  savePeerKey,
  type E2eeIdentity,
} from "@/lib/e2ee"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/ui/message-scroller"
import {
  PromptInput,
  PromptInputAttachButton,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ui/prompt-input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Suggestion, Suggestions } from "@/components/ui/suggestion"
import { AttachmentFile, AttachmentRemove } from "@/components/ui/attachment"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"

/* ── Types ──────────────────────────────────────────────────────────────── */

interface DirectoryUser {
  id: string
  username: string
  avatar_url?: string | null
}

interface ConversationRecord {
  id: string
  participants: string[]
  created_at: string
  updated_at: string
}

interface RawMessage {
  id: string
  user_id: string
  username?: string
  content: string
  created_at: string
  edited_at?: string | null
  conversation_id?: string
}

interface RoomMessage extends RawMessage {
  /** Decrypted / parsed text, or null while an encrypted body is unreadable. */
  text: string | null
  locked: boolean
  pending?: boolean
  failed?: boolean
  control?: boolean
}

type RoomKind = "global" | "dm" | "group"

interface Room {
  id: string
  kind: RoomKind
  title: string
  participants: string[]
  updatedAt: string
  lastText: string
  unread: boolean
}

interface PendingFile {
  name: string
  language: string
  body: string
}

const MAX_MESSAGE_LENGTH = 4000
const MAX_ATTACHMENT_BYTES = 64 * 1024
const REACTIONS = ["👍", "🔥", "😂", "❤️", "👀"] as const
const READ_KEY = "unstable_room_read_";
const REACTIONS_KEY = "unstable_room_reactions_";

/* ── Helpers ────────────────────────────────────────────────────────────── */

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "??"
}

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "sending…" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function dayKey(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toDateString()
}

function formatDay(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function sanitize(text: string) {
  // Control characters (except newline/tab) are stripped before they reach the
  // database; React escapes everything else on render.
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, MAX_MESSAGE_LENGTH)
}

function buildReplyPayload(username: string, snippet: string, body: string) {
  const cleanName = username.replace(/[|\]]/g, "").slice(0, 40)
  const cleanSnippet = snippet.replace(/\s+/g, " ").replace(/\]\]/g, "]").slice(0, 72)
  return `[[reply:${cleanName}|${cleanSnippet}]]\n${body}`
}

function parseReply(content: string) {
  const match = content.match(/^\[\[reply:([^|\]]+)\|([\s\S]*?)\]\]\n([\s\S]*)$/)
  if (!match) return { replyUsername: null as string | null, replySnippet: null as string | null, body: content }
  return { replyUsername: match[1] ?? null, replySnippet: match[2] ?? null, body: match[3] ?? "" }
}

/** Body of a message without the `[[reply:…]]` envelope, for editing/copying. */
function replyBody(content: string | null | undefined) {
  return content ? parseReply(content).body : ""
}

function languageForFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  const map: Record<string, string> = {
    ts: "ts", tsx: "tsx", js: "js", jsx: "jsx", json: "json", css: "css", html: "html",
    md: "md", py: "py", rs: "rs", go: "go", java: "java", c: "c", cpp: "cpp", sh: "bash", yml: "yaml", yaml: "yaml", txt: "text",
  }
  return map[ext] ?? "text"
}

function readStoredMap<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStoredMap(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function ChatHub({
  user,
  profile,
  initialTab = "global",
  onTabChange,
}: {
  user: { id: string }
  profile: DirectoryUser
  initialTab?: "global" | "dm"
  onTabChange?: (tab: "global" | "dm") => void
}) {
  const selfId = user.id
  const [conversations, setConversations] = React.useState<ConversationRecord[]>([])
  const [directory, setDirectory] = React.useState<DirectoryUser[]>([])
  const [activeRoom, setActiveRoom] = React.useState<string>(initialTab === "dm" ? "" : "global")
  const [globalMessages, setGlobalMessages] = React.useState<RawMessage[]>([])
  const [dmMessages, setDmMessages] = React.useState<RawMessage[]>([])
  const [previews, setPreviews] = React.useState<Record<string, { text: string; at: string }>>({})
  const [loading, setLoading] = React.useState(true)
  const [messagesLoading, setMessagesLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [composerOpen, setComposerOpen] = React.useState(false)
  const [mobileSidebar, setMobileSidebar] = React.useState(true)
  const [replyTo, setReplyTo] = React.useState<RoomMessage | null>(null)
  const [pendingFile, setPendingFile] = React.useState<PendingFile | null>(null)
  const [editing, setEditing] = React.useState<{ id: string; value: string } | null>(null)
  const [identity, setIdentity] = React.useState<E2eeIdentity | null>(null)
  const [peerKeys, setPeerKeys] = React.useState<Record<string, JsonWebKey>>({})
  const [reactions, setReactions] = React.useState<Record<string, string[]>>({})
  const [readMap, setReadMap] = React.useState<Record<string, number>>({})
  const [typing, setTyping] = React.useState<Record<string, { name: string; at: number }>>({})
  const [draft, setDraft] = React.useState("")
  const [selecting, setSelecting] = React.useState<string[]>([])
  const [peopleQuery, setPeopleQuery] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [menuRoom, setMenuRoom] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const typingChannelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastTypingSent = React.useRef(0)
  const announcedRef = React.useRef<Set<string>>(new Set())
  const decodedCache = React.useRef<Map<string, { text: string | null; locked: boolean }>>(new Map())
  const activeRoomRef = React.useRef(activeRoom)
  const conversationIdsRef = React.useRef<string[]>([])

  activeRoomRef.current = activeRoom
  conversationIdsRef.current = conversations.map(conversation => conversation.id)

  const isGlobal = activeRoom === "global"
  const activeConversation = conversations.find(conversation => conversation.id === activeRoom) ?? null
  const activeParticipants = activeConversation?.participants ?? []
  const activeKind: RoomKind = !activeConversation ? "global" : activeParticipants.length > 2 ? "group" : "dm"
  const secured = activeConversation ? conversationIsSecured(activeParticipants, selfId, peerKeys) : false

  const nameOf = React.useCallback(
    (id: string) => {
      if (id === selfId) return profile.username
      return directory.find(person => person.id === id)?.username ?? `user-${id.slice(0, 6)}`
    },
    [directory, profile.username, selfId]
  )

  const rawActiveMessages = isGlobal ? globalMessages : dmMessages

  /* ── Identity + peer keys ─────────────────────────────────────────────── */

  React.useEffect(() => {
    let cancelled = false
    void ensureIdentity(selfId).then(next => {
      if (!cancelled) setIdentity(next)
    })
    setPeerKeys(loadPeerKeys(selfId))
    setReactions(readStoredMap<Record<string, string[]>>(REACTIONS_KEY + selfId, {}))
    setReadMap(readStoredMap<Record<string, number>>(READ_KEY + selfId, {}))
    return () => {
      cancelled = true
    }
  }, [selfId])

  /* ── Directory + conversations ────────────────────────────────────────── */

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      const [peopleResult, conversationResult] = await Promise.all([
        supabase.from("profiles").select("id, username, avatar_url").neq("id", selfId).limit(200),
        supabase
          .from("dm_conversations")
          .select("*")
          .contains("participants", [selfId])
          .order("updated_at", { ascending: false }),
      ])
      if (cancelled) return
      if (conversationResult.error) setError(conversationResult.error.message)
      setDirectory((peopleResult.data ?? []) as DirectoryUser[])
      const list = (conversationResult.data ?? []) as ConversationRecord[]
      setConversations(list)
      if (activeRoomRef.current !== "global" && !list.some(conversation => conversation.id === activeRoomRef.current)) {
        setActiveRoom(list[0]?.id ?? "global")
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [selfId])

  // Conversation list changes (new DM / group) arrive over realtime.
  React.useEffect(() => {
    const channel = supabase
      .channel(`hub_conversations:${selfId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_conversations", filter: `participants=cs.{${selfId}}` },
        payload => {
          if (payload.eventType === "DELETE") {
            const removed = (payload.old as { id?: string } | null)?.id
            if (removed) setConversations(prev => prev.filter(conversation => conversation.id !== removed))
            return
          }
          const next = payload.new as ConversationRecord
          if (!next?.id) return
          setConversations(prev => {
            const exists = prev.some(conversation => conversation.id === next.id)
            return exists
              ? prev.map(conversation => (conversation.id === next.id ? next : conversation))
              : [next, ...prev]
          })
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [selfId])

  /* ── Global messages (always live, so the sidebar preview is fresh) ────── */

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: loadError } = await supabase
        .from("chat_messages")
        .select("id, user_id, username, content, created_at")
        .order("created_at", { ascending: true })
        .limit(200)
      if (cancelled) return
      if (loadError) setError(loadError.message)
      setGlobalMessages((data ?? []) as RawMessage[])
    }
    void load()

    const channel = supabase
      .channel("hub_global_chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        payload => {
          const incoming = payload.new as RawMessage
          if (!incoming?.id) return
          setGlobalMessages(prev => (prev.some(message => message.id === incoming.id) ? prev : [...prev, incoming]))
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        payload => {
          const id = String((payload.old as { id?: string } | null)?.id ?? "")
          if (!id) return
          setGlobalMessages(prev => prev.filter(message => message.id !== id))
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [])

  /* ── Active DM messages ───────────────────────────────────────────────── */

  React.useEffect(() => {
    if (!activeConversation) {
      setDmMessages([])
      return
    }
    const conversationId = activeConversation.id
    let cancelled = false
    setMessagesLoading(true)

    async function load() {
      const { data, error: loadError } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(300)
      if (cancelled) return
      if (loadError) setError(loadError.message)
      setDmMessages((data ?? []) as RawMessage[])
      setMessagesLoading(false)
    }
    void load()

    const channel = supabase
      .channel(`hub_dm:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        payload => {
          const incoming = payload.new as RawMessage
          if (!incoming?.id) return
          setDmMessages(prev => (prev.some(message => message.id === incoming.id) ? prev : [...prev, incoming]))
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        payload => {
          const next = payload.new as RawMessage
          setDmMessages(prev => prev.map(message => (message.id === next.id ? { ...message, ...next } : message)))
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        payload => {
          const id = String((payload.old as { id?: string } | null)?.id ?? "")
          if (!id) return
          setDmMessages(prev => prev.filter(message => message.id !== id))
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [activeConversation?.id])

  /* ── Last-message previews for every conversation ─────────────────────── */

  React.useEffect(() => {
    if (!conversations.length) return
    let cancelled = false
    const ids = conversations.map(conversation => conversation.id)
    async function load() {
      const { data } = await supabase
        .from("dm_messages")
        .select("conversation_id, user_id, content, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(300)
      if (cancelled) return
      const next: Record<string, { text: string; at: string }> = {}
      for (const row of (data ?? []) as Array<{ conversation_id: string; user_id: string; content: string; created_at: string }>) {
        if (next[row.conversation_id]) continue
        if (isControlMessage(row.content)) continue
        next[row.conversation_id] = {
          text: isEncryptedMessage(row.content) ? "Encrypted message" : parseReply(row.content).body.slice(0, 80),
          at: row.created_at,
        }
      }
      setPreviews(next)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [conversations])

  // Live preview updates for any conversation we belong to.
  React.useEffect(() => {
    const channel = supabase
      .channel(`hub_previews:${selfId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        payload => {
          const row = payload.new as RawMessage
          if (!row?.conversation_id) return
          if (!conversationIdsRef.current.includes(row.conversation_id)) return
          if (isControlMessage(row.content)) return
          setPreviews(prev => ({
            ...prev,
            [row.conversation_id!]: {
              text: isEncryptedMessage(row.content) ? "Encrypted message" : parseReply(row.content).body.slice(0, 80),
              at: row.created_at,
            },
          }))
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [selfId])

  /* ── Key exchange + decryption ────────────────────────────────────────── */

  // Learn public keys from control messages in the current transcript.
  React.useEffect(() => {
    if (isGlobal) return
    let learned = false
    const next = { ...peerKeys }
    for (const message of dmMessages) {
      const announcement = parseKeyAnnouncement(message.content)
      if (!announcement || announcement.userId === selfId) continue
      savePeerKey(selfId, announcement.userId, announcement.jwk)
      next[announcement.userId] = announcement.jwk
      learned = true
    }
    if (learned) setPeerKeys(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dmMessages, isGlobal, selfId])

  // Publish our key once per conversation (and answer peers who announced).
  React.useEffect(() => {
    if (!identity || isGlobal || !activeConversation) return
    const conversationId = activeConversation.id
    const others = activeConversation.participants.filter(id => id !== selfId)
    if (!others.length) return

    const missing = others.some(id => !peerKeys[id])
    const storageKey = `unstable_e2ee_announced_${conversationId}_${selfId}`
    let announcedAt = 0
    try {
      announcedAt = Number(localStorage.getItem(storageKey) ?? 0)
    } catch {
      announcedAt = 0
    }
    const stale = Date.now() - announcedAt > 1000 * 60 * 60 * 24
    if ((!missing && !stale) || announcedRef.current.has(conversationId)) return

    announcedRef.current.add(conversationId)
    void (async () => {
      const { error: announceError } = await supabase.from("dm_messages").insert({
        conversation_id: conversationId,
        user_id: selfId,
        content: buildKeyAnnouncement(identity),
      })
      if (announceError) {
        announcedRef.current.delete(conversationId)
        return
      }
      try {
        localStorage.setItem(storageKey, String(Date.now()))
      } catch {
        /* ignore */
      }
    })()
  }, [activeConversation, identity, isGlobal, peerKeys, selfId])

  // Decode the visible transcript. Ciphertext never reaches the renderer.
  const activeMessages = React.useMemo<RoomMessage[]>(() => {
    return rawActiveMessages.map(raw => {
      if (isControlMessage(raw.content)) {
        return { ...raw, text: null, locked: false, control: true }
      }
      if (isGlobal || !isEncryptedMessage(raw.content)) {
        return { ...raw, text: raw.content, locked: false }
      }
      const cached = decodedCache.current.get(raw.id)
      if (cached) return { ...raw, text: cached.text, locked: cached.locked }
      return { ...raw, text: null, locked: true }
    })
  }, [rawActiveMessages, isGlobal])

  // Decrypt asynchronously; results are cached by message id.
  React.useEffect(() => {
    if (isGlobal || !identity) return
    let cancelled = false
    const pending = dmMessages.filter(
      message =>
        !isControlMessage(message.content) &&
        isEncryptedMessage(message.content) &&
        !decodedCache.current.has(message.id)
    )
    if (!pending.length) return

    void (async () => {
      let changed = false
      for (const message of pending) {
        const result = await decryptMessage(message.content, identity, peerKeys[message.user_id])
        decodedCache.current.set(message.id, {
          text: result.kind === "text" ? result.text : null,
          locked: result.kind === "locked",
        })
        changed = true
      }
      if (changed && !cancelled) {
        // Touch state so the memo above re-reads the cache.
        setDmMessages(prev => [...prev])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dmMessages, identity, isGlobal, peerKeys])

  /* ── Read state + typing presence ─────────────────────────────────────── */

  React.useEffect(() => {
    if (!activeRoom) return
    setReadMap(prev => {
      const next = { ...prev, [activeRoom]: Date.now() }
      writeStoredMap(READ_KEY + selfId, next)
      return next
    })
  }, [activeRoom, activeMessages.length, selfId])

  React.useEffect(() => {
    if (!activeRoom) return
    const channel = supabase
      .channel(`hub_typing:${activeRoom}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, payload => {
        const info = payload.payload as { userId?: string; username?: string }
        if (!info?.userId || info.userId === selfId) return
        setTyping(prev => ({
          ...prev,
          [info.userId!]: { name: info.username ?? nameOf(info.userId!), at: Date.now() },
        }))
      })
      .subscribe()
    typingChannelRef.current = channel
    return () => {
      typingChannelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [activeRoom, nameOf, selfId])

  // Typing entries expire on their own.
  React.useEffect(() => {
    if (!Object.keys(typing).length) return
    const timer = window.setInterval(() => {
      setTyping(prev => {
        const next: typeof prev = {}
        let changed = false
        for (const [id, entry] of Object.entries(prev)) {
          if (Date.now() - entry.at < 3000) next[id] = entry
          else changed = true
        }
        return changed ? next : prev
      })
    }, 1200)
    return () => window.clearInterval(timer)
  }, [typing])

  function notifyTyping() {
    const now = Date.now()
    if (now - lastTypingSent.current < 1400) return
    lastTypingSent.current = now
    void typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: selfId, username: profile.username },
    })
  }

  /* ── Rooms ────────────────────────────────────────────────────────────── */

  const rooms = React.useMemo<Room[]>(() => {
    const lastGlobal = globalMessages[globalMessages.length - 1]
    const globalRoom: Room = {
      id: "global",
      kind: "global",
      title: "Global Chat",
      participants: [],
      updatedAt: lastGlobal?.created_at ?? "",
      lastText: lastGlobal ? parseReply(lastGlobal.content).body.slice(0, 80) : "Everyone signed in",
      unread: false,
    }

    const dmRooms = conversations.map(conversation => {
      const others = conversation.participants.filter(id => id !== selfId)
      const group = conversation.participants.length > 2
      const title = group
        ? others.map(nameOf).slice(0, 3).join(", ") + (others.length > 3 ? ` +${others.length - 3}` : "")
        : nameOf(others[0] ?? "")
      const preview = previews[conversation.id]
      const lastAt = preview?.at ?? conversation.updated_at
      const lastRead = readMap[conversation.id] ?? 0
      return {
        id: conversation.id,
        kind: group ? "group" : "dm",
        title: title || "Conversation",
        participants: conversation.participants,
        updatedAt: lastAt,
        lastText: preview?.text ?? (group ? `${others.length + 1} members` : "No messages yet"),
        unread: conversation.id !== activeRoom && new Date(lastAt).getTime() > lastRead,
      } satisfies Room
    })

    return [globalRoom, ...dmRooms]
  }, [activeRoom, conversations, globalMessages, nameOf, previews, readMap, selfId])

  const filteredRooms = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rooms
    return rooms.filter(room => room.title.toLowerCase().includes(query) || room.lastText.toLowerCase().includes(query))
  }, [rooms, search])

  const people = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    const selected = new Set(activeParticipants)
    return directory
      .filter(person => !selected.has(person.id))
      .filter(person => !query || person.username.toLowerCase().includes(query))
      .slice(0, query ? 20 : 8)
  }, [activeParticipants, directory, search])

  /* ── Opening rooms ────────────────────────────────────────────────────── */

  function openRoom(id: string) {
    setActiveRoom(id)
    setReplyTo(null)
    setEditing(null)
    setMobileSidebar(false)
    if (id === "global") onTabChange?.("global")
    else onTabChange?.("dm")
  }

  async function openDirectMessage(personId: string) {
    setComposerOpen(false)
    const existing = conversations.find(
      conversation =>
        conversation.participants.length === 2 &&
        conversation.participants.includes(selfId) &&
        conversation.participants.includes(personId)
    )
    if (existing) {
      openRoom(existing.id)
      return
    }
    setCreating(true)
    try {
      const { data, error: createError } = await supabase
        .from("dm_conversations")
        .insert({ participants: [selfId, personId] })
        .select()
        .single()
      if (createError) throw createError
      const conversation = data as ConversationRecord
      setConversations(prev => [conversation, ...prev])
      openRoom(conversation.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start that conversation.")
    } finally {
      setCreating(false)
    }
  }

  async function createGroup() {
    const participants = [selfId, ...selecting]
    if (participants.length < 3) return
    setCreating(true)
    try {
      const { data, error: createError } = await supabase
        .from("dm_conversations")
        .insert({ participants })
        .select()
        .single()
      if (createError) throw createError
      const conversation = data as ConversationRecord
      setConversations(prev => [conversation, ...prev])
      setSelecting([])
      setComposerOpen(false)
      openRoom(conversation.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that group.")
    } finally {
      setCreating(false)
    }
  }

  /* ── Sending ──────────────────────────────────────────────────────────── */

  async function sendMessage() {
    const body = sanitize(draft).trim()
    if ((!body && !pendingFile) || sending || !activeRoom) return
    setSending(true)
    setError("")

    let composed = body
    if (pendingFile) {
      composed = `${composed ? `${composed}\n\n` : ""}\`\`\`${pendingFile.language}\n${pendingFile.body}\n\`\`\``
    }
    const payload = replyTo
      ? buildReplyPayload(replyTo.user_id === selfId ? profile.username : nameOf(replyTo.user_id), replyBody(replyTo.text), composed)
      : composed

    setDraft("")
    setPendingFile(null)
    setReplyTo(null)

    if (isGlobal) {
      const optimisticId = crypto.randomUUID()
      const optimistic: RawMessage = {
        id: optimisticId,
        user_id: selfId,
        username: profile.username,
        content: payload,
        created_at: new Date().toISOString(),
      }
      setGlobalMessages(prev => [...prev, optimistic])
      try {
        const { data, error: sendError } = await supabase
          .from("chat_messages")
          .insert({ user_id: selfId, username: profile.username, content: payload })
          .select("id")
          .single()
        if (sendError) throw sendError
        if (data?.id) {
          setGlobalMessages(prev =>
            prev.map(message => (message.id === optimisticId ? { ...message, id: data.id as string } : message))
          )
        }
      } catch (err) {
        setGlobalMessages(prev => prev.filter(message => message.id !== optimisticId))
        setDraft(composed)
        setError(err instanceof Error ? err.message : "Unable to send message.")
      } finally {
        setSending(false)
      }
      return
    }

    if (!activeConversation) {
      setSending(false)
      return
    }

    const recipientKeys: Record<string, JsonWebKey | undefined> = {}
    for (const participant of activeConversation.participants) {
      if (participant !== selfId) recipientKeys[participant] = peerKeys[participant]
    }
    // Only encrypt when every participant has published a key. Encrypting for a
    // subset would leave the member who has not announced yet permanently
    // locked out of the message, so a partial handshake stays in the clear.
    const secured = conversationIsSecured(activeConversation.participants, selfId, peerKeys)
    const encrypted = identity && secured ? await encryptMessage(payload, identity, recipientKeys) : null
    const content = encrypted ?? payload

    const optimisticId = crypto.randomUUID()
    const optimistic: RawMessage = {
      id: optimisticId,
      user_id: selfId,
      content,
      created_at: new Date().toISOString(),
      conversation_id: activeConversation.id,
    }
    setDmMessages(prev => [...prev, optimistic])
    decodedCache.current.set(optimisticId, { text: payload, locked: false })

    try {
      const { data, error: sendError } = await supabase
        .from("dm_messages")
        .insert({ conversation_id: activeConversation.id, user_id: selfId, content })
        .select("id")
        .single()
      if (sendError) throw sendError
      if (data?.id) {
        const persistedId = data.id as string
        decodedCache.current.set(persistedId, decodedCache.current.get(optimisticId) ?? { text: payload, locked: false })
        setDmMessages(prev => prev.map(message => (message.id === optimisticId ? { ...message, id: persistedId } : message)))
        setPreviews(prev => ({
          ...prev,
          [activeConversation.id]: { text: parseReply(payload).body.slice(0, 80), at: new Date().toISOString() },
        }))
      }
      await supabase
        .from("dm_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversation.id)
    } catch (err) {
      setDmMessages(prev => prev.filter(message => message.id !== optimisticId))
      decodedCache.current.delete(optimisticId)
      setDraft(composed)
      setError(err instanceof Error ? err.message : "Unable to send message.")
    } finally {
      setSending(false)
    }
  }

  async function saveEdit() {
    if (!editing || !activeConversation) return
    const next = sanitize(editing.value).trim()
    if (!next) return
    const target = dmMessages.find(message => message.id === editing.id)
    if (!target) return
    // Keep the reply quote the message already had: editing only changes the body.
    const original = parseReply(decodedCache.current.get(editing.id)?.text ?? target.content)
    const composed =
      original.replyUsername && original.replySnippet
        ? buildReplyPayload(original.replyUsername, original.replySnippet, next)
        : next
    const payload = isEncryptedMessage(target.content)
      ? ((identity ? await encryptMessage(composed, identity, Object.fromEntries(
          activeConversation.participants
            .filter(id => id !== selfId)
            .map(id => [id, peerKeys[id]])
        )) : null) ?? composed)
      : composed
    setEditing(null)
    decodedCache.current.set(editing.id, { text: composed, locked: false })
    setDmMessages(prev =>
      prev.map(message => (message.id === editing.id ? { ...message, content: payload, edited_at: new Date().toISOString() } : message))
    )
    const { error: editError } = await supabase
      .from("dm_messages")
      .update({ content: payload, edited_at: new Date().toISOString() })
      .eq("id", editing.id)
      .eq("user_id", selfId)
    if (editError) setError(editError.message)
  }

  async function deleteMessage(message: RoomMessage) {
    if (message.user_id !== selfId) return
    const previousGlobal = globalMessages
    const previousDm = dmMessages
    if (isGlobal) setGlobalMessages(prev => prev.filter(item => item.id !== message.id))
    else setDmMessages(prev => prev.filter(item => item.id !== message.id))
    const table = isGlobal ? "chat_messages" : "dm_messages"
    const { error: deleteError } = await supabase.from(table).delete().eq("id", message.id).eq("user_id", selfId)
    if (deleteError) {
      if (isGlobal) setGlobalMessages(previousGlobal)
      else setDmMessages(previousDm)
      setError(deleteError.message)
    }
  }

  function toggleReaction(messageId: string, emoji: string) {
    setReactions(prev => {
      const current = prev[messageId] ?? []
      const next = current.includes(emoji) ? current.filter(item => item !== emoji) : [...current, emoji]
      const map = { ...prev, [messageId]: next }
      writeStoredMap(REACTIONS_KEY + selfId, map)
      return map
    })
  }

  async function attachFile(file: File) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("Attachments are limited to 64 KB of text.")
      return
    }
    try {
      const text = await file.text()
      setPendingFile({ name: file.name, language: languageForFile(file.name), body: text.slice(0, MAX_ATTACHMENT_BYTES) })
      setError("")
    } catch {
      setError("That file could not be read.")
    }
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  const typingNames = Object.values(typing).map(entry => entry.name)
  const visibleMessages = activeMessages.filter(message => !message.control)
  const roomTitle = isGlobal
    ? "Global Chat"
    : activeConversation
      ? activeKind === "group"
        ? activeParticipants.filter(id => id !== selfId).map(nameOf).slice(0, 4).join(", ")
        : nameOf(activeParticipants.find(id => id !== selfId) ?? "")
      : "Messages"

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background font-sans">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "min-h-0 w-full shrink-0 flex-col border-r border-border/50 bg-sidebar md:flex md:w-[19rem]",
          mobileSidebar ? "flex" : "hidden"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <h1 className="text-[1.05rem] leading-tight font-semibold text-foreground">Messages</h1>
          <Button
            size="icon"
            variant="outline"
            className="size-8 rounded-full"
            aria-label="New conversation"
            onClick={() => setComposerOpen(true)}
          >
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search messages or people"
              className="h-8 rounded-full pl-8 text-[0.72rem]"
              aria-label="Search messages or people"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-1 px-2 pb-3">
            {loading ? (
              <div className="flex flex-col gap-2 p-2">
                {[0, 1, 2].map(index => (
                  <Skeleton key={index} className="h-12 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredRooms.length === 0 && !search ? (
              <p className="px-3 py-6 text-center text-[0.68rem] text-muted-foreground">
                No conversations yet. Start one with the button above.
              </p>
            ) : (
              filteredRooms.map(room => (
                <RoomRow
                  key={room.id}
                  room={room}
                  active={room.id === activeRoom}
                  onOpen={() => openRoom(room.id)}
                  selfId={selfId}
                />
              ))
            )}

            {people.length > 0 ? (
              <>
                <p className="mt-2 px-3 text-[0.54rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                  {search ? "People" : "Start a chat"}
                </p>
                {people.map(person => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => void openDirectMessage(person.id)}
                    className="flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
                  >
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[0.56rem]">{initials(person.username)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-[0.72rem] text-foreground/85">@{person.username}</span>
                    <Plus className="size-3.5 text-muted-foreground" />
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </ScrollArea>
      </aside>

      {/* ── Room ── */}
      <section className={cn("min-h-0 min-w-0 flex-1 flex-col", mobileSidebar ? "hidden md:flex" : "flex")}>
        <header className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5 sm:px-4">
          <Button
            size="icon"
            variant="ghost"
            className="size-8 md:hidden"
            aria-label="Back to conversations"
            onClick={() => setMobileSidebar(true)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Avatar className="size-8">
            <AvatarFallback className="text-[0.58rem]">
              {isGlobal ? <Globe2 className="size-4" /> : activeKind === "group" ? <Users className="size-4" /> : initials(roomTitle)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-semibold text-foreground">{roomTitle || "Messages"}</p>
            <p className="flex items-center gap-1 truncate text-[0.6rem] text-muted-foreground">
              {isGlobal ? (
                <>
                  <Globe2 className="size-2.5" /> Public room · TLS in transit
                </>
              ) : activeKind === "group" ? (
                <>
                  <Users className="size-2.5" /> {activeParticipants.length} members ·{" "}
                  {secured ? "end-to-end encrypted" : "securing…"}
                </>
              ) : (
                <>
                  {secured ? <Lock className="size-2.5" /> : <Lock className="size-2.5 opacity-40" />}
                  {secured ? "End-to-end encrypted" : "Waiting for keys…"}
                </>
              )}
            </p>
          </div>
          {activeConversation ? (
            <Badge variant={secured ? "secondary" : "outline"} className="hidden h-6 gap-1 text-[0.56rem] sm:flex">
              {secured ? <Lock className="size-2.5" /> : null}
              {secured ? "E2EE" : "TLS"}
            </Badge>
          ) : (
            <Badge variant="outline" className="hidden h-6 gap-1 text-[0.56rem] sm:flex">
              <Globe2 className="size-2.5" /> public
            </Badge>
          )}
        </header>

        {error ? (
          <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-[0.66rem] text-destructive">
            <span className="min-w-0 flex-1 truncate">{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent>
                {messagesLoading && !visibleMessages.length ? (
                  <div className="flex flex-col gap-3 py-4">
                    <Skeleton className="h-14 w-2/3" />
                    <Skeleton className="ml-auto h-12 w-1/2" />
                    <Skeleton className="h-16 w-3/5" />
                  </div>
                ) : visibleMessages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center py-10">
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <MessageSquarePlus className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>No messages yet</EmptyTitle>
                        <EmptyDescription>
                          {isGlobal
                            ? "Say hi to everyone signed into this deployment."
                            : "This is the start of the conversation. Say something."}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : (
                  visibleMessages.map((message, index) => {
                    const previous = visibleMessages[index - 1]
                    const newDay = !previous || dayKey(previous.created_at) !== dayKey(message.created_at)
                    return (
                      <React.Fragment key={message.id}>
                        {newDay ? (
                          <Marker variant="separator">
                            <MarkerContent>{formatDay(message.created_at)}</MarkerContent>
                          </Marker>
                        ) : null}
                        <MessageRow
                          message={message}
                          own={message.user_id === selfId}
                          name={message.user_id === selfId ? profile.username : nameOf(message.user_id)}
                          reactions={reactions[message.id] ?? []}
                          onReact={emoji => toggleReaction(message.id, emoji)}
                          onReply={() => setReplyTo(message)}
                          onEdit={message.user_id === selfId && !isGlobal ? () => setEditing({ id: message.id, value: replyBody(message.text) }) : undefined}
                          onDelete={message.user_id === selfId ? () => void deleteMessage(message) : undefined}
                          editing={editing?.id === message.id ? editing.value : null}
                          onEditingChange={value => setEditing({ id: message.id, value })}
                          onSaveEdit={() => void saveEdit()}
                          onCancelEdit={() => setEditing(null)}
                          onJump={targetId => {
                            const el = document.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(targetId)}"]`)
                            el?.scrollIntoView({ block: "center", behavior: "smooth" })
                          }}
                        />
                      </React.Fragment>
                    )
                  })
                )}

                {typingNames.length > 0 ? (
                  <MessageScrollerItem messageId="typing-indicator">
                    <Marker role="status">
                      <MarkerIcon>
                        <Spinner className="size-3" />
                      </MarkerIcon>
                      <MarkerContent>
                        {typingNames.slice(0, 3).join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
                      </MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <div className="border-t border-border/50 p-2 sm:p-3">
          {replyTo ? (
            <div className="mb-2 flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3 py-1.5">
              <Reply className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.54rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Replying to {replyTo.user_id === selfId ? "yourself" : nameOf(replyTo.user_id)}
                </p>
                <p className="truncate text-[0.66rem] text-foreground/70">{replyTo.text ?? "Encrypted message"}</p>
              </div>
              <Button size="icon" variant="ghost" className="size-6" aria-label="Cancel reply" onClick={() => setReplyTo(null)}>
                <X className="size-3.5" />
              </Button>
            </div>
          ) : null}

          <PromptInput
            onSubmit={event => {
              event.preventDefault()
              void sendMessage()
            }}
          >
            {pendingFile ? (
              <PromptInputAttachments>
                <AttachmentFile
                  name={pendingFile.name}
                  description={`${Math.ceil(pendingFile.body.length / 1024)} KB · ${pendingFile.language}`}
                  kind="code"
                  className="w-full"
                />
                <AttachmentRemove aria-label="Remove attachment" onClick={() => setPendingFile(null)} />
              </PromptInputAttachments>
            ) : null}
            <PromptInputBody>
              <PromptInputTextarea
                value={draft}
                onChange={event => {
                  setDraft(event.target.value)
                  notifyTyping()
                }}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage()
                  }
                }}
                placeholder={isGlobal ? "Message everyone in Global Chat…" : `Message ${roomTitle || "conversation"}…`}
                maxLength={MAX_MESSAGE_LENGTH}
                aria-label="Message"
              />
            </PromptInputBody>
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputAttachButton onClick={() => fileInputRef.current?.click()} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.css,.html,.py,.rs,.go,.java,.c,.cpp,.sh,.yml,.yaml,text/*"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0]
                    if (file) void attachFile(file)
                    event.target.value = ""
                  }}
                />
                <span className="hidden text-[0.58rem] text-muted-foreground sm:inline">
                  {draft.length}/{MAX_MESSAGE_LENGTH}
                </span>
                {!isGlobal ? (
                  <span className="hidden items-center gap-1 text-[0.58rem] text-muted-foreground sm:flex">
                    {secured ? <Lock className="size-2.5" /> : <Lock className="size-2.5 opacity-40" />}
                    {secured ? "encrypted" : "not encrypted yet"}
                  </span>
                ) : null}
              </PromptInputTools>
              <PromptInputSubmit
                status={sending ? "submitting" : "ready"}
                disabled={sending || (!draft.trim() && !pendingFile)}
              />
            </PromptInputToolbar>
          </PromptInput>
          {visibleMessages.length === 0 && !isGlobal ? (
            <Suggestions className="mt-2">
              <Suggestion onClick={() => setDraft("Hey! How's it going?")}>Say hi</Suggestion>
              <Suggestion onClick={() => setDraft("What are you working on?")}>Break the ice</Suggestion>
              <Suggestion onClick={() => setDraft("Let's plan something this week.")}>Make a plan</Suggestion>
            </Suggestions>
          ) : null}
        </div>
      </section>

      {/* ── New conversation dialog ── */}
      <Dialog
        open={composerOpen}
        onOpenChange={(open: boolean) => {
          setComposerOpen(open)
          if (!open) {
            setSelecting([])
            setPeopleQuery("")
          }
        }}
      >
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle>New conversation</DialogTitle>
            <DialogDescription>
              Pick one person for a direct message, or several to start a group chat.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={peopleQuery}
              onChange={event => setPeopleQuery(event.target.value)}
              placeholder="Search people"
              className="h-9 pl-8 text-[0.74rem]"
              aria-label="Search people"
            />
          </div>
          <ScrollArea className="max-h-64">
            <div className="flex flex-col gap-1 pr-2">
              {directory
                .filter(person => !peopleQuery || person.username.toLowerCase().includes(peopleQuery.toLowerCase()))
                .slice(0, 60)
                .map(person => {
                  const selected = selecting.includes(person.id)
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() =>
                        setSelecting(prev => (prev.includes(person.id) ? prev.filter(id => id !== person.id) : [...prev, person.id]))
                      }
                      className={cn(
                        "flex items-center gap-2 rounded-2xl px-2.5 py-1.5 text-left transition-colors hover:bg-muted/60",
                        selected && "bg-muted/70"
                      )}
                    >
                      <Checkbox checked={selected} aria-label={`Select ${person.username}`} />
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[0.56rem]">{initials(person.username)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-[0.74rem]">@{person.username}</span>
                    </button>
                  )
                })}
              {directory.length === 0 ? (
                <p className="px-2 py-4 text-center text-[0.7rem] text-muted-foreground">No other accounts yet.</p>
              ) : null}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setComposerOpen(false)
                setSelecting([])
              }}
            >
              Cancel
            </Button>
            {selecting.length === 1 ? (
              <Button size="sm" disabled={creating} onClick={() => void openDirectMessage(selecting[0])}>
                {creating ? <Spinner className="size-3.5" /> : <Send className="size-3.5" />}
                Start DM
              </Button>
            ) : (
              <Button size="sm" disabled={creating || selecting.length < 2} onClick={() => void createGroup()}>
                {creating ? <Spinner className="size-3.5" /> : <Users className="size-3.5" />}
                Create group{selecting.length ? ` (${selecting.length})` : ""}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Room row ───────────────────────────────────────────────────────────── */

function RoomRow({
  room,
  active,
  onOpen,
  selfId,
}: {
  room: Room
  active: boolean
  onOpen: () => void
  selfId: string
}) {
  const icon =
    room.kind === "global" ? <Globe2 className="size-3.5" /> : room.kind === "group" ? <Users className="size-3.5" /> : null
  const people = room.participants.filter(id => id !== selfId)

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition-colors",
        active
          ? "border-border bg-muted/80 shadow-sm"
          : "border-transparent hover:border-border/60 hover:bg-muted/40"
      )}
    >
      <Avatar className="size-9">
        <AvatarFallback className={cn("text-[0.6rem]", room.kind === "global" && "text-primary")}>
          {icon ?? initials(room.title || people[0] || "??")}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <p className={cn("min-w-0 flex-1 truncate text-[0.74rem]", active ? "font-semibold text-foreground" : "font-medium text-foreground/85")}>
            {room.title}
          </p>
          {room.updatedAt ? (
            <span className="shrink-0 text-[0.56rem] text-muted-foreground">{formatTime(room.updatedAt)}</span>
          ) : null}
        </div>
        <p className="truncate text-[0.62rem] text-muted-foreground">{room.lastText}</p>
      </div>
      {room.unread ? <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
    </button>
  )
}

/* ── Message row ────────────────────────────────────────────────────────── */

function MessageRow({
  message,
  own,
  name,
  reactions,
  onReact,
  onReply,
  onEdit,
  onDelete,
  editing,
  onEditingChange,
  onSaveEdit,
  onCancelEdit,
  onJump,
}: {
  message: RoomMessage
  own: boolean
  name: string
  reactions: string[]
  onReact: (emoji: string) => void
  onReply: () => void
  onEdit?: () => void
  onDelete?: () => void
  editing: string | null
  onEditingChange: (value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onJump: (messageId: string) => void
}) {
  const parsed = message.text ? parseReply(message.text) : { replyUsername: null, replySnippet: null, body: "" }
  const [copied, setCopied] = React.useState(false)
  const [showOptions, setShowOptions] = React.useState(false)
  const lastTapRef = React.useRef(0)
  const { spring } = useMotionTokens()
  const reduceMotion = useShouldReduceMotion()

  function handleTouchEnd() {
    const now = Date.now()
    if (now - lastTapRef.current < 350) {
      setShowOptions(prev => !prev)
    }
    lastTapRef.current = now
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(parsed.body)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <MessageScrollerItem messageId={message.id} scrollAnchor={own}>
      <motion.div
        className="w-full"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.pop}
      >
      <Message
        align={own ? "end" : "start"}
        onDoubleClick={() => setShowOptions(prev => !prev)}
        onTouchEnd={handleTouchEnd}
      >
        <MessageAvatar>
          <Avatar className="size-8">
            <AvatarFallback className="text-[0.58rem]">{initials(name)}</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>
            <span>{own ? "you" : name}</span>
            {message.locked ? <Lock className="size-2.5" /> : null}
            {message.edited_at ? <span className="normal-case tracking-normal text-muted-foreground/70">edited</span> : null}
          </MessageHeader>

          {editing !== null ? (
            <div className="flex w-full max-w-xl flex-col gap-1.5">
              <textarea
                value={editing}
                onChange={event => onEditingChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    onSaveEdit()
                  }
                  if (event.key === "Escape") onCancelEdit()
                }}
                rows={3}
                className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-[0.78rem] text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Edit message"
              />
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 rounded-full" onClick={onCancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" className="h-7 rounded-full" onClick={onSaveEdit}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <Bubble variant={own ? "default" : "secondary"} align={own ? "end" : "start"}>
              {message.locked ? (
                <BubbleContent className="flex items-center gap-2 text-[0.72rem] text-muted-foreground">
                  <Lock className="size-3.5" />
                  Encrypted message — no key on this device yet
                </BubbleContent>
              ) : (
                <BubbleContent className="flex flex-col gap-1.5">
                  {parsed.replyUsername && parsed.replySnippet ? (
                    <button
                      type="button"
                      onClick={() => {
                        const target = document.querySelector<HTMLElement>(
                          `[data-message-id="${CSS.escape(message.id)}"]`
                        )
                        target?.scrollIntoView({ block: "center", behavior: "smooth" })
                        onJump(message.id)
                      }}
                      className={cn(
                        "w-full rounded-2xl border-l-2 px-2.5 py-1 text-left text-[0.66rem]",
                        own ? "border-primary-foreground/40 bg-primary-foreground/10" : "border-border bg-muted/60"
                      )}
                    >
                      <span className="block text-[0.54rem] uppercase tracking-[0.12em] opacity-70">
                        {parsed.replyUsername}
                      </span>
                      <span className="line-clamp-2 opacity-80">{parsed.replySnippet}</span>
                    </button>
                  ) : null}
                  {parsed.body && /```/.test(parsed.body) ? (
                    <MarkdownInBubble content={parsed.body} />
                  ) : (
                    <span className="whitespace-pre-wrap break-words">{parsed.body}</span>
                  )}
                </BubbleContent>
              )}
            </Bubble>
          )}

            {reactions.length > 0 ? (
              <div className={cn("mt-1 flex flex-wrap gap-1", own && "justify-end")} role="img" aria-label={`Reactions: ${reactions.join(", ")}`}>
                {reactions.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onReact(emoji)}
                    className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[0.66rem] transition-colors hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}

            <MessageFooter>
              <span>{formatTime(message.created_at)}</span>
              {message.pending ? <span>· sending…</span> : null}
              <div
                className={cn(
                  "ml-1 flex items-center gap-0.5 rounded-full border border-border/40 bg-card/90 px-1 py-0.5 shadow-sm backdrop-blur-sm transition-all duration-150",
                  showOptions
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none group-hover/message:opacity-100 group-hover/message:pointer-events-auto"
                )}
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="ghost" className="size-6 rounded-full" aria-label="Add reaction">
                      <Smile className="size-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align={own ? "end" : "start"} className="flex w-auto gap-1 rounded-2xl p-1.5">
                    {REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onReact(emoji)}
                        className="rounded-full px-1.5 py-1 text-[0.9rem] transition-colors hover:bg-muted"
                        aria-label={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
                <Button size="icon" variant="ghost" className="size-6 rounded-full" aria-label="Reply" onClick={onReply}>
                  <Reply className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-6 rounded-full" aria-label={copied ? "Copied" : "Copy message"} onClick={() => void copy()}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </Button>
                {onEdit ? (
                  <Button size="icon" variant="ghost" className="size-6 rounded-full" aria-label="Edit message" onClick={onEdit}>
                    <Pencil className="size-3.5" />
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 rounded-full text-muted-foreground hover:text-destructive"
                    aria-label="Delete message"
                    onClick={onDelete}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </MessageFooter>
          </MessageContent>
        </Message>
      </motion.div>
    </MessageScrollerItem>
  )
}

/* Renders fenced code inside a chat bubble without the full markdown surface. */
function MarkdownInBubble({ content }: { content: string }) {
  const parts = React.useMemo(() => {
    const segments: Array<{ type: "text"; value: string } | { type: "code"; value: string; lang: string }> = []
    const fence = /```([\w+#.-]*)[^\S\r\n]*\r?\n([\s\S]*?)```/g
    let last = 0
    for (let match = fence.exec(content); match; match = fence.exec(content)) {
      if (match.index > last) segments.push({ type: "text", value: content.slice(last, match.index) })
      segments.push({ type: "code", value: match[2].replace(/\r?\n$/, ""), lang: match[1] || "code" })
      last = match.index + match[0].length
    }
    if (last < content.length) segments.push({ type: "text", value: content.slice(last) })
    return segments
  }, [content])

  return (
    <div className="flex flex-col gap-1.5">
      {parts.map((part, index) =>
        part.type === "code" ? (
          <pre
            key={index}
            className="max-h-64 overflow-auto rounded-2xl border border-border/60 bg-background/70 p-3 font-mono text-[0.68rem] leading-relaxed"
          >
            <code>{part.value}</code>
          </pre>
        ) : part.value.trim() ? (
          <span key={index} className="whitespace-pre-wrap break-words">
            {part.value.trim()}
          </span>
        ) : null
      )}
    </div>
  )
}
