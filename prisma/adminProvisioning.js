/**
 * Administrator provisioning / password-reset helpers.
 *
 * Why this exists
 * ---------------
 * The previous seed implementation created the administrator by calling
 * `POST {NEON_AUTH_BASE_URL}/sign-up/email` and then only fell back to
 * "link the existing auth user id" when the call failed. That meant:
 *
 *   1. If the Neon Auth user already existed (second run, changed password,
 *      an earlier partial seed, an imported account, a rotated password), the
 *      stored credential password was NEVER updated. The seed still printed
 *      "verified with ADMIN role", so the operator believed provisioning had
 *      succeeded while `/api/auth/admin-login` kept returning 401
 *      "Invalid email/mobile number or password".
 *   2. If NEON_AUTH_BASE_URL was not set (the recommended production setup,
 *      where the app serves its own Neon Auth-compatible endpoint), the whole
 *      admin block was skipped silently and no administrator existed at all.
 *   3. Seeding required the deployed site to be reachable from the machine
 *      running the seed, which is unnecessary: the credential hash format is
 *      the same one the app, the app's password-reset flow and Neon Auth
 *      (Better Auth scrypt) already use.
 *
 * This module provisions the administrator deterministically against the
 * real database:
 *
 *   - upserts `neon_auth."user"`
 *   - upserts the `credential` row in `neon_auth."account"` with a freshly
 *     generated scrypt hash (`salt:hex`, N=16384 r=16 p=1 dkLen=64) — exactly
 *     the format verified by `@better-auth/utils/password` at sign-in time
 *   - upserts the application profile in `aurena."User"` with role ADMIN
 *   - reads everything back and re-verifies the password with the same
 *     `verifyPassword` used by the login route
 *
 * It is idempotent and non-destructive: no user, appointment, review or
 * content row is ever deleted. The only rows ever removed are the target
 * administrator's own auth sessions (opt-in), which is the standard
 * "password changed" revocation step.
 *
 * Nothing in here prints a password, a password hash or a connection string.
 */
const crypto = require("crypto");
const { hashPassword, verifyPassword } = require("@better-auth/utils/password");
const { NEON_AUTH_DDL } = require("./neonAuthDdl");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Values that must never be accepted as a production administrator password.
const PLACEHOLDER_PASSWORDS = new Set([
  "change_me_strong_password",
  "changeme",
  "change-me",
  "password",
  "admin",
  "admin123",
  "admin@123",
  "replace-with-at-least-32-random-characters"
]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function assertValidEmail(email) {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error(
      "INITIAL_ADMIN_EMAIL must be a valid email address (e.g. admin@aurenanails.com)."
    );
  }
}

function assertValidPassword(password) {
  const value = String(password || "");
  if (!value) {
    throw new Error("INITIAL_ADMIN_PASSWORD is required.");
  }
  if (PLACEHOLDER_PASSWORDS.has(value.toLowerCase())) {
    throw new Error(
      "INITIAL_ADMIN_PASSWORD is still a placeholder. Choose a real, unique password."
    );
  }
  if (value.length < 8 || value.length > 128) {
    throw new Error(
      "INITIAL_ADMIN_PASSWORD must be between 8 and 128 characters long."
    );
  }
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
    throw new Error(
      "INITIAL_ADMIN_PASSWORD must contain at least one uppercase letter, one lowercase letter and one number."
    );
  }
}

async function ensureNeonAuthTables(prisma) {
  for (const statement of NEON_AUTH_DDL) {
    await prisma.$executeRawUnsafe(statement);
  }
}

async function findAuthUser(prisma, email) {
  const rows = await prisma.$queryRaw`
    SELECT "id", "email", "banned", "emailVerified"
    FROM "neon_auth"."user"
    WHERE LOWER("email") = ${email}
    LIMIT 1
  `;
  return rows?.[0] || null;
}

