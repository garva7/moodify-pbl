import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Animated Gradient Background ────────────────────────────────────────────
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#080b14]" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute -top-1/2 -left-1/2 w-full h-full opacity-20"
        style={{ background: "conic-gradient(from 0deg, #0f3460, #16213e, #1a1a2e, #0f3460)", borderRadius: "50%" }}
      />
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px]"
        style={{ background: "radial-gradient(circle, #1db954, #006400)" }}
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]"
        style={{ background: "radial-gradient(circle, #7c3aed, #4c1d95)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}

// ─── Sound Wave ───────────────────────────────────────────────────────────────
function SoundWave({ active }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-10 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: "linear-gradient(to top, #d19cf7, #7c3aed)", height: "20px", transformOrigin: "center" }}
          animate={active ? { scaleY: [0.5, 1, 0.6, 0.9], opacity: [0.6, 1, 0.7, 1] } : { scaleY: 0.3, opacity: 0.3 }}
          transition={active ? { duration: 1.2, repeat: Infinity, delay: i * 0.06, ease: "easeInOut" } : { duration: 0.4 }}
        />
      ))}
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────
const loadingPhrases = ["Feeling the vibe…", "Reading between the notes…", "Tuning into your emotion…", "Curating your sound…", "Almost there…"];
function LoadingState() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % loadingPhrases.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-8 py-12">
      <SoundWave active />
      <AnimatePresence mode="wait">
        <motion.p key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          style={{ background: "linear-gradient(90deg, #1db954, #7c3aed, #2563eb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'DM Sans', sans-serif", fontSize: "1.2rem", fontWeight: 300, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          {loadingPhrases[idx]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────────
function InsightCard({ icon, label, value, color, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.04, y: -4 }}
      style={{ flex: "1 1 140px", minWidth: "140px", borderRadius: "16px", padding: "20px", position: "relative", overflow: "hidden", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: `0 0 30px ${color}22` }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.05, borderRadius: "16px", background: `radial-gradient(circle at top left, ${color}, transparent)` }} />
      <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "1.05rem", fontWeight: 600, color, fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
    </motion.div>
  );
}

// ─── "Why This Song?" Reason Tags ─────────────────────────────────────────────
function ReasonTags({ reasons }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
      {reasons.map((r, i) => (
        <span key={i} style={{
          fontSize: "0.62rem", padding: "3px 8px", borderRadius: "99px",
          background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)",
          color: "#c4b5fd", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
        }}>
          {r}
        </span>
      ))}
    </div>
  );
}

