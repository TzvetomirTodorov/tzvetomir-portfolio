// ═══════════════════════════════════════════════════════════════════
//  DATABASE SEED — Initial Guestbook Entries
//
//  Seeds the guestbook with the three founding entries:
//    • Adina  — "So proud of how far you've come. 💜"
//    • Galya  — "Браво, сине мой! (Bravo, my son!)"
//    • Keegan — "The cybersecurity site is SO COOL!"
//
//  Run with: npm run db:seed
//  (or: node prisma/seed.js)
//
//  This script is idempotent — it checks for existing entries
//  before inserting, so you can safely run it multiple times.
// ═══════════════════════════════════════════════════════════════════

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SEED_ENTRIES = [
  {
    name: "Adina",
    message: "So proud of how far you've come. 💜",
    createdAt: new Date("2026-01-15T12:00:00Z"),
  },
  {
    name: "Galya",
    message: "Браво, сине мой! (Bravo, my son!)",
    createdAt: new Date("2026-01-10T12:00:00Z"),
  },
  {
    name: "Keegan",
    message: "The cybersecurity site is SO COOL!",
    createdAt: new Date("2025-12-20T12:00:00Z"),
  },
];

async function main() {
  console.log("🌱 Seeding database...\n");

  for (const entry of SEED_ENTRIES) {
    // Check if this exact entry already exists (name + message combo)
    const existing = await prisma.guestbookEntry.findFirst({
      where: {
        name: entry.name,
        message: entry.message,
      },
    });

    if (existing) {
      console.log(`  ⏭️  Skipping "${entry.name}" — already exists`);
    } else {
      await prisma.guestbookEntry.create({
        data: {
          ...entry,
          visible: true,
          ipHash: "seed", // Marker to identify seeded entries
        },
      });
      console.log(`  ✅ Added "${entry.name}" — "${entry.message}"`);
    }
  }

  console.log("\n🐾 Seeding complete! Nothing but green lights ahead.\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
