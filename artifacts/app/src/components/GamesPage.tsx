import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Gamepad2, Search, X } from "lucide-react";
import { CLOUD_GAMES, PLATFORM_INFO, type CloudGame, type CloudPlatform } from "../data/cloudGames";

interface GamesPageProps { onNavigate?: (url: string) => void; }
const PLATFORMS = Object.keys(PLATFORM_INFO) as CloudPlatform[];

/** A stable, intentionally simple cloud game catalogue. */
export function GamesPage({ onNavigate }: GamesPageProps) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<CloudPlatform | "all">("all");
  const [selected, setSelected] = useState<CloudGame | null>(null);
  const games = useMemo(() => {
    const term = query.trim().toLowerCase();
    return CLOUD_GAMES.filter(game => (!term || [game.name, game.category, game.description].some(text => text.toLowerCase().includes(term))) && (platform === "all" || game.platforms.some(link => link.platform === platform)));
  }, [query, platform]);
  const open = (url: string) => onNavigate ? onNavigate(url) : window.location.assign(url);

  return <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: "100%", overflow: "auto", boxSizing: "border-box", padding: "clamp(1.2rem,3vw,2.4rem)", background: "radial-gradient(circle at 82% -8%,rgba(255,255,255,.08),transparent 30%),#0d0d0d", color: "#ededed", fontFamily: "'Space Grotesk',sans-serif" }}>
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginBottom: "1.45rem" }}>
        <div><p style={label}>Unstable cloud</p><h1 style={{ margin: ".45rem 0 0", fontSize: "clamp(1.65rem,3vw,2.25rem)", lineHeight: 1.05, letterSpacing: "-.04em", fontWeight: 600 }}>Games, ready to stream.</h1><p style={{ margin: ".65rem 0 0", maxWidth: 600, color: "rgba(255,255,255,.48)", fontSize: ".76rem", lineHeight: 1.65 }}>Choose a game, select a cloud platform, and it opens inside Unstable.</p></div>
        <div style={{ minWidth: "min(100%,280px)", flex: "0 1 330px", display: "flex", alignItems: "center", gap: ".55rem", padding: ".15rem .7rem", border: "1px solid rgba(255,255,255,.11)", background: "rgba(255,255,255,.035)", borderRadius: 10 }}><Search size={15} color="rgba(255,255,255,.42)" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search games" aria-label="Search games" style={{ width: "100%", background: "transparent", border: 0, outline: 0, color: "#ededed", padding: ".62rem 0", fontFamily: "inherit", fontSize: ".75rem" }} /></div>
      </header>
      <nav aria-label="Platform filters" style={{ display: "flex", gap: ".45rem", flexWrap: "wrap", marginBottom: "1.35rem" }}><Filter active={platform === "all"} onClick={() => setPlatform("all")}>All games</Filter>{PLATFORMS.map(item => <Filter key={item} active={platform === item} onClick={() => setPlatform(item)}>{PLATFORM_INFO[item].tag}</Filter>)}</nav>
      <p style={{ margin: "0 0 .8rem", color: "rgba(255,255,255,.34)", fontSize: ".64rem", letterSpacing: ".1em", textTransform: "uppercase" }}>{games.length} {games.length === 1 ? "game" : "games"}</p>
      {games.length === 0 ? <div style={{ padding: "3rem 1rem", textAlign: "center", border: "1px dashed rgba(255,255,255,.13)", borderRadius: 14, color: "rgba(255,255,255,.4)", fontSize: ".76rem" }}>No games match that search.</div> : <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: ".8rem" }}>{games.map((game, index) => <motion.button key={game.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .02, .3) }} whileHover={{ y: -3 }} onClick={() => setSelected(game)} style={{ cursor: "pointer", padding: 0, overflow: "hidden", textAlign: "left", color: "inherit", background: "#121212", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, fontFamily: "inherit" }}>
        <div style={{ position: "relative", aspectRatio: ".72", background: "linear-gradient(145deg,#242424,#101010)", overflow: "hidden" }}><img src={game.coverImage} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /><div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 48%,rgba(0,0,0,.9))" }} /><span style={{ position: "absolute", right: 9, bottom: 9, display: "inline-flex", alignItems: "center", gap: 4, padding: ".28rem .45rem", background: "rgba(5,5,5,.78)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 5, color: "rgba(255,255,255,.76)", fontSize: ".54rem", letterSpacing: ".08em", textTransform: "uppercase" }}><Gamepad2 size={11} /> {game.platforms.length}</span></div>
        <div style={{ padding: ".7rem .75rem .78rem" }}><p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: ".78rem", fontWeight: 600 }}>{game.name}</p><p style={{ margin: ".26rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "rgba(255,255,255,.38)", fontSize: ".61rem" }}>{game.category}</p></div>
      </motion.button>)}</section>}
    </div>
    <AnimatePresence>{selected && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, zIndex: 30, display: "grid", placeItems: "center", padding: "1rem", background: "rgba(0,0,0,.66)", backdropFilter: "blur(5px)" }}><motion.section initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }} onClick={event => event.stopPropagation()} style={{ width: "min(100%,520px)", padding: "1.15rem", borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(180deg,#191919,#0e0e0e)", boxShadow: "0 24px 80px rgba(0,0,0,.6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}><div><p style={label}>{selected.category}</p><h2 style={{ margin: ".35rem 0 0", fontSize: "1.3rem", letterSpacing: "-.03em" }}>{selected.name}</h2></div><button onClick={() => setSelected(null)} aria-label="Close" style={{ padding: 4, color: "rgba(255,255,255,.58)", border: 0, background: "transparent", cursor: "pointer" }}><X size={18} /></button></div>
      <p style={{ margin: ".85rem 0 1rem", color: "rgba(255,255,255,.5)", fontSize: ".72rem", lineHeight: 1.62 }}>{selected.description}</p><div style={{ display: "grid", gap: ".45rem" }}>{selected.platforms.map(link => { const info = PLATFORM_INFO[link.platform]; return <button key={link.platform} onClick={() => open(link.url || info.fallbackUrl)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".72rem .78rem", borderRadius: 9, cursor: "pointer", color: "#eee", background: info.badgeBg, border: `1px solid ${info.color}55`, fontFamily: "inherit" }}><span style={{ fontSize: ".72rem", fontWeight: 600 }}>{info.name}</span><ExternalLink size={15} color={info.color} /></button>; })}</div>
    </motion.section></motion.div>}</AnimatePresence>
  </motion.main>;
}

const label = { margin: 0, color: "rgba(255,255,255,.32)", fontSize: ".6rem", letterSpacing: ".22em", textTransform: "uppercase" as const };
function Filter({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) { return <button onClick={onClick} style={{ padding: ".42rem .66rem", cursor: "pointer", borderRadius: 7, border: `1px solid ${active ? "rgba(255,255,255,.32)" : "rgba(255,255,255,.09)"}`, background: active ? "rgba(255,255,255,.13)" : "rgba(255,255,255,.035)", color: active ? "#f2f2f2" : "rgba(255,255,255,.5)", fontFamily: "'Space Grotesk',sans-serif", fontSize: ".6rem", letterSpacing: ".08em", textTransform: "uppercase" }}>{children}</button>; }
export default GamesPage;
