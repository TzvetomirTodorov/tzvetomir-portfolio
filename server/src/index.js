// ═══════════════════════════════════════════════════════════════════
//  TZVETOMIR.DEV — Express API Server
//
//  This is the main entry point for the backend API. It sets up:
//    1. Express with JSON parsing and CORS
//    2. General rate limiting on all /api routes
//    3. Individual route handlers (guestbook, newsletter, contact)
//    4. Health check endpoint for Railway monitoring
//    5. Graceful shutdown with Prisma disconnect
//
//  The server trusts proxies (important for Railway/Vercel) so that
//  rate limiting uses the real client IP, not the proxy's IP.
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { generalLimiter } = require("./middleware/rateLimiter");

// ─── Route Imports ──────────────────────────────────────────────
const healthRoutes = require("./routes/health");
const guestbookRoutes = require("./routes/guestbook");
const newsletterRoutes = require("./routes/newsletter");
const contactRoutes = require("./routes/contact");

// ─── Initialize ─────────────────────────────────────────────────
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ─── CORS Configuration ─────────────────────────────────────────
// In production, ALLOWED_ORIGINS should be set to your actual domain:
//   ALLOWED_ORIGINS=https://tzvetomir.dev,https://www.tzvetomir.dev
// In development, defaults to localhost:5173 (Vite's default port).
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin} is not allowed`));
  },
  credentials: true,
}));

// ─── Middleware ──────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));   // Parse JSON, cap body size at 10KB
app.set("trust proxy", 1);                   // Trust first proxy (Railway/Vercel)

// ─── Routes ─────────────────────────────────────────────────────
// Health check is exempt from rate limiting (monitoring tools need it)
app.use("/api/health", healthRoutes);

// All other API routes get the general rate limiter applied first
app.use("/api", generalLimiter);
app.use("/api/guestbook", guestbookRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/contact", contactRoutes);

// ─── Root Route ─────────────────────────────────────────────────
// Simple response for anyone hitting the API root directly
app.get("/", (req, res) => {
  res.json({
    name: "tzvetomir.dev API",
    version: "1.0.0",
    docs: "/api/health",
    message: "Nothing but green lights ahead 🐾",
  });
});

// ─── 404 Handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    hint: "Try /api/health, /api/guestbook, /api/newsletter, or /api/contact",
  });
});

// ─── Error Handler ──────────────────────────────────────────────
// Global error catcher — logs the error and returns a clean response
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
  });
});

// ─── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║                                               ║
  ║   🐾  tzvetomir.dev API                       ║
  ║   ──────────────────────────                   ║
  ║   Port:    ${String(PORT).padEnd(36)}║
  ║   Mode:    ${(process.env.NODE_ENV || "development").padEnd(36)}║
  ║   Health:  http://localhost:${PORT}/api/health    ║
  ║                                               ║
  ║   "Nothing but green lights ahead"             ║
  ║                                               ║
  ╚═══════════════════════════════════════════════╝
  `);
});

// ─── Graceful Shutdown ──────────────────────────────────────────
// When the server receives SIGTERM (Railway sends this on redeploy),
// we cleanly disconnect Prisma's connection pool so no queries
// are left hanging mid-flight.
process.on("SIGTERM", async () => {
  console.log("SIGTERM received — shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received — shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});