// ─── Spotify Embed Modal ──────────────────────────────────────────────────────
function SpotifyEmbed({ spotifyId, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{ background: "#121212", borderRadius: "22px", overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.08)", width: "100%", maxWidth: "420px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px" }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Full Track</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.5)", borderRadius: "8px", padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem" }}>
            ✕ Close
          </button>
        </div>
        <iframe
          src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`}
          width="100%" height="352" frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ display: "block" }}
        />
      </motion.div>
    </motion.div>
  );
}

// ─── Song Card ────────────────────────────────────────────────────────────────
function SongCard({ song, index, onEmbed }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -6 }}
      onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
      style={{
        position: "relative", borderRadius: "20px", overflow: "hidden", cursor: "pointer",
        background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: hovered ? "0 0 40px rgba(124,58,237,0.25), 0 20px 40px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.3)",
        transition: "box-shadow 0.3s ease", minWidth: "220px", maxWidth: "260px", flex: "0 0 auto",
      }}>

      {/* Album art */}
      <div style={{ width: "100%", height: "176px", position: "relative", overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
        {song.image_url && (
          <img src={song.image_url} alt={song.song_name}
            style={{ width: "100%", height: "176px", objectFit: "cover", transition: "transform 0.4s ease", transform: hovered ? "scale(1.1)" : "scale(1)" }} />
        )}

        <AnimatePresence>
          {hovered && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>

              {/* ▶ Embed / full play button */}
              <motion.button
                initial={{ scale: 0.7 }} animate={{ scale: 1 }} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.93 }}
                onClick={() => onEmbed(song.spotify_id)}
                title="Play full track"
                style={{ width: "54px", height: "54px", borderRadius: "50%", border: "none", background: "#1db954", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 24px rgba(29,185,84,0.55)", color: "#000", fontSize: "20px", fontWeight: "bold" }}>
                ▶
              </motion.button>

              {/* Spotify icon button */}
              <motion.button
                initial={{ scale: 0.7 }} animate={{ scale: 1 }} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.93 }}
                onClick={() => window.open(song.spotify_url, "_blank")}
                title="Open in Spotify app"
                style={{ width: "42px", height: "42px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1db954">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ position: "absolute", top: "10px", left: "10px", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "600", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}>
          {index + 1}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "3px" }}>{song.song_name}</div>
        <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "2px" }}>{song.artist}</div>
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.28)", fontFamily: "'DM Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "10px" }}>{song.album}</div>

        {/* "Why this song?" reason tags */}
        <ReasonTags reasons={song.reasons} />

        <motion.a href={song.spotify_url} target="_blank" rel="noopener noreferrer"
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", padding: "8px", borderRadius: "10px", fontSize: "0.73rem", fontWeight: 600, color: "#3670ce", background: "rgb(3,0,2)", border: "1px solid rgba(36,27,103,0.65)", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#1db954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Open in Spotify
        </motion.a>
      </div>
    </motion.div>
  );
}

// ─── Share Toast ──────────────────────────────────────────────────────────────
function ShareToast({ visible, onClose }) {
  useEffect(() => {
    if (visible) { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }
  }, [visible, onClose]);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          style={{ position: "fixed", bottom: "32px", left: "50%", transform: "translateX(-50%)", background: "rgba(29,185,84,0.15)", border: "1px solid rgba(29,185,84,0.4)", backdropFilter: "blur(12px)", borderRadius: "12px", padding: "12px 24px", color: "#1db954", fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", fontWeight: 500, zIndex: 999, whiteSpace: "nowrap" }}>
          🔗 Link copied to clipboard!
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [result, setResult]       = useState(null);
  const [focused, setFocused]     = useState(false);
  const [embedId, setEmbedId]     = useState(null);
  const [showToast, setShowToast] = useState(false);
  const inputRef   = useRef(null);
  const resultsRef = useRef(null);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:5000/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    } catch (err) {
      setError(err.message || "Something went wrong. Is your backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!result?.playlist_id) return;
    const url = `${window.location.origin}/playlist/${result.playlist_id}`;
    navigator.clipboard.writeText(url).then(() => setShowToast(true));
  };

  const suggestions = ["euphoric and dancing", "heartbroken at 2am", "study focus deep work", "late night drive, sad but peaceful"];
  const playlist    = result?.playlist || [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,300&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080b14; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <AnimatedBackground />

      {/* Spotify Embed Modal */}
      <AnimatePresence>
        {embedId && <SpotifyEmbed spotifyId={embedId} onClose={() => setEmbedId(null)} />}
      </AnimatePresence>

      {/* Share Toast */}
      <ShareToast visible={showToast} onClose={() => setShowToast(false)} />

      <div style={{ minHeight: "100vh", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>

        {/* Navbar */}
        <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #772480, #7c3aed)", boxShadow: "0 0 20px rgba(194,111,246,0.4)", fontSize: "1.2rem" }}>♪</div>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, fontFamily: "'Syne', sans-serif", background: "linear-gradient(90deg, #fff, rgba(255,255,255,0.7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Moodify</span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {["Discover", "Library"].map(item => (
              <motion.button key={item} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                style={{ padding: "8px 20px", borderRadius: "99px", fontSize: "0.85rem", fontWeight: 500, background: item === "Discover" ? "rgba(124,58,237,0.2)" : "transparent", border: `1px solid ${item === "Discover" ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.12)"}`, color: item === "Discover" ? "#a78bfa" : "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {item}
              </motion.button>
            ))}
          </div>
        </motion.nav>

        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "40px 24px 20px" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px", fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ width: "32px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3))" }} />
            AI · Music · Emotion
            <span style={{ width: "32px", height: "1px", background: "linear-gradient(90deg, rgba(255,255,255,0.3), transparent)" }} />
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ fontSize: "clamp(2.4rem, 6vw, 4.2rem)", fontWeight: 800, lineHeight: 1.05, marginBottom: "20px", maxWidth: "900px", fontFamily: "'Syne', sans-serif" }}>
            <span style={{ color: "#fff" }}>Feel it. </span>
            <span style={{ background: "linear-gradient(135deg, #c4b5fd, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Type it.</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #6533c9, #49257a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Hear it.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: "480px", marginBottom: "32px", fontFamily: "'DM Sans', sans-serif" }}>
            Turn your mood into a perfect playlist — instantly, magically.
          </motion.p>

          {/* Input */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            style={{ width: "100%", maxWidth: "680px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 8px 8px 20px", borderRadius: "20px", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: focused ? "1px solid rgba(124,58,237,0.6)" : "1px solid rgba(255,255,255,0.09)", boxShadow: focused ? "0 0 0 4px rgba(124,58,237,0.1), 0 20px 60px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.3)", transition: "all 0.3s ease" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={focused ? "#a78bfa" : "rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "stroke 0.3s" }}>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                placeholder="late night drive, sad but peaceful…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.9)", fontFamily: "'DM Sans', sans-serif", fontSize: "16px", caretColor: "#a78bfa" }} />
              <motion.button onClick={handleGenerate} disabled={loading || !input.trim()}
                whileHover={!loading && input.trim() ? { scale: 1.04 } : {}} whileTap={!loading && input.trim() ? { scale: 0.97 } : {}}
                style={{ padding: "12px 24px", borderRadius: "14px", fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", background: loading || !input.trim() ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #712baf, #3e2674)", color: loading || !input.trim() ? "rgba(255,255,255,0.3)" : "#fff", boxShadow: !loading && input.trim() ? "0 0 24px rgba(148,71,170,0.4)" : "none", transition: "all 0.3s ease", cursor: loading || !input.trim() ? "not-allowed" : "pointer", border: "none", fontFamily: "'DM Sans', sans-serif" }}>
                {loading ? "Generating…" : "Generate"}
              </motion.button>
            </div>
          </motion.div>

          {/* Suggestion chips */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px" }}>
            {suggestions.map(s => (
              <motion.button key={s} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={() => setInput(s)}
                style={{ fontSize: "0.75rem", padding: "6px 14px", borderRadius: "99px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                "{s}"
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Results */}
        <div ref={resultsRef} style={{ padding: "0 0 96px", width: "100%" }}>
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LoadingState />
              </motion.div>
            )}

            {error && !loading && (
              <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ textAlign: "center", paddingTop: "48px" }}>
                <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "32px", borderRadius: "20px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <span style={{ fontSize: "2rem" }}>⚠️</span>
                  <p style={{ color: "#f87171", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
                </div>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>

                {/* Mood Insights */}
                {(result.mood || result.energy || result.context) && (
                  <div style={{ marginBottom: "40px" }}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", textAlign: "center", marginBottom: "24px", fontFamily: "'DM Sans', sans-serif" }}>
                      Mood Analysis
                    </motion.div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center", padding: "0 24px" }}>
                      {result.mood    && <InsightCard icon="🎭" label="Mood"    value={result.mood}    color="#a78bfa" delay={0.1} />}
                      {result.energy  && <InsightCard icon="⚡" label="Energy"  value={result.energy}  color="#1db954" delay={0.2} />}
                      {result.context && <InsightCard icon="🌙" label="Context" value={result.context} color="#7648ec" delay={0.3} />}
                    </div>
                  </div>
                )}

                {/* Playlist */}
                {playlist.length > 0 && (
                  <div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", padding: "0 40px" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", marginBottom: "4px", fontFamily: "'DM Sans', sans-serif" }}>Your Playlist</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Syne', sans-serif", color: "#fff" }}>{playlist.length} tracks for you</div>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        {result.playlist_id && (
                          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={handleShare}
                            style={{ padding: "10px 18px", borderRadius: "12px", fontSize: "0.83rem", fontWeight: 500, background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.3)", color: "#1db954", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: "6px" }}>
                            🔗 Share
                          </motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={handleGenerate}
                          style={{ padding: "10px 18px", borderRadius: "12px", fontSize: "0.83rem", fontWeight: 500, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          ↻ Regenerate
                        </motion.button>
                      </div>
                    </motion.div>

                    <div className="scroll-hide"
                      style={{ display: "flex", gap: "16px", overflowX: "auto", padding: "20px 40px 24px", cursor: "grab" }}>
                      {playlist.map((song, i) => (
                        <SongCard key={song.spotify_id || i} song={song} index={i} onEmbed={setEmbedId} />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}