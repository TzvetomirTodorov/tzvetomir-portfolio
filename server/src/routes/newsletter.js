// ═══════════════════════════════════════════════════════════════════
//  NEWSLETTER ROUTES — /api/newsletter
//
//  POST   /api/newsletter              → Subscribe
//  GET    /api/newsletter/confirm/:token → Confirm (double opt-in)
//  DELETE /api/newsletter/:token       → Unsubscribe
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const prisma = require("../utils/prisma");   // AUDIT FIX: shared instance
const { newsletterSchema, validate } = require("../utils/validation");
const { newsletterLimiter } = require("../middleware/rateLimiter");

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// POST /api/newsletter
router.post("/", newsletterLimiter, async (req, res) => {
  const { data, error } = validate(newsletterSchema, req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const existing = await prisma.newsletterSub.findUnique({
      where: { email: data.email },
    });

    if (existing && existing.confirmed && !existing.unsubAt) {
      return res.json({
        message: "You're already subscribed! До скоро! (See you soon!)",
        status: "already_subscribed",
      });
    }

    if (existing && existing.unsubAt) {
      const confirmToken = generateToken();
      const unsubToken = generateToken();
      await prisma.newsletterSub.update({
        where: { email: data.email },
        data: { confirmed: false, confirmToken, unsubToken, unsubAt: null, confirmedAt: null },
      });
      return res.status(200).json({
        message: "Welcome back! Please check your email to re-confirm.",
        status: "resubscribed",
      });
    }

    if (existing && !existing.confirmed) {
      const confirmToken = generateToken();
      await prisma.newsletterSub.update({
        where: { email: data.email },
        data: { confirmToken },
      });
      return res.json({
        message: "Confirmation email re-sent! Check your inbox.",
        status: "confirmation_resent",
      });
    }

    // Brand new subscriber
    const confirmToken = generateToken();
    const unsubToken = generateToken();
    await prisma.newsletterSub.create({
      data: { email: data.email, confirmToken, unsubToken, confirmed: false },
    });

    res.status(201).json({
      message: "Almost there! Check your email to confirm your subscription.",
      status: "pending_confirmation",
    });
  } catch (err) {
    console.error("[Newsletter POST] Error:", err.message);
    res.status(500).json({ error: "Failed to process subscription." });
  }
});

// GET /api/newsletter/confirm/:token
router.get("/confirm/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const sub = await prisma.newsletterSub.findFirst({
      where: { confirmToken: token, confirmed: false },
    });
    if (!sub) {
      return res.status(404).json({ error: "Invalid or expired confirmation link." });
    }
    await prisma.newsletterSub.update({
      where: { id: sub.id },
      data: { confirmed: true, confirmedAt: new Date(), confirmToken: null },
    });
    res.json({ message: "Welcome aboard! 🐾 До скоро! (See you soon!)", status: "confirmed" });
  } catch (err) {
    console.error("[Newsletter CONFIRM] Error:", err.message);
    res.status(500).json({ error: "Failed to confirm subscription." });
  }
});

// DELETE /api/newsletter/:token
router.delete("/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const sub = await prisma.newsletterSub.findFirst({
      where: { unsubToken: token, unsubAt: null },
    });
    if (!sub) {
      return res.status(404).json({ error: "Invalid unsubscribe link or already unsubscribed." });
    }
    await prisma.newsletterSub.update({
      where: { id: sub.id },
      data: { unsubAt: new Date() },
    });
    res.json({ message: "You've been unsubscribed. Sorry to see you go!", status: "unsubscribed" });
  } catch (err) {
    console.error("[Newsletter DELETE] Error:", err.message);
    res.status(500).json({ error: "Failed to process unsubscription." });
  }
});

module.exports = router;
