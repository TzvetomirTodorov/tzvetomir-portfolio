// ═══════════════════════════════════════════════════════════════════
//  HEALTH CHECK ROUTE — GET /api/health
//  Used by Railway, monitoring tools, and uptime checks.
//  Returns server status and basic diagnostics.
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// GET /api/health
// Returns: { status, timestamp, uptime, database }
router.get("/", async (req, res) => {
  let dbStatus = "unknown";

  try {
    // Quick query to verify database connectivity
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
