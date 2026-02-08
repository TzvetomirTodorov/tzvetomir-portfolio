// ═══════════════════════════════════════════════════════════════════
//  CONTACT ROUTES — /api/contact
//  POST /api/contact → Submit a contact form message
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");   // AUDIT FIX: shared instance
const { contactSchema, validate } = require("../utils/validation");
const { contactLimiter } = require("../middleware/rateLimiter");

// POST /api/contact
router.post("/", contactLimiter, async (req, res) => {
  const { data, error } = validate(contactSchema, req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const message = await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      },
      select: {
        id: true,
        name: true,
        subject: true,
        createdAt: true,
      },
    });

    // TODO: Send notification email via Resend
    // await sendNotificationEmail(data);

    res.status(201).json({
      message: "Message received! I'll get back to you soon. До скоро! 🐾",
      contact: message,
    });
  } catch (err) {
    console.error("[Contact POST] Error:", err.message);
    res.status(500).json({ error: "Failed to send message." });
  }
});

module.exports = router;
