#!/usr/bin/env node
/**
 * Live production smoke test for Aurena Nails.
 *
 * Runs against a deployed site (default: https://aurena-nails.netlify.app) and
 * exercises the real Neon/Postgres database and the real Neon Auth-compatible
 * session endpoints. It is intentionally runnable without installing
 * dependencies (Node 20+ global fetch).
 *
 * Usage:
 *   node scripts/live-smoke.mjs
 *   SMOKE_BASE_URL=https://deploy-preview-1--aurena-nails.netlify.app node scripts/live-smoke.mjs
 *
 * The script uses a dedicated QA customer account. If it already exists the
 * script logs in instead of registering again, so repeated runs do not create
 * extra records.
 */

const BASE_URL = (process.env.SMOKE_BASE_URL || "https://aurena-nails.netlify.app").replace(
  /\/+$/,
  ""
);
const EMAIL = process.env.SMOKE_EMAIL || "qa.smoke@aurena-nails.invalid";
const MOBILE = process.env.SMOKE_MOBILE || "9999900001";
const PASSWORD = process.env.SMOKE_PASSWORD || "SmokeTest@2026";

const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures += 1;
  const icon = ok ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function summarize(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

/* ------------------------------------------------------------------ *
 * Minimal cookie jar (fetch does not persist cookies between calls)  *
 * ------------------------------------------------------------------ */
const jar = new Map();

function storeCookies(response) {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];

  for (const rawCookie of setCookies) {
    const [pair] = rawCookie.split(";");
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    const expired = /expires=Thu, 01 Jan 1970/i.test(rawCookie);
    if (!name) continue;
    if (!value || expired) {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: {
      accept: "application/json, text/html;q=0.9",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(jar.size ? { cookie: cookieHeader() } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  storeCookies(response);

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, status: response.status, text, json };
}

async function main() {
  console.log(`\nAurena Nails live smoke test → ${BASE_URL}\n`);

  /* 1. Database + auth table health ------------------------------- */
  const health = await request("/api/health");
  check("GET /api/health returns 200", health.status === 200, `status ${health.status}`);
  check(
    "Database connection is live",
    health.json?.database?.connected === true,
    summarize(health.json?.database)
  );
  check(
    "Prisma schema is ready",
    health.json?.database?.schemaReady === true,
    summarize(health.json?.database)
  );

  // Any GET against the Neon Auth-compatible endpoint provisions the
  // neon_auth tables when they are missing (idempotent).
  const sessionProbe = await request("/api/neon-auth/get-session");
  check(
    "GET /api/neon-auth/get-session succeeds",
    sessionProbe.status === 200,
    `status ${sessionProbe.status} ${summarize(sessionProbe.text)}`
  );

  const healthAfter = await request("/api/health");
  check(
    "Neon Auth tables exist (tablesReady)",
    healthAfter.json?.auth?.tablesReady === true,
    summarize(healthAfter.json?.auth)
  );

  /* 2. Public pages render ---------------------------------------- */
  const about = await request("/about");
  check("GET /about returns 200", about.status === 200, `status ${about.status}`);
  check(
    "/about renders About content",
    /More than nails/i.test(about.text),
    `body length ${about.text.length}`
  );

  /* 3. Registration / session ------------------------------------- */
  const register = await request("/api/auth/register", {
    method: "POST",
    body: {
      firstName: "Aurena",
      lastName: "Smoke",
      email: EMAIL,
      mobile: MOBILE,
      password: PASSWORD,
      confirmPassword: PASSWORD
    }
  });

  const registered = register.status === 201;
  const alreadyExists = register.status === 409;
  check(
    "POST /api/auth/register creates (or already has) the QA customer",
    registered || alreadyExists,
    `status ${register.status} ${summarize(register.json?.error || register.json?.user || "")}`
  );

  if (!registered) {
    const login = await request("/api/auth/login", {
      method: "POST",
      body: { identifier: EMAIL, password: PASSWORD }
    });
    check(
      "POST /api/auth/login works for the QA customer",
      login.status === 200,
      `status ${login.status} ${summarize(login.json?.error || "")}`
    );
  }

  const session = await request("/api/auth/session");
  check(
    "Session cookie establishes an authenticated session",
    session.status === 200 && session.json?.user?.email === EMAIL,
    `status ${session.status} ${summarize(session.json?.user?.email || session.json?.error || "")}`
  );
  check(
    "Customer role is CUSTOMER",
    String(session.json?.user?.role || "").toUpperCase() === "CUSTOMER",
    `role ${session.json?.user?.role}`
  );

  /* 4. Protected customer pages do not bounce authenticated users -- */
  for (const path of ["/profile", "/appointments", "/wishlist", "/notifications"]) {
    const page = await request(path);
    check(
      `Authenticated GET ${path} renders (no login redirect)`,
      page.status === 200,
      `status ${page.status}${page.response.headers.get("location") ? ` → ${page.response.headers.get("location")}` : ""}`
    );
  }

  /* 5. Authorization: customer must not reach the admin dashboard -- */
  const adminPage = await request("/admin/dashboard");
  check(
    "Customer cannot open /admin/dashboard",
    adminPage.status !== 200,
    `status ${adminPage.status}${adminPage.json?.error ? ` ${summarize(adminPage.json.error)}` : ""}`
  );

  const adminLogin = await request("/api/auth/admin-login", {
    method: "POST",
    body: { identifier: EMAIL, password: PASSWORD }
  });
  check(
    "Customer credentials are rejected by the admin login API",
    adminLogin.status === 403,
    `status ${adminLogin.status} ${summarize(adminLogin.json?.error || "")}`
  );

  /* 6. Logout invalidates the session ----------------------------- */
  const logout = await request("/api/auth/logout", { method: "POST" });
  check(
    "POST /api/auth/logout returns 200",
    logout.status === 200,
    `status ${logout.status} ${summarize(logout.json?.error || "")}`
  );

  const afterLogout = await request("/api/auth/session");
  check(
    "Session is empty after logout",
    afterLogout.status === 200 && !afterLogout.json?.user,
    `status ${afterLogout.status} ${summarize(afterLogout.json?.user?.email || "no user")}`
  );

  jar.clear();
  const protectedWithoutSession = await request("/profile");
  const redirectLocation = protectedWithoutSession.response.headers.get("location") || "";
  check(
    "Unauthenticated /profile redirects to /login",
    protectedWithoutSession.status >= 300 &&
      protectedWithoutSession.status < 400 &&
      redirectLocation.includes("/login"),
    `status ${protectedWithoutSession.status} → ${redirectLocation}`
  );

  /* 7. Login again: session persistence across requests ---------- */
  const relogin = await request("/api/auth/login", {
    method: "POST",
    body: { identifier: EMAIL, password: PASSWORD, rememberMe: true }
  });
  check(
    "POST /api/auth/login signs the customer back in",
    relogin.status === 200,
    `status ${relogin.status} ${summarize(relogin.json?.error || "")}`
  );

  const persisted = await request("/api/auth/session");
  check(
    "Session persists on a subsequent request",
    persisted.status === 200 && persisted.json?.user?.email === EMAIL,
    `status ${persisted.status}`
  );

  const profileAgain = await request("/profile");
  check(
    "Authenticated /profile is still reachable after re-login",
    profileAgain.status === 200,
    `status ${profileAgain.status}`
  );

  await request("/api/auth/logout", { method: "POST" });

  /* 8. Administrator portal (opt-in) ------------------------------ *
   * Only runs when SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD are
   * provided, so production credentials never live in the repo.
   * This is the check that actually proves the admin login fix.
   */
  const adminEmail = process.env.SMOKE_ADMIN_EMAIL || "";
  const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || "";

  if (adminEmail && adminPassword) {
    jar.clear();

    const wrongPassword = await request("/api/auth/admin-login", {
      method: "POST",
      body: { identifier: adminEmail, password: `${adminPassword}-wrong` }
    });
    check(
      "Wrong administrator password is rejected",
      wrongPassword.status === 401,
      `status ${wrongPassword.status} ${summarize(wrongPassword.json?.error || "")}`
    );

    jar.clear();
    const adminLogin = await request("/api/auth/admin-login", {
      method: "POST",
      body: { identifier: adminEmail, password: adminPassword, rememberMe: true }
    });
    check(
      "Administrator signs in via POST /api/auth/admin-login",
      adminLogin.status === 200 && adminLogin.json?.user?.role === "ADMIN",
      `status ${adminLogin.status} role=${adminLogin.json?.user?.role || "none"}`
    );

    const adminSession = await request("/api/auth/session");
    check(
      "Administrator session is valid",
      adminSession.status === 200 &&
        adminSession.json?.user?.role === "ADMIN" &&
        adminSession.json?.user?.email === adminEmail.toLowerCase(),
      `status ${adminSession.status}`
    );

    const adminDashboardPage = await request("/admin/dashboard");
    check(
      "Administrator opens /admin/dashboard",
      adminDashboardPage.status === 200,
      `status ${adminDashboardPage.status}`
    );

    const adminDashboardApi = await request("/api/admin/dashboard");
    check(
      "Administrator can call /api/admin/dashboard",
      adminDashboardApi.status === 200,
      `status ${adminDashboardApi.status}`
    );

    await request("/api/auth/logout", { method: "POST" });
    jar.clear();
  } else {
    console.log(
      "[SKIP] Administrator login checks — set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD to enable"
    );
  }

  /* Summary ------------------------------------------------------ */
  const passed = results.length - failures;
  console.log(`\n${passed}/${results.length} checks passed.`);
  if (failures > 0) {
    console.error(`${failures} check(s) failed against ${BASE_URL}`);
    process.exit(1);
  }
  console.log(`Live smoke test passed against ${BASE_URL}\n`);
}

main().catch((error) => {
  console.error("Smoke test crashed:", error);
  process.exit(1);
});
