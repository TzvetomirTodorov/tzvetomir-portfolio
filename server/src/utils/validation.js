// ═══════════════════════════════════════════════════════════════════
//  INPUT VALIDATION — Zod Schemas
//  Validates and sanitizes all incoming API data before it
//  touches the database. This is your first line of defense.
// ═══════════════════════════════════════════════════════════════════

const { z } = require("zod");

// ─── Guestbook Entry ────────────────────────────────────────────
// Name: 1-80 chars, trimmed, no HTML
// Message: 1-200 chars, trimmed, no HTML
const guestbookSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or less")
    .regex(/^[^<>]*$/, "Name contains invalid characters"),

  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(200, "Message must be 200 characters or less")
    .regex(/^[^<>]*$/, "Message contains invalid characters"),
});

// ─── Newsletter Subscription ────────────────────────────────────
// Standard email validation — this is the only field needed
const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(255, "Email must be 255 characters or less")
    .toLowerCase(),   // Normalize to lowercase for dedup
});

// ─── Contact Form ───────────────────────────────────────────────
// Name, email, subject, and full message body
const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(255, "Email must be 255 characters or less")
    .toLowerCase(),

  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or less"),

  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(5000, "Message must be 5000 characters or less"),
});

// ─── Validation Helper ──────────────────────────────────────────
// Use this in route handlers:
//   const { data, error } = validate(guestbookSchema, req.body);
//   if (error) return res.status(400).json({ error });
function validate(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Flatten Zod errors into a simple { field: "message" } map
    const errors = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path.join(".");
      errors[field] = issue.message;
    });
    return { data: null, error: errors };
  }
  return { data: result.data, error: null };
}

module.exports = {
  guestbookSchema,
  newsletterSchema,
  contactSchema,
  validate,
};
