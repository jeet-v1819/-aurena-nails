const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Prisma } = require('@prisma/client');
const { inspectSchema } = require('../../prisma/schemaPreflight');

function catalog({ missing = null, authIdType = 'uuid' } = {}) {
  const columns = Prisma.dmmf.datamodel.models.flatMap((model) =>
    model.fields.filter((field) => field.kind !== 'object').map((field) => ({
      table_schema: 'public', table_name: model.dbName || model.name,
      column_name: field.dbName || field.name, data_type: 'text', is_nullable: 'NO'
    })));
  for (const [table, names] of Object.entries({
    user: ['id', 'name', 'email', 'banned', 'emailVerified', 'role', 'updatedAt'],
    account: ['id', 'userId', 'accountId', 'providerId', 'password', 'updatedAt', 'createdAt'],
    session: ['id', 'userId', 'token', 'expiresAt', 'createdAt', 'updatedAt']
  })) {
    columns.push(...names.map((name) => ({
      table_schema: 'neon_auth', table_name: table, column_name: name,
      data_type: ['id', 'userId'].includes(name) ? authIdType : 'text', is_nullable: 'NO'
    })));
  }
  const enums = Prisma.dmmf.datamodel.enums.flatMap((type) =>
    type.values.map((value) => ({ schema: 'public', name: type.dbName || type.name, label: value.dbName || value.name })));
  const indexes = ['email', 'authId', 'mobile'].map((column) => ({
    schema: 'public', table_name: 'User', definition: `CREATE UNIQUE INDEX x ON public."User" ("${column}")`
  }));
  indexes.push({ schema: 'neon_auth', table_name: 'user', definition: 'CREATE UNIQUE INDEX x ON neon_auth."user" (email)' });
  return {
    async query(sql) {
      if (sql.includes('information_schema.columns')) return { rows: columns.filter((c) => `${c.table_schema}.${c.table_name}.${c.column_name}` !== missing) };
      if (sql.includes('FROM pg_constraint')) return { rows: [] };
      if (sql.includes('FROM pg_indexes')) return { rows: indexes };
      if (sql.includes('FROM pg_type')) return { rows: enums };
      if (sql.includes('SELECT COUNT(*)::int AS count FROM public.')) return { rows: [{ count: 0 }] };
      return { rows: [] };
    }
  };
}

test('matching public schema passes the read-only preflight', async () => {
  const report = await inspectSchema(catalog());
  assert.deepEqual(report.issues, []);
});

test('aurena/public mismatch and missing auth columns fail closed', async () => {
  const report = await inspectSchema(catalog({ missing: 'public.User.authId' }));
  assert.ok(report.issues.some((issue) => issue.includes('public."User"."authId"')));
});

test('incompatible Neon Auth ID type fails closed', async () => {
  const report = await inspectSchema(catalog({ authIdType: 'text' }));
  assert.ok(report.issues.some((issue) => issue.includes('must be uuid')));
});

test('fresh baseline creates application tables only in public', () => {
  const migration = fs.readFileSync('prisma/migrations/20261014080000_aurena_initial/migration.sql', 'utf8');
  assert.match(migration, /CREATE TABLE "public"\."User"/);
  assert.doesNotMatch(migration, /"aurena"\./);
});
