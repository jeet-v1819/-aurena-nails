# Admin login — root cause, fix and production runbook

Live site: <https://aurena-nails.netlify.app/admin/login>

## Symptom

`/admin/login` returns **"Invalid email/mobile number or password"** for
`admin@aurenanails.com` even though the expected password is correct.

## Root cause

The password check was never the problem — the administrator's **Neon Auth
credential was never (re)written**.

`/api/auth/admin-login` → `loginUser()` does two things:

1. looks up the application profile in `aurena."User"` to find the role, then
2. verifies the password through Neon Auth (`POST {NEON_AUTH_BASE_URL}/sign-in/email`).

A 401 with the exact message in the report is produced only by step 2. If the
role were wrong the API would answer **403**, and if the app profile were
missing the API would answer **401 without a role**, but the account still has
to exist in Neon Auth.

The old `prisma/seed.js` created the admin like this:

```js
fetch(`${NEON_AUTH_BASE_URL}/sign-up/email`, { ...credentials... })
// on failure: look up the existing neon_auth user id and move on
```

That has three failure modes, all of which leave the application profile with
`role = ADMIN` while the auth credential is missing, empty or holds an older
password:

| # | Situation | Old seed behaviour | Result |
|---|-----------|-------------------|--------|
| 1 | Admin already exists in `neon_auth` (second run, password rotation, imported account, earlier partial seed) | Sign-up returns `422 User already exists`; seed only links `authId` and grants `ADMIN` | Password **never updated**, login keeps failing while the seed prints "verified with ADMIN role" |
| 2 | `NEON_AUTH_BASE_URL` unset — exactly what `.env.example` recommends for production (the in-app `/api/neon-auth` endpoint) | Entire admin block **skipped silently** | No administrator and no credential at all |
| 3 | Seed machine cannot reach the deployed site | `fetch` throws / returns non-OK | Only the app profile gets created; no usable password |

Both failure modes were reproduced locally against a real PostgreSQL database:
after corrupting the credential, re-running the documented seed command still
returned `401 INVALID_CREDENTIALS` *while reporting success*. That is the bug.

Nothing in the request path (email lookup, role check, cookie/session
handling, redirects) needed to be weakened — no password verification was
bypassed and no debug bypass was added.

## The fix

* `prisma/adminProvisioning.js` (new) — deterministic, idempotent
  provision/reset against the real Neon database:
  * upserts `neon_auth."user"`
  * upserts the `credential` row in `neon_auth."account"` with a fresh
    `@better-auth/utils/password` scrypt hash (`salt:hex`, N=16384 r=16 p=1
    dkLen=64) — the identical format the login route verifies and the one the
    app's own password-reset flow already writes
  * upserts `aurena."User"` with `role = ADMIN`, `active = true`
  * reads everything back and **re-verifies the password** with the same
    `verifyPassword()` used at sign-in
  * never deletes users or application data (only the admin's own auth
    sessions, and only when `revokeSessions` is enabled)
* `prisma/seed.js` — administrator provisioning no longer needs
  `NEON_AUTH_BASE_URL` or a reachable deployment, and **fails loudly** if the
  password cannot be verified instead of printing a success message.
* `scripts/provision-admin.js` (new) — check/apply CLI, plus optional live
  verification through the public login API.
* `services/authService.js` — when a credential sign-in is rejected, the server
  now logs (without secrets) whether a credential row/password exists and
  whether the admin portal was targeted. The HTTP response is unchanged.
* `app/admin/layout.jsx` — a signed-in customer hitting `/admin/*` is now
  redirected to `/forbidden` instead of receiving a rendered 200 page, so
  automated checks can tell "denied" from "allowed".

## Production runbook

All commands are safe to repeat. They never truncate or drop data.

### 1. Inspect the current production state (read-only)

```bash
DATABASE_URL='<Neon pooled connection string>' \
INITIAL_ADMIN_EMAIL='admin@aurenanails.com' \
INITIAL_ADMIN_PASSWORD='<current password to test>' \
node scripts/provision-admin.js --check
```

`--check` performs no writes. It reports whether the `neon_auth` user, the
credential row, the password format, the `ADMIN` role and the `authId` link
exist, and whether the supplied password matches. It prints the database
host/database name but **never** the connection string, password or hash.

### 2. Create or reset the administrator

```bash
DATABASE_URL='<Neon pooled connection string>' \
INITIAL_ADMIN_EMAIL='admin@aurenanails.com' \
INITIAL_ADMIN_MOBILE='9876543210' \
INITIAL_ADMIN_PASSWORD='<strong password: 8-128 chars, upper+lower+digit>' \
node scripts/provision-admin.js --apply --verify-live
```

* Use the **pooled** `DATABASE_URL` (`...-pooler...`, `sslmode=require`).
* `--apply` creates the Neon Auth user if needed, writes/resets the credential
  password, guarantees `role = ADMIN` / `active = true` in `aurena."User"`, and
  revokes the admin's old sessions (use `--keep-sessions` to skip).
* `--verify-live` then POSTs the credentials to
  `${NEXT_PUBLIC_APP_URL}/api/auth/admin-login` and requires `200` with
  `role = ADMIN`. Set `NEXT_PUBLIC_APP_URL=https://aurena-nails.netlify.app`.
* Equivalent seed form (also seeds catalogue/content data):

  ```bash
  DATABASE_URL='...' \
  INITIAL_ADMIN_EMAIL='admin@aurenanails.com' \
  INITIAL_ADMIN_PASSWORD='<password>' \
  node prisma/seed.js
  ```

The password is read from the environment — never pass it as a CLI flag and
never add it to `.env.example`, a workflow file or a commit.

### 3. Verify the live acceptance criteria

```bash
BASE_URL='https://aurena-nails.netlify.app' \
AUTH_TEST_ADMIN_EMAIL='admin@aurenanails.com' \
AUTH_TEST_ADMIN_PASSWORD='<password>' \
node scripts/verify-auth-flows.js
```

This checks: admin login 200 + `role=ADMIN`, valid admin session, dashboard
renders, wrong password 401, customer login still works, customer denied on
`/api/auth/admin-login` (403), `/api/admin/*` (403) and `/admin/dashboard`
(redirect to `/forbidden`), and logout invalidation.

For the full production smoke test:

```bash
SMOKE_BASE_URL='https://aurena-nails.netlify.app' \
SMOKE_ADMIN_EMAIL='admin@aurenanails.com' \
SMOKE_ADMIN_PASSWORD='<password>' \
node scripts/live-smoke.mjs
```

### 4. Environment checklist (Netlify)

| Variable | Expected value |
|----------|----------------|
| `DATABASE_URL` | Neon **pooled** PostgreSQL URL, `sslmode=require` |
| `AUTH_SECRET` | 32+ random characters (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | `https://aurena-nails.netlify.app` |
| `NEON_AUTH_BASE_URL` | Empty (built-in endpoint) **or** the hosted Neon Auth URL. It must be the same provider that the provisioning step wrote to. |

If a hosted Neon Auth endpoint is configured, it owns its `neon_auth` tables.
`provision-admin.js` writes to the database named by `DATABASE_URL`; if that is
a different database from the managed auth service, `--verify-live` will fail
and you should reset the password through Neon's console instead of the DB.

## Guarantees

* No password verification is skipped, weakened or bypassed.
* `admin-login` still returns `401` for a wrong password and `403` for a
  non-admin account.
* Customer accounts remain `CUSTOMER` and are denied the admin portal.
* No secrets are committed: `.env.example` holds placeholders only, and the
  lifecycle scripts read credentials from the environment.
