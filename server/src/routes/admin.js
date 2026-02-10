// ═══════════════════════════════════════════════════════════════════
//  ADMIN ROUTES — /api/admin
//
//  Authentication & management endpoints for the site admin (you).
//  All routes except POST /login require a valid JWT token.
//
//  POST /api/admin/login              → Authenticate, receive JWT
//  GET  /api/admin/guestbook          → List ALL entries (incl. hidden)
//  DELETE /api/admin/guestbook/:id    → Delete a guestbook entry
//  PATCH  /api/admin/guestbook/:id    → Toggle visibility
//  GET  /api/admin/newsletter         → List all subscribers
//  DELETE /api/admin/newsletter/:id   → Remove a subscriber
//  GET  /api/admin/contacts           → List all contact messages
//  PATCH  /api/admin/contacts/:id     → Mark as read/unread
//  DELETE /api/admin/contacts/:id     → Delete a contact message
//  GET  /api/admin/stats              → Dashboard overview stats
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const prisma = require("../utils/prisma");
const { requireAdmin } = require("../middleware/auth");

// ─── Environment Variables ──────────────────────────────────────
// ADMIN_USERNAME and ADMIN_PASSWORD_HASH are set in .env
// Generate the hash with: node server/src/utils/hashPassword.js
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

// ─── Login Rate Limiter ─────────────────────────────────────────
// 5 login attempts per 15 minutes per IP — prevents brute force.
// This is deliberately strict because there's only one admin user.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 5,                       // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
});


// ═══════════════════════════════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════

// POST /api/admin/login
// Validates username + password against env vars, returns a JWT.
router.post("/login", loginLimiter, async (req, res) => {
  // Guard: Admin credentials must be configured
  if (!ADMIN_PASSWORD_HASH || !JWT_SECRET) {
    console.error("[Admin] ADMIN_PASSWORD_HASH or JWT_SECRET not configured.");
    return res.status(500).json({
      error: "Admin login is not configured on this server.",
    });
  }

  const { username, password } = req.body;

  // Validate input exists
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  // Check username (case-insensitive)
  if (username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
    // Intentionally vague error to prevent username enumeration
    return res.status(401).json({ error: "Invalid credentials." });
  }

  try {
    // Compare the plaintext password against the bcrypt hash from .env
    const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Issue a JWT with the admin username in the payload
    const token = jwt.sign(
      { username: ADMIN_USERNAME, role: "admin" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      expiresIn: JWT_EXPIRES_IN,
      message: "Welcome back, admin. 🐾",
    });
  } catch (err) {
    console.error("[Admin Login] Error:", err.message);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// GET /api/admin/verify
// Quick token validation check — used by the frontend to verify
// that a stored token is still valid without making a full request.
router.get("/verify", requireAdmin, (req, res) => {
  res.json({ valid: true, username: req.admin.username });
});


// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════

// GET /api/admin/stats
// Returns aggregate counts for the admin dashboard overview.
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const [guestbookTotal, guestbookVisible, newsletterTotal, newsletterConfirmed, contactsTotal, contactsUnread] =
      await Promise.all([
        prisma.guestbookEntry.count(),
        prisma.guestbookEntry.count({ where: { visible: true } }),
        prisma.newsletterSub.count(),
        prisma.newsletterSub.count({ where: { confirmed: true } }),
        prisma.contactMessage.count(),
        prisma.contactMessage.count({ where: { read: false } }),
      ]);

    res.json({
      guestbook: { total: guestbookTotal, visible: guestbookVisible },
      newsletter: { total: newsletterTotal, confirmed: newsletterConfirmed },
      contacts: { total: contactsTotal, unread: contactsUnread },
    });
  } catch (err) {
    console.error("[Admin Stats] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});


// ═══════════════════════════════════════════════════════════════════
//  GUESTBOOK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

// GET /api/admin/guestbook
// Returns ALL guestbook entries (including hidden ones), newest first.
router.get("/guestbook", requireAdmin, async (req, res) => {
  try {
    const entries = await prisma.guestbookEntry.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        message: true,
        visible: true,
        ipHash: true,
        createdAt: true,
      },
    });
    res.json({ entries });
  } catch (err) {
    console.error("[Admin Guestbook GET] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch guestbook entries." });
  }
});

