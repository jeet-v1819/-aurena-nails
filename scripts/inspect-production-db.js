#!/usr/bin/env node
// Read-only preflight: supply DATABASE_URL via environment, never on the CLI.
const path = require('path');
require('dotenv').config({
  path: [path.join(process.cwd(), '.env.local'), path.join(process.cwd(), '.env')]
});
const { Pool } = require('pg');
const { describeDatabaseTarget } = require('../prisma/adminProvisioning');
const { inspectSchema, summarizeSchema } = require('../prisma/schemaPreflight');
(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    console.log(`Target: ${describeDatabaseTarget(process.env.DATABASE_URL)}`);
    const report = await inspectSchema(pool);
    summarizeSchema(report);
    if (report.issues.length) process.exitCode = 1;
  } finally { await pool.end(); }
})().catch(() => { console.error('Inspection failed; confirm connectivity, permissions and schema.'); process.exitCode = 1; });
