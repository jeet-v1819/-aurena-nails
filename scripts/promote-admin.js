#!/usr/bin/env node
const path = require("path");
require("dotenv").config({
  path: [path.join(process.cwd(), ".env.local"), path.join(process.cwd(), ".env")]
});
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.log("Usage: node scripts/promote-admin.js <user-email>");
  console.log("Example: node scripts/promote-admin.js admin@example.com");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required in .env or environment.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool, { schema: "public" })
});

async function main() {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.error(`✖ User "${email}" was not found in the database.`);
    console.error(`  Please register an account first at http://localhost:3000/register`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: {
      role: "ADMIN",
      active: true,
      deletedAt: null
    }
  });

  console.log(`✔ User "${updated.email}" (${updated.firstName} ${updated.lastName}) is now an ADMIN!`);
  console.log(`  You can now log in at http://localhost:3000/admin/login`);
}

main()
  .catch((err) => {
    console.error("Failed to promote user:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
