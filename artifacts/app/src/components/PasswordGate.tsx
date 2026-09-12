import { useState, useEffect } from "react";
import type { ReactNode } from "react";

const SESSION_KEY = "unstable_auth";

// If PASSWORD is not configured, the gate is skipped entirely. Otherwise only
// the configured PASSWORD unlocks it.
async function isGateRequired(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/password-status", {
      signal: AbortSignal.timeout(6000),
    });
    const data = (await res.json().catch(() => null)) as { required?: boolean } | null;
    return Boolean(res.ok && data?.required);
  } catch {
    return false;
  }
}

// POST /api/auth/check -> 200 ok | 401 wrong
async function verifyPassword(pw: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"checking" | "locked" | "unlocked">("checking");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const required = await isGateRequired();
      if (cancelled) return;
      if (!required || sessionStorage.getItem(SESSION_KEY) === "true") {
        setPhase("unlocked");
      } else {
        setPhase("locked");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    const ok = await verifyPassword(pw);
    setChecking(false);
    if (ok) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setPhase("unlocked");
    } else {
      setErr(true);
      setShaking(true);
      setPw("");
      setTimeout(() => setShaking(false), 500);
    }
  }

  if (phase === "checking") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif" }}>
        <span style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>unstable</span>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0d0d0d", fontFamily: "'Space Grotesk', sans-serif", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", width: "100%", maxWidth: "360px", padding: "0 1.5rem" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: 0 }}>unstable</p>
          <form onSubmit={submit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ animation: shaking ? "shake 0.5s ease-in-out" : "none" }}>
              <input type="password" value={pw} autoFocus onChange={e => { setPw(e.target.value); setErr(false); }} placeholder="enter password"
                style={{ width: "100%", background: "#111", border: `1px solid ${err ? "#8b2b2b" : "#222"}`, color: "#e8e8e8", padding: "0.875rem 1rem", fontSize: "0.9rem", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.04em", outline: "none", borderRadius: "2px", transition: "border-color 0.2s", boxSizing: "border-box" }}
                onFocus={e => { if (!err) e.target.style.borderColor = "#444"; }} onBlur={e => { if (!err) e.target.style.borderColor = "#222"; }}
              />
            </div>
            {err && <p style={{ color: "#a04040", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0, textAlign: "center" }}>incorrect password</p>}
            <button type="submit" disabled={checking} style={{ width: "100%", background: checking ? "#555" : "#e8e8e8", color: checking ? "#aaa" : "#0d0d0d", border: "none", padding: "0.875rem 1rem", fontSize: "0.68rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", cursor: checking ? "not-allowed" : "pointer", borderRadius: "2px", transition: "background 0.15s" }}
              onMouseEnter={e => { if (!checking) (e.target as HTMLButtonElement).style.background = "#bbb"; }}
              onMouseLeave={e => { if (!checking) (e.target as HTMLButtonElement).style.background = "#e8e8e8"; }}
            >{checking ? "checking…" : "enter"}</button>
          </form>
        </div>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}30%{transform:translateX(8px)}45%{transform:translateX(-6px)}60%{transform:translateX(6px)}75%{transform:translateX(-3px)}90%{transform:translateX(3px)}} input::placeholder{color:rgba(255,255,255,0.2)}`}</style>
      </div>
    );
  }

  return <>{children}</>;
}
