import type { FastifyPluginAsync } from "fastify";
import { logger } from "../lib/logger";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatMode = "fast" | "think";

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const resetIn = entry.resetAt - now;
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetIn: entry.resetAt - now };
}

// Periodically clean up stale entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS * 2);

const aiRoute: FastifyPluginAsync = async (app) => {
  app.post("/ai/chat", async (req, reply) => {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    const messages = Array.isArray((req.body as any)?.messages) ? (req.body as any).messages : [];
    const mode: ChatMode = (req.body as any)?.mode === "think" ? "think" : "fast";

    if (!apiKey) {
      return reply.status(503).send({ error: "AI is not configured on this server." });
    }

    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const rateLimit = checkRateLimit(clientIp);

    reply.header("X-RateLimit-Limit", RATE_LIMIT_MAX);
    reply.header("X-RateLimit-Remaining", rateLimit.remaining);
    reply.header("X-RateLimit-Reset", Math.ceil(rateLimit.resetIn / 1000));

    if (!rateLimit.allowed) {
      return reply.status(429).send({
        error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
        retryAfter: Math.ceil(rateLimit.resetIn / 1000),
      });
    }

    const sanitizedMessages = messages
      .map((message: unknown) => {
        const role = typeof (message as ChatMessage)?.role === "string" ? (message as ChatMessage).role : "user";
        const content = typeof (message as ChatMessage)?.content === "string" ? (message as ChatMessage).content.trim().slice(0, 4000) : "";
        if (!content) return null;
        if (!["system", "user", "assistant"].includes(role)) return null;
        return { role, content };
      })
      .filter((message: ChatMessage | null): message is ChatMessage => Boolean(message))
      .slice(-16);

    const totalChars = sanitizedMessages.reduce((sum: number, m: ChatMessage) => sum + m.content.length, 0);
    if (totalChars > 64000) {
      return reply.status(400).send({ error: "Message history too long. Please start a new conversation." });
    }

    if (!sanitizedMessages.length) {
      return reply.status(400).send({ error: "At least one message is required." });
    }

    try {
      const model = mode === "think" ? "openai/gpt-oss-20b" : "llama-3.1-8b-instant";
      const temperature = mode === "think" ? 0.3 : 0.6;
      const maxTokens = mode === "think" ? 1100 : 700;
      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            {
              role: "system",
              content:
                mode === "think"
                  ? "You are Unstable AI in think mode. Spend more effort on reasoning, stay concise where possible, and use plain text only."
                  : "You are Unstable AI in fast mode. Be concise, helpful, and confident. Use plain text only.",
            },
            ...sanitizedMessages,
          ],
        }),
      });

      const data = (await upstream.json().catch(() => null)) as
        | { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> }
        | null;

      if (!upstream.ok) {
        const message = data?.error?.message || "Groq request failed.";
        return reply.status(upstream.status).send({ error: message });
      }

      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return reply.status(502).send({ error: "Groq returned an empty response." });
      }

      return reply.send({ content, model, mode });
    } catch (err) {
      logger.error({ err }, "Groq chat request failed");
      return reply.status(502).send({ error: "Unable to reach Groq right now." });
    }
  });
};

export default aiRoute;
