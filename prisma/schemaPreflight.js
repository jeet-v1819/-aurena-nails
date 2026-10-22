/** Read-only catalogue comparison. Never creates, migrates or moves tables. */
const { Prisma } = require("@prisma/client");

async function inspectSchema(pool) {
  const issues = [];
  const requiredTables = Prisma.dmmf.datamodel.models;
  const { rows: columns } = await pool.query(`
    SELECT table_schema, table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema IN ('public', 'aurena', 'neon_auth')
    ORDER BY table_schema, table_name, ordinal_position
  `);
  const columnSet = new Set(columns.map((c) => `${c.table_schema}.${c.table_name}.${c.column_name}`));
  for (const model of requiredTables) {
    const table = model.dbName || model.name;
    for (const field of model.fields) {
      if (field.kind === "object") continue;
      const column = field.dbName || field.name;
      if (!columnSet.has(`public.${table}.${column}`)) {
        issues.push(`Missing public."${table}"."${column}"`);
      }
    }
  }
  const authColumns = {
    user: ["id", "email", "name", "banned", "emailVerified", "role", "updatedAt"],
    account: ["id", "userId", "accountId", "providerId", "password", "updatedAt", "createdAt"],
    session: ["id", "userId", "token", "expiresAt", "createdAt", "updatedAt"]
  };
  for (const [table, fields] of Object.entries(authColumns)) {
    for (const column of fields) {
      if (!columnSet.has(`neon_auth.${table}.${column}`)) {
        issues.push(`Missing neon_auth."${table}"."${column}"`);
      }
    }
  }
  for (const [table, column, type] of [
    ["user", "id", "uuid"], ["account", "userId", "uuid"],
    ["account", "id", "uuid"], ["session", "userId", "uuid"]
  ]) {
    const actual = columns.find((c) => c.table_schema === "neon_auth" && c.table_name === table && c.column_name === column);
    if (actual && actual.data_type !== type) issues.push(`neon_auth."${table}"."${column}" must be ${type} (found ${actual.data_type})`);
  }
  const { rows: constraints } = await pool.query(`
    SELECT n.nspname AS schema, c.relname AS table_name, con.conname AS name,
           pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'neon_auth')
    ORDER BY n.nspname, c.relname, con.conname
  `);
  const { rows: indexes } = await pool.query(`
    SELECT schemaname AS schema, tablename AS table_name, indexname AS name, indexdef AS definition
    FROM pg_indexes WHERE schemaname IN ('public', 'neon_auth')
    ORDER BY schemaname, tablename, indexname
  `);
  const { rows: enums } = await pool.query(`
    SELECT n.nspname AS schema, t.typname AS name, e.enumlabel AS label
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public' ORDER BY t.typname, e.enumsortorder
  `);
  for (const type of Prisma.dmmf.datamodel.enums) {
    const labels = enums.filter((e) => e.name === (type.dbName || type.name)).map((e) => e.label);
    for (const value of type.values) {
      if (!labels.includes(value.dbName || value.name)) issues.push(`Missing public enum ${type.name}.${value.name}`);
    }
  }
  // Prisma's runtime queries rely on unique identifiers; provisioning must
  // never target a database with ambiguous emails or mappings.
  const uniqueIndex = (table, column) => indexes.some((i) =>
    i.schema === "public" && i.table_name === table &&
    /CREATE UNIQUE INDEX/.test(i.definition) &&
    new RegExp(`\\(\"?${column}\"?\\)`).test(i.definition));
  for (const column of ["email", "authId", "mobile"]) {
    if (!uniqueIndex("User", column)) issues.push(`Missing unique index on public."User"("${column}")`);
  }
  const authEmailUnique = indexes.some((i) => i.schema === "neon_auth" && i.table_name === "user" &&
    /CREATE UNIQUE INDEX/.test(i.definition) && /\(\"?email\"?\)/.test(i.definition));
  if (!authEmailUnique) issues.push('Missing unique index on neon_auth."user"(email)');

  let migrations = [];
  if (columnSet.has("public._prisma_migrations.migration_name")) {
    const result = await pool.query('SELECT migration_name, finished_at IS NOT NULL AS applied, rolled_back_at IS NOT NULL AS rolled_back FROM public."_prisma_migrations" ORDER BY started_at');
    migrations = result.rows;
  }
  const rowCounts = {};
  for (const table of ['User', 'Service', 'Appointment', 'WebsiteContent']) {
    if (columnSet.has(`public.${table}.id`) || columnSet.has(`public.${table}.key`)) {
      // Fixed identifiers only; read-only counts, never select application data.
      const result = await pool.query(`SELECT COUNT(*)::int AS count FROM public."${table}"`);
      rowCounts[table] = result.rows[0].count;
    }
  }
  return {
    issues, migrations, rowCounts,
    tables: [...new Set(columns.map((c) => `${c.table_schema}.${c.table_name}`))],
    columns, constraints, indexes, enums
  };
}

function summarizeSchema(report) {
  console.log(`  tables: ${report.tables.join(', ')}`);
  console.log(`  application row counts: ${Object.entries(report.rowCounts).map(([table, count]) => `${table}=${count}`).join(', ')}`);
  console.log(`  migrations: ${report.migrations.length ? report.migrations.map((m) => `${m.migration_name} (${m.applied ? 'applied' : 'unfinished'})`).join(', ') : '(none recorded)'}`);
  console.log(`  columns: ${report.columns.map((c) => `${c.table_schema}.${c.table_name}.${c.column_name}:${c.data_type}${c.is_nullable === 'YES' ? '?' : ''}`).join(', ')}`);
  console.log(`  constraints: ${report.constraints.map((c) => `${c.schema}.${c.table_name}.${c.name}: ${c.definition}`).join('; ')}`);
  console.log(`  indexes: ${report.indexes.map((i) => `${i.schema}.${i.table_name}.${i.name}: ${i.definition}`).join('; ')}`);
  console.log(`  enum values: ${report.enums.map((e) => `${e.schema}.${e.name}.${e.label}`).join(', ')}`);
  console.log(`  compatibility: ${report.issues.length ? report.issues.join('; ') : 'all modeled columns and required auth columns found'}`);
}

module.exports = { inspectSchema, summarizeSchema };
