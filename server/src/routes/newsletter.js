// ═══════════════════════════════════════════════════════════════════
//  NEWSLETTER ROUTES — /api/newsletter
//
//  POST   /api/newsletter              → Subscribe (creates pending sub)
//  GET    /api/newsletter/confirm/:token → Confirm subscription (double opt-in)
//  DELETE /api/newsletter/:token       → Unsubscribe via token
//
//  This implements a proper double opt-in flow:
//    1. Visitor submits email → stored as unconfirmed + tokens generated
//    2. Confirmation email sent with unique link (you'll wire this up
//       to Resend/Buttondown/your provider of choice)
//    3. Visitor clicks link → confirmedAt is set, they're officially in
//    4. Every email includes an unsubscribe link with their unique token
//
//  Why double opt-in?
//    - GDPR/CAN-SPAM compliance
//    - Prevents abuse (someone subscribing others without consent)
//    - Better deliverability (email providers trust confirmed lists)
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { newsletterSchema, validate } = require("../utils/validation");
const { newsletterLimiter } = require("../middleware/rateLimiter");

const prisma = new PrismaClient();

// ─── Helper: Generate a cryptographically secure token ──────────
function generateToken() {
  return crypto.randomBytes(32).toString("hex"); // 64-char hex string
}

// ─── POST /api/newsletter ───────────────────────────────────────
// Subscribes a new email address. If the email already exists and
// is confirmed, we let them know. If it exists but unconfirmed,
// we regenerate the confirmation token.
// Request body: { email: string }
router.post("/", newsletterLimiter, async (req, res) => {
  // Step 1: Validate the email
  const { data, error } = validate(newsletterSchema, req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    // Step 2: Check if this email is already in the system
    const existing = await prisma.newsletterSub.findUnique({
      where: { email: data.email },
    });

    // Case A: Already confirmed and active
    if (existing && existing.confirmed && !existing.unsubAt) {
      return res.json({
        message: "You're already subscribed! До скоро! (See you soon!)",
        status: "already_subscribed",
      });
    }

    // Case B: Previously unsubscribed — re-subscribe them
    if (existing && existing.unsubAt) {
      const confirmToken = generateToken();
      const unsubToken = generateToken();

      await prisma.newsletterSub.update({
        where: { email: data.email },
        data: {
          confirmed: false,
          confirmToken,
          unsubToken,
          unsubAt: null,
          confirmedAt: null,
        },
      });

      // TODO: Send confirmation email via Resend/Buttondown
      // await sendConfirmationEmail(data.email, confirmToken);

      return res.status(200).json({
        message: "Welcome back! Please check your email to re-confirm.",
        status: "resubscribed",
      });
    }

    // Case C: Exists but never confirmed — regenerate token
    if (existing && !existing.confirmed) {
      const confirmToken = generateToken();
      await prisma.newsletterSub.update({
        where: { email: data.email },
        data: { confirmToken },
      });

      // TODO: Resend confirmation email
      // await sendConfirmationEmail(data.email, confirmToken);

      return res.json({
        message: "Confirmation email re-sent! Check your inbox.",
        status: "confirmation_resent",
      });
    }

    // Case D: Brand new subscriber
    const confirmToken = generateToken();
    const unsubToken = generateToken();

    await prisma.newsletterSub.create({
      data: {
        email: data.email,
        confirmToken,
        unsubToken,
        confirmed: false,
      },
    });

    // TODO: Send confirmation email via your provider
    // await sendConfirmationEmail(data.email, confirmToken);

    res.status(201).json({
      message: "Almost there! Check your email to confirm your subscription.",
      status: "pending_confirmation",
    });
  } catch (err) {
    console.error("[Newsletter POST] Error:", err.message);
    res.status(500).json({ error: "Failed to process subscription." });
  }
});

// ─── GET /api/newsletter/confirm/:token ─────────────────────────
// Confirms a subscription via the token sent in the confirmation email.
// This is the link the subscriber clicks from their inbox.
router.get("/confirm/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const sub = await prisma.newsletterSub.findFirst({
      where: { confirmToken: token, confirmed: false },
    });

    if (!sub) {
      return res.status(404).json({
        error: "Invalid or expired confirmation link.",
      });
    }

    await prisma.newsletterSub.update({
      where: { id: sub.id },
      data: {
        confirmed: true,
        confirmedAt: new Date(),
        confirmToken: null,   // Clear the token after use
      },
    });

    // In production, you'd redirect to a "Welcome!" page:
    // return res.redirect("https://tzvetomir.dev/welcome");
    res.json({
      message: "Welcome aboard! 🐾 До скоро! (See you soon!)",
      status: "confirmed",
    });
  } catch (err) {
    console.error("[Newsletter CONFIRM] Error:", err.message);
    res.status(500).json({ error: "Failed to confirm subscription." });
  }
});

// ─── DELETE /api/newsletter/:token ──────────────────────────────
// Unsubscribes using the unique unsubscribe token.
// Soft-deletes by setting unsubAt timestamp (preserves data for analytics).
router.delete("/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const sub = await prisma.newsletterSub.findFirst({
      where: { unsubToken: token, unsubAt: null },
    });

    if (!sub) {
      return res.status(404).json({
        error: "Invalid unsubscribe link or already unsubscribed.",
      });
    }

    await prisma.newsletterSub.update({
      where: { id: sub.id },
      data: { unsubAt: new Date() },
    });

    res.json({
      message: "You've been unsubscribed. Sorry to see you go!",
      status: "unsubscribed",
    });
  } catch (err) {
    console.error("[Newsletter DELETE] Error:", err.message);
    res.status(500).json({ error: "Failed to process unsubscription." });
  }
});

module.exports = router;
