import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { patients } from '../database/schema';
import { Actor, found, requireStaff } from '../database/access';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
@Injectable()
export class PatientsService {
  constructor(private readonly database: DatabaseService) {}
  async create(userId: string, dto: CreatePatientDto, actor: Actor) {
    if (
      await this.database.db.query.patients.findFirst({
        where: eq(patients.userId, userId),
      })
    )
      throw new BadRequestException(
        'Patient profile already exists for this user',
      );
    return this.database.audit(
      actor,
      'Patient',
      'CREATE',
      Object.keys(dto),
      async (tx) =>
        found(
          (
            await tx
              .insert(patients)
              .values({ ...dto, dob: new Date(dto.dob), userId })
              .returning()
          )[0],
        ),
    );
  }
  async registerWalkIn(dto: CreatePatientDto, actor: Actor) {
    return this.database.audit(
      actor,
      'Patient',
      'CREATE',
      Object.keys(dto),
      async (tx) =>
        found(
          (
            await tx
              .insert(patients)
              .values({ ...dto, dob: new Date(dto.dob) })
              .returning()
          )[0],
        ),
    );
  }
  findAll(actor: Actor) {
    if (actor.role === 'BILLING')
      return this.database.db.query.patients.findMany({
        columns: { id: true, firstName: true, lastName: true },
      });
    return this.database.db.query.patients.findMany({
      where:
        actor.role === 'PATIENT'
          ? eq(patients.userId, actor.userId)
          : undefined,
    });
  }
  async findOne(id: string, actor: Actor) {
    if (actor.role === 'BILLING') throw new ForbiddenException();
    const row = found(
      await this.database.db.query.patients.findFirst({
        where: eq(patients.id, id),
      }),
    );
    if (actor.role === 'PATIENT' && row.userId !== actor.userId)
      throw new ForbiddenException();
    return row;
  }
  async update(id: string, dto: UpdatePatientDto, actor: Actor) {
    if (!Object.keys(dto).length)
      throw new BadRequestException('No patient changes supplied');
    await this.findOne(id, actor);
    return this.database.audit(
      actor,
      'Patient',
      'UPDATE',
      Object.keys(dto),
      async (tx) =>
        found(
          (
            await tx
              .update(patients)
              .set({ ...dto, dob: dto.dob ? new Date(dto.dob) : undefined })
              .where(eq(patients.id, id))
              .returning()
          )[0],
        ),
    );
  }
  async remove(id: string, actor: Actor) {
    requireStaff(actor);
    return this.database.audit(actor, 'Patient', 'DELETE', [], async (tx) =>
      found(
        (await tx.delete(patients).where(eq(patients.id, id)).returning())[0],
      ),
    );
  }
}
