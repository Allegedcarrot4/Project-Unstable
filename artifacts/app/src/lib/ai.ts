/**
 * Shared AI chat types and helpers.
 *
 * Kept outside App.tsx so the AI page component and the shell agree on the
 * conversation shape and the request helper.
 */

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type AIMode = "fast" | "think";

export interface AIConversationRecord {
  id: string;
  title: string | null;
  created_at: string;
}

export const AI_MODES: Record<AIMode, { label: string; model: string; hint: string }> = {
  fast: { label: "Fast", model: "llama-3.1-8b-instant", hint: "lowest latency" },
  think: { label: "Think", model: "openai/gpt-oss-20b", hint: "more reasoning, slower replies" },
};

export function aiMessageId() {
  return Math.random().toString(36).slice(2);
}

// ai_chat_feedback.message_id FKeys to ai_messages(id) (uuid), so only ids that
// came back from the database may be written. Optimistic/local ids are not uuids.
const MESSAGE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPersistedMessageId(id: string) {
  return MESSAGE_UUID_RE.test(id);
}

export function buildConversationTitle(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

export async function sendAiChat(messages: AIMessage[], mode: AIMode): Promise<string> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  });

  const data = (await res.json().catch(() => null)) as { content?: string; error?: string } | null;
  if (!res.ok) throw new Error(data?.error || "The AI request failed.");
  if (!data?.content) throw new Error("The AI response was empty.");
  return data.content;
}
