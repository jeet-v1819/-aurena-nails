#!/usr/bin/env node
/**
 * Aurena Nails — administrator provisioning / password reset.
 *
 * Safe, repeatable and non-destructive. It creates the administrator when it
 * is missing and resets the credential password + ADMIN role when it exists.
 * It never deletes users, appointments, reviews or content, and it never
 * prints a password, a password hash or a connection string.
 *
 * Usage
 * -----
 *   # report only (no writes). Verifies the password when one is supplied.
 *   INITIAL_ADMIN_EMAIL=admin@aurenanails.com \
 *   INITIAL_ADMIN_PASSWORD='...' \
 *   DATABASE_URL='postgresql://...' \
 *   node scripts/provision-admin.js --check
 *
 *   # create or reset the administrator (writes to the database)
 *   INITIAL_ADMIN_EMAIL=admin@aurenanails.com \
 *   INITIAL_ADMIN_PASSWORD='...' \
 *   DATABASE_URL='postgresql://...' \
 *   node scripts/provision-admin.js --apply
 *
 *   # additionally prove the live login API accepts the credentials
 *   ... node scripts/provision-admin.js --apply --verify-live
 *
 * Options
 * -------
 *   --check         Read-only inspection. Never writes.
 *   --apply         Create/reset the administrator. Default is --check.
 *   --verify-live   After a successful apply, POST the credentials to
 *                   `${NEXT_PUBLIC_APP_URL}/api/auth/admin-login` and require
 *                   HTTP 200 with role=ADMIN. Uses only the public API.
 *   --keep-sessions Do not revoke the administrator's existing auth sessions
 *                   when the password is reset.
 *   --help
 *
 * Environment
 * -----------
 *   DATABASE_URL             Required. Use the pooled Neon connection string.
 *   INITIAL_ADMIN_EMAIL      Required.
 *   INITIAL_ADMIN_PASSWORD   Required for --apply; optional for --check.
 *   INITIAL_ADMIN_MOBILE     Optional.
 *   NEXT_PUBLIC_APP_URL      Required only for --verify-live.
 *
 * Exit codes: 0 success, 1 failure (safe to re-run).
 */
const path = require("path");

// Load .env.local first (local development) then .env. Real environment
// variables always win, so CI/Netlify values are never overridden.
require("dotenv").config({
  path: [path.join(process.cwd(), ".env.local"), path.join(process.cwd(), ".env")]
});

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const {
  describeDatabaseTarget,
  inspectAdmin,
  normalizeEmail,
  provisionAdmin,
  verifyStoredPassword
} = require("../prisma/adminProvisioning");

