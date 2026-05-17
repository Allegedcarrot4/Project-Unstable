import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatMode = "fast" | "think";

router.post("/ai/chat", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const mode: ChatMode = req.body?.mode === "think" ? "think" : "fast";

  if (!apiKey) {
    res.status(503).json({ error: "AI is not configured on this server." });
    return;
  }

  const sanitizedMessages = messages
    .map((message: unknown) => {
      const role = typeof (message as ChatMessage)?.role === "string" ? (message as ChatMessage).role : "user";
      const content = typeof (message as ChatMessage)?.content === "string" ? (message as ChatMessage).content.trim() : "";
      if (!content) return null;
      if (!["system", "user", "assistant"].includes(role)) return null;
      return { role, content };
    })
    .filter((message: ChatMessage | null): message is ChatMessage => Boolean(message))
    .slice(-16);

  if (!sanitizedMessages.length) {
    res.status(400).json({ error: "At least one message is required." });
    return;
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
      res.status(upstream.status).json({ error: message });
      return;
    }

    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      res.status(502).json({ error: "Groq returned an empty response." });
      return;
    }

    res.json({ content, model, mode });
  } catch (err) {
    logger.error({ err }, "Groq chat request failed");
    res.status(502).json({ error: "Unable to reach Groq right now." });
  }
});

export default router;
