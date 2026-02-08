// ═══════════════════════════════════════════════════════════════════
//  GUESTBOOK ROUTES — /api/guestbook
//  
//  GET  /api/guestbook  → List all visible entries (newest first)
//  POST /api/guestbook  → Add a new entry (rate-limited)
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const prisma = require("../utils/prisma");   // AUDIT FIX: shared instance
const { guestbookSchema, validate } = require("../utils/validation");
const { guestbookWriteLimiter } = require("../middleware/rateLimiter");

// GET /api/guestbook
router.get("/", async (req, res) => {
  try {
    const entries = await prisma.guestbookEntry.findMany({
      where: { visible: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        message: true,
        createdAt: true,
      },
    });

    res.json({ entries });
  } catch (err) {
    console.error("[Guestbook GET] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch guestbook entries." });
  }
});

// POST /api/guestbook
router.post("/", guestbookWriteLimiter, async (req, res) => {
  const { data, error } = validate(guestbookSchema, req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

    const entry = await prisma.guestbookEntry.create({
      data: {
        name: data.name,
        message: data.message,
        ipHash,
        visible: true,
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
