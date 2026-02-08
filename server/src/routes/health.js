// ═══════════════════════════════════════════════════════════════════
//  HEALTH CHECK ROUTE — GET /api/health
//  Used by Railway, monitoring tools, and uptime checks.
//  Returns server status and basic diagnostics.
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");   // AUDIT FIX: shared instance

// GET /api/health
router.get("/", async (req, res) => {
  let dbStatus = "unknown";

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "disconnected";
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: dbStatus,
    version: "1.0.0",
    message: "Nothing but green lights ahead 🐾",
  });
});

module.exports = router;
