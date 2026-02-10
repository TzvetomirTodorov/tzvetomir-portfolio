#!/usr/bin/env node

// ═══════════════════════════════════════════════════════════════════
//  PASSWORD HASHER — One-Time Setup Utility
//
//  Generates a bcrypt hash for your admin password. Run this once,
//  copy the output hash into your .env file, and never store or
//  commit the plaintext password anywhere.
//
//  Usage:
//    node server/src/utils/hashPassword.js YourSecurePassword123!
//
//  Or run without arguments for an interactive prompt:
//    node server/src/utils/hashPassword.js
//
//  Then paste the output into your .env:
//    ADMIN_PASSWORD_HASH=$2b$12$...
// ═══════════════════════════════════════════════════════════════════

const bcrypt = require("bcrypt");
const readline = require("readline");

const SALT_ROUNDS = 12;   // Industry standard — ~250ms per hash on modern hardware

async function hashFromArg(plaintext) {
  const hash = await bcrypt.hash(plaintext, SALT_ROUNDS);

  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║  🔐  Password Hash Generated                     ║
  ╠═══════════════════════════════════════════════════╣
  ║                                                   ║
  ║  Copy this entire hash into your .env file:       ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
  console.log(`  ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`
  ── Security Reminders ─────────────────────────────
  • Never commit this hash to Git (it's in .env)
  • Never store the plaintext password anywhere
  • Use a strong password: 16+ chars, mixed case,
    numbers, and symbols
  • The hash changes every time you run this — that's
    normal (bcrypt includes a unique salt each time)
  `);
}

async function main() {
  // If password is passed as a CLI argument
  if (process.argv[2]) {
    await hashFromArg(process.argv[2]);
    return;
  }

  // Otherwise, interactive prompt (hides input)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Node doesn't have a built-in "hidden input" for readline,
  // so we mute the output temporarily
  process.stdout.write("  Enter your admin password: ");
  process.stdin.setRawMode && process.stdin.setRawMode(true);

  let password = "";
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", async (char) => {
    const c = char.toString();

    // Enter key — process the password
    if (c === "\n" || c === "\r" || c === "\u0004") {
      process.stdin.setRawMode && process.stdin.setRawMode(false);
      process.stdout.write("\n");
      rl.close();

      if (!password) {
        console.error("  ✗ No password entered. Exiting.");
        process.exit(1);
      }

      await hashFromArg(password);
      process.exit(0);
    }

    // Backspace
    if (c === "\u007F" || c === "\b") {
      password = password.slice(0, -1);
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write("  Enter your admin password: " + "*".repeat(password.length));
      return;
    }

    // Ctrl+C — abort
    if (c === "\u0003") {
      console.log("\n  Cancelled.");
      process.exit(0);
    }

    // Normal character
    password += c;
    process.stdout.write("*");
  });
}

main().catch(err => {
  console.error("  ✗ Error:", err.message);
  process.exit(1);
});
