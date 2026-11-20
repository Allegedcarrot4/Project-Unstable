"use client"

import * as React from "react"
import {
  ArrowLeft,
  Atom,
  Brain,
  Copy,
  MessageSquarePlus,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  Zap,
} from "lucide-react"

import { supabase } from "../supabase"
import { cn } from "@/lib/utils"
import {
  AI_MODES,
  aiMessageId,
  buildConversationTitle,
  isPersistedMessageId,
  sendAiChat,
  type AIConversationRecord,
  type AIMessage,
  type AIMode,
} from "@/lib/ai"
import { AIMessageBody } from "@/components/AIMessageBody"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Marker, MarkerContent } from "@/components/ui/marker"
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
} from "@/components/ui/message-scroller"
import { ModelSelector } from "@/components/ui/model-selector"
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
import { Spinner } from "@/components/ui/spinner"
import { AttachmentFile, AttachmentRemove } from "@/components/ui/attachment"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { formatQuotaReset, readAiQuota, recordAiMessage } from "@/lib/ai-quota"
import { motion } from "motion/react"
import { useMotionTokens, useShouldReduceMotion } from "@animate-ui/react/utils/motion"

const MAX_ATTACHMENT_BYTES = 64 * 1024

function starterMessage(): AIMessage {
  return {
    id: aiMessageId(),
    role: "assistant",
    content:
      "Ready when you are. Ask for quick answers, rewrites, brainstorming, or code help — code comes back in a copyable block, and I'll use a form when I need a decision from you.",
  }
}

function languageForFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  const map: Record<string, string> = {
    ts: "ts",
    tsx: "tsx",
    js: "js",
    jsx: "jsx",
    json: "json",
    css: "css",
    html: "html",
    md: "md",
    py: "py",
    rs: "rs",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    sh: "bash",
    yml: "yaml",
    yaml: "yaml",
    txt: "text",
  }
  return map[ext] ?? "text"
}

interface PendingAttachment {
  name: string
  language: string
  body: string
}

/** User turns stay plain text, but fenced code keeps the code-block surface. */
function UserText({ content }: { content: string }) {
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
    return segments.length ? segments : [{ type: "text" as const, value: content }]
  }, [content])

  return (
    <div className="flex flex-col gap-1.5">
      {parts.map((part, index) =>
        part.type === "code" ? (
          <CodeBlock key={index}>
            <CodeBlockHeader>
              <CodeBlockTitle>{part.lang}</CodeBlockTitle>
              <CodeBlockActions>
                <CodeBlockCopyButton value={part.value} />
              </CodeBlockActions>
            </CodeBlockHeader>
            <CodeBlockContent>{part.value}</CodeBlockContent>
          </CodeBlock>
        ) : part.value.trim() ? (
          <span key={index} className="whitespace-pre-wrap break-words">
            {part.value.trim()}
          </span>
        ) : null
      )}
    </div>
  )
}

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "AI"
}

