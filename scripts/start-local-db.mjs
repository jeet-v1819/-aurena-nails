import fs from "fs";
import path from "path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const dataDir = path.join("/tmp", "aurena-nails-pglite");
fs.mkdirSync(dataDir, { recursive: true });

const db = await PGlite.create({
  dataDir,
  extensions: {
    btree_gist
  }
});

const migrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20261014080000_aurena_initial",
  "migration.sql"
);

const checkRes = await db.query(`
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'aurena' AND table_name = 'User'
  ) AS "exists"
`);

if (!checkRes.rows?.[0]?.exists) {
  console.log("Applying migration.sql to PGlite database...");
  const sql = fs.readFileSync(migrationPath, "utf8");
  await db.exec(sql);
  console.log("✔ Applied migration.sql");
}

await db.exec(`
  CREATE SCHEMA IF NOT EXISTS "neon_auth";

  CREATE TABLE IF NOT EXISTS "neon_auth"."user" (
    "id" UUID PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT TRUE,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "banned" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS "neon_auth"."account" (
    "id" UUID PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS "neon_auth"."session" (
    "id" UUID PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE,
    "token" TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

const server = new PGLiteSocketServer({
  db,
  port: 5432,
  host: "127.0.0.1",
  maxConnections: 100
});

await server.start();
console.log("PGlite PostgreSQL socket server listening on 127.0.0.1:5432");
