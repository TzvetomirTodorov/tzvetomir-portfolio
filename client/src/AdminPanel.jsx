import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
//  ADMIN PANEL — tzvetomir.dev Site Management
//
//  A terminal-themed admin dashboard for managing:
//    • Guestbook entries (view, hide/show, delete)
//    • Newsletter subscribers (view, remove)
//    • Contact messages (view, mark read, delete)
//
//  Access: Navigate to /admin or add ?admin to the URL.
//  Auth:   Single admin user, JWT-based sessions.
//
//  This component is fully self-contained — it handles its own
//  auth state, API calls, and rendering. Import it into App.jsx
//  and conditionally render it based on the URL.
// ═══════════════════════════════════════════════════════════════════

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Color Palette (matches App.jsx) ────────────────────────────
const ACCENT = "#00ff9f";
const BG_DEEP = "#0a0e17";
const BG_CARD = "#0d1220";
const BG_TERMINAL = "#080c14";
const TEXT_PRIMARY = "#c9d6e3";
const TEXT_MUTED = "#5a6b7f";
const AMBER = "#ffb000";
const CYAN = "#02d7f2";
const MAGENTA = "#ff2d6b";
const RED = "#ff4444";

// ─── Shared Styles ──────────────────────────────────────────────
const FONT = "'Fira Code', 'JetBrains Mono', 'Courier New', monospace";

const btnBase = {
  border: "none",
  borderRadius: 4,
  padding: "6px 14px",
  fontFamily: FONT,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const inputStyle = {
  background: BG_TERMINAL,
  border: `1px solid ${ACCENT}33`,
  borderRadius: 6,
  padding: "12px 16px",
  color: TEXT_PRIMARY,
  fontFamily: FONT,
  fontSize: 14,
  outline: "none",
  width: "100%",
};

// Helper to format ISO dates into readable strings
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}


