import { Router } from "express";

const router = Router();

router.post("/auth/check", (req, res) => {
  const { password } = req.body ?? {};

  const expected = process.env.PASSWORD;

  if (!expected) {
    // PASSWORD not configured — tell the client to handle auth locally (dev mode)
    res.status(503).json({ dev: true });
    return;
  }

  if (typeof password !== "string" || password !== expected) {
    res.status(401).json({ ok: false });
    return;
  }

  res.json({ ok: true });
});

export default router;
