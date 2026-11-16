import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Download, X } from "lucide-react";
import { formatBytes, formatSpeed, getDownloads, subscribe, type DownloadEntry } from "../lib/downloads";

/** How long a finished/failed transfer stays on screen. */
const DONE_VISIBLE_MS = 6000;

/**
 * Floating status for downloads the manager is handling. Transfers started from
 * a proxied page show up here while the file streams through the proxy, then the
 * card switches to the saved/failed state and fades out on its own.
 */
export function DownloadIndicator({ onOpen }: { onOpen: () => void }) {
  const [entries, setEntries] = useState<DownloadEntry[]>(() => getDownloads());
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribe(() => setEntries(getDownloads())), []);

  const active = entries.filter(entry => {
    if (entry.state === "in-progress") return true;
    return Boolean(entry.completedAt) && now - (entry.completedAt as number) < DONE_VISIBLE_MS;
  });
  const visible = active.filter(entry => !hiddenIds.includes(entry.id));

  // Keep the clock moving while something is on screen so finished transfers
  // can expire without another store event.
  useEffect(() => {
    if (visible.length === 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [visible.length]);

  const current = visible[0];
  if (!current) return null;

  const extra = visible.length - 1;
  const progress = current.totalBytes > 0
    ? Math.min(100, (current.downloadedBytes / current.totalBytes) * 100)
    : 0;
  const done = current.state === "complete";
  const failed = current.state === "error";
  const accent = failed ? "rgba(255,120,120,0.85)" : done ? "#8fd6a0" : "#e8e8e8";

  const detail = failed
    ? current.errorMessage || "Download failed"
    : done
      ? `${formatBytes(current.totalBytes)} · saved to your downloads`
      : [
          current.totalBytes > 0
            ? `${formatBytes(current.downloadedBytes)} / ${formatBytes(current.totalBytes)}`
            : formatBytes(current.downloadedBytes),
          current.speedBytesPerSec ? formatSpeed(current.speedBytesPerSec) : "",
        ].filter(Boolean).join(" · ");

  return (
    <AnimatePresence>
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          zIndex: 1000002,
          width: "min(320px, calc(100vw - 32px))",
          padding: "0.6rem 0.7rem",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(24,24,24,0.97), rgba(12,12,12,0.97))",
          boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          fontFamily: "'Space Grotesk', sans-serif",
          color: "#e8e8e8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <button
            onClick={onOpen}
            title="Open downloads"
            style={{
              flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "0.55rem",
              background: "none", border: "none", padding: 0, cursor: "pointer",
              color: "inherit", fontFamily: "inherit", textAlign: "left",
            }}
          >
            <span style={{ width: 22, height: 22, display: "grid", placeItems: "center", flexShrink: 0 }}>
              {failed ? <AlertTriangle size={14} color={accent} /> : done ? <Check size={14} color={accent} /> : <Download size={14} color={accent} />}
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{
                display: "block", fontSize: "0.68rem", fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {current.filename}
              </span>
              <span style={{
                display: "block", marginTop: 1, fontSize: "0.56rem",
                color: failed ? "rgba(255,120,120,0.8)" : "rgba(255,255,255,0.45)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {extra > 0 ? `${detail} · +${extra} more` : detail}
              </span>
            </span>
          </button>
          <button
            onClick={() => setHiddenIds(ids => [...ids, current.id])}
            aria-label="Hide download status"
            style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex" }}
          >
            <X size={13} />
          </button>
        </div>

        {!done && !failed && (
          <div style={{ marginTop: "0.4rem", height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.25 }}
              style={{ height: "100%", borderRadius: 2, background: "#e8e8e8" }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default DownloadIndicator;