async function findCredentialAccount(prisma, authUserId) {
  const rows = await prisma.$queryRaw`
    SELECT "id", "password"
    FROM "neon_auth"."account"
    WHERE "userId" = ${authUserId}::uuid AND "providerId" = 'credential'
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;
  return rows?.[0] || null;
}

/**
 * Read-only inspection. Never returns passwords or hashes.
 */
async function inspectAdmin(prisma, email) {
  const normalizedEmail = normalizeEmail(email);
  const summary = {
    email: normalizedEmail,
    authUserExists: false,
    authUserId: null,
    banned: null,
    credentialAccountExists: false,
    passwordHashFormat: null,
    appUserExists: false,
    appUserId: null,
    role: null,
    active: null,
    deleted: null,
    authIdsMatch: null,
    tablesReady: true
  };

  let authUser = null;
  try {
    authUser = await findAuthUser(prisma, normalizedEmail);
  } catch (error) {
    if (error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "")) {
      summary.tablesReady = false;
    } else {
      throw error;
    }
  }

  if (authUser) {
    summary.authUserExists = true;
    summary.authUserId = String(authUser.id);
    summary.banned = Boolean(authUser.banned);

    const account = await findCredentialAccount(prisma, String(authUser.id));
    if (account) {
      summary.credentialAccountExists = true;
      const stored = typeof account.password === "string" ? account.password : "";
      if (!stored) {
        summary.passwordHashFormat = "empty";
      } else if (/^[0-9a-f]+:[0-9a-f]+$/i.test(stored)) {
        summary.passwordHashFormat = "scrypt-salt-hex";
      } else {
        // Never expose the hash itself, only whether it is understood.
        summary.passwordHashFormat = "unrecognised";
      }
    }
  }

  const appUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (appUser) {
    summary.appUserExists = true;
    summary.appUserId = appUser.id;
    summary.role = appUser.role;
    summary.active = Boolean(appUser.active);
    summary.deleted = Boolean(appUser.deletedAt);
    summary.authIdsMatch =
      summary.authUserId !== null && String(appUser.authId) === summary.authUserId;
  }

  return summary;
}

/**
 * Verifies a password against the stored Neon Auth credential hash using the
 * exact same hasher as the application login route.
 */
async function verifyStoredPassword(prisma, email, password) {
  const normalizedEmail = normalizeEmail(email);
  const authUser = await findAuthUser(prisma, normalizedEmail);
  if (!authUser) return { verified: false, reason: "AUTH_USER_MISSING" };

  const account = await findCredentialAccount(prisma, String(authUser.id));
  if (!account?.password) {
    return { verified: false, reason: "PASSWORD_NOT_SET" };
  }

  try {
    const verified = await verifyPassword(account.password, String(password || ""));
    return { verified, reason: verified ? null : "PASSWORD_MISMATCH" };
  } catch {
    return { verified: false, reason: "UNSUPPORTED_HASH_FORMAT" };
  }
}

/**
 * Creates the administrator if missing and (re)sets its password + ADMIN role.
 * Safe to run repeatedly. Never deletes users or application data.
 */
async function provisionAdmin(prisma, options = {}) {
  const {
    email,
    password,
    mobile,
    firstName = "Aurena",
    lastName = "Admin",
    displayName = "Aurena Administrator",
    revokeSessions = false,
    logger = console
  } = options;

  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  assertValidPassword(password);

  await ensureNeonAuthTables(prisma);

  const appUserBefore = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  const passwordHash = await hashPassword(String(password));
  const authUserId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const warnings = [];
  let createdAuthUser = false;
  let createdAppUser = false;
  let passwordWasCreated = false;
  let sessionsRevoked = 0;

  await prisma.$transaction(async (tx) => {
    const existingAuth = await findAuthUser(tx, normalizedEmail);

    if (existingAuth) {
      await tx.$executeRaw`
        UPDATE "neon_auth"."user"
        SET "emailVerified" = TRUE,
            "banned" = FALSE,
            "updatedAt" = NOW()
        WHERE "id" = ${String(existingAuth.id)}::uuid
      `;
    } else {
      createdAuthUser = true;
      await tx.$executeRaw`
        INSERT INTO "neon_auth"."user" (
          "id", "name", "email", "emailVerified", "image", "role", "banned",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${authUserId}::uuid, ${displayName}, ${normalizedEmail}, TRUE, NULL,
          'admin', FALSE, NOW(), NOW()
        )
      `;
    }

    const resolvedAuthUserId = existingAuth
      ? String(existingAuth.id)
      : authUserId;

    const existingAccount = await findCredentialAccount(tx, resolvedAuthUserId);
    if (existingAccount) {
      await tx.$executeRaw`
        UPDATE "neon_auth"."account"
        SET "password" = ${passwordHash}, "updatedAt" = NOW()
        WHERE "userId" = ${resolvedAuthUserId}::uuid
          AND "providerId" = 'credential'
      `;
      passwordWasCreated = false;
    } else {
      await tx.$executeRaw`
        INSERT INTO "neon_auth"."account" (
          "id", "accountId", "providerId", "userId", "password",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${accountId}::uuid, ${resolvedAuthUserId}, 'credential',
          ${resolvedAuthUserId}::uuid, ${passwordHash}, NOW(), NOW()
        )
      `;
      passwordWasCreated = true;
    }

    // Resolve the mobile number without ever stealing one from another user.
    let resolvedMobile;
    if (mobile) {
      const mobileOwner = await tx.user.findUnique({ where: { mobile } });
      if (mobileOwner && mobileOwner.email !== normalizedEmail) {
        warnings.push(
          `Mobile number ${mobile} already belongs to another account; the administrator was saved without changing it.`
        );
      } else {
        resolvedMobile = mobile;
      }
    }

    if (appUserBefore) {
      await tx.user.update({
        where: { id: appUserBefore.id },
        data: {
          authId: resolvedAuthUserId,
          role: "ADMIN",
          active: true,
          deletedAt: null,
          ...(resolvedMobile ? { mobile: resolvedMobile } : {})
        }
      });
    } else {
      createdAppUser = true;
      await tx.user.create({
        data: {
          authId: resolvedAuthUserId,
          email: normalizedEmail,
          firstName,
          lastName,
          mobile: resolvedMobile || null,
          role: "ADMIN",
          active: true
        }
      });
    }

    if (revokeSessions) {
      sessionsRevoked = await tx.$executeRaw`
        DELETE FROM "neon_auth"."session"
        WHERE "userId" = ${resolvedAuthUserId}::uuid
      `;
    }
  });

  const after = await inspectAdmin(prisma, normalizedEmail);
  const passwordCheck = await verifyStoredPassword(
    prisma,
    normalizedEmail,
    password
  );

  const ok =
    after.authUserExists &&
    after.credentialAccountExists &&
    after.passwordHashFormat === "scrypt-salt-hex" &&
    passwordCheck.verified &&
    after.appUserExists &&
    after.role === "ADMIN" &&
    after.active === true &&
    after.deleted === false &&
    after.authIdsMatch === true;

  if (warnings.length > 0) {
    for (const warning of warnings) {
      logger.warn(`[admin-provision] ${warning}`);
    }
  }

  return {
    ok,
    email: normalizedEmail,
    authUserExists: after.authUserExists,
    appUserExists: after.appUserExists,
    authUserId: after.authUserId,
    appUserId: after.appUserId,
    role: after.role,
    active: after.active,
    credentialAccountExists: after.credentialAccountExists,
    passwordHashFormat: after.passwordHashFormat,
    passwordVerified: passwordCheck.verified,
    passwordFailureReason: passwordCheck.reason,
    authIdsMatch: after.authIdsMatch,
    createdAuthUser,
    createdAppUser,
    passwordCreated: passwordWasCreated,
    passwordReset: !passwordWasCreated,
    sessionsRevoked,
    warnings
  };
}

/**
 * Masks a PostgreSQL connection string so operators can confirm the target
 * database without ever printing credentials.
 */
function describeDatabaseTarget(connectionString) {
  if (!connectionString) return "DATABASE_URL is not set";
  try {
    const url = new URL(connectionString);
    const database = url.pathname.replace(/^\//, "") || "(default)";
    const ssl = url.searchParams.get("sslmode") || "default";
    return `${url.hostname}${url.port ? `:${url.port}` : ""}/${database} (ssl=${ssl})`;
  } catch {
    return "DATABASE_URL could not be parsed";
  }
}

module.exports = {
  PLACEHOLDER_PASSWORDS,
  assertValidEmail,
  assertValidPassword,
  describeDatabaseTarget,
  ensureNeonAuthTables,
  inspectAdmin,
  normalizeEmail,
  provisionAdmin,
  verifyStoredPassword
};
