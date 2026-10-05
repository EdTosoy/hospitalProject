import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });
    console.log('Migrations applied.');
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    'Migration failed; check schema compatibility and database availability. No automatic reset is performed.',
  );
  process.exitCode = 1;
});
