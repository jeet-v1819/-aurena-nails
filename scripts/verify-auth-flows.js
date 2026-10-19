#!/usr/bin/env node
/**
 * Aurena Nails — admin + customer authentication flow verification.
 *
 * Runs against a real HTTP deployment (local `next start` or production) and
 * exercises the public API. It never opens a database connection and never
 * prints credentials.
 *
 * Checks
 *   1. Admin can sign in through /api/auth/admin-login (200, role=ADMIN)
 *   2. The admin session is accepted by /api/auth/session
 *   3. The admin dashboard renders for the admin session
 *   4. A wrong password is rejected (401) and does not create a session
 *   5. A customer can still sign in through /api/auth/login
 *   6. A customer cannot use /api/auth/admin-login (403)
 *   7. A customer receives 403 from admin APIs and is redirected/denied on
 *      /admin/dashboard (never a rendered admin page)
 *   8. Logout invalidates the session
 *
 * Usage
 *   BASE_URL=http://localhost:3000 \
 *   AUTH_TEST_ADMIN_EMAIL=admin@aurenanails.com \
 *   AUTH_TEST_ADMIN_PASSWORD='...' \
 *   node scripts/verify-auth-flows.js
 *
 * Environment
 *   BASE_URL (or AUTH_TEST_BASE_URL / NEXT_PUBLIC_APP_URL, default localhost)
 *   AUTH_TEST_ADMIN_EMAIL    / AUTH_TEST_ADMIN_PASSWORD
 *     (fallbacks: SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD,
 *      INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD)
 *   AUTH_TEST_CUSTOMER_EMAIL (optional, default qa.auth-check@aurena-nails.invalid)
 *   AUTH_TEST_CUSTOMER_PASSWORD (optional, default AuthCheck@2026)
 *
 * Exit code 0 = all executed checks passed.
 */
