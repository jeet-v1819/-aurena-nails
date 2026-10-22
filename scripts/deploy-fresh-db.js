#!/usr/bin/env node
// Never replay the repository's fresh baseline onto an existing production DB.
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { execFileSync } = require('child_process');

(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const { rows } = await pool.query(`
      SELECT table_schema, table_name FROM information_schema.tables
      WHERE table_schema IN ('public', 'aurena')
      UNION ALL
      SELECT n.nspname, t.typname FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname IN ('public', 'aurena') AND t.typtype = 'e' 
    `);
    if (rows.length) {
      throw new Error('Existing application tables or migration history detected. Refusing to apply a fresh baseline.');
    }
  } finally {
    await pool.end();
  }
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' });
})().catch((error) => {
  const safe = error.message === 'Existing application tables or migration history detected. Refusing to apply a fresh baseline.';
  console.error(safe ? error.message : 'Migration preflight/deploy failed; no further steps were run.');
  process.exitCode = 1;
});
