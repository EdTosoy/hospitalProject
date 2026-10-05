import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import type { Actor } from './access';
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  readonly db = drizzle(this.pool, { schema });
  async audit<T extends { id: string }>(
    actor: Actor,
    resource: string,
    action: string,
    fields: string[],
    change: (tx: DatabaseTransaction) => Promise<T>,
  ) {
    return this.db.transaction(async (tx) => {
      const row = await change(tx);
      await tx.insert(schema.auditLogs).values({
        actorId: actor.userId,
        resource,
        resourceId: row.id,
        action,
        details: JSON.stringify({
          fields: fields.filter((field) => !/password|token/i.test(field)),
        }),
      });
      return row;
    });
  }
  async onModuleInit() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    await this.pool.query('SELECT 1');
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}

export type DatabaseTransaction = Parameters<
  Parameters<DatabaseService['db']['transaction']>[0]
>[0];