const BASE_URL = (
  process.env.BASE_URL ||
  process.env.AUTH_TEST_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const ADMIN_EMAIL =
  process.env.AUTH_TEST_ADMIN_EMAIL ||
  process.env.SMOKE_ADMIN_EMAIL ||
  process.env.INITIAL_ADMIN_EMAIL ||
  "";
const ADMIN_PASSWORD =
  process.env.AUTH_TEST_ADMIN_PASSWORD ||
  process.env.SMOKE_ADMIN_PASSWORD ||
  process.env.INITIAL_ADMIN_PASSWORD ||
  "";

const CUSTOMER_EMAIL =
  process.env.AUTH_TEST_CUSTOMER_EMAIL || "qa.auth-check@aurena-nails.invalid";
const CUSTOMER_MOBILE = process.env.AUTH_TEST_CUSTOMER_MOBILE || "9999900002";
const CUSTOMER_PASSWORD =
  process.env.AUTH_TEST_CUSTOMER_PASSWORD || "AuthCheck@2026";

let failures = 0;
let passed = 0;
let skipped = 0;

function check(name, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`[PASS] ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures += 1;
    console.log(`[FAIL] ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function skip(name, detail = "") {
  skipped += 1;
  console.log(`[SKIP] ${name}${detail ? ` — ${detail}` : ""}`);
}

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
    const expired = /expires=Thu, 01 Jan 1970/i.test(rawCookie) || /Max-Age=0/i.test(rawCookie);
    if (!name) continue;
    if (!value || expired) jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(path, { method = "GET", body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: {
      accept: "application/json, text/html;q=0.9",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(jar.size ? { cookie: cookieHeader() } : {})
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
  return {
    status: response.status,
    location: response.headers.get("location") || "",
    text,
    json
  };
}

async function ensureCustomer() {
  const register = await request("/api/auth/register", {
    method: "POST",
    body: {
      firstName: "Auth",
      lastName: "Check",
      email: CUSTOMER_EMAIL,
      mobile: CUSTOMER_MOBILE,
      password: CUSTOMER_PASSWORD,
      confirmPassword: CUSTOMER_PASSWORD
    }
  });

  if (register.status === 201 || register.status === 200) return true;

  if (register.status === 409) {
    jar.clear();
    const login = await request("/api/auth/login", {
      method: "POST",
      body: { identifier: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }
    });
    return login.status === 200;
  }

  // The mobile number may belong to another QA run; retry with a random one.
  const retry = await request("/api/auth/register", {
    method: "POST",
    body: {
      firstName: "Auth",
      lastName: "Check",
      email: CUSTOMER_EMAIL,
      mobile: `9${String(Date.now()).slice(-9)}`,
      password: CUSTOMER_PASSWORD,
      confirmPassword: CUSTOMER_PASSWORD
    }
  });
  return retry.status === 201 || retry.status === 200 || retry.status === 409;
}

async function main() {
  console.log(`\nAurena Nails auth flow verification → ${BASE_URL}\n`);

  const health = await request("/api/health");
  check(
    "GET /api/health is reachable",
    health.status === 200,
    `status ${health.status}`
  );
  check(
    "Database is connected",
    health.json?.database?.connected === true,
    `status ${health.status}`
  );

  /* ---------------------------------------------------------------- *
   * Administrator flows
   * ---------------------------------------------------------------- */
  const adminConfigured = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

  if (!adminConfigured) {
    skip(
      "Administrator login",
      "set AUTH_TEST_ADMIN_EMAIL and AUTH_TEST_ADMIN_PASSWORD to test the admin portal"
    );
  } else {
    const adminLogin = await request("/api/auth/admin-login", {
      method: "POST",
      body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD, rememberMe: true }
    });
    check(
      "Administrator can sign in via /api/auth/admin-login",
      adminLogin.status === 200 && adminLogin.json?.user?.role === "ADMIN",
      `status ${adminLogin.status}${
        adminLogin.json?.code ? ` (${adminLogin.json.code})` : ""
      }`
    );

    const adminSession = await request("/api/auth/session");
    check(
      "Administrator session is valid",
      adminSession.status === 200 &&
        adminSession.json?.user?.email === ADMIN_EMAIL.toLowerCase() &&
        adminSession.json?.user?.role === "ADMIN",
      `status ${adminSession.status} role=${adminSession.json?.user?.role || "none"}`
    );

    const adminDashboard = await request("/admin/dashboard");
    check(
      "Administrator can open /admin/dashboard",
      adminDashboard.status === 200 &&
        !/Administrator Login/i.test(adminDashboard.text),
      `status ${adminDashboard.status}`
    );

    const adminApi = await request("/api/admin/dashboard");
    check(
      "Administrator can call admin APIs",
      adminApi.status === 200,
      `status ${adminApi.status}`
    );

    // Wrong password must be rejected and must not replace the session.
    await request("/api/auth/logout", { method: "POST" });
    jar.clear();

    const wrongPassword = await request("/api/auth/admin-login", {
      method: "POST",
      body: { identifier: ADMIN_EMAIL, password: `${ADMIN_PASSWORD}-wrong`, rememberMe: true }
    });
    check(
      "Wrong administrator password is rejected",
      wrongPassword.status === 401,
      `status ${wrongPassword.status}`
    );
    check(
      "Rejected sign-in does not create a session",
      !jar.has("aurena_session_token") &&
        !jar.has("__Secure-neon-auth.session_token"),
      `cookies: ${[...jar.keys()].join(", ") || "none"}`
    );
  }

  /* ---------------------------------------------------------------- *
   * Customer flows (must keep working) + privilege separation
   * ---------------------------------------------------------------- */
  jar.clear();
  const customerReady = await ensureCustomer();
  check(
    "QA customer can register or sign in",
    customerReady,
    CUSTOMER_EMAIL
  );

  if (customerReady) {
    const customerSession = await request("/api/auth/session");
    check(
      "Customer session has role CUSTOMER",
      customerSession.json?.user?.role === "CUSTOMER",
      `role ${customerSession.json?.user?.role || "none"}`
    );

    const customerAdminLogin = await request("/api/auth/admin-login", {
      method: "POST",
      body: { identifier: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }
    });
    check(
      "Customer credentials are rejected by /api/auth/admin-login",
      customerAdminLogin.status === 403,
      `status ${customerAdminLogin.status}`
    );

    // The rejected admin-login attempt must not leave an admin-capable session
    // behind; re-establish the customer session for the next checks.
    jar.clear();
    await request("/api/auth/login", {
      method: "POST",
      body: { identifier: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }
    });

    const customerAdminApi = await request("/api/admin/dashboard");
    check(
      "Customer is denied admin APIs (403)",
      customerAdminApi.status === 403,
      `status ${customerAdminApi.status}`
    );

    const customerAdminPage = await request("/admin/dashboard");
    const deniedByStatus = customerAdminPage.status >= 300;
    const deniedByContent = /Administrator Access Required/i.test(
      customerAdminPage.text
    );
    check(
      "Customer cannot open the admin dashboard",
      deniedByStatus || deniedByContent,
      `status ${customerAdminPage.status}${customerAdminPage.location ? ` → ${customerAdminPage.location}` : ""}`
    );
    check(
      "Denied admin request does not render admin navigation",
      !/Admin Portal|admin-dashboard-view|Sign out of Admin/i.test(
        customerAdminPage.text
      ),
      `status ${customerAdminPage.status}`
    );

    const logout = await request("/api/auth/logout", { method: "POST" });
    check("Logout returns 200", logout.status === 200, `status ${logout.status}`);

    const afterLogout = await request("/api/auth/session");
    check(
      "Session is empty after logout",
      afterLogout.status === 200 && !afterLogout.json?.user,
      `status ${afterLogout.status}`
    );
  }

  console.log(
    `\n${passed} passed, ${failures} failed, ${skipped} skipped\n`
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error("Auth flow verification crashed:", error.message);
  process.exit(1);
});
