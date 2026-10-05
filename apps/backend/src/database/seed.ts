import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from './schema';
async function seed() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Demo seed is prohibited in production');
  if (
    !process.env.DATABASE_URL ||
    !process.env.SEED_PASSWORD ||
    process.env.SEED_PASSWORD.length < 8
  )
    throw new Error(
      'DATABASE_URL and SEED_PASSWORD (at least 8 characters) are required',
    );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  try {
    const password = await bcrypt.hash(process.env.SEED_PASSWORD, 12);
    await db.transaction(async (tx) => {
      for (const role of Object.values(schema.Role)) {
        const email = `${role.toLowerCase().replace('_', '')}@hospital.com`;
        await tx
          .insert(schema.users)
          .values({
            email,
            role,
            name:
              role === 'DOCTOR'
                ? 'Dr. House'
                : role === 'PATIENT'
                  ? 'John Doe'
                  : `${role} User`,
            password,
          })
          .onConflictDoNothing({ target: schema.users.email });
      }
      const patientUser = await tx.query.users.findFirst({
        where: eq(schema.users.email, 'patient@hospital.com'),
      });
      await tx
        .insert(schema.patients)
        .values({
          userId: patientUser!.id,
          firstName: 'John',
          lastName: 'Doe',
          dob: new Date('1990-01-01'),
          gender: 'MALE',
          phone: '555-0123',
          address: '123 Main St',
        })
        .onConflictDoNothing({ target: schema.patients.userId });
    });
    console.log('Demo accounts seeded; existing users and records preserved.');
  } finally {
    await pool.end();
  }
}
seed().catch(() => {
  console.error('Seed failed; check configuration and database availability.');
  process.exitCode = 1;
});
