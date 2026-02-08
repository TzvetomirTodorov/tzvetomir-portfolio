// ═══════════════════════════════════════════════════════════════════
//  SHARED PRISMA CLIENT — Singleton Pattern
//
//  AUDIT FIX: Previously, each route file (health.js, guestbook.js,
//  newsletter.js, contact.js) created its own `new PrismaClient()`.
//  This wastes database connections and can exhaust the connection
//  pool under load. This module exports a single shared instance.
//
//  Usage in route files:
//    const prisma = require("../utils/prisma");
// ═══════════════════════════════════════════════════════════════════

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
