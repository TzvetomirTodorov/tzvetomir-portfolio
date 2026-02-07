// ═══════════════════════════════════════════════════════════════════
//  GUESTBOOK ROUTES — /api/guestbook
//  
//  GET  /api/guestbook       → List all visible entries (newest first)
//  POST /api/guestbook       → Add a new entry (rate-limited)
//
//  The guestbook is one of the portfolio's signature features.
//  It's seeded with entries from Adina, Galya, and Keegan, and
//  visitors can add their own messages (up to 200 characters).
//
//  Anti-spam strategy:
//    1. Rate limiting (3 per hour per IP via middleware)
//    2. Input validation via Zod (length, character restrictions)
//    3. IP hashing (SHA-256) for accountability without storing raw IPs
//    4. Admin visibility toggle (hide offensive entries without deletion)
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { guestbookSchema, validate } = require("../utils/validation");
const { guestbookWriteLimiter } = require("../middleware/rateLimiter");

const prisma = new PrismaClient();

// ─── GET /api/guestbook ─────────────────────────────────────────
// Returns all visible guestbook entries, newest first.
// No authentication required — this is public-facing.
// Response shape: { entries: [{ id, name, message, createdAt }] }
router.get("/", async (req, res) => {
  try {
    const entries = await prisma.guestbookEntry.findMany({
      where: { visible: true },            // Only show approved entries
      orderBy: { createdAt: "desc" },       // Newest first
      select: {
        id: true,
        name: true,
        message: true,
        createdAt: true,
        // Note: ipHash is deliberately excluded from the response
        // — it's internal data used only for rate limiting
      },
    });

    res.json({ entries });
  } catch (err) {
    console.error("[Guestbook GET] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch guestbook entries." });
  }
});

// ─── POST /api/guestbook ────────────────────────────────────────
// Adds a new guestbook entry.
// Rate limited to 3 per hour per IP (applied in middleware).
// Request body: { name: string, message: string }
// Response: { entry: { id, name, message, createdAt } }
router.post("/", guestbookWriteLimiter, async (req, res) => {
  // Step 1: Validate input with Zod
  const { data, error } = validate(guestbookSchema, req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    // Step 2: Hash the visitor's IP for accountability
    // We store a SHA-256 hash, never the raw IP address.
    // This lets us identify repeat submissions without being creepy.
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

    // Step 3: Create the entry in PostgreSQL
    const entry = await prisma.guestbookEntry.create({
      data: {
        name: data.name,
        message: data.message,
        ipHash,
        visible: true,   // Visible by default; admin can hide if needed
      },
      select: {
        id: true,
        name: true,
        message: true,
        createdAt: true,
      },
    });

    res.status(201).json({ entry });
  } catch (err) {
    console.error("[Guestbook POST] Error:", err.message);
    res.status(500).json({ error: "Failed to save guestbook entry." });
  }
});

module.exports = router;
