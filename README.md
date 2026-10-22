# Aurena Nails

Luxury nail studio site with a customer portal, booking flow and an
administrator management portal.

* Framework: Next.js 14 (App Router, **JavaScript only** — `.js` / `.jsx`)
* Database: Neon PostgreSQL + Prisma ORM (application tables in `public`) with `@prisma/adapter-pg`
* Auth: Neon Auth (managed endpoint or the app's built-in `/api/neon-auth`
  compatible endpoint) with a `neon_auth` schema in the same database

## Quick start

```bash
npm install --legacy-peer-deps
cp .env.example .env.local     # then fill in the placeholders
node scripts/prisma-generate.js
# On a NEW EMPTY database only; never run this baseline on production.
npm run db:deploy
npm run db:seed
npm run dev
```

## Administrator account

Production uses `public` application tables and `neon_auth` auth tables. Do not
assume the reported password exists in Neon. The committed initial migration
is for **fresh databases only**; production has a different migration history.
Before any writes, inspect the real target, schema, auth provider, and account:

```bash
node scripts/inspect-production-db.js
INITIAL_ADMIN_EMAIL=admin@aurenanails.com node scripts/provision-admin.js --check
```

Only after the preflight and Netlify provider/target comparison, use
`CONFIRM_DATABASE_TARGET=<host>/<database> node scripts/provision-admin.js --apply`
with the email and password supplied securely through environment variables.
See [docs/admin-login-runbook.md](docs/admin-login-runbook.md) for precise
commands, warnings and live verification. Do not run `db:seed` to reset an
administrator or `db:deploy` against the existing production database.

## Tests

```bash
npm run build
npm run test:e2e        # Playwright (needs a reachable database + Chromium)
npm run test:auth       # HTTP auth flows incl. admin login + privilege separation
```

`npm run test:auth` accepts `BASE_URL`, `AUTH_TEST_ADMIN_EMAIL` and
`AUTH_TEST_ADMIN_PASSWORD`; without admin credentials the admin checks are
skipped and the customer flows are still verified.
