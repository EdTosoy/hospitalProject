import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

// Only creates isolated databases. Never resets, truncates, or drops caller data.
describe('Database migration lifecycle', () => {
  it('initializes, seeds, adopts legacy data, and refuses incompatible schemas', async () => {
    if (
      !process.env.DATABASE_URL ||
      !new URL(process.env.DATABASE_URL).pathname.includes('test')
    )
      throw new Error(
        'Use a dedicated test database URL and a role with CREATEDB',
      );
    const source = new URL(process.env.DATABASE_URL);
    const control = new Pool({ connectionString: source.href });
    const pools: Pool[] = [];
    const suffix = randomUUID().replaceAll('-', '');
    const tables = [
      'User',
      'Patient',
      'Appointment',
      'Queue',
      'ConsultNote',
      'Billing',
      'AuditLog',
    ];
    const legacy = readFileSync(
      resolve('test/fixtures/legacy-schema.sql'),
      'utf8',
    );
    const run = (url: string, script: string, expected = 0) => {
      let status = 0;
      try {
        execFileSync(
          process.execPath,
          [
            resolve('node_modules/tsx/dist/cli.mjs'),
            `src/database/${script}.ts`,
          ],
          {
            env: {
              ...process.env,
              DATABASE_URL: url,
              NODE_ENV: 'development',
              SEED_PASSWORD: 'migration-test-password',
            },
            stdio: 'pipe',
            timeout: 20000,
          },
        );
      } catch (error) {
        status = (error as { status?: number }).status ?? -1;
      }
      expect({ script, status }).toEqual({ script, status: expected });
    };
    const digest = async (pool: Pool) => {
      const hash = createHash('sha256');
      for (const table of tables) {
        const result = await pool.query(`SELECT * FROM "${table}" ORDER BY id`);
        // Compare every original field; additive migration columns have separate assertions.
        const rows = result.rows.map((row) => {
          if (table !== 'Billing') return row;
          const {
            amountMinor: _amountMinor,
            currency: _currency,
            ...legacyFields
          } = row;
          return legacyFields;
        });
        hash.update(JSON.stringify(rows));
      }
      return hash.digest('hex');
    };
    const create = async (kind: string) => {
      const name = `hospital_${kind}_test_${suffix}`;
      await control.query(`CREATE DATABASE "${name}"`);
      const url = new URL(source.href);
      url.pathname = `/${name}`;
      const pool = new Pool({ connectionString: url.href });
      pools.push(pool);
      return { pool, url: url.href };
    };
    try {
      const fresh = await create('fresh');
      run(fresh.url, 'migrate');
      run(fresh.url, 'migrate');
      run(fresh.url, 'seed');
      const seeded = await digest(fresh.pool);
      run(fresh.url, 'seed');
      expect(await digest(fresh.pool)).toBe(seeded);
      expect(
        (await fresh.pool.query('SELECT count(*)::int AS count FROM "User"'))
          .rows[0].count,
      ).toBe(6);

      const adopted = await create('adopted');
      await adopted.pool.query(legacy);
      // Exercise original UUID/text IDs, timestamp precision, enums, nullable links, and money.
      await adopted.pool.query(`
        INSERT INTO "User" (id,email,password,role,"updatedAt") VALUES ('legacy-user','legacy@example.test','fixture-not-a-login-password','DOCTOR','2020-01-02 12:34:56.789');
        INSERT INTO "Patient" (id,"userId","firstName","lastName",dob,gender,phone,"updatedAt") VALUES ('legacy-patient','legacy-user','Legacy','Patient','1990-02-03','OTHER','09123456789','2020-01-02');
        INSERT INTO "Appointment" (id,"patientId","doctorId","dateTime",reason,"updatedAt") VALUES ('legacy-appointment','legacy-patient','legacy-user','2027-01-01 01:23:45.678','Fixture','2020-01-02');
        INSERT INTO "Queue" (id,"patientId","queueNumber",status) VALUES ('legacy-queue','legacy-patient',42,'COMPLETED');
        INSERT INTO "ConsultNote" (id,"patientId","doctorId","appointmentId","updatedAt") VALUES ('legacy-note','legacy-patient','legacy-user','legacy-appointment','2020-01-02');
        INSERT INTO "Billing" (id,"patientId","appointmentId",amount,description,status,"paidAt") VALUES ('legacy-bill','legacy-patient','legacy-appointment',17.125,'Fixture','PAID','2020-01-03');
        INSERT INTO "AuditLog" (id,"actorId",action,resource,"resourceId") VALUES ('legacy-audit','legacy-user','TEST','Patient','legacy-patient');
      `);
      const before = await digest(adopted.pool);
      run(adopted.url, 'baseline');
      run(adopted.url, 'baseline');
      run(adopted.url, 'migrate');
      expect(await digest(adopted.pool)).toBe(before);
      expect(
        (
          await adopted.pool.query(
            `SELECT amount, "amountMinor", currency FROM "Billing" WHERE id='legacy-bill'`,
          )
        ).rows[0],
      ).toEqual({ amount: 17.125, amountMinor: null, currency: null });
      await adopted.pool.query(
        "INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ('unknown-fixture',1)",
      );
      run(adopted.url, 'baseline', 1);
      expect(await digest(adopted.pool)).toBe(before);

      const mismatch = await create('mismatch');
      await mismatch.pool.query(legacy);
      await mismatch.pool.query(
        'ALTER TABLE "Patient" ADD COLUMN "unexpectedFixture" text',
      );
      run(mismatch.url, 'baseline', 1);
      expect(
        (
          await mismatch.pool.query(
            "SELECT count(*)::int AS count FROM information_schema.schemata WHERE schema_name='drizzle' OR schema_name LIKE 'baseline_%'",
          )
        ).rows[0].count,
      ).toBe(0);
    } finally {
      await Promise.all(pools.map((pool) => pool.end()));
      await control.end();
    }
  }, 60000);
});
