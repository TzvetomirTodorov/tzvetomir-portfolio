import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════
//  TZVETOMIR TODOROV — SENIOR FULL STACK DEVELOPER
//  Terminal-themed portfolio landing page
//
//  AUDIT FIXES APPLIED:
//    - Guestbook now fetches from & posts to the live API
//    - Newsletter now posts to the live API
//    - GitHub URL corrected to /TzvetomirTodorov
//    - LinkedIn URL corrected to full profile path
//    - Project cards now have clickable links
//    - Social links fixed (no more # placeholders)
//    - Terminal commands object memoized (no re-creation per render)
//    - useCallback dependency array fixed
//    - API_URL sourced from VITE_API_URL env variable
//    - Loading/error states added for API calls
//    - Mobile nav hamburger menu added
//
//  v2 FIXES (Aleadis feedback, Feb 2026):
//    - Terminal height: 360px fixed → minHeight 360 / maxHeight 55vh (responsive)
//    - Section reveal animation: 0.8s cubic-bezier → 0.45s ease-out (snappier)
//    - SkillOrb: Added hover tooltips with experience blurbs for each skill
//    - Terminal text: Disabled Fira Code ligatures (liga/calt off) to fix box chars
//    - About/skills/neofetch commands: Simplified box-drawing for consistent rendering
//    - Bottom link buttons: Inherit snappier section timing
//
//  v3 FIXES (Aleadis feedback round 2, Feb 2026):
//    - Terminal scroll containment: overscrollBehavior "contain" prevents
//      terminal scrolling from pushing the whole page down
//    - SkillOrb hover latency: Separated entrance animation (delayed
//      cubic-bezier on opacity/transform) from hover responsiveness
//      — hover reactions are now instant instead of waiting 0.6s+delay
// ═══════════════════════════════════════════════════════════════════

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const ACCENT = "#00ff9f";
const ACCENT_DIM = "#00cc7f";
const BG_DEEP = "#0a0e17";
const BG_CARD = "#0d1220";
const BG_TERMINAL = "#080c14";
const TEXT_PRIMARY = "#c9d6e3";
const TEXT_MUTED = "#5a6b7f";
const AMBER = "#ffb000";
const CYAN = "#02d7f2";
const MAGENTA = "#ff2d6b";

// ─── Project URLs ───────────────────────────────────────────────
// AUDIT FIX: Centralized project links — update these when live URLs exist
const PROJECT_LINKS = {
  pawstrack: "https://github.com/TzvetomirTodorov/PawsTrack",
  constellationworks: "https://github.com/TzvetomirTodorov/ConstellationWorks",
  holdyourown: "https://github.com/TzvetomirTodorov/HoldYourOwnBrand",
  memoir: "https://github.com/TzvetomirTodorov/FromAshesToPaws",
  wtf: null,          // Cybersecurity ops — no public repo
  gamified: null,     // Educational platforms — no public repo
};

// ─── Matrix Rain Background ─────────────────────────────────────
function MatrixRain() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    let w, h, cols, drops;
    const chars = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЪЬЮЯ01アイウエオカキクケコ";
    const fontSize = 14;

    function resize() {
      w = c.width = window.innerWidth;
      h = c.height = window.innerHeight;
      cols = Math.floor(w / fontSize);
      drops = Array(cols).fill(1).map(() => Math.random() * -100);
    }
    resize();
    window.addEventListener("resize", resize);

    const interval = setInterval(() => {
      ctx.fillStyle = "rgba(10, 14, 23, 0.06)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = ACCENT + "18";
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < cols; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5;
      }
    }, 60);
    return () => { clearInterval(interval); window.removeEventListener("resize", resize); };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
    />
  );
}

// ─── Typing Effect Hook ─────────────────────────────────────────
function useTypingEffect(texts, speed = 60, pause = 2000) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    if (!deleting && charIdx < current.length) {
      const t = setTimeout(() => { setDisplay(current.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, speed);
      return () => clearTimeout(t);
    } else if (!deleting && charIdx === current.length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    } else if (deleting && charIdx > 0) {
      const t = setTimeout(() => { setDisplay(current.slice(0, charIdx - 1)); setCharIdx(c => c - 1); }, speed / 2);
      return () => clearTimeout(t);
    } else if (deleting && charIdx === 0) {
      setDeleting(false);
      setIdx(i => (i + 1) % texts.length);
    }
  }, [charIdx, deleting, idx, texts, speed, pause]);

  return display;
}

// ─── Glow Text Component ────────────────────────────────────────
function GlowText({ children, color = ACCENT, size = "1rem", weight = "bold", style = {} }) {
  return (
    <span style={{
      color, fontSize: size, fontWeight: weight,
      textShadow: `0 0 6px ${color}44, 0 0 20px ${color}22`,
      ...style,
    }}>
      {children}
    </span>
  );
}

