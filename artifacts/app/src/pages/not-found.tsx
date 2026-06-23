import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--t-bg, #0d0d0d)",
      fontFamily: "'Space Grotesk', sans-serif"
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem",
          padding: "2.5rem", border: "1px solid var(--t-border-light, #1e1e1e)",
          borderRadius: "2px", background: "var(--t-bg-secondary, rgba(17,17,17,0.5))",
          backdropFilter: "blur(12px)", maxWidth: 380
        }}
      >
        <AlertCircle className="h-10 w-10" style={{ color: "var(--t-text-muted, rgba(255,255,255,0.3))" }} />
        <h1 style={{
          fontSize: "1.15rem", fontWeight: 600, margin: 0,
          color: "var(--t-text, #e0e0e0)", letterSpacing: "0.04em"
        }}>
          404 — Page not found
        </h1>
        <p style={{
          fontSize: "0.78rem", margin: 0, textAlign: "center", lineHeight: 1.5,
          color: "var(--t-text-secondary, rgba(255,255,255,0.55))"
        }}>
          The page you're looking for doesn't exist.
        </p>
        <button
          onClick={() => window.location.href = "/"}
          style={{
            marginTop: "0.5rem", padding: "0.6rem 1.4rem", fontSize: "0.7rem",
            fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
            background: "none", border: "1px solid var(--t-border-light, #1e1e1e)",
            color: "var(--t-text-muted, rgba(255,255,255,0.3))", cursor: "pointer",
            fontFamily: "inherit", borderRadius: "2px", transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--t-text, #e0e0e0)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--t-text-muted, rgba(255,255,255,0.3))"; }}
        >
          Go home
        </button>
      </motion.div>
    </div>
  );
}
