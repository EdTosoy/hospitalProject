import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { users, Role, auditLogs } from '../database/schema';
import {
  Actor,
  found,
  publicUser,
  publicUserColumns,
} from '../database/access';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}
  async create(dto: CreateUserDto, actor?: Actor) {
    if (await this.findOneByEmail(dto.email))
      throw new ConflictException('Email already exists');
    const password = await bcrypt.hash(dto.password, 12);
    const row = await this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({ ...dto, password })
        .returning();
      await tx.insert(auditLogs).values({
        actorId: actor?.userId ?? created.id,
        resource: 'User',
        resourceId: created.id,
        action: 'CREATE',
        details: JSON.stringify({ fields: ['email', 'name', 'role'] }),
      });
      return created;
    });
    return publicUser(row);
  }
  findByRole(role: Role) {
    return this.database.db.query.users.findMany({
      where: eq(users.role, role),
      columns: publicUserColumns,
    });
  }
  findAll() {
    return this.database.db.query.users.findMany({
      columns: publicUserColumns,
    });
  }
  findOneById(id: string) {
    return this.database.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: publicUserColumns,
    });
  }
  findOneByEmail(email: string) {
    return this.database.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }
  async update(id: string, dto: UpdateUserDto, actor: Actor) {
    if (!Object.keys(dto).length)
      throw new BadRequestException('No account changes supplied');
    return publicUser(
      await this.database.audit(
        actor,
        'User',
        'UPDATE',
        Object.keys(dto),
        async (tx) =>
          found(
            (
              await tx
                .update(users)
                .set({ name: dto.name, email: dto.email })
                .where(eq(users.id, id))
                .returning()
            )[0],
          ),
      ),
    );
  }
  async remove(id: string, actor: Actor) {
    return publicUser(
      await this.database.audit(actor, 'User', 'DELETE', [], async (tx) =>
        found((await tx.delete(users).where(eq(users.id, id)).returning())[0]),
      ),
    );
  }
}
