# PostgreSQL migration: Prisma to Drizzle

The migration preserves the original seven-table model from commit `48c0bfd`. The original repository had a Prisma schema and destructive demo seed, but no committed Prisma migration history. The in-progress migration was checked against that original schema before completing the audit. Do not infer the state of a real database from Git alone.

## Plan and implementation

1. Inventory the original schema, service queries, role enums, relation includes, transactions, seed, configuration, Docker packaging, and shared frontend contracts.
2. Translate the physical PostgreSQL model without a data redesign. Use Drizzle ORM **0.45.3**, Drizzle Kit **0.31.11**, and the existing `pg` driver/pool.
3. Replace Prisma services and generated types with the global `DatabaseModule`, Drizzle table definitions, typed queries, safe relation projections, and schema-derived enum constants.
4. Provide a fresh-database SQL migration and snapshot. For existing tables, verify compatibility and adopt the baseline instead of replaying table creation.
5. Replace the seed with additive, transactional inserts using a caller-configured demo password. Preserve existing accounts, password hashes, IDs, and application records.
6. Exercise both paths with PostgreSQL integration tests, then remove Prisma packages, generator configuration, schema/seed, and runtime service references.

## Preserved semantics

| Property | Result |
| --- | --- |
| Tables and columns | Existing quoted names: User, Patient, Appointment, Queue, ConsultNote, Billing, AuditLog |
| IDs | Text primary keys; UUID generation stays in application code, with no database UUID default |
| Dates | `timestamp(3)` without time zone; retain millisecond precision |
| Created timestamps | PostgreSQL `now()` default, equivalent to the original `CURRENT_TIMESTAMP` |
| Updated timestamps | Application managed through `$defaultFn` and `$onUpdate`; no SQL trigger/default added |
| Money | Original `amount` stays double precision and unchanged; additive migration 0001 introduces nullable integer centavos and PHP currency, requiring explicit legacy review |
| Uniqueness | User.email, nullable Patient.userId, nullable ConsultNote.appointmentId, and all primary keys |
| Enums | Role, Gender, AppointmentStatus, QueueStatus, BillingStatus; existing labels, order, and defaults |
| Foreign keys | All eight original foreign keys and their `RESTRICT`/`SET NULL` delete and `CASCADE` update actions |
| Indexes | Existing primary and unique indexes remain; the original model defined no additional nonunique indexes |
| Optional appointment links | Billing.appointmentId and ConsultNote.appointmentId remain scalar text; the original schema did not define foreign keys for them |

The API validates optional appointment links against the selected patient (and the consultation author) on create and update. This improves API integrity without silently adding constraints to legacy data. Drizzle relation metadata describes query relationships separately from database foreign keys.

No application code, package dependency, Docker command, or runtime configuration still requires Prisma. Remaining text references describe this migration, identify the legacy test fixture, or belong to Drizzle's optional peer-dependency metadata in the generated lockfile. Removing that genuine lockfile metadata by hand would make dependency installation inconsistent.

