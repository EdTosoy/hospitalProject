import 'dotenv/config';
import { Pool, PoolClient } from 'pg';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
// Compare physical semantics, ignoring constraint names and unique index vs constraint syntax.
async function signature(client: PoolClient, namespace: string) {
  const tables = [
    'User',
    'Patient',
    'Appointment',
    'Queue',
    'Billing',
    'ConsultNote',
    'AuditLog',
  ];
  const columns = await client.query(
    `SELECT table_name,column_name,udt_name,is_nullable,character_maximum_length,datetime_precision,column_default FROM information_schema.columns WHERE table_schema=$1 AND table_name=ANY($2) ORDER BY table_name,ordinal_position`,
    [namespace, tables],
  );
  const enums = await client.query(
    `SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) labels FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname=$1 GROUP BY t.typname ORDER BY t.typname`,
    [namespace],
  );
  const keys = await client.query(
    `SELECT c.relname,co.contype, array(SELECT a.attname FROM unnest(co.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.num ORDER BY k.ord) cols, rc.relname target, rn.nspname target_namespace, array(SELECT a.attname FROM unnest(co.confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=rc.oid AND a.attnum=k.num ORDER BY k.ord) target_cols, co.confdeltype,co.confupdtype,co.confmatchtype,co.condeferrable,co.condeferred FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_class rc ON rc.oid=co.confrelid LEFT JOIN pg_namespace rn ON rn.oid=rc.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2) AND co.contype IN ('p','f') ORDER BY c.relname,co.contype,co.conkey`,
    [namespace, tables],
  );
  const unique = await client.query(
    `SELECT c.relname,array(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.num ORDER BY k.ord) cols,i.indnullsnotdistinct,i.indisvalid,i.indisready,pg_get_expr(i.indpred,i.indrelid) predicate,pg_get_expr(i.indexprs,i.indrelid) expressions FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2) AND i.indisunique ORDER BY c.relname,cols`,
    [namespace, tables],
  );
  const checks = await client.query(
    `SELECT c.relname,co.contype,pg_get_constraintdef(co.oid) definition FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2) AND co.contype IN ('c','x') ORDER BY c.relname,definition`,
    [namespace, tables],
  );
  return JSON.stringify({
    columns: columns.rows.map((row) => ({
      ...row,
      column_default: row.column_default
        ?.replace(/CURRENT_TIMESTAMP/gi, 'now()')
        .replaceAll(`"${namespace}".`, '')
        .replaceAll(`${namespace}.`, ''),
    })),
    enums: enums.rows,
    keys: keys.rows.map((row) => ({
      ...row,
      target_namespace:
        row.target_namespace === namespace
          ? 'application'
          : row.target_namespace,
    })),
    unique: unique.rows,
    checks: checks.rows,
  });
}
async function baseline() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(481522)');
    const migrations = readMigrationFiles({
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });
    const first = migrations[0];
    if (!first) throw new Error('No initial migration found');
    const namespace = `baseline_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA "${namespace}"`);
    await client.query(`SET LOCAL search_path TO "${namespace}"`);
    for (const statement of first.sql)
      await client.query(statement.replaceAll('"public"', `"${namespace}"`));
    if (
      (await signature(client, 'public')) !==
      (await signature(client, namespace))
    )
      throw new Error(
        'Existing schema does not match the baseline; inspect a backup with drizzle-kit pull before proceeding',
      );
    await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await client.query(
      'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)',
    );
    const existing = await client.query(
      'SELECT hash,created_at FROM drizzle.__drizzle_migrations',
    );
    if (
      existing.rowCount &&
      (!existing.rows.some(
        (row) =>
          row.hash === first.hash &&
          Number(row.created_at) === first.folderMillis,
      ) ||
        existing.rows.some(
          (row) =>
            !migrations.some(
              (migration) =>
                migration.hash === row.hash &&
                migration.folderMillis === Number(row.created_at),
            ),
        ))
    )
      throw new Error('Unrecognized migration history');
    if (!existing.rowCount)
      await client.query(
        'INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ($1,$2)',
        [first.hash, first.folderMillis],
      );
    await client.query(`DROP SCHEMA "${namespace}" CASCADE`);
    await client.query('COMMIT');
    console.log(
      'Existing schema verified and adopted; application tables and data unchanged.',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
baseline().catch((error) => {
  console.error(
    error instanceof Error && error.message.startsWith('Existing schema')
      ? error.message
      : 'Schema adoption failed; no application data changed.',
  );
  process.exitCode = 1;
});
