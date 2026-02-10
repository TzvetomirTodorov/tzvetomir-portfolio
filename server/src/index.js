// ═══════════════════════════════════════════════════════════════════
//  TZVETOMIR.DEV — Express API Server
//
//  Main entry point for the backend API. Sets up:
//    1. Express with JSON parsing and CORS
//    2. General rate limiting on all /api routes
//    3. Individual route handlers (guestbook, newsletter, contact)
//    4. Admin panel routes (JWT-protected management endpoints)
//    5. Health check endpoint for Railway monitoring
//    6. Graceful shutdown with Prisma disconnect
//
//  The server trusts proxies (important for Railway/Vercel) so that
//  rate limiting uses the real client IP, not the proxy's IP.
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const cors = require("cors");
const prisma = require("./utils/prisma");                  // AUDIT FIX: shared instance
const { generalLimiter } = require("./middleware/rateLimiter");

// ─── Route Imports ──────────────────────────────────────────────
const healthRoutes = require("./routes/health");
const guestbookRoutes = require("./routes/guestbook");
const newsletterRoutes = require("./routes/newsletter");
const contactRoutes = require("./routes/contact");
const adminRoutes = require("./routes/admin");

// ─── Initialize ─────────────────────────────────────────────────
const app = express();
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

// Admin routes are mounted BEFORE the general limiter.
// They use their own login rate limiter and JWT auth, so they
// don't need the general 100-req/15min limit that would interfere
// with rapid admin operations (bulk deletes, refreshes, etc.)
app.use("/api/admin", adminRoutes);

// All other API routes get the general rate limiter applied first
app.use("/api", generalLimiter);
app.use("/api/guestbook", guestbookRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/contact", contactRoutes);

// ─── Root Route ─────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "tzvetomir.dev API",
    version: "1.1.0",
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
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   🐾  tzvetomir.dev API                           ║
  ║   ──────────────────────────                      ║
  ║   Port:    ${String(PORT).padEnd(39)}║
  ║   Mode:    ${(process.env.NODE_ENV || "development").padEnd(39)}║
  ║   Health:  http://localhost:${PORT}/api/health       ║
  ║   Admin:   http://localhost:${PORT}/api/admin         ║
  ║                                                   ║
  ║   "Nothing but green lights ahead"                ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

// ─── Graceful Shutdown ──────────────────────────────────────────
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
