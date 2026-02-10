// ═══════════════════════════════════════════════════════════════════
//  JWT AUTHENTICATION MIDDLEWARE
//
//  Protects admin routes by verifying a Bearer token in the
//  Authorization header. The token is issued at login and signed
//  with JWT_SECRET from the environment.
//
//  Usage in route files:
//    const { requireAdmin } = require("../middleware/auth");
//    router.delete("/entries/:id", requireAdmin, async (req, res) => { ... });
//
//  Token format in request headers:
//    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
// ═══════════════════════════════════════════════════════════════════

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * requireAdmin — Express middleware
 *
 * Extracts the JWT from the Authorization header, verifies it,
 * and attaches the decoded payload to req.admin. If the token is
 * missing, expired, or invalid, the request is rejected with 401.
 */
function requireAdmin(req, res, next) {
  // Guard: JWT_SECRET must be configured in .env
  if (!JWT_SECRET) {
    console.error("[Auth] JWT_SECRET is not set — admin routes are disabled.");
    return res.status(500).json({ error: "Server misconfigured. Admin auth is unavailable." });
  }

  // Extract the token from the "Bearer <token>" header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the token signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach admin info to the request for downstream use
    req.admin = decoded;
    next();
  } catch (err) {
    // Token is expired, malformed, or has an invalid signature
    const message = err.name === "TokenExpiredError"
      ? "Session expired. Please log in again."
      : "Invalid token. Please log in again.";

    return res.status(401).json({ error: message });
  }
}

module.exports = { requireAdmin };