// ═══════════════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok && data.token) {
        onLogin(data.token);
      } else {
        setError(data.error || "Login failed.");
      }
    } catch {
      setError("Network error — is the API running?");
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: BG_DEEP,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
    }}>
      <div style={{
        background: BG_CARD,
        border: `1px solid ${ACCENT}33`,
        borderRadius: 8,
        padding: 40,
        width: 380,
        boxShadow: `0 0 40px ${ACCENT}08`,
      }}>
        {/* Terminal-style header */}
        <div style={{
          color: ACCENT,
          fontSize: 13,
          marginBottom: 8,
          opacity: 0.7,
        }}>
          {">"} sudo authenticate
        </div>
        <h1 style={{
          color: "#fff",
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 24,
        }}>
          Admin Panel
        </h1>

        {error && (
          <div style={{
            background: `${RED}15`,
            border: `1px solid ${RED}33`,
            borderRadius: 6,
            padding: "10px 14px",
            color: RED,
            fontSize: 12,
            marginBottom: 16,
          }}>
            ✗ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ color: TEXT_MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              placeholder="admin"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div>
            <label style={{ color: TEXT_MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••••••"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...btnBase,
              background: loading ? TEXT_MUTED : ACCENT,
              color: BG_DEEP,
              padding: "12px",
              fontSize: 13,
              fontWeight: 700,
              marginTop: 8,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Authenticating..." : "Login →"}
          </button>
        </form>

        <div style={{
          color: TEXT_MUTED,
          fontSize: 10,
          textAlign: "center",
          marginTop: 20,
          opacity: 0.5,
        }}>
          tzvetomir.dev — admin panel v1.0
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
//  STAT CARD — Dashboard overview widget
// ═══════════════════════════════════════════════════════════════════
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${color}33`,
      borderRadius: 8,
      padding: "20px 24px",
      flex: 1,
      minWidth: 160,
    }}>
      <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 28, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
//  CONFIRM DIALOG — prevents accidental deletes
// ═══════════════════════════════════════════════════════════════════
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: BG_CARD,
        border: `1px solid ${RED}44`,
        borderRadius: 8,
        padding: 32,
        maxWidth: 400,
        width: "90%",
        boxShadow: `0 8px 40px rgba(0,0,0,0.5)`,
      }}>
        <div style={{ color: RED, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
          ⚠ Confirm Action
        </div>
        <p style={{ color: TEXT_PRIMARY, fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ ...btnBase, background: `${TEXT_MUTED}33`, color: TEXT_PRIMARY }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ ...btnBase, background: RED, color: "#fff" }}
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
//  MAIN ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function Dashboard({ token, onLogout }) {
  const [tab, setTab] = useState("guestbook");
  const [stats, setStats] = useState(null);
  const [guestbook, setGuestbook] = useState([]);
  const [newsletter, setNewsletter] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);  // Track which item is being actioned
  const [confirmDelete, setConfirmDelete] = useState(null);   // { type, id, name }
  const [toast, setToast] = useState(null);

  // Auth headers for all admin API calls
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Show a temporary toast notification
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Fetch all data on mount ───────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, gbRes, nlRes, ctRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers }),
        fetch(`${API_URL}/api/admin/guestbook`, { headers }),
        fetch(`${API_URL}/api/admin/newsletter`, { headers }),
        fetch(`${API_URL}/api/admin/contacts`, { headers }),
      ]);

      // If any request returns 401, the token is expired
      if (statsRes.status === 401 || gbRes.status === 401) {
        onLogout();
        return;
      }

      const [statsData, gbData, nlData, ctData] = await Promise.all([
        statsRes.json(), gbRes.json(), nlRes.json(), ctRes.json(),
      ]);

      setStats(statsData);
      setGuestbook(gbData.entries || []);
      setNewsletter(nlData.subscribers || []);
      setContacts(ctData.messages || []);
    } catch (err) {
      showToast("Failed to fetch data: " + err.message, "error");
    }
    setLoading(false);
  }, [token, onLogout, showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Action handlers ───────────────────────────────────────────

  // Toggle guestbook entry visibility
  const toggleGuestbookVisibility = async (id) => {
    setActionLoading(`gb-vis-${id}`);
    try {
      const res = await fetch(`${API_URL}/api/admin/guestbook/${id}`, {
        method: "PATCH", headers,
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      if (res.ok) {
        setGuestbook(prev => prev.map(e =>
          e.id === id ? { ...e, visible: data.entry.visible } : e
        ));
        showToast(data.message);
      }
    } catch { showToast("Action failed.", "error"); }
    setActionLoading(null);
  };

  // Delete guestbook entry (after confirmation)
  const deleteGuestbookEntry = async (id) => {
    setActionLoading(`gb-del-${id}`);
    try {
      const res = await fetch(`${API_URL}/api/admin/guestbook/${id}`, {
        method: "DELETE", headers,
      });
      if (res.status === 401) { onLogout(); return; }
      if (res.ok) {
        setGuestbook(prev => prev.filter(e => e.id !== id));
        showToast("Entry deleted.");
      }
    } catch { showToast("Delete failed.", "error"); }
    setActionLoading(null);
    setConfirmDelete(null);
  };

  // Delete newsletter subscriber
  const deleteSubscriber = async (id) => {
    setActionLoading(`nl-del-${id}`);
    try {
      const res = await fetch(`${API_URL}/api/admin/newsletter/${id}`, {
        method: "DELETE", headers,
      });
      if (res.status === 401) { onLogout(); return; }
      if (res.ok) {
        setNewsletter(prev => prev.filter(s => s.id !== id));
        showToast("Subscriber removed.");
      }
    } catch { showToast("Delete failed.", "error"); }
    setActionLoading(null);
    setConfirmDelete(null);
  };

  // Toggle contact message read status
  const toggleContactRead = async (id) => {
    setActionLoading(`ct-read-${id}`);
    try {
      const res = await fetch(`${API_URL}/api/admin/contacts/${id}`, {
        method: "PATCH", headers,
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      if (res.ok) {
        setContacts(prev => prev.map(m =>
          m.id === id ? { ...m, read: data.contact.read } : m
        ));
      }
    } catch { showToast("Action failed.", "error"); }
    setActionLoading(null);
  };

  // Delete contact message
  const deleteContact = async (id) => {
    setActionLoading(`ct-del-${id}`);
    try {
      const res = await fetch(`${API_URL}/api/admin/contacts/${id}`, {
        method: "DELETE", headers,
      });
      if (res.status === 401) { onLogout(); return; }
      if (res.ok) {
        setContacts(prev => prev.filter(m => m.id !== id));
        showToast("Message deleted.");
      }
    } catch { showToast("Delete failed.", "error"); }
    setActionLoading(null);
    setConfirmDelete(null);
  };


  // ── Tab definitions ───────────────────────────────────────────
  const tabs = [
    { key: "guestbook", label: "Guestbook", icon: "📝", count: guestbook.length },
    { key: "newsletter", label: "Newsletter", icon: "📬", count: newsletter.length },
    { key: "contacts", label: "Messages", icon: "💬", count: contacts.filter(c => !c.read).length },
  ];


  // ═════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: "100vh",
      background: BG_DEEP,
      fontFamily: FONT,
      color: TEXT_PRIMARY,
    }}>
      {/* ── Toast notification ─────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 1001,
          background: toast.type === "error" ? `${RED}dd` : `${ACCENT}dd`,
          color: toast.type === "error" ? "#fff" : BG_DEEP,
          padding: "10px 20px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          animation: "tooltipFade 0.2s ease-out",
        }}>
          {toast.type === "error" ? "✗" : "✓"} {toast.message}
        </div>
      )}

      {/* ── Confirm delete dialog ──────────────────────────────── */}
      {confirmDelete && (
        <ConfirmDialog
          message={confirmDelete.message}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete.type === "guestbook") deleteGuestbookEntry(confirmDelete.id);
            else if (confirmDelete.type === "newsletter") deleteSubscriber(confirmDelete.id);
            else if (confirmDelete.type === "contact") deleteContact(confirmDelete.id);
          }}
        />
      )}

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div style={{
        background: `${BG_CARD}ee`,
        borderBottom: `1px solid ${ACCENT}22`,
        padding: "0 32px",
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          height: 56,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: ACCENT, fontSize: 16, fontWeight: 700 }}>{"<TT />"}</span>
            <span style={{ color: TEXT_MUTED, fontSize: 12 }}>admin panel</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={fetchAll} style={{ ...btnBase, background: `${CYAN}22`, color: CYAN, fontSize: 10 }}>
              ↻ Refresh
            </button>
            <a href="/" style={{ ...btnBase, background: `${ACCENT}15`, color: ACCENT, textDecoration: "none", fontSize: 10 }}>
              ← Back to Site
            </a>
            <button onClick={onLogout} style={{ ...btnBase, background: `${RED}22`, color: RED, fontSize: 10 }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 80px" }}>

        {/* ── Stats cards ──────────────────────────────────────── */}
        {stats && (
          <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
            <StatCard
              label="Guestbook Entries"
              value={stats.guestbook.total}
              sub={`${stats.guestbook.visible} visible`}
              color={MAGENTA}
            />
            <StatCard
              label="Newsletter Subs"
              value={stats.newsletter.total}
              sub={`${stats.newsletter.confirmed} confirmed`}
              color={CYAN}
            />
            <StatCard
              label="Contact Messages"
              value={stats.contacts.total}
              sub={`${stats.contacts.unread} unread`}
              color={AMBER}
            />
          </div>
        )}

        {/* ── Tab navigation ───────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 20,
          borderBottom: `1px solid ${ACCENT}15`,
          paddingBottom: 0,
        }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...btnBase,
                background: tab === t.key ? `${ACCENT}15` : "transparent",
                color: tab === t.key ? ACCENT : TEXT_MUTED,
                borderBottom: tab === t.key ? `2px solid ${ACCENT}` : "2px solid transparent",
                borderRadius: "4px 4px 0 0",
                padding: "10px 20px",
                fontSize: 12,
              }}
            >
              {t.icon} {t.label}
              {t.count > 0 && (
                <span style={{
                  marginLeft: 6,
                  background: tab === t.key ? ACCENT : TEXT_MUTED,
                  color: BG_DEEP,
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontSize: 10,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Loading state ────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: TEXT_MUTED, fontSize: 13 }}>
            Loading data...
          </div>
        ) : (
          <>
            {/* ═══ GUESTBOOK TAB ═══ */}
            {tab === "guestbook" && (
              <div>
                <div style={{ color: ACCENT, fontSize: 12, marginBottom: 16, opacity: 0.6 }}>
                  {">"} Showing all {guestbook.length} entries (including hidden)
                </div>
                {guestbook.length === 0 ? (
                  <div style={{ color: TEXT_MUTED, textAlign: "center", padding: 40 }}>
                    No guestbook entries yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {guestbook.map(entry => (
                      <div key={entry.id} style={{
                        background: BG_CARD,
                        border: `1px solid ${entry.visible ? `${MAGENTA}22` : `${RED}22`}`,
                        borderRadius: 6,
                        padding: "14px 18px",
                        opacity: entry.visible ? 1 : 0.6,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ color: MAGENTA, fontWeight: 600, fontSize: 13 }}>{entry.name}</span>
                            <span style={{ color: TEXT_MUTED, fontSize: 10 }}>#{entry.id}</span>
                            {!entry.visible && (
                              <span style={{
                                background: `${RED}22`, color: RED,
                                fontSize: 9, padding: "1px 6px", borderRadius: 3,
                              }}>
                                HIDDEN
                              </span>
                            )}
                          </div>
                          <div style={{ color: TEXT_PRIMARY, fontSize: 12, lineHeight: 1.5, marginBottom: 4, opacity: 0.85 }}>
                            {entry.message}
                          </div>
                          <div style={{ color: TEXT_MUTED, fontSize: 10 }}>
                            {formatDate(entry.createdAt)}
                            {entry.ipHash && <span style={{ marginLeft: 8 }}>IP: {entry.ipHash.slice(0, 8)}...</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => toggleGuestbookVisibility(entry.id)}
                            disabled={actionLoading === `gb-vis-${entry.id}`}
                            style={{
                              ...btnBase,
                              background: entry.visible ? `${AMBER}22` : `${ACCENT}22`,
                              color: entry.visible ? AMBER : ACCENT,
                            }}
                          >
                            {entry.visible ? "Hide" : "Show"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete({
                              type: "guestbook", id: entry.id,
                              message: `Permanently delete "${entry.name}"'s guestbook entry? This cannot be undone.`,
                            })}
                            style={{ ...btnBase, background: `${RED}22`, color: RED }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ NEWSLETTER TAB ═══ */}
            {tab === "newsletter" && (
              <div>
                <div style={{ color: CYAN, fontSize: 12, marginBottom: 16, opacity: 0.6 }}>
                  {">"} {newsletter.length} total subscribers
                </div>
                {newsletter.length === 0 ? (
                  <div style={{ color: TEXT_MUTED, textAlign: "center", padding: 40 }}>
                    No newsletter subscribers yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {newsletter.map(sub => (
                      <div key={sub.id} style={{
                        background: BG_CARD,
                        border: `1px solid ${CYAN}22`,
                        borderRadius: 6,
                        padding: "12px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <div>
                          <div style={{ color: CYAN, fontSize: 13, fontWeight: 500 }}>{sub.email}</div>
                          <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 2 }}>
                            Signed up: {formatDate(sub.createdAt)}
                            {sub.confirmed && <span style={{ color: ACCENT, marginLeft: 8 }}>✓ Confirmed</span>}
                            {sub.unsubAt && <span style={{ color: RED, marginLeft: 8 }}>Unsubscribed</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => setConfirmDelete({
                            type: "newsletter", id: sub.id,
                            message: `Remove ${sub.email} from the newsletter? This cannot be undone.`,
                          })}
                          style={{ ...btnBase, background: `${RED}22`, color: RED }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ CONTACTS TAB ═══ */}
            {tab === "contacts" && (
              <div>
                <div style={{ color: AMBER, fontSize: 12, marginBottom: 16, opacity: 0.6 }}>
                  {">"} {contacts.length} messages ({contacts.filter(c => !c.read).length} unread)
                </div>
                {contacts.length === 0 ? (
                  <div style={{ color: TEXT_MUTED, textAlign: "center", padding: 40 }}>
                    No contact messages yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {contacts.map(msg => (
                      <div key={msg.id} style={{
                        background: BG_CARD,
                        border: `1px solid ${msg.read ? `${AMBER}15` : `${AMBER}44`}`,
                        borderLeft: msg.read ? `3px solid ${AMBER}22` : `3px solid ${AMBER}`,
                        borderRadius: 6,
                        padding: "14px 18px",
                      }}>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 8,
                        }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: AMBER, fontWeight: 600, fontSize: 13 }}>{msg.name}</span>
                              {!msg.read && (
                                <span style={{
                                  background: AMBER, color: BG_DEEP,
                                  fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 700,
                                }}>
                                  NEW
                                </span>
                              )}
                            </div>
                            <div style={{ color: CYAN, fontSize: 11, marginTop: 2 }}>{msg.email}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => toggleContactRead(msg.id)}
                              disabled={actionLoading === `ct-read-${msg.id}`}
                              style={{
                                ...btnBase,
                                background: msg.read ? `${AMBER}22` : `${ACCENT}22`,
                                color: msg.read ? AMBER : ACCENT,
                              }}
                            >
                              {msg.read ? "Unread" : "Read"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete({
                                type: "contact", id: msg.id,
                                message: `Delete the message from ${msg.name} (${msg.email})? This cannot be undone.`,
                              })}
                              style={{ ...btnBase, background: `${RED}22`, color: RED }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div style={{
                          color: TEXT_MUTED, fontSize: 11, fontWeight: 600,
                          marginBottom: 6,
                        }}>
                          Subject: {msg.subject}
                        </div>
                        <div style={{
                          color: TEXT_PRIMARY, fontSize: 12, lineHeight: 1.6,
                          opacity: 0.85,
                          background: `${BG_TERMINAL}88`,
                          padding: "10px 14px",
                          borderRadius: 4,
                          whiteSpace: "pre-wrap",
                        }}>
                          {msg.message}
                        </div>
                        <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 8 }}>
                          {formatDate(msg.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
//  ADMIN PANEL — Main Export
//
//  Manages auth state with sessionStorage persistence.
//  sessionStorage is used (not localStorage) so the token
//  is automatically cleared when the browser tab closes —
//  an extra security layer for admin sessions.
// ═══════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [token, setToken] = useState(() => {
    // Restore token from sessionStorage on initial load
    try { return sessionStorage.getItem("admin_token") || null; }
    catch { return null; }
  });

  // Verify that a stored token is still valid on mount
  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/api/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) {
          // Token is expired or invalid — clear it
          setToken(null);
          try { sessionStorage.removeItem("admin_token"); } catch {}
        }
      })
      .catch(() => {
        // Network error — keep the token and let the dashboard
        // handle the error on its own API calls
      });
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
    try { sessionStorage.setItem("admin_token", newToken); } catch {}
  };

  const handleLogout = () => {
    setToken(null);
    try { sessionStorage.removeItem("admin_token"); } catch {}
  };

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}
