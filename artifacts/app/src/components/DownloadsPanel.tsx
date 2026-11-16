import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Check, Download, Trash2, X } from "lucide-react";
import {
  clearDownloads,
  formatBytes,
  formatSpeed,
  getDownloads,
  removeDownload,
  retryDownload,
  subscribe,
  type DownloadEntry,
} from "../lib/downloads";

/** Compact downloads dropdown for the toolbar's three-dot menu. */
export function DownloadsPanel({
  onOpenManager,
  onClose,
}: {
  onOpenManager: () => void;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<DownloadEntry[]>(() => getDownloads());

  useEffect(() => subscribe(() => setEntries(getDownloads())), []);

  const active = entries.filter(entry => entry.state === "in-progress").length;
  const shown = entries.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        width: 320,
        background: "#111",
        border: "1px solid #222",
        borderRadius: 8,
        boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#e8e8e8",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.55rem 0.6rem", borderBottom: "1px solid #1e1e1e" }}>
        <Download size={13} style={{ opacity: 0.7 }} />
        <span style={{ flex: 1, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em" }}>
          Download manager
        </span>
        {entries.length > 0 && (
          <button
            onClick={() => { clearDownloads(); }}
            title="Clear all downloads"
            aria-label="Clear all downloads"
            style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "rgba(255,255,255,0.32)", display: "flex" }}
          >
            <Trash2 size={12} />
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close download manager"
          style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "rgba(255,255,255,0.32)", display: "flex" }}
        >
          <X size={13} />
        </button>
      </div>

      <div style={{ maxHeight: 280, overflowY: "auto", padding: "0.25rem" }}>
        {shown.length === 0 ? (
          <p style={{ margin: "1.1rem 0.6rem", fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
            Downloads started in a proxied page show up here.
          </p>
        ) : shown.map(entry => <Row key={entry.id} entry={entry} />)}
      </div>

      <button
        onClick={onOpenManager}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem",
          width: "100%", padding: "0.55rem 0.6rem", borderTop: "1px solid #1e1e1e",
          background: "transparent", border: "none", borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "#1e1e1e",
          color: "rgba(255,255,255,0.72)", fontFamily: "inherit", fontSize: "0.66rem",
          letterSpacing: "0.02em", cursor: "pointer", textAlign: "left",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#1a1a1a"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <span>Open download manager</span>
        <ArrowUpRight size={12} style={{ opacity: 0.6 }} />
      </button>

      {active > 0 && (
        <div style={{ padding: "0 0.6rem 0.45rem", fontSize: "0.56rem", color: "rgba(255,255,255,0.32)", letterSpacing: "0.04em" }}>
          {active} active
        </div>
      )}
    </motion.div>
  );
}

function Row({ entry }: { entry: DownloadEntry }) {
  const done = entry.state === "complete";
  const failed = entry.state === "error";
  const progress = entry.totalBytes > 0
    ? Math.min(100, (entry.downloadedBytes / entry.totalBytes) * 100)
    : 0;

  const detail = failed
    ? entry.errorMessage || "Failed"
    : done
      ? `${formatBytes(entry.totalBytes)} · ${new Date(entry.completedAt || entry.startedAt).toLocaleDateString()}`
      : [
          entry.totalBytes > 0
            ? `${formatBytes(entry.downloadedBytes)} / ${formatBytes(entry.totalBytes)}`
            : formatBytes(entry.downloadedBytes),
          entry.speedBytesPerSec ? formatSpeed(entry.speedBytesPerSec) : "",
        ].filter(Boolean).join(" · ");

  return (
    <div style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start", padding: "0.4rem 0.45rem", borderRadius: 6 }}>
      <span style={{ width: 16, display: "flex", justifyContent: "center", paddingTop: 2, flexShrink: 0 }}>
        {failed
          ? <AlertTriangle size={12} color="rgba(255,120,120,0.8)" />
          : done
            ? <Check size={12} color="#8fd6a0" />
            : <Download size={12} color="rgba(255,255,255,0.55)" />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.filename}
        </p>
        <p style={{
          margin: "1px 0 0", fontSize: "0.55rem",
          color: failed ? "rgba(255,120,120,0.75)" : "rgba(255,255,255,0.38)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {detail}
        </p>
        {entry.state === "in-progress" && (
          <div style={{ marginTop: 3, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{
              width: `${progress}%`, height: "100%", borderRadius: 2,
              background: "#e8e8e8", transition: "width 0.25s ease",
            }} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        {failed && (
          <button
            onClick={() => retryDownload(entry.id)}
            title="Retry"
            style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "rgba(255,255,255,0.45)", fontFamily: "inherit", fontSize: "0.55rem" }}
          >
            Retry
          </button>
        )}
        <button
          onClick={() => removeDownload(entry.id)}
          title="Remove"
          aria-label="Remove download"
          style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "rgba(255,255,255,0.28)", display: "flex" }}
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

export default DownloadsPanel;
