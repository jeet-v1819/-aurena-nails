# Admin login: production investigation and recovery

**Status:** The live password and Neon project have NOT been verified from this repository checkout. The reported 401 means the sign-in provider rejected the credential; it does **not** establish whether the auth user is missing, the password is wrong, the provider points elsewhere, or the stored format is incompatible. A role failure would normally return 403. Do not treat an old local seed result as proof of production state.

## What the code does

`/admin/login` POSTs `{identifier,password,rememberMe}` to `/api/auth/admin-login` → `loginUser()` (`services/authService.js`). Email is trimmed/lowercased; Indian mobiles are normalized to ten digits and looked up in `public."User"`. The password is checked by the configured Neon Auth endpoint (`NEON_AUTH_BASE_URL`, or the in-app `/api/neon-auth` endpoint using `neon_auth."account"` and Better Auth's scrypt verification). After successful authentication the app loads the profile, requires `active=true`, `deletedAt=null`, matching `authId` and `role=ADMIN`; session cookies are set only after those checks. The layout and admin APIs verify the session again.

The prior repo instead targeted `aurena` for **every** Prisma query, including rate limits, users, services and appointments. The reported production database has application tables under `public`, so an `aurena.User` provisioning query cannot update the live application. The repository migration `20261014080000_aurena_initial` also differs from the reported production history `20260101000000_init`. We changed the Prisma model and adapter target to `public`, and the initial SQL **for fresh test databases only**. We have NOT migrated or altered any production table or reconciled its migration ledger. Never run `prisma migrate deploy`, `migrate dev`, `db push`, `db:seed`, or that baseline SQL on production: it may create duplicates or fail on existing objects. Keep production migration history as-is until an operator compares the actual DDL/checksum with the repository; any future migration must be a separate reviewed change.

## 1. Inspect production without writes

From a secure operator shell, using the **same** Neon project/branch/database as Netlify `DATABASE_URL` (pooled connection with SSL):

```bash
# Set DATABASE_URL securely in your shell or CI secret store (do not paste it into logs/chat).
node scripts/prisma-generate.js
node scripts/inspect-production-db.js
INITIAL_ADMIN_EMAIL='admin@aurenanails.com' node scripts/provision-admin.js --check
```

`inspect-production-db.js` reports the target hostname/database, all existing application/auth table and column types, indexes, constraints, enums and `_prisma_migrations` rows, and fails when modeled fields are missing. No contents of customer records, password hashes or URLs are printed. Inspect **all** differences and constraints, not just the presence of `public.User`. The `--check` script also reports whether the auth user, credential, app role, active state and IDs match. To check the supplied password without echoing it or putting it in shell history:

```bash
read -rsp 'Admin password to verify: ' INITIAL_ADMIN_PASSWORD; echo
export INITIAL_ADMIN_PASSWORD
INITIAL_ADMIN_EMAIL='admin@aurenanails.com' node scripts/provision-admin.js --check
```

Compare the inspected hostname/database, Neon branch/project and `NEON_AUTH_BASE_URL` with **Netlify Site configuration → Environment variables** for the production deploy (not just the local env or a preview context). Verify `AUTH_SECRET` is set, `NEXT_PUBLIC_APP_URL=https://aurena-nails.netlify.app`, and Netlify's published deploy commit is the expected `main` commit. Hosted Neon Auth may own a different database: in that case this CLI's direct password reset is not valid; use that provider's supported password reset in its own project and link the verified auth ID to the application profile only after explicit review. Do not infer that the two targets match just because their email addresses do.

## 2. Provision/reset only after the preflight passes

Only when the actual target has been explicitly checked, schema and provider format are compatible, the auth user is not banned, and any existing IDs match:

```bash
# Password is still held in the shell environment from the read step above.
export INITIAL_ADMIN_EMAIL='admin@aurenanails.com'
export INITIAL_ADMIN_MOBILE='9876543210' # optional; leave unset if owned by another account
export CONFIRM_DATABASE_TARGET='<host>/<database>' # exactly as printed in the preflight error
node scripts/provision-admin.js --apply
unset INITIAL_ADMIN_PASSWORD
```

The CLI refuses writes without a matching `CONFIRM_DATABASE_TARGET`, the full schema preflight, or when an external `NEON_AUTH_BASE_URL` is configured. It uses Better Auth's `hashPassword` and verifies with `verifyPassword`; a reset revokes **only that admin's** old sessions by default (`--keep-sessions` overrides). If the account is missing, it creates one auth user, one credential account and one app profile. If the profile/auth ID conflicts or the account is inactive/deleted/banned, it stops for manual investigation instead of silently reassociating/re-enabling an identity. Repeating it does not create duplicate profiles. Avoid the publicly shared example password in future: rotate to a new unique password after confirming the intended account.

## 3. Verify live (after the code is deployed)

Use the project's GitHub `main` → Netlify deployment workflow after CI and review. Production deploy must **not** automatically run migrations or seeds. Check Netlify deploy logs and the published commit and environment context. Then (secure shell, re-enter password via `read -rsp`):

```bash
export BASE_URL='https://aurena-nails.netlify.app'
export AUTH_TEST_ADMIN_EMAIL='admin@aurenanails.com'
read -rsp 'Admin password: ' AUTH_TEST_ADMIN_PASSWORD; echo
export AUTH_TEST_ADMIN_PASSWORD
node scripts/verify-auth-flows.js
unset AUTH_TEST_ADMIN_PASSWORD
```

This checks HTTP admin login, session reuse/navigation, admin API and dashboard, wrong password, customer registration/login and admin denial. It **creates a dedicated QA customer** if missing. On production, obtain approval for that write first; alternatively verify with an existing authorized customer via the browser. Check customer/appointment/service row counts before and after via the read-only database and verify existing data was not changed. Do not claim live acceptance before testing the deployed site and a refresh in a browser. Never print/store cookies or hashes.

If the preflight fails because production columns differ, **stop**: adjust the Prisma schema to the observed production columns and test on a sanitized copy before deploying. Do not provision, migrate, or create parallel tables to silence the error.