// ─── Section Wrapper ────────────────────────────────────────────
function Section({ id, children, style = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      id={id} ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.45s ease-out, transform 0.45s ease-out",
        padding: "80px 0",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

// ─── Interactive Terminal ────────────────────────────────────────
// AUDIT FIX: Commands defined as a stable reference via useMemo,
// runCommand's useCallback now has correct dependency array.
function Terminal() {
  const [history, setHistory] = useState([
    { type: "system", text: "Welcome to tzvetomir.dev — Type 'help' to see available commands" },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  const commands = useMemo(() => ({
    help: () => `Available commands:
  about      — Who is Tzvetomir?
  skills     — Technical stack
  projects   — Featured projects
  memoir     — About "From Ashes To Paws"
  bg         — Bulgarian roots
  contact    — Get in touch
  whoami     — Current visitor info
  clear      — Clear terminal
  neofetch   — System info`,
    about: () => `  TZVETOMIR TODOROV
  ──────────────────────────────────
  Senior Full Stack Developer
  15+ years of experience

  🏥 IT Consultant & SysAdmin
  📍 Troy, Michigan
  🇧🇬 Bulgarian-American
  ✍️  Author & Wildlife Rescuer
  🔒 Cybersecurity Investigator`,
    skills: () => `  TECHNICAL ARSENAL
  ──────────────────────────────────
  Frontend:  React, Vue.js, Angular, HTML
  Backend:   Node.js, Express, Django,
             ASP.NET, Python, Java
  Database:  PostgreSQL, MongoDB, SQL
  Languages: JavaScript, TypeScript,
             Python, C++, C, Java
  DevOps:    Railway, Vercel, Netlify
  Security:  HIPAA, Incident Response,
             Digital Forensics, OSINT
  Stack:     PERN (PostgreSQL, Express,
             React, Node.js)`,
    projects: () => `[1] PawsTrack ─── Volunteer & Animal Tracking
    PERN stack shelter management system
    
[2] ConstellationWorks ─── Nonprofit Platform
    Housing & ecological restoration (PERN)

[3] HoldYourOwnBrand ─── Streetwear E-commerce
    Full-stack with Stripe payments
    
[4] From Ashes To Paws ─── Trilingual Memoir
    Interactive digital experience

[5] WTF Response Team ─── Cybersecurity Ops
    Digital forensics & threat attribution

[6] Learning Platforms ─── Gamified Education
    Custom sites for friends & mentees`,
    memoir: () => `📖 "FROM ASHES TO PAWS"
━━━━━━━━━━━━━━━━━━━━━━━━━━
A memoir chronicling the journey through
divorce, depression ("The Void"), and
healing through wildlife rescue work.

Available in three editions:
  🇺🇸 English  |  🇧🇬 Bulgarian  |  🌐 Bilingual

Characters: Oso 🐕, Bear 🐕, Adina 💜
Location: Marley's Castle Wildlife Rescue`,
    bg: () => `🇧🇬  BULGARIAN ROOTS
━━━━━━━━━━━━━━━━━━━━━━━━━━
Здравейте! (Zdraveyte — Hello!)

Born in Bulgaria, raised between worlds.
Mother: Galya Todorova — forever inspiring.
Language: Bulgarian, English, learning German.

"Rabota" (Работа) means "Work" in Bulgarian
— and work is what we do. 💪

Cyrillic runs through the code:
  const име = "Цветомир";  // name
  const град = "Трой, Мичиган"; // city`,
    contact: () => `📬  GET IN TOUCH
━━━━━━━━━━━━━━━━━━━━━━━━━━
  GitHub:    github.com/TzvetomirTodorov
  LinkedIn:  linkedin.com/in/tzvetomir-todorov-2a68a96a
  Email:     hello@tzvetomir.dev`,
    whoami: () => `visitor@tzvetomir.dev — Guest Session
  Timestamp: ${new Date().toISOString()}
  Status: Welcome! Explore freely.`,
    neofetch: () => `
  ████████╗██╗   ██╗
  ╚══██╔══╝╚██╗ ██╔╝
     ██║    ╚████╔╝ 
     ██║     ╚██╔╝  
     ██║      ██║   
     ╚═╝      ╚═╝   
  ─────────────────────
  OS:      Developer Linux 15.0+
  Host:    tzvetomir.dev
  Shell:   paws-sh 2.0
  Stack:   PERN (PostgreSQL/Express/React/Node)
  Uptime:  15+ years
  Memory:  Full of code & stories
  Theme:   Terminal Dark [Matrix]`,
  }), []);

  const runCommand = useCallback((cmd) => {
    const trimmed = cmd.trim().toLowerCase();
    if (trimmed === "clear") {
      setHistory([{ type: "system", text: "Terminal cleared. Type 'help' for commands." }]);
      return;
    }
    const output = commands[trimmed]
      ? commands[trimmed]()
      : `Command not found: ${cmd}. Type 'help' for available commands.`;
    setHistory(h => [...h, { type: "input", text: `visitor@tzvetomir.dev:~$ ${cmd}` }, { type: "output", text: output }]);
  }, [commands]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  return (
    <div style={{
      background: BG_TERMINAL,
      border: `1px solid ${ACCENT}33`,
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: `0 0 30px ${ACCENT}11, inset 0 0 60px ${BG_DEEP}`,
      maxWidth: 720,
      margin: "0 auto",
    }}>
      {/* Title bar */}
      <div style={{
        background: "#111827",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderBottom: `1px solid ${ACCENT}22`,
      }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: MAGENTA }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: AMBER }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: ACCENT }} />
        <span style={{ color: TEXT_MUTED, fontSize: 12, marginLeft: 12, fontFamily: "monospace" }}>
          paws-sh — tzvetomir.dev
        </span>
      </div>
      {/* Terminal body */}
      <div style={{
        padding: 20, minHeight: 360, maxHeight: "55vh", overflowY: "auto", overscrollBehavior: "contain",
        fontFamily: "'Fira Code', 'JetBrains Mono', 'Courier New', monospace",
        fontSize: 13, lineHeight: 1.6,
      }}>
        {history.map((line, i) => (
          <div key={i} style={{
            color: line.type === "input" ? ACCENT : line.type === "system" ? AMBER : TEXT_PRIMARY,
            whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 4,
            fontFeatureSettings: "'liga' 0, 'calt' 0",
          }}>
            {line.text}
          </div>
        ))}
        <div ref={endRef} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{ color: ACCENT, whiteSpace: "nowrap" }}>visitor@tzvetomir.dev:~$</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && input.trim()) {
                runCommand(input);
                setInput("");
              }
            }}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: TEXT_PRIMARY, fontFamily: "inherit", fontSize: "inherit", caretColor: ACCENT,
            }}
            placeholder="type a command..."
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

