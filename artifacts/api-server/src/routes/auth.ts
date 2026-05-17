import { Router } from "express";

const router = Router();

router.post("/auth/check", (req, res) => {
  const { password } = req.body ?? {};
  const expectedRaw = process.env.PASSWORD;

  if (!expectedRaw) {
    // PASSWORD not configured — tell the client to handle auth locally (dev mode)
    res.status(503).json({ dev: true });
    return;
  }

  const expected = expectedRaw.trim().replace(/^['"]|['"]$/g, "");
  const provided = typeof password === "string" ? password.trim() : "";

  if (!provided || provided !== expected) {
    res.status(401).json({ ok: false });
    return;
  }

  res.json({ ok: true });
});

export default router;