function parseArgs(argv) {
  const args = {
    mode: "check",
    verifyLive: false,
    keepSessions: false,
    help: false
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--apply") args.mode = "apply";
    else if (arg === "--check") args.mode = "check";
    else if (arg === "--verify-live") args.verifyLive = true;
    else if (arg === "--keep-sessions") args.keepSessions = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log(
    [
      "Aurena Nails — administrator provisioning",
      "",
      "  node scripts/provision-admin.js --check   # read-only status report",
      "  node scripts/provision-admin.js --apply   # create or reset the admin",
      "",
      "  --verify-live     also test POST /api/auth/admin-login on NEXT_PUBLIC_APP_URL",
      "  --keep-sessions   keep existing sessions when resetting the password",
      "",
      "Required env: DATABASE_URL, INITIAL_ADMIN_EMAIL",
      "For --apply:  INITIAL_ADMIN_PASSWORD (8-128 chars, upper+lower+digit)",
      "Optional:     INITIAL_ADMIN_MOBILE",
      "",
      "Secrets are read from the environment and are never printed or logged."
    ].join("\n")
  );
}

function formatReport(summary) {
  const lines = [
    `  email            : ${summary.email}`,
    `  neon_auth user   : ${summary.authUserExists ? `present (${summary.authUserId})` : "MISSING"}`,
    `  credential row   : ${summary.credentialAccountExists ? "present" : "MISSING"}`,
    `  password format  : ${summary.passwordHashFormat || "n/a"}`,
    `  app profile      : ${summary.appUserExists ? `present (${summary.appUserId})` : "MISSING"}`,
    `  app role         : ${summary.role || "MISSING"}`,
    `  app active       : ${summary.active === null ? "n/a" : String(summary.active)}`,
    `  authId linked    : ${summary.authIdsMatch === null ? "n/a" : String(summary.authIdsMatch)}`
  ];
  return lines.join("\n");
}

async function verifyLiveLogin(baseUrl, email, password) {
  const root = String(baseUrl || "").replace(/\/+$/, "");
  if (!root) {
    return { ok: false, detail: "NEXT_PUBLIC_APP_URL is not set" };
  }

  try {
    const response = await fetch(`${root}/api/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password, rememberMe: false })
    });

    const body = await response.json().catch(() => ({}));
    const role = body?.user?.role;
    const ok = response.status === 200 && role === "ADMIN";
    return {
      ok,
      status: response.status,
      role: role || null,
      detail: ok
        ? "admin-login returned 200 with role=ADMIN"
        : `admin-login returned ${response.status}` +
          `${body?.code ? ` (${body.code})` : ""}`
    };
  } catch (error) {
    return { ok: false, detail: `admin-login request failed: ${error.message}` };
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return 0;
  }

  const email = normalizeEmail(process.env.INITIAL_ADMIN_EMAIL);
  const password = process.env.INITIAL_ADMIN_PASSWORD || "";
  const mobile = process.env.INITIAL_ADMIN_MOBILE?.trim() || undefined;

  if (!process.env.DATABASE_URL) {
    console.error("✖ DATABASE_URL is required (Neon PostgreSQL connection string).");
    return 1;
  }
  if (!email) {
    console.error("✖ INITIAL_ADMIN_EMAIL is required.");
    return 1;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    allowExitOnIdle: true
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { schema: "aurena" })
  });

  let exitCode = 0;

  try {
    console.log(`\nAurena Nails administrator ${args.mode === "apply" ? "provisioning" : "status check"}`);
    console.log(`  target: ${describeDatabaseTarget(process.env.DATABASE_URL)}`);

    if (args.mode === "apply") {
      const result = await provisionAdmin(prisma, {
        email,
        password,
        mobile,
        firstName: process.env.INITIAL_ADMIN_FIRST_NAME?.trim() || "Aurena",
        lastName: process.env.INITIAL_ADMIN_LAST_NAME?.trim() || "Admin",
        revokeSessions: !args.keepSessions
      });

      console.log(
        `\n  created neon_auth user : ${result.createdAuthUser ? "yes" : "no (reused)"}`
      );
      console.log(
        `  credential password   : ${result.passwordCreated ? "created" : "reset"}`
      );
      console.log(`  verified with login   : ${result.passwordVerified ? "yes" : "NO"}`);
      console.log(`  app role              : ${result.role}`);
      if (result.sessionsRevoked) {
        console.log(`  sessions revoked      : ${result.sessionsRevoked}`);
      }

      if (!result.ok) {
        console.error(
          `\n✖ Provisioning did not verify${
            result.passwordFailureReason ? ` (${result.passwordFailureReason})` : ""
          }.`
        );
        exitCode = 1;
      } else {
        console.log("\n✔ Administrator provisioned and password hash verified.");
      }
    } else if (args.mode === "check") {
      const summary = await inspectAdmin(prisma, email);
      console.log(`\n${formatReport(summary)}`);

      if (!summary.tablesReady) {
        console.log("  neon_auth schema : missing (run with --apply to create it)");
      }

      let passwordMatches = null;
      if (password) {
        const verification = await verifyStoredPassword(prisma, email, password);
        passwordMatches = verification.verified;
        console.log(
          `  password check   : ${verification.verified ? "MATCHES" : `FAILS (${verification.reason})`}`
        );
      } else {
        console.log("  password check   : skipped (INITIAL_ADMIN_PASSWORD not set)");
      }

      const healthy =
        summary.authUserExists &&
        summary.credentialAccountExists &&
        summary.role === "ADMIN" &&
        summary.active === true &&
        summary.deleted === false &&
        summary.authIdsMatch === true &&
        passwordMatches !== false;
      console.log(`  overall          : ${healthy ? "READY" : "NOT READY"}`);
      if (!healthy) exitCode = 1;
    }

    if (args.verifyLive && exitCode === 0) {
      console.log("\nVerifying the deployed login API ...");
      const live = await verifyLiveLogin(
        process.env.NEXT_PUBLIC_APP_URL,
        email,
        password
      );
      console.log(`  ${live.ok ? "✔" : "✖"} ${live.detail}`);
      if (!live.ok) exitCode = 1;
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  }

  return exitCode;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    // Never echo raw database errors: they can include connection details.
    console.error(`\n✖ ${error?.message || "Provisioning failed."}`);
    process.exitCode = 1;
  });