// ─── Project Card ───────────────────────────────────────────────
function ProjectCard({ title, subtitle, description, tech, accent, icon, link }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `${BG_CARD}ee` : BG_CARD,
        border: `1px solid ${hovered ? accent : accent + "33"}`,
        borderRadius: 8, padding: 28,
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 40px ${accent}15` : "none",
        cursor: link ? "pointer" : "default",
        position: "relative", overflow: "hidden",
      }}
      onClick={() => link && window.open(link, "_blank", "noopener,noreferrer")}
    >
      {/* Corner glow */}
      <div style={{
        position: "absolute", top: -40, right: -40, width: 100, height: 100,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${accent}11 0%, transparent 70%)`,
        transition: "opacity 0.3s", opacity: hovered ? 1 : 0,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: accent, fontWeight: 700, fontSize: 16, fontFamily: "'Fira Code', monospace" }}>
              {title}
            </span>
            {/* AUDIT FIX: Show external link indicator for clickable cards */}
            {link && (
              <span style={{ color: `${accent}88`, fontSize: 11 }}>↗</span>
            )}
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: "'Fira Code', monospace" }}>
            {subtitle}
          </div>
        </div>
      </div>
      <p style={{ color: TEXT_PRIMARY, fontSize: 14, lineHeight: 1.7, marginBottom: 16, opacity: 0.85 }}>
        {description}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tech.map((t, i) => (
          <span key={i} style={{
            background: `${accent}15`, color: accent,
            padding: "3px 10px", borderRadius: 4, fontSize: 11,
            fontFamily: "'Fira Code', monospace", border: `1px solid ${accent}22`,
          }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Newsletter Signup ──────────────────────────────────────────
// AUDIT FIX: Now actually POSTs to the API instead of just toggling local state
function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSubscribe = async () => {
    if (!email.includes("@")) return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/api/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Welcome aboard!");
      } else {
        setStatus("error");
        setMessage(data.error?.email || data.error || "Something went wrong. Try again.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error — the API might be waking up. Try again in a moment.");
    }
  };

  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${CYAN}33`, borderRadius: 8,
      padding: 32, maxWidth: 520, margin: "0 auto", textAlign: "center",
    }}>
      {status === "idle" || status === "loading" || status === "error" ? (
        <>
          <div style={{ fontSize: 20, color: CYAN, fontWeight: 700, marginBottom: 8, fontFamily: "'Fira Code', monospace" }}>
            ./subscribe --newsletter
          </div>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            Deep-dives on full-stack engineering, healthcare IT, cybersecurity, and the occasional literary tangent. One email per week.
          </p>
          {status === "error" && (
            <div style={{ color: MAGENTA, fontSize: 12, marginBottom: 12, fontFamily: "'Fira Code', monospace" }}>
              ⚠ {message}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.dev"
              onKeyDown={e => e.key === "Enter" && handleSubscribe()}
              style={{
                flex: 1, background: BG_TERMINAL, border: `1px solid ${CYAN}33`,
                borderRadius: 6, padding: "12px 16px", color: TEXT_PRIMARY,
                fontFamily: "'Fira Code', monospace", fontSize: 14, outline: "none",
              }}
            />
            <button
              onClick={handleSubscribe}
              disabled={status === "loading"}
              style={{
                background: status === "loading" ? TEXT_MUTED : `linear-gradient(135deg, ${CYAN}, ${ACCENT})`,
                border: "none", borderRadius: 6, padding: "12px 24px",
                color: BG_DEEP, fontWeight: 700, fontFamily: "'Fira Code', monospace",
                fontSize: 14, cursor: status === "loading" ? "wait" : "pointer", whiteSpace: "nowrap",
                opacity: status === "loading" ? 0.6 : 1,
              }}
            >
              {status === "loading" ? "..." : "Subscribe"}
            </button>
          </div>
        </>
      ) : (
        <div>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✨</div>
          <div style={{ color: ACCENT, fontWeight: 700, fontSize: 18, fontFamily: "'Fira Code', monospace" }}>
            Welcome aboard!
          </div>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 8 }}>
            {message || "You'll hear from me soon. До скоро! (See you soon!)"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Guestbook ──────────────────────────────────────────────────
// AUDIT FIX: Now fetches entries from the live API on mount,
// and POSTs new entries to the API instead of just updating local state.
function Guestbook() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch guestbook entries from the API on mount
  useEffect(() => {
    fetch(`${API_URL}/api/guestbook`)
      .then(r => r.json())
      .then(data => {
        if (data.entries) {
          setEntries(data.entries);
        }
      })
      .catch(() => {
        // Fallback to seeded entries if API is unreachable
        setEntries([
          { name: "Adina", message: "So proud of how far you've come. 💜", createdAt: "2026-01-15T00:00:00Z" },
          { name: "Galya", message: "Браво, сине мой! (Bravo, my son!)", createdAt: "2026-01-10T00:00:00Z" },
          { name: "Keegan", message: "The cybersecurity site is SO COOL!", createdAt: "2025-12-20T00:00:00Z" },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!name || !msg) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/guestbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message: msg }),
      });
      const data = await res.json();
      if (res.ok && data.entry) {
        setEntries(prev => [data.entry, ...prev]);
        setName("");
        setMsg("");
        setShowForm(false);
      } else {
        const errMsg = data.error;
        setError(typeof errMsg === "object" ? Object.values(errMsg).join(", ") : errMsg || "Failed to submit.");
      }
    } catch {
      setError("Network error — try again in a moment.");
    }
    setSubmitting(false);
  };

  // Format date for display
  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toISOString().split("T")[0];
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${MAGENTA}33`, borderRadius: 8,
      padding: 32, maxWidth: 520, margin: "0 auto",
    }}>
      <div style={{
        fontSize: 20, color: MAGENTA, fontWeight: 700, marginBottom: 16,
        fontFamily: "'Fira Code', monospace", textAlign: "center",
      }}>
        cat guestbook.log
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: TEXT_MUTED, padding: 20, fontFamily: "'Fira Code', monospace", fontSize: 13 }}>
          Loading entries...
        </div>
      ) : (
        <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
          {entries.length === 0 ? (
            <div style={{ color: TEXT_MUTED, textAlign: "center", fontSize: 13, padding: 16 }}>
              No entries yet. Be the first to sign!
            </div>
          ) : (
            entries.map((e, i) => (
              <div key={e.id || i} style={{
                padding: "10px 14px", marginBottom: 8,
                background: `${MAGENTA}08`,
                borderLeft: `3px solid ${MAGENTA}44`,
                borderRadius: "0 6px 6px 0",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: MAGENTA, fontWeight: 600, fontSize: 13, fontFamily: "'Fira Code', monospace" }}>
                    {e.name}
                  </span>
                  <span style={{ color: TEXT_MUTED, fontSize: 11 }}>{formatDate(e.createdAt)}</span>
                </div>
                <div style={{ color: TEXT_PRIMARY, fontSize: 13, opacity: 0.85 }}>{e.message}</div>
              </div>
            ))
          )}
        </div>
      )}

      {error && (
        <div style={{ color: MAGENTA, fontSize: 12, marginBottom: 8, fontFamily: "'Fira Code', monospace", textAlign: "center" }}>
          ⚠ {error}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: "100%", background: "transparent",
            border: `1px dashed ${MAGENTA}55`, borderRadius: 6,
            padding: "12px", color: MAGENTA,
            fontFamily: "'Fira Code', monospace", fontSize: 13, cursor: "pointer",
          }}
        >
          + Sign the guestbook
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            style={{
              background: BG_TERMINAL, border: `1px solid ${MAGENTA}33`,
              borderRadius: 6, padding: "10px 14px", color: TEXT_PRIMARY,
              fontFamily: "'Fira Code', monospace", fontSize: 13, outline: "none",
            }}
          />
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="Leave a message... (200 chars max)"
            maxLength={200}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{
              background: BG_TERMINAL, border: `1px solid ${MAGENTA}33`,
              borderRadius: 6, padding: "10px 14px", color: TEXT_PRIMARY,
              fontFamily: "'Fira Code', monospace", fontSize: 13, outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              background: submitting ? TEXT_MUTED : MAGENTA, border: "none", borderRadius: 6,
              padding: "10px", color: "#fff", fontWeight: 700,
              fontFamily: "'Fira Code', monospace", fontSize: 13,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Sending..." : 'echo "message" >> guestbook.log'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Skill Bar (animated + hover tooltip) ───────────────────────
// FIX: Added descriptive tooltips so visitors understand what the
// bar levels actually represent — years, context, and project usage.
function SkillOrb({ label, level, color, delay = 0, blurb = "" }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
        opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-20px)",
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        position: "relative", cursor: blurb ? "help" : "default",
      }}
    >
      <span style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: "'Fira Code', monospace", width: 110, textAlign: "right" }}>
        {label}
      </span>
      <div style={{ flex: 1, position: "relative" }}>
        {/* The bar track + fill */}
        <div style={{ height: 6, background: `${color}15`, borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            width: visible ? `${level}%` : "0%", height: "100%",
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: 3,
            transition: `width 1.2s cubic-bezier(0.16,1,0.3,1) ${delay + 300}ms`,
            boxShadow: `0 0 8px ${color}44`,
          }} />
        </div>
        {/* Tooltip popup on hover */}
        {blurb && hovered && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 10px)", left: "50%",
            transform: "translateX(-50%)", whiteSpace: "normal",
            background: "#151b2e", border: `1px solid ${color}44`,
            borderRadius: 6, padding: "10px 14px", width: 260,
            boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 12px ${color}11`,
            zIndex: 50, pointerEvents: "none",
            animation: "tooltipFade 0.15s ease-out",
          }}>
            <div style={{ color, fontSize: 11, fontWeight: 700, fontFamily: "'Fira Code', monospace", marginBottom: 4 }}>
              {label} — {level}%
            </div>
            <div style={{ color: TEXT_PRIMARY, fontSize: 11, lineHeight: 1.5, opacity: 0.85 }}>
              {blurb}
            </div>
            {/* Tooltip arrow */}
            <div style={{
              position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)",
              width: 10, height: 10, background: "#151b2e",
              borderRight: `1px solid ${color}44`, borderBottom: `1px solid ${color}44`,
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────
// AUDIT FIX: Added mobile hamburger menu
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  const links = ["about", "projects", "terminal", "connect"];
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? `${BG_DEEP}ee` : "transparent",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: scrolled ? `1px solid ${ACCENT}15` : "none",
      transition: "all 0.3s ease",
      padding: "0 32px",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto", display: "flex",
        justifyContent: "space-between", alignItems: "center", height: 60,
      }}>
        <a href="#hero" style={{ textDecoration: "none" }}>
          <span style={{ color: ACCENT, fontWeight: 800, fontSize: 18, fontFamily: "'Fira Code', monospace", letterSpacing: -0.5 }}>
            {"<TT />"}
          </span>
        </a>

        {/* Desktop nav links */}
        <div style={{ display: "flex", gap: 28 }} className="nav-desktop">
          {links.map(l => (
            <a
              key={l}
              href={`#${l}`}
              style={{
                color: TEXT_MUTED, textDecoration: "none",
                fontFamily: "'Fira Code', monospace", fontSize: 13,
                transition: "color 0.2s", letterSpacing: 0.5,
              }}
              onMouseEnter={e => e.target.style.color = ACCENT}
              onMouseLeave={e => e.target.style.color = TEXT_MUTED}
            >
              .{l}()
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-mobile-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: "none", background: "transparent", border: "none",
            color: ACCENT, fontSize: 22, cursor: "pointer", padding: 4,
          }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="nav-mobile-menu" style={{
          display: "none", flexDirection: "column", gap: 0,
          background: `${BG_DEEP}f5`, borderTop: `1px solid ${ACCENT}22`,
          padding: "8px 0",
        }}>
          {links.map(l => (
            <a
              key={l}
              href={`#${l}`}
              onClick={() => setMobileOpen(false)}
              style={{
                color: TEXT_MUTED, textDecoration: "none",
                fontFamily: "'Fira Code', monospace", fontSize: 14,
                padding: "12px 32px", display: "block",
              }}
            >
              .{l}()
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const typedRole = useTypingEffect([
    "Senior Full Stack Developer",
    "Healthcare IT Architect",
    "Cybersecurity Investigator",
    "PERN Stack Engineer",
    "Author & Storyteller",
    "Българин в Америка",
  ], 55, 2200);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 200); }, []);

  const container = { maxWidth: 1100, margin: "0 auto", padding: "0 24px" };

  return (
    <div style={{
      minHeight: "100vh", background: BG_DEEP, color: TEXT_PRIMARY,
      fontFamily: "'Fira Code', 'JetBrains Mono', 'Courier New', monospace",
      overflow: "hidden", position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { background: ${BG_DEEP}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${BG_DEEP}; }
        ::-webkit-scrollbar-thumb { background: ${ACCENT}44; border-radius: 3px; }
        ::selection { background: ${ACCENT}33; color: ${ACCENT}; }
        input::placeholder { color: ${TEXT_MUTED}; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes tooltipFade {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        /* AUDIT FIX: Mobile responsive nav */
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: block !important; }
          .nav-mobile-menu { display: flex !important; }
        }
      `}</style>

      <MatrixRain />
      <Nav />

      {/* CRT Scanline overlay */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none", zIndex: 99,
        background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 3px)",
      }} />

      {/* ═══ HERO ═══ */}
      <div id="hero" style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          ...container, textAlign: "center",
          opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(30px)",
          transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <pre style={{
            color: ACCENT, fontSize: "clamp(6px, 1.1vw, 11px)", lineHeight: 1.2,
            textShadow: `0 0 10px ${ACCENT}44, 0 0 30px ${ACCENT}18`,
            marginBottom: 32, display: "inline-block", textAlign: "left",
          }}>{`
 ████████╗███████╗██╗   ██╗███████╗████████╗ ██████╗ ███╗   ███╗██╗██████╗ 
 ╚══██╔══╝╚══███╔╝██║   ██║██╔════╝╚══██╔══╝██╔═══██╗████╗ ████║██║██╔══██╗
    ██║     ███╔╝ ██║   ██║█████╗     ██║   ██║   ██║██╔████╔██║██║██████╔╝
    ██║    ███╔╝  ╚██╗ ██╔╝██╔══╝     ██║   ██║   ██║██║╚██╔╝██║██║██╔══██╗
    ██║   ███████╗ ╚████╔╝ ███████╗   ██║   ╚██████╔╝██║ ╚═╝ ██║██║██║  ██║
    ╚═╝   ╚══════╝  ╚═══╝  ╚══════╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═╝`}</pre>

          <div style={{ marginBottom: 16 }}>
            <span style={{ color: TEXT_MUTED, fontSize: 14 }}>{">"} </span>
            <span style={{ color: ACCENT, fontSize: "clamp(16px, 2.5vw, 22px)" }}>{typedRole}</span>
            <span style={{ color: ACCENT, animation: "pulse 1s infinite" }}>▊</span>
          </div>

          <p style={{
            color: TEXT_MUTED, fontSize: 15, maxWidth: 600,
            margin: "0 auto 36px", lineHeight: 1.8,
          }}>
            15+ years building full-stack systems. From PERN-powered platforms to cybersecurity operations.
            Bulgarian roots, American drive, and a memoir in three languages.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#projects" style={{
              background: `linear-gradient(135deg, ${ACCENT}, ${CYAN})`,
              color: BG_DEEP, padding: "12px 28px", borderRadius: 6,
              textDecoration: "none", fontWeight: 700, fontSize: 14,
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: `0 4px 20px ${ACCENT}33`,
            }}>
              View Projects →
            </a>
            <a href="#terminal" style={{
              background: "transparent", border: `1px solid ${ACCENT}55`,
              color: ACCENT, padding: "12px 28px", borderRadius: 6,
              textDecoration: "none", fontWeight: 600, fontSize: 14,
              transition: "all 0.2s",
            }}>
              Open Terminal ⌨
            </a>
          </div>

          <div style={{
            marginTop: 60, animation: "float 2.5s ease-in-out infinite",
            color: TEXT_MUTED, fontSize: 12,
          }}>
            ↓ scroll to explore ↓
          </div>
        </div>
      </div>

      {/* ═══ ABOUT ═══ */}
      <Section id="about">
        <div style={container}>
          <GlowText size="12px" color={ACCENT} style={{ letterSpacing: 3, display: "block", marginBottom: 12 }}>
            // ABOUT
          </GlowText>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", color: "#fff", fontWeight: 700, marginBottom: 32 }}>
            Здравейте, I'm <GlowText color={ACCENT}>Tzvetomir</GlowText>
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            <div style={{ background: BG_CARD, border: `1px solid ${ACCENT}22`, borderRadius: 8, padding: 28 }}>
              <div style={{ color: AMBER, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                {">"} cat about.txt
              </div>
              <p style={{ color: TEXT_PRIMARY, fontSize: 14, lineHeight: 1.9, opacity: 0.85 }}>
                A Bulgarian-American developer with over fifteen years of experience spanning front-end frameworks, 
                back-end architectures, and everything in between. Currently serving as IT Consultant & Technical 
                System Administrator at a plastic surgery clinic in Troy, Michigan — where I manage healthcare IT 
                security, HIPAA compliance, and clinical management systems.
              </p>
              <p style={{ color: TEXT_PRIMARY, fontSize: 14, lineHeight: 1.9, opacity: 0.85, marginTop: 12 }}>
                Beyond the code, I'm the author of <span style={{ color: AMBER }}>"From Ashes To Paws"</span> — a 
                trilingual memoir about finding purpose through wildlife rescue. I volunteer at Marley's Castle 
                Wildlife Rescue, study German in my spare time, and believe the best debugging tool is a walk with my dogs.
              </p>
            </div>

            <div style={{ background: BG_CARD, border: `1px solid ${CYAN}22`, borderRadius: 8, padding: 28 }}>
              <div style={{ color: CYAN, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                {">"} cat skills.log
              </div>
              <SkillOrb label="React/Vue" level={95} color={CYAN} delay={0}
                blurb="Primary frontend framework for 8+ years. Built PawsTrack, ConstellationWorks, HoldYourOwn, and this portfolio. Vue on select projects." />
              <SkillOrb label="Node/Express" level={93} color={ACCENT} delay={80}
                blurb="Backend workhorse across every PERN project. REST APIs, middleware chains, auth flows, and real-time features." />
              <SkillOrb label="PostgreSQL" level={90} color={AMBER} delay={160}
                blurb="Go-to relational DB. Schema design, Prisma ORM, complex queries, migrations, and production tuning across all PERN apps." />
              <SkillOrb label="Python" level={88} color={MAGENTA} delay={240}
                blurb="OSINT automation, digital forensics tooling, scripting, data processing. Used heavily in the WTF Response Team investigation." />
              <SkillOrb label="C++/C" level={82} color={CYAN} delay={320}
                blurb="Systems-level work and university foundation. Lower-level performance-critical projects and embedded concepts." />
              <SkillOrb label="TypeScript" level={90} color={ACCENT} delay={400}
                blurb="Strict typing on all new projects. Full-stack TS with React + Express for type safety across the wire." />
              <SkillOrb label="DevOps" level={85} color={AMBER} delay={480}
                blurb="Railway, Vercel, Netlify deployments. CI/CD pipelines, DNS management, SSL, environment configs, and container basics." />
              <SkillOrb label="Security" level={87} color={MAGENTA} delay={560}
                blurb="OSINT, digital forensics, incident response. Led multi-victim cybercrime investigation with FBI IC3 reporting." />
              <SkillOrb label="ASP.NET" level={80} color={CYAN} delay={640}
                blurb="Enterprise C# development. MVC patterns, Entity Framework, and legacy system maintenance in professional settings." />
              <SkillOrb label="HIPAA/IT" level={88} color={ACCENT} delay={720}
                blurb="Healthcare IT admin at Platinum Surgery Center. M365 tenant recovery, EHR platform evaluation, compliance auditing." />
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ PROJECTS ═══ */}
      <Section id="projects">
        <div style={container}>
          <GlowText size="12px" color={ACCENT} style={{ letterSpacing: 3, display: "block", marginBottom: 12 }}>
            // PROJECTS
          </GlowText>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", color: "#fff", fontWeight: 700, marginBottom: 12 }}>
            ls ~/projects<GlowText color={ACCENT}>/*</GlowText>
          </h2>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 36, lineHeight: 1.7 }}>
            Full-stack systems, nonprofit platforms, cybersecurity ops, and a streetwear brand.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {/* AUDIT FIX: All project cards now have link props pointing to GitHub repos */}
            <ProjectCard
              icon="🐾"
              title="PawsTrack"
              subtitle="Volunteer & Animal Tracking"
              description="A comprehensive shelter management system coordinating volunteers, animals, clinics, and shifts. Features role-based access, real-time status tracking, and medical note management."
              tech={["PostgreSQL", "Express", "React", "Node.js", "Prisma"]}
              accent={ACCENT}
              link={PROJECT_LINKS.pawstrack}
            />
            <ProjectCard
              icon="🌍"
              title="ConstellationWorks"
              subtitle="Nonprofit Platform"
              description="Full-stack web platform for a nonprofit focused on dignified housing solutions and ecological land restoration. Features donations, applications, blog, and user dashboards."
              tech={["PERN Stack", "Railway", "Namecheap", "Auth"]}
              accent={CYAN}
              link={PROJECT_LINKS.constellationworks}
            />
            <ProjectCard
              icon="👕"
              title="HoldYourOwnBrand"
              subtitle="Streetwear E-commerce"
              description="Dark & gold aesthetic streetwear brand with full e-commerce capabilities including Stripe payment integration, product catalog, size guides, and lookbook features."
              tech={["React", "Node.js", "Stripe", "Vercel"]}
              accent={AMBER}
              link={PROJECT_LINKS.holdyourown}
            />
            <ProjectCard
              icon="📖"
              title="From Ashes To Paws"
              subtitle="Trilingual Digital Memoir"
              description="Interactive and formal web experiences for a memoir about healing through wildlife rescue. Available in English, Bulgarian, and bilingual editions with immersive storytelling."
              tech={["HTML/CSS/JS", "Netlify", "Cyrillic", "i18n"]}
              accent={MAGENTA}
              link={PROJECT_LINKS.memoir}
            />
            <ProjectCard
              icon="🔒"
              title="WTF Response Team"
              subtitle="Cybersecurity Operations"
              description="Led digital forensics investigations for a multi-victim cybercrime case. Built comprehensive evidence packages, OSINT attribution across 89+ platforms, and FBI IC3 reporting workflows."
              tech={["OSINT", "Digital Forensics", "Python", "IC3"]}
              accent="#ff6b35"
              link={PROJECT_LINKS.wtf}
            />
            <ProjectCard
              icon="🎮"
              title="Gamified Learning"
              subtitle="Educational Platforms"
              description="Custom-built interactive learning websites with gamified progress tracking, achievement systems, and personalized themes — from Fast & Furious cybersecurity to D&D-style web dev quests."
              tech={["HTML/CSS/JS", "Netlify", "localStorage", "Gamification"]}
              accent="#a855f7"
              link={PROJECT_LINKS.gamified}
            />
          </div>
        </div>
      </Section>

      {/* ═══ TERMINAL ═══ */}
      <Section id="terminal">
        <div style={container}>
          <GlowText size="12px" color={ACCENT} style={{ letterSpacing: 3, display: "block", marginBottom: 12 }}>
            // INTERACTIVE TERMINAL
          </GlowText>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", color: "#fff", fontWeight: 700, marginBottom: 12 }}>
            ssh visitor@<GlowText color={ACCENT}>tzvetomir.dev</GlowText>
          </h2>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 36, lineHeight: 1.7 }}>
            Explore my portfolio the hacker way. Type <span style={{ color: ACCENT }}>help</span> to see all commands.
          </p>
          <Terminal />
        </div>
      </Section>

      {/* ═══ CONNECT ═══ */}
      <Section id="connect">
        <div style={container}>
          <GlowText size="12px" color={ACCENT} style={{ letterSpacing: 3, display: "block", marginBottom: 12 }}>
            // CONNECT
          </GlowText>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", color: "#fff", fontWeight: 700, marginBottom: 36 }}>
            Let's <GlowText color={ACCENT}>build</GlowText> something
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 48 }}>
            <Newsletter />
            <Guestbook />
          </div>

          {/* AUDIT FIX: Corrected GitHub and LinkedIn URLs, replaced placeholder # links */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "GitHub", icon: "⚡", href: "https://github.com/TzvetomirTodorov", color: ACCENT },
              { label: "LinkedIn", icon: "💼", href: "https://www.linkedin.com/in/tzvetomir-todorov-2a68a96a/", color: CYAN },
              { label: "PawsTrack", icon: "🐾", href: PROJECT_LINKS.pawstrack, color: AMBER },
              { label: "Memoir", icon: "📖", href: PROJECT_LINKS.memoir, color: MAGENTA },
            ].filter(s => s.href).map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" style={{
                display: "flex", alignItems: "center", gap: 8,
                background: BG_CARD, border: `1px solid ${s.color}33`,
                borderRadius: 8, padding: "12px 24px",
                textDecoration: "none", color: s.color,
                fontFamily: "'Fira Code', monospace", fontSize: 13,
                fontWeight: 600, transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.boxShadow = `0 4px 20px ${s.color}22`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = s.color + "33"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <span>{s.icon}</span> {s.label}
              </a>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        textAlign: "center", padding: "40px 24px",
        borderTop: `1px solid ${ACCENT}11`, position: "relative", zIndex: 1,
      }}>
        <div style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: "'Fira Code', monospace", lineHeight: 1.8 }}>
          <span style={{ color: ACCENT }}>const</span> builtWith ={" "}
          <span style={{ color: AMBER }}>{"{"}</span>{" "}
          love, React, Bulgarian coffee, and two dogs{" "}
          <span style={{ color: AMBER }}>{"}"}</span>;
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 8 }}>
          © {new Date().getFullYear()} Tzvetomir Todorov — Цветомир Тодоров
        </div>
        <div style={{ color: `${TEXT_MUTED}66`, fontSize: 10, marginTop: 4 }}>
          "Nothing but green lights ahead" 🐾
        </div>
      </footer>
    </div>
  );
}
