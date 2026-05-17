import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

router.post("/ai/chat", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

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
    .filter((message): message is ChatMessage => Boolean(message))
    .slice(-16);

  if (!sanitizedMessages.length) {
    res.status(400).json({ error: "At least one message is required." });
    return;
  }

  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.6,
        max_tokens: 700,
        messages: [
          {
            role: "system",
            content:
              "You are Unstable AI, a fast, stylish assistant inside a minimalist browser UI. Be concise, helpful, and confident. Use plain text only.",
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

    res.json({ content, model: "llama-3.1-8b-instant" });
  } catch (err) {
    logger.error({ err }, "Groq chat request failed");
    res.status(502).json({ error: "Unable to reach Groq right now." });
  }
});

export default router;