// PATCH /api/admin/guestbook/:id
// Toggle visibility (soft-hide instead of delete). This keeps the
// data for audit purposes but removes it from the public view.
router.patch("/guestbook/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid entry ID." });

  try {
    // Fetch current visibility state, then flip it
    const entry = await prisma.guestbookEntry.findUnique({ where: { id } });
    if (!entry) return res.status(404).json({ error: "Entry not found." });

    const updated = await prisma.guestbookEntry.update({
      where: { id },
      data: { visible: !entry.visible },
      select: { id: true, name: true, visible: true },
    });

    res.json({
      entry: updated,
      message: updated.visible ? "Entry is now visible." : "Entry is now hidden.",
    });
  } catch (err) {
    console.error("[Admin Guestbook PATCH] Error:", err.message);
    res.status(500).json({ error: "Failed to update entry." });
  }
});

// DELETE /api/admin/guestbook/:id
// Permanent deletion — use PATCH to toggle visibility for soft-hide.
router.delete("/guestbook/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid entry ID." });

  try {
    await prisma.guestbookEntry.delete({ where: { id } });
    res.json({ message: "Entry permanently deleted.", id });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Entry not found." });
    }
    console.error("[Admin Guestbook DELETE] Error:", err.message);
    res.status(500).json({ error: "Failed to delete entry." });
  }
});


// ═══════════════════════════════════════════════════════════════════
//  NEWSLETTER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

// GET /api/admin/newsletter
// Returns all newsletter subscribers with their status.
router.get("/newsletter", requireAdmin, async (req, res) => {
  try {
    const subscribers = await prisma.newsletterSub.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        confirmed: true,
        createdAt: true,
        confirmedAt: true,
        unsubAt: true,
      },
    });
    res.json({ subscribers });
  } catch (err) {
    console.error("[Admin Newsletter GET] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch subscribers." });
  }
});

// DELETE /api/admin/newsletter/:id
// Remove a subscriber permanently.
router.delete("/newsletter/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid subscriber ID." });

  try {
    await prisma.newsletterSub.delete({ where: { id } });
    res.json({ message: "Subscriber removed.", id });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Subscriber not found." });
    }
    console.error("[Admin Newsletter DELETE] Error:", err.message);
    res.status(500).json({ error: "Failed to remove subscriber." });
  }
});


// ═══════════════════════════════════════════════════════════════════
//  CONTACT MESSAGE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

// GET /api/admin/contacts
// Returns all contact form submissions, newest first.
router.get("/contacts", requireAdmin, async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ messages });
  } catch (err) {
    console.error("[Admin Contacts GET] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch contact messages." });
  }
});

// PATCH /api/admin/contacts/:id
// Toggle read/unread status.
router.patch("/contacts/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid message ID." });

  try {
    const msg = await prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) return res.status(404).json({ error: "Message not found." });

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { read: !msg.read },
      select: { id: true, read: true },
    });

    res.json({
      message: updated.read ? "Marked as read." : "Marked as unread.",
      contact: updated,
    });
  } catch (err) {
    console.error("[Admin Contacts PATCH] Error:", err.message);
    res.status(500).json({ error: "Failed to update message." });
  }
});

// DELETE /api/admin/contacts/:id
// Permanent deletion of a contact message.
router.delete("/contacts/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid message ID." });

  try {
    await prisma.contactMessage.delete({ where: { id } });
    res.json({ message: "Contact message deleted.", id });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Message not found." });
    }
    console.error("[Admin Contacts DELETE] Error:", err.message);
    res.status(500).json({ error: "Failed to delete message." });
  }
});


module.exports = router;
