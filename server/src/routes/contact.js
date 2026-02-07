// ═══════════════════════════════════════════════════════════════════
//  CONTACT ROUTES — /api/contact
//
//  POST /api/contact → Submit a contact message
//
//  Messages are stored in PostgreSQL and can optionally be forwarded
//  to your email via Resend/SendGrid/etc. The route validates input,
//  rate-limits submissions, and stores everything for later review.
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { contactSchema, validate } = require("../utils/validation");
const { contactLimiter } = require("../middleware/rateLimiter");

const prisma = new PrismaClient();

// ─── POST /api/contact ──────────────────────────────────────────
// Submits a new contact form message.
// Rate limited to 3 per hour per IP.
// Request body: { name, email, subject, message }
router.post("/", contactLimiter, async (req, res) => {
  // Step 1: Validate all fields with Zod
  const { data, error } = validate(contactSchema, req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    // Step 2: Store the message in PostgreSQL
    const contact = await prisma.contactMessage.create({
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

    // TODO: Forward the message via email using Resend
    // This is where you'd integrate your email service:
    //
    // const { Resend } = require("resend");
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: "portfolio@tzvetomir.dev",
    //   to: "tzvtdr@gmail.com",
    //   subject: `[Portfolio Contact] ${data.subject}`,
    //   html: `
    //     <h2>New Contact from ${data.name}</h2>
    //     <p><strong>Email:</strong> ${data.email}</p>
    //     <p><strong>Subject:</strong> ${data.subject}</p>
    //     <hr />
    //     <p>${data.message}</p>
    //   `,
    // });

    res.status(201).json({
      message: "Message received! I'll get back to you soon. До скоро!",
      id: contact.id,
    });
  } catch (err) {
    console.error("[Contact POST] Error:", err.message);
    res.status(500).json({ error: "Failed to send message. Please try again." });
  }
});

module.exports = router;
