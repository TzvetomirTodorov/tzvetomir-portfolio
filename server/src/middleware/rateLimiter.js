// ═══════════════════════════════════════════════════════════════════
//  RATE LIMITER — Express Middleware
//  Protects public endpoints from spam and abuse.
//  Uses express-rate-limit with different tiers for different routes.
// ═══════════════════════════════════════════════════════════════════

const rateLimit = require("express-rate-limit");

// ─── General API Limiter ────────────────────────────────────────
// Applied to all /api routes as a baseline protection.
// 100 requests per 15 minutes per IP — generous for normal browsing.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 100,                     // 100 requests per window
  standardHeaders: true,        // Return rate limit info in headers (RateLimit-*)
  legacyHeaders: false,         // Disable X-RateLimit-* headers
  message: {
    error: "Too many requests. Please try again in a few minutes.",
  },
});

// ─── Guestbook Write Limiter ────────────────────────────────────
// Stricter limit for POST /api/guestbook — prevents spam entries.
// 3 entries per hour per IP. That's plenty for a legitimate visitor,
// but stops bots from flooding the guestbook.
const guestbookWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 3,                       // 3 entries per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You've signed the guestbook recently. Come back in a bit!",
  },
});

// ─── Newsletter Subscribe Limiter ───────────────────────────────
// 5 subscribe attempts per hour per IP. Handles typos gracefully
// while preventing mass signup abuse.
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 5,                       // 5 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many subscribe attempts. Please try again later.",
  },
});

// ─── Contact Form Limiter ───────────────────────────────────────
// 3 contact submissions per hour per IP. Prevents inbox flooding.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 3,                       // 3 submissions per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You've sent a few messages already. I'll get back to you soon!",
  },
});

module.exports = {
  generalLimiter,
  guestbookWriteLimiter,
  newsletterLimiter,
  contactLimiter,
};
