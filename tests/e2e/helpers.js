const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { hashPassword } = require("@better-auth/utils/password");
const crypto = require("crypto");

const connectionString =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "";

const pool = new Pool({
  connectionString: connectionString || undefined,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  allowExitOnIdle: true
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool, { schema: "aurena" })
});

const TEST_PREFIX = "aurena-pw-suite-";
const TEST_ADMIN_EMAIL = `${TEST_PREFIX}admin@aurenanails.com`;
const TEST_ADMIN_PASSWORD = "AdminPassword@2026";

function attachErrorCollector(page) {
  const pageErrors = [];
  const consoleErrors = [];

  page.on("pageerror", (err) => {
    pageErrors.push(err.message || String(err));
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore expected 401/403/400/409 fetch status notifications logged by browser network layer during negative validation tests
      if (
        text.includes("Failed to load resource: the server responded with a status of 400") ||
        text.includes("Failed to load resource: the server responded with a status of 401") ||
        text.includes("Failed to load resource: the server responded with a status of 403") ||
        text.includes("Failed to load resource: the server responded with a status of 404") ||
        text.includes("Failed to load resource: the server responded with a status of 409")
      ) {
        return;
      }
      consoleErrors.push(text);
    }
  });

  return {
    assertNoErrors() {
      if (pageErrors.length > 0) {
        throw new Error(`Uncaught pageerror(s): ${pageErrors.join(" | ")}`);
      }
      if (consoleErrors.length > 0) {
        throw new Error(`Console error(s): ${consoleErrors.join(" | ")}`);
      }
    }
  };
}

async function ensureTestAdmin() {
  const passwordHash = await hashPassword(TEST_ADMIN_PASSWORD);

  const neonRows = await prisma.$queryRawUnsafe(
    `SELECT id FROM neon_auth."user" WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    TEST_ADMIN_EMAIL
  );

  let neonAuthId;
  if (neonRows.length > 0) {
    neonAuthId = neonRows[0].id;
    await prisma.$executeRawUnsafe(
      `UPDATE neon_auth."user" SET "emailVerified" = true, role = 'admin', "updatedAt" = NOW() WHERE id = $1::uuid`,
      neonAuthId
    );
    await prisma.$executeRawUnsafe(
      `UPDATE neon_auth.account SET password = $1, "updatedAt" = NOW() WHERE "userId" = $2::uuid AND "providerId" = 'credential'`,
      passwordHash,
      neonAuthId
    );
  } else {
    neonAuthId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO neon_auth."user" (id, name, email, "emailVerified", role, banned, "createdAt", "updatedAt")
       VALUES ($1::uuid, $2, $3, true, 'admin', false, NOW(), NOW())`,
      neonAuthId,
      "Aurena Test Admin",
      TEST_ADMIN_EMAIL
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO neon_auth.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES ($1::uuid, $2, 'credential', $3::uuid, $4, NOW(), NOW())`,
      accountId,
      neonAuthId,
      neonAuthId,
      passwordHash
    );
  }

  const adminUser = await prisma.user.upsert({
    where: { email: TEST_ADMIN_EMAIL },
    update: {
      authId: neonAuthId,
      role: "ADMIN",
      active: true,
      deletedAt: null
    },
    create: {
      authId: neonAuthId,
      firstName: "Aurena",
      lastName: "Admin",
      email: TEST_ADMIN_EMAIL,
      mobile: "9876543210",
      role: "ADMIN",
      active: true
    }
  });

  return {
    adminUser,
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD
  };
}

/**
 * Finds an open future date and slot for a given serviceId so tests never collide with existing bookings
 */
async function findAvailableFutureDateAndSlot(request, serviceId, startDaysAhead = 10) {
  for (let offset = startDaysAhead; offset < startDaysAhead + 25; offset++) {
    const d = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(d);

    const res = await request.get(
      `/api/appointments/availability?serviceId=${serviceId}&date=${dateStr}`
    );
    if (res.ok()) {
      const data = await res.json();
      const openSlots = Array.isArray(data.slots)
        ? data.slots.filter((s) => s.available)
        : [];
      if (data.available && openSlots.length >= 6) {
        return {
          date: dateStr,
          slot: openSlots[0].time,
          secondSlot: openSlots[4].time
        };
      }
    }
  }
  throw new Error("Could not find an available future date with open slots");
}

async function cleanupTestArtifacts() {
  try {
    const testUsers = await prisma.user.findMany({
      where: {
        email: { startsWith: TEST_PREFIX }
      },
      select: { id: true, email: true, authId: true }
    });

    const userIds = testUsers.map((u) => u.id);
    if (userIds.length > 0) {
      await prisma.review.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.wishlist.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.appointment.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.passwordResetToken.deleteMany({
        where: { userId: { in: userIds } }
      });
      await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM neon_auth."user" WHERE email LIKE $1`,
      `${TEST_PREFIX}%`
    );

    await prisma.contactMessage.deleteMany({
      where: { email: { startsWith: TEST_PREFIX } }
    });
    await prisma.galleryImage.deleteMany({
      where: { title: { startsWith: TEST_PREFIX } }
    });
    await prisma.video.deleteMany({
      where: { title: { startsWith: TEST_PREFIX } }
    });
    await prisma.service.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } }
    });
    await prisma.galleryCategory.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } }
    });
  } catch (err) {
    console.warn("Cleanup warning:", err.message);
  }
}

module.exports = {
  prisma,
  TEST_PREFIX,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  attachErrorCollector,
  ensureTestAdmin,
  findAvailableFutureDateAndSlot,
  cleanupTestArtifacts
};
