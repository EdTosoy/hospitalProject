import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, ne, and, inArray, sql, desc, asc } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { queues, auditLogs } from '../database/schema';
import { found, Actor } from '../database/access';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
@Injectable()
export class QueueService {
  constructor(private readonly database: DatabaseService) {}
  create(dto: CreateQueueDto, actor: Actor) {
    return this.addToQueue(dto.patientId, dto.notes, actor);
  }
  async addToQueue(patientId: string, notes: string | undefined, actor: Actor) {
    return this.database.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(481521)`);
      const active = await tx.query.queues.findFirst({
        where: and(
          eq(queues.patientId, patientId),
          inArray(queues.status, ['WAITING', 'CALLED', 'IN_PROGRESS']),
        ),
      });
      if (active)
        throw new ConflictException('Patient is already in the active queue');
      const last = await tx.query.queues.findFirst({
        orderBy: desc(queues.queueNumber),
      });
      const [row] = await tx
        .insert(queues)
        .values({ patientId, notes, queueNumber: (last?.queueNumber ?? 0) + 1 })
        .returning();
      await tx.insert(auditLogs).values({
        actorId: actor.userId,
        resource: 'Queue',
        resourceId: row.id,
        action: 'CREATE',
        details: JSON.stringify({ fields: ['patientId', 'notes'] }),
      });
      return tx.query.queues.findFirst({
        where: eq(queues.id, row.id),
        with: { patient: true },
      });
    });
  }
  async callNext(actor: Actor) {
    return this.database.db.transaction(async (tx) => {
      const [next] = await tx
        .select()
        .from(queues)
        .where(eq(queues.status, 'WAITING'))
        .orderBy(asc(queues.queueNumber))
        .limit(1)
        .for('update', { skipLocked: true });
      if (!next) return null;
      await tx
        .update(queues)
        .set({ status: 'IN_PROGRESS', calledAt: new Date() })
        .where(eq(queues.id, next.id));
      await tx.insert(auditLogs).values({
        actorId: actor.userId,
        resource: 'Queue',
        resourceId: next.id,
        action: 'UPDATE',
        details: JSON.stringify({ fields: ['status', 'calledAt'] }),
      });
      return tx.query.queues.findFirst({
        where: eq(queues.id, next.id),
        with: { patient: true },
      });
    });
  }
  complete(id: string, actor: Actor) {
    return this.update(id, { status: 'COMPLETED' }, actor);
  }
  findAll() {
    return this.database.db.query.queues.findMany({
      with: { patient: true },
      orderBy: asc(queues.queueNumber),
    });
  }
  async findOne(id: string) {
    return found(
      await this.database.db.query.queues.findFirst({
        where: eq(queues.id, id),
      }),
    );
  }
  async update(id: string, dto: UpdateQueueDto, actor: Actor) {
    if (!Object.keys(dto).length)
      throw new BadRequestException('No queue changes supplied');
    return this.database.audit(
      actor,
      'Queue',
      'UPDATE',
      Object.keys(dto),
      async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(481521)`);
        const existing = found(
          (
            await tx
              .select()
              .from(queues)
              .where(eq(queues.id, id))
              .for('update')
          )[0],
        );
        if (['COMPLETED', 'NO_SHOW'].includes(existing.status)) {
          if (Object.keys(dto).length === 1 && dto.status === existing.status)
            return existing;
          throw new ConflictException(
            'Closed queue entries cannot be changed; add a new visit',
          );
        }
        const transitions = {
          WAITING: ['CALLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'],
          CALLED: ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW'],
          IN_PROGRESS: ['COMPLETED', 'NO_SHOW'],
        };
        if (
          dto.status &&
          dto.status !== existing.status &&
          !transitions[
            existing.status as 'WAITING' | 'CALLED' | 'IN_PROGRESS'
          ].includes(dto.status)
        )
          throw new ConflictException('Queue status cannot move backwards');
        if (
          ['WAITING', 'CALLED', 'IN_PROGRESS'].includes(
            dto.status ?? existing.status,
          )
        ) {
          const duplicate = await tx.query.queues.findFirst({
            where: and(
              ne(queues.id, id),
              eq(queues.patientId, dto.patientId ?? existing.patientId),
              inArray(queues.status, ['WAITING', 'CALLED', 'IN_PROGRESS']),
            ),
          });
          if (duplicate)
            throw new ConflictException(
              'Patient is already in the active queue',
            );
        }
        return found(
          (
            await tx
              .update(queues)
              .set(dto)
              .where(eq(queues.id, id))
              .returning()
          )[0],
        );
      },
    );
  }
  async remove(id: string, actor: Actor) {
    return this.database.audit(actor, 'Queue', 'DELETE', [], async (tx) =>
      found((await tx.delete(queues).where(eq(queues.id, id)).returning())[0]),
    );
  }
}