The runtime defaults are application behavior, not database defaults. Direct SQL imports must supply IDs and nonnullable updated timestamps. This follows [Drizzle's documented runtime defaults](https://orm.drizzle.team/docs/column-types/pg).

## Fresh database

From the root, with `apps/backend/.env` configured:

```sh
docker compose up -d database
pnpm --filter backend db:migrate
pnpm --filter backend db:seed
```

Set `SEED_PASSWORD` to at least eight characters. The seed refuses `NODE_ENV=production`. Migration generation/building does not connect to the database. Generating SQL is distinct from applying it:

```sh
pnpm --filter backend db:generate
# Inspect SQL and snapshot changes before proceeding.
pnpm --filter backend db:migrate
```

The migrator reads `apps/backend/drizzle` when invoked through the backend workspace command. The backend Docker image includes the same migration files and compiled CLI; Compose runs migrations before starting the API. Kubernetes uses a migration init container with the same backend image.

## Existing development database

1. Back up the database, and restore a copy into a separate development database. Confirm that the backup can be restored. No real production database was accessed during this audit.
2. Point `DATABASE_URL` at the restored copy. Stop application writers while adopting the migration baseline.
3. Run `pnpm --filter backend db:baseline`.
4. If it succeeds, run `pnpm --filter backend db:migrate` and verify the application against the copy.
5. Review the result before considering the original database. Production adoption requires a separate operational decision and explicit authorization.

`db:baseline` creates a temporary comparison schema inside a transaction, materializes the initial migration there, and compares application columns, types, precision, nullability, defaults, enum ordering, primary keys, unique-index semantics, check/exclusion constraints, foreign-key targets/actions/deferrability, and migration history. Constraint names and unique-index versus unique-constraint spelling are not treated as semantic differences. It serializes adoption with an advisory lock.

On compatibility it records the initial migration hash/timestamp in `drizzle.__drizzle_migrations`, removes only its temporary comparison schema, and commits. Application tables and rows are untouched. On a mismatch or unknown migration history it rolls back and exits unsuccessfully. There is no force/reset path. Additional tables, triggers, nonunique performance indexes, row-level security policies, grants, extensions, and database-wide configuration require manual review; this checker is not a universal schema audit. The initial schema assumes `public`.

Do not apply the fresh-table migration directly over existing application tables. Never use `db:push`, reset, table truncation, or volume deletion to work around a mismatch. Investigate it on the backed-up copy. [Drizzle's existing-database guidance](https://orm.drizzle.team/docs/get-started/postgresql-existing) explains introspection, and its [migration documentation](https://orm.drizzle.team/docs/migrations) distinguishes migration strategies.

## Executed equivalence checks

`pnpm --filter backend test:e2e` includes `test/database-migration.e2e-spec.ts`. It requires a dedicated database URL whose database name contains `test` and a PostgreSQL role with `CREATEDB`. It creates randomly named fresh/adoption/mismatch test databases and intentionally never drops or resets caller data. On local runs these databases remain for inspection; remove them only after checking their names and explicitly choosing cleanup. CI's disposable PostgreSQL service provides the required role.

The compatibility fixture in `test/fixtures/legacy-schema.sql` was generated from the original Prisma schema using Prisma 6 with its required datasource URL declaration; the original repository used Prisma 7. The model definitions were unchanged. Prisma 7's attempted legacy DDL command was unavailable in the earlier audit environment, so this is a schema-level compatibility check, not an executed upgrade of a live Prisma 7 deployment.

Verified: fresh migration and repeat migration; seed and repeat seed with unchanged stored data/password hashes; adoption and repeat adoption of original DDL with representative rows in all seven tables; unchanged SHA-256 data digest after adoption and migration; rollback on an incompatible column; rejection of unknown migration history. API tests additionally exercise uniqueness conflicts, restrictive foreign keys, relation queries, application-managed updated timestamps, transaction rollback, duplicate queue insertion, and queue reactivation protection.

## Additive quality migration (0001)

`0001_overjoyed_zeigeist.sql` adds `Session` with user/expiry indexes and a cascading user foreign key, and nullable `Billing.amountMinor`/`currency`. It does not update, round, relabel, or drop existing financial data. Its CHECK constraint requires either both exact-money fields to be null (legacy) or nonnegative bounded centavos with currency PHP. New application writes use integer centavos; API responses normalize `amount` from those centavos and expose `legacyAmount` plus `requiresReview`. Review writes only the new fields; the original column stays intact.

An existing Drizzle-initialized development database needs only `db:migrate`; do not run baseline adoption again. An untouched compatible Prisma-era copy uses baseline then migrate, applying 0001 afterward. Fresh databases apply both SQL files. Old JWTs lack a session ID and require a new login. Neither database credentials nor production schemas were changed.

The lifecycle regression still compares every original field in all seven legacy tables; new nullable billing columns are checked separately. Its legacy fixture uses 17.125 to prove preservation of fractional-cent amounts. API regressions confirm explicit review to PHP 17.13 stores 1713 centavos while retaining the original 17.125, and reject negative amounts or partially populated exact-money fields at the database boundary. This verifies additive migration semantics on synthetic PostgreSQL fixtures, not a production-data upgrade.