export function AIChat({ user, profile }: { user: { id: string }; profile: { username: string } }) {
  const [conversations, setConversations] = React.useState<AIConversationRecord[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<AIMessage[]>(() => [starterMessage()])
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [booting, setBooting] = React.useState(true)
  const [error, setError] = React.useState("")
  const [quota, setQuota] = React.useState(() => readAiQuota(user.id))
  const { spring, transition } = useMotionTokens()
  const reduceMotion = useShouldReduceMotion()
  const [mode, setMode] = React.useState<AIMode>(() => {
    try {
      return localStorage.getItem("unstable_ai_mode") === "think" ? "think" : "fast"
    } catch {
      return "fast"
    }
  })
  const [editMessageId, setEditMessageId] = React.useState<string | null>(null)
  const [editingContent, setEditingContent] = React.useState("")
  const [listening, setListening] = React.useState(false)
  const [speakingMessageId, setSpeakingMessageId] = React.useState<string | null>(null)
  const [regenerating, setRegenerating] = React.useState(false)
  const [feedback, setFeedback] = React.useState<Record<string, "like" | "dislike" | null>>({})
  const [attachment, setAttachment] = React.useState<PendingAttachment | null>(null)
  const [search, setSearch] = React.useState("")
  const [mobileSidebar, setMobileSidebar] = React.useState(true)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const editTextareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    try {
      localStorage.setItem("unstable_ai_mode", mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  /* ── Load conversations ───────────────────────────────────────────────── */

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setBooting(true)
      try {
        const { data, error: err } = await supabase
          .from("ai_conversations")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
        if (err) throw err
        if (cancelled) return
        const list = (data ?? []) as AIConversationRecord[]
        setConversations(list)
        if (list.length > 0) setActiveId(list[0].id)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load conversations.")
      } finally {
        if (!cancelled) setBooting(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user.id])

  /* ── Load messages for the active conversation ────────────────────────── */

  React.useEffect(() => {
    if (!activeId) {
      setMessages([starterMessage()])
      return
    }
    let cancelled = false
    async function loadMessages() {
      setBooting(true)
      try {
        const { data, error: err } = await supabase
          .from("ai_messages")
          .select("id, role, content")
          .eq("conversation_id", activeId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
        if (err) throw err
        if (cancelled) return
        if (data && data.length > 0) {
          setMessages(data.map(m => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })))
        } else {
          setMessages([starterMessage()])
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load messages.")
      } finally {
        if (!cancelled) setBooting(false)
      }
    }
    void loadMessages()
    return () => {
      cancelled = true
    }
  }, [activeId, user.id])

  /* ── Saved feedback ───────────────────────────────────────────────────── */

  React.useEffect(() => {
    let cancelled = false
    async function loadFeedback() {
      try {
        const { data, error: err } = await supabase
          .from("ai_chat_feedback")
          .select("message_id, feedback_type")
          .eq("user_id", user.id)
        if (err) throw err
        if (cancelled) return
        const map: Record<string, "like" | "dislike"> = {}
        for (const row of (data ?? []) as Array<{ message_id: string; feedback_type: "like" | "dislike" }>) {
          map[row.message_id] = row.feedback_type
        }
        setFeedback(map)
      } catch (err) {
        if (!cancelled) console.error("Failed to load feedback:", err)
      }
    }
    void loadFeedback()
    return () => {
      cancelled = true
    }
  }, [user.id, activeId])

  /* ── Conversation actions ─────────────────────────────────────────────── */

  async function newChat() {
    const { data, error: err } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, title: "New chat" })
      .select("id, title, created_at")
      .single()
    if (err) {
      setError(err.message)
      return
    }
    const conversation = data as AIConversationRecord
    setConversations(prev => [conversation, ...prev])
    setActiveId(conversation.id)
    setMessages([starterMessage()])
    setInput("")
    setAttachment(null)
    setMobileSidebar(false)
    setError("")
  }

  async function deleteChat(id: string) {
    const { error: messageError } = await supabase
      .from("ai_messages")
      .delete()
      .eq("conversation_id", id)
      .eq("user_id", user.id)
    if (messageError) {
      setError(messageError.message)
      return
    }
    const { error: conversationError } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
    if (conversationError) {
      setError(conversationError.message)
      return
    }
    setConversations(prev => prev.filter(conversation => conversation.id !== id))
    if (activeId === id) {
      const next = conversations.find(conversation => conversation.id !== id)
      setActiveId(next ? next.id : null)
      if (!next) setMessages([starterMessage()])
    }
  }

  async function updateConversationTitle(id: string, title: string) {
    setConversations(prev => prev.map(conversation => (conversation.id === id ? { ...conversation, title } : conversation)))
    const { error: updateError } = await supabase.from("ai_conversations").update({ title }).eq("id", id).eq("user_id", user.id)
    if (updateError) setError(updateError.message)
  }

  async function generateTitle(conversationId: string, userPrompt: string, aiResponse: string) {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fast",
          messages: [
            {
              role: "system",
              content:
                "Generate a concise title under 6 words for this conversation based on the first user message and AI response. Reply with only the title, no quotes or extra text.",
            },
            { role: "user", content: userPrompt },
            { role: "assistant", content: aiResponse },
          ],
        }),
      })
      const data = (await res.json().catch(() => null)) as { content?: string } | null
      if (data?.content) {
        const title = data.content.trim().replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 60)
        if (title) void updateConversationTitle(conversationId, title)
      }
    } catch {
      /* title generation is best effort */
    }
  }

  /* ── Sending ──────────────────────────────────────────────────────────── */

  async function sendMessage(rawPrompt?: string) {
    const typed = (rawPrompt ?? input).trim()
    const attachedBlock = attachment ? `\`\`\`${attachment.language}\n${attachment.body}\n\`\`\`` : ""
    const prompt = [typed, attachedBlock].filter(Boolean).join("\n\n").trim()
    if (!prompt || loading || booting) return

    let conversationId = activeId
    if (!conversationId) {
      const { data, error: err } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, title: buildConversationTitle(typed || attachment?.name || "Attachment") })
        .select("id, title, created_at")
        .single()
      if (err) {
        setError(err.message)
        return
      }
      const conversation = data as AIConversationRecord
      setConversations(prev => [conversation, ...prev])
      conversationId = conversation.id
      setActiveId(conversation.id)
    }

    const userMessage: AIMessage = { id: aiMessageId(), role: "user", content: prompt }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setAttachment(null)
    setError("")
    setLoading(true)
    setQuota(recordAiMessage(user.id))

    try {
      const { data: userRow, error: insertError } = await supabase
        .from("ai_messages")
        .insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: prompt })
        .select("id")
        .single()
      if (insertError) throw insertError
      // Swap the optimistic id for the persisted uuid so edits, deletes and
      // feedback target the real row instead of a locally generated placeholder.
      if (userRow?.id) replaceMessageId(userMessage.id, userRow.id as string)

      const history = [...messages, userMessage].slice(-16)
      const content = await sendAiChat(history, mode)
      const assistantMessage: AIMessage = { id: aiMessageId(), role: "assistant", content }
      setMessages(prev => [...prev, assistantMessage])

      const { data: assistantRow, error: aiInsertError } = await supabase
        .from("ai_messages")
        .insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content })
        .select("id")
        .single()
      if (aiInsertError) throw aiInsertError
      if (assistantRow?.id) replaceMessageId(assistantMessage.id, assistantRow.id as string)

      const conversation = conversations.find(item => item.id === conversationId)
      if (conversation && conversation.title === "New chat") {
        const tempTitle = buildConversationTitle(typed || "Attachment")
        void updateConversationTitle(conversationId, tempTitle)
        void generateTitle(conversationId, prompt, content)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to get a response right now.")
    } finally {
      setLoading(false)
    }
  }

  /* ── Message actions ──────────────────────────────────────────────────── */

  function replaceMessageId(tempId: string, persistedId: string) {
    setMessages(prev => prev.map(message => (message.id === tempId ? { ...message, id: persistedId } : message)))
  }

  async function saveEdit(messageId: string) {
    const next = editingContent.trim()
    if (!next) return
    setMessages(prev => prev.map(message => (message.id === messageId ? { ...message, content: next } : message)))
    setEditMessageId(null)
    setEditingContent("")
    const { error: updateError } = await supabase
      .from("ai_messages")
      .update({ content: next })
      .eq("id", messageId)
      .eq("user_id", user.id)
    if (updateError) setError(updateError.message)
  }

  function startEdit(message: AIMessage) {
    setEditMessageId(message.id)
    setEditingContent(message.content)
    window.setTimeout(() => editTextareaRef.current?.focus(), 0)
  }

  function cancelEdit() {
    setEditMessageId(null)
    setEditingContent("")
  }

  function copyMessage(content: string) {
    void navigator.clipboard.writeText(content).catch(() => {})
  }

  /**
   * Persists like/dislike on an assistant message to ai_chat_feedback.
   * The UI updates immediately and DB failures are logged only, so feedback
   * never blocks the chat. Local-only ids are skipped because the column is a
   * uuid FKey.
   */
  async function saveFeedback(messageId: string, next: "like" | "dislike" | null) {
    setFeedback(prev => ({ ...prev, [messageId]: next }))
    if (!isPersistedMessageId(messageId)) return
    try {
      if (next === null) {
        const { error } = await supabase
          .from("ai_chat_feedback")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("ai_chat_feedback")
          .upsert({ message_id: messageId, user_id: user.id, feedback_type: next }, { onConflict: "message_id,user_id" })
        if (error) throw error
      }
    } catch (err) {
      console.error("Failed to save feedback:", err)
    }
  }

  function speakMessage(id: string, content: string) {
    if (speakingMessageId === id) {
      window.speechSynthesis.cancel()
      setSpeakingMessageId(null)
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(content)
    utterance.onend = () => setSpeakingMessageId(null)
    utterance.onerror = () => setSpeakingMessageId(null)
    setSpeakingMessageId(id)
    window.speechSynthesis.speak(utterance)
  }

  async function regenerateMessage() {
    const lastUserMessage = [...messages].reverse().find(message => message.role === "user")
    if (!lastUserMessage || regenerating) return
    setRegenerating(true)
    const lastAssistantIndex = messages.map(message => message.role).lastIndexOf("assistant")
    if (lastAssistantIndex !== -1) {
      const removed = messages[lastAssistantIndex]
      setMessages(prev => prev.filter(message => message.id !== removed.id))
      if (activeId && isPersistedMessageId(removed.id)) {
        try {
          await supabase.from("ai_messages").delete().eq("id", removed.id).eq("user_id", user.id)
        } catch {
          /* ignore */
        }
      }
    }
    setLoading(true)
    try {
      const history = messages.slice(0, lastAssistantIndex > 0 ? lastAssistantIndex - 1 : 0)
      const content = await sendAiChat([...history, lastUserMessage], mode)
      const assistantMessage: AIMessage = { id: aiMessageId(), role: "assistant", content }
      setMessages(prev => [...prev, assistantMessage])
      if (activeId) {
        try {
          const { data: assistantRow } = await supabase
            .from("ai_messages")
            .insert({ conversation_id: activeId, user_id: user.id, role: "assistant", content })
            .select("id")
            .single()
          if (assistantRow?.id) replaceMessageId(assistantMessage.id, assistantRow.id as string)
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate.")
    } finally {
      setLoading(false)
      setRegenerating(false)
    }
  }

  function startVoiceInput() {
    if (listening) return
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setError("Voice input is not available in this browser.")
      return
    }
    const recognition = new Recognition()
    recognition.interimResults = false
    recognition.lang = "en-US"
    setListening(true)
    recognition.onresult = event => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0].transcript).join("")
      setInput(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    try {
      recognition.start()
    } catch {
      setListening(false)
    }
  }

  async function attachFile(file: File) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("Attachments are limited to 64 KB of text.")
      return
    }
    try {
      const body = await file.text()
      setAttachment({ name: file.name, language: languageForFile(file.name), body: body.slice(0, MAX_ATTACHMENT_BYTES) })
      setError("")
    } catch {
      setError("That file could not be read.")
    }
  }

  /* ── Derived ──────────────────────────────────────────────────────────── */

  const activeConversation = conversations.find(conversation => conversation.id === activeId) ?? null
  const filteredConversations = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter(conversation => (conversation.title ?? "Untitled").toLowerCase().includes(query))
  }, [conversations, search])

  const modeOptions = (Object.keys(AI_MODES) as AIMode[]).map(id => ({
    id,
    label: AI_MODES[id].label,
    hint: `${AI_MODES[id].model} · ${AI_MODES[id].hint}`,
    icon: id === "fast" ? <Zap className="size-3.5" /> : <Brain className="size-3.5" />,
  }))

  const title = activeConversation?.title || (activeId ? "Chat" : "New conversation")

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background font-sans">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "min-h-0 w-full shrink-0 flex-col border-r border-border/50 bg-sidebar md:flex md:w-[17rem]",
          mobileSidebar ? "flex" : "hidden"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <h1 className="text-[1.05rem] leading-tight font-semibold text-foreground">AI</h1>
          <Button
            size="icon"
            variant="outline"
            className="size-8 rounded-full"
            aria-label="New chat"
            onClick={() => void newChat()}
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
              placeholder="Search chats"
              className="h-8 rounded-full pl-8 text-[0.72rem]"
              aria-label="Search chats"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-1 px-2 pb-3">
            {booting && conversations.length === 0 ? (
              <div className="flex flex-col gap-2 p-2">
                {[0, 1, 2].map(index => (
                  <Skeleton key={index} className="h-10 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <p className="px-3 py-6 text-center text-[0.68rem] text-muted-foreground">
                {conversations.length === 0 ? "No conversations yet." : "No chats match that search."}
              </p>
            ) : (
              filteredConversations.map(conversation => {
                const active = conversation.id === activeId
                return (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group/chat flex items-center gap-1 rounded-2xl border px-2.5 py-1.5 transition-colors",
                      active
                        ? "border-border bg-muted/80 shadow-sm"
                        : "border-transparent hover:border-border/60 hover:bg-muted/40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(conversation.id)
                        setMobileSidebar(false)
                      }}
                      aria-current={active ? "true" : undefined}
                      className="flex min-w-0 flex-1 flex-col text-left"
                    >
                      <span className={cn("truncate text-[0.72rem]", active ? "font-semibold" : "font-medium text-foreground/85")}>
                        {conversation.title || "Untitled"}
                      </span>
                      <span className="truncate text-[0.56rem] text-muted-foreground">
                        {new Date(conversation.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 rounded-full opacity-0 transition-opacity group-hover/chat:opacity-100 focus-visible:opacity-100"
                          aria-label={`Actions for ${conversation.title ?? "chat"}`}
                        >
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-2xl">
                        <DropdownMenuItem onSelect={() => setActiveId(conversation.id)}>
                          <MessageSquarePlus className="size-3.5" /> Open
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => void deleteChat(conversation.id)}
                        >
                          <Trash2 className="size-3.5" /> Delete chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-baseline justify-between gap-2 text-[0.68rem]">
            <span className="font-medium text-foreground">Free</span>
            <span className="font-mono text-[0.62rem] text-muted-foreground">
              {quota.remaining}/{quota.limit}
            </span>
          </div>
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Free messages remaining this week"
            aria-valuemin={0}
            aria-valuemax={quota.limit}
            aria-valuenow={quota.remaining}
          >
            <motion.div
              className="h-full origin-left rounded-full bg-primary"
              initial={false}
              animate={{ scaleX: Math.max(0, Math.min(1, quota.fraction)) }}
              transition={reduceMotion ? transition.instant : spring.progress}
            />
          </div>
          <p className="text-[0.56rem] text-muted-foreground">
            Resets in {formatQuotaReset(quota.resetsAt)} · Mon 00:00 UTC
          </p>
        </div>
      </aside>

      {/* ── Conversation ── */}
      <section className={cn("min-h-0 min-w-0 flex-1 flex-col", mobileSidebar ? "hidden md:flex" : "flex")}>
        <header className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5 sm:px-4">
          <Button
            size="icon"
            variant="ghost"
            className="size-8 md:hidden"
            aria-label="Back to chats"
            onClick={() => setMobileSidebar(true)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Avatar className="size-8">
            <AvatarFallback className="text-primary">
              <Atom className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-semibold text-foreground">{title}</p>
            <p className="truncate text-[0.6rem] text-muted-foreground">
              {loading ? "Generating a reply…" : `${AI_MODES[mode].label} · ${AI_MODES[mode].model}`}
            </p>
          </div>
          <ModelSelector
            value={mode}
            onChange={id => setMode(id as AIMode)}
            options={modeOptions}
            label="Response mode"
            className="hidden sm:inline-flex"
          />
          <Button
            size="icon"
            variant="outline"
            className="size-8 rounded-full"
            aria-label="New chat"
            onClick={() => void newChat()}
          >
            <Plus className="size-4" />
          </Button>
          {activeId ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-muted-foreground hover:text-destructive"
              aria-label="Delete this chat"
              onClick={() => void deleteChat(activeId)}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </header>

        {error ? (
          <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-[0.66rem] text-destructive">
            <span className="min-w-0 flex-1 truncate">{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        ) : null}

        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller>
            <MessageScrollerContent>
              <Marker variant="separator">
                <MarkerContent>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3" />
                    {activeConversation
                      ? new Date(activeConversation.created_at).toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })
                      : "New conversation"}
                  </span>
                </MarkerContent>
              </Marker>

              {booting && messages.length <= 1 ? (
                <div className="flex flex-col gap-3 py-4">
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="ml-auto h-12 w-1/2" />
                  <Skeleton className="h-20 w-2/3" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-10">
                  <Empty className="border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Atom className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>Send a message to start</EmptyTitle>
                      <EmptyDescription>Ask for code, a rewrite, a plan, or an explanation.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                messages.map((message, index) => {
                  const own = message.role === "user"
                  const isEditing = editMessageId === message.id
                  const isLast = index === messages.length - 1
                  return (
                    <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={own}>
                      <motion.div
                        className="w-full"
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={spring.pop}
                      >
                      <Message align={own ? "end" : "start"}>
                        <MessageAvatar>
                          <Avatar className="size-8">
                            <AvatarFallback
                              className={cn("text-[0.58rem]", !own && "text-primary")}
                            >
                              {own ? initials(profile.username) : <Atom className="size-3.5" />}
                            </AvatarFallback>
                          </Avatar>
                        </MessageAvatar>
                        <MessageContent>
                          <MessageHeader>
                            <span>{own ? "you" : "assistant"}</span>
                            {!own ? (
                              <Badge variant="outline" className="h-4 px-1 text-[0.5rem] uppercase tracking-wide">
                                {mode}
                              </Badge>
                            ) : null}
                          </MessageHeader>

                          {isEditing ? (
                            <div className="flex w-full max-w-2xl flex-col gap-1.5">
                              <textarea
                                ref={editTextareaRef}
                                value={editingContent}
                                onChange={event => setEditingContent(event.target.value)}
                                onKeyDown={event => {
                                  if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault()
                                    void saveEdit(message.id)
                                  }
                                  if (event.key === "Escape") cancelEdit()
                                }}
                                rows={4}
                                className="w-full resize-none rounded-2xl border border-border bg-card px-3.5 py-2.5 text-[0.8rem] leading-relaxed text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                aria-label="Edit message"
                              />
                              <div className="flex justify-end gap-1.5">
                                <Button size="sm" variant="ghost" className="h-7" onClick={cancelEdit}>
                                  Cancel
                                </Button>
                                <Button size="sm" className="h-7" onClick={() => void saveEdit(message.id)}>
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Bubble
                              variant={own ? "default" : "ghost"}
                              align={own ? "end" : "start"}
                              className={own ? undefined : "w-full max-w-full"}
                            >
                              <BubbleContent className={cn("flex flex-col gap-2", own ? "max-w-2xl" : "w-full")}>
                                {own ? (
                                  <UserText content={message.content} />
                                ) : (
                                  <AIMessageBody
                                    content={message.content}
                                    interactive={isLast && !loading}
                                    onAnswer={answer => void sendMessage(answer)}
                                    meta={{ model: AI_MODES[mode].model, mode }}
                                  />
                                )}
                              </BubbleContent>
                            </Bubble>
                          )}

                          {!isEditing ? (
                            <MessageFooter className="gap-0.5 opacity-60 transition-opacity md:opacity-0 md:group-hover/message:opacity-100 md:focus-within:opacity-100">
                              {!own ? (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-6"
                                    aria-label={speakingMessageId === message.id ? "Stop reading" : "Read aloud"}
                                    onClick={() => speakMessage(message.id, message.content)}
                                  >
                                    <Volume2 className="size-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-6"
                                    aria-label="Regenerate reply"
                                    disabled={loading || regenerating}
                                    onClick={() => void regenerateMessage()}
                                  >
                                    <RefreshCw className={cn("size-3.5", regenerating && "animate-spin")} />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  aria-label="Edit message"
                                  onClick={() => startEdit(message)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-6"
                                aria-label="Copy message"
                                onClick={() => copyMessage(message.content)}
                              >
                                <Copy className="size-3.5" />
                              </Button>
                              {!own ? (
                                <>
                                  <span className="mx-0.5 h-3 w-px bg-border" />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={cn(
                                      "size-6",
                                      feedback[message.id] === "like" && "text-emerald-400"
                                    )}
                                    aria-label="Good response"
                                    aria-pressed={feedback[message.id] === "like"}
                                    onClick={() =>
                                      void saveFeedback(message.id, feedback[message.id] === "like" ? null : "like")
                                    }
                                  >
                                    <ThumbsUp className="size-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={cn(
                                      "size-6",
                                      feedback[message.id] === "dislike" && "text-destructive"
                                    )}
                                    aria-label="Bad response"
                                    aria-pressed={feedback[message.id] === "dislike"}
                                    onClick={() =>
                                      void saveFeedback(message.id, feedback[message.id] === "dislike" ? null : "dislike")
                                    }
                                  >
                                    <ThumbsDown className="size-3.5" />
                                  </Button>
                                </>
                              ) : null}
                            </MessageFooter>
                          ) : null}
                        </MessageContent>
                      </Message>
                      </motion.div>
                    </MessageScrollerItem>
                  )
                })
              )}

              {loading ? (
                <MessageScrollerItem messageId="ai-typing">
                  <Message align="start">
                    <MessageAvatar>
                      <Avatar className="size-8">
                        <AvatarFallback className="text-primary">
                          <Atom className="size-3.5" />
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent>
                      <MessageHeader>
                        <span>assistant</span>
                      </MessageHeader>
                      <Bubble variant="ghost">
                        <BubbleContent className="flex items-center gap-2 text-[0.72rem] text-muted-foreground">
                          <Spinner className="size-3.5" />
                          Thinking…
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <div className="border-t border-border/50 p-2 sm:p-3">
          {attachment ? (
            <PromptInputAttachments className="mb-2 rounded-2xl border border-border bg-muted/30 px-3 py-2">
              <AttachmentFile
                name={attachment.name}
                description={`${Math.ceil(attachment.body.length / 1024)} KB · ${attachment.language}`}
                kind="code"
                className="w-full border-0 bg-transparent"
              />
              <AttachmentRemove aria-label="Remove attachment" onClick={() => setAttachment(null)} />
            </PromptInputAttachments>
          ) : null}

          <PromptInput
            onSubmit={event => {
              event.preventDefault()
              void sendMessage()
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage()
                  }
                }}
                placeholder={activeId ? "Ask anything…" : "Start a new chat…"}
                maxHeight={200}
                aria-label="Message the AI"
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
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-7 gap-1 rounded-full px-2 text-[0.64rem] text-muted-foreground hover:text-foreground",
                    listening && "text-destructive"
                  )}
                  aria-label={listening ? "Listening" : "Dictate a message"}
                  aria-pressed={listening}
                  onClick={startVoiceInput}
                >
                  <Mic className={cn("size-3.5", listening && "animate-pulse")} />
                  <span className="hidden sm:inline">{listening ? "Listening" : "Dictate"}</span>
                </Button>
                <span className="hidden text-[0.58rem] text-muted-foreground sm:inline">
                  {input.length}/4000
                </span>
              </PromptInputTools>
              <PromptInputSubmit
                status={loading ? "submitting" : "ready"}
                disabled={loading || (!input.trim() && !attachment)}
              >
                <Send className="size-3.5" />
              </PromptInputSubmit>
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </section>
    </div>
  )
}

interface SpeechRecognitionLike {
  interimResults: boolean
  lang: string
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
}
