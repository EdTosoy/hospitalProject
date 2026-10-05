import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { eq, or, isNull } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { appointments, patients, users } from '../database/schema';
import { Actor, found, publicUserColumns } from '../database/access';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentsGateway } from './appointments.gateway';
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly gateway: AppointmentsGateway,
  ) {}
  private async patient(id: string, actor: Actor) {
    const row = found(
      await this.database.db.query.patients.findFirst({
        where: or(eq(patients.id, id), eq(patients.userId, id)),
      }),
    );
    if (actor.role === 'PATIENT' && row.userId !== actor.userId)
      throw new ForbiddenException();
    return row;
  }
  private async doctor(id?: string) {
    if (
      id &&
      (
        await this.database.db.query.users.findFirst({
          where: eq(users.id, id),
        })
      )?.role !== 'DOCTOR'
    )
      throw new BadRequestException('Selected user is not a doctor');
  }
  async create(dto: CreateAppointmentDto, actor: Actor) {
    const patient = await this.patient(dto.patientId, actor);
    await this.doctor(dto.doctorId);
    if (new Date(dto.dateTime) <= new Date())
      throw new BadRequestException('Appointment must be in the future');
    if (dto.status && !['PENDING', 'CONFIRMED'].includes(dto.status))
      throw new BadRequestException(
        'New appointments must be pending or confirmed',
      );
    const row = await this.database.audit(
      actor,
      'Appointment',
      'CREATE',
      Object.keys(dto),
      async (tx) =>
        found(
          (
            await tx
              .insert(appointments)
              .values({
                ...dto,
                patientId: patient.id,
                dateTime: new Date(dto.dateTime),
                status: actor.role === 'PATIENT' ? 'PENDING' : dto.status,
              })
              .returning()
          )[0],
        ),
    );
    this.gateway.emitAppointmentUpdated();
    return row;
  }
  async findAll(actor: Actor) {
    const patient =
      actor.role === 'PATIENT'
        ? await this.database.db.query.patients.findFirst({
            where: eq(patients.userId, actor.userId),
          })
        : undefined;
    if (actor.role === 'PATIENT' && !patient) return [];
    return this.database.db.query.appointments.findMany({
      where: patient
        ? eq(appointments.patientId, patient.id)
        : actor.role === 'DOCTOR'
          ? or(
              eq(appointments.doctorId, actor.userId),
              isNull(appointments.doctorId),
            )
          : undefined,
      with: { patient: true, doctor: { columns: publicUserColumns } },
      orderBy: appointments.dateTime,
    });
  }
  async findOne(id: string, actor: Actor) {
    const row = found(
      await this.database.db.query.appointments.findFirst({
        where: eq(appointments.id, id),
        with: { patient: true, doctor: { columns: publicUserColumns } },
      }),
    );
    if (actor.role === 'PATIENT' && row.patient.userId !== actor.userId)
      throw new ForbiddenException();
    if (
      actor.role === 'DOCTOR' &&
      row.doctorId &&
      row.doctorId !== actor.userId
    )
      throw new ForbiddenException();
    return row;
  }
  async update(id: string, dto: UpdateAppointmentDto, actor: Actor) {
    if (!Object.keys(dto).length)
      throw new BadRequestException('No appointment changes supplied');
    const row = await this.database.audit(
      actor,
      'Appointment',
      'UPDATE',
      Object.keys(dto),
      async (tx) => {
        const existing = found(
          (
            await tx
              .select()
              .from(appointments)
              .where(eq(appointments.id, id))
              .for('update')
          )[0],
        );
        const owner = found(
          await tx.query.patients.findFirst({
            where: eq(patients.id, existing.patientId),
          }),
        );
        if (actor.role === 'PATIENT' && owner.userId !== actor.userId)
          throw new ForbiddenException();
        if (
          actor.role === 'DOCTOR' &&
          existing.doctorId &&
          existing.doctorId !== actor.userId
        )
          throw new ForbiddenException();
        if (
          actor.role === 'PATIENT' &&
          (dto.status !== 'CANCELLED' ||
            Object.keys(dto).some((key) => key !== 'status'))
        )
          throw new ForbiddenException(
            'Patients may only cancel their appointment',
          );
        if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(existing.status))
          throw new ConflictException(
            'Completed, cancelled, and no-show appointments cannot be changed',
          );
        const transitions = {
          PENDING: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
          CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
        };
        if (
          dto.status &&
          dto.status !== existing.status &&
          !transitions[existing.status as 'PENDING' | 'CONFIRMED'].includes(
            dto.status,
          )
        )
          throw new ConflictException(
            'This appointment status transition is not allowed',
          );
        const data = { ...dto };
        if (actor.role === 'DOCTOR') {
          if (data.doctorId !== undefined && data.doctorId !== actor.userId)
            throw new ForbiddenException();
          if (!existing.doctorId) data.doctorId = actor.userId;
        }
        const patient = data.patientId
          ? await this.patient(data.patientId, actor)
          : undefined;
        await this.doctor(data.doctorId);
        if (data.dateTime && new Date(data.dateTime) <= new Date())
          throw new BadRequestException('Appointment must be in the future');
        return found(
          (
            await tx
              .update(appointments)
              .set({
                ...data,
                patientId: patient?.id,
                dateTime: data.dateTime ? new Date(data.dateTime) : undefined,
              })
              .where(eq(appointments.id, id))
              .returning()
          )[0],
        );
      },
    );
    this.gateway.emitAppointmentUpdated();
    return row;
  }
  async remove(id: string, actor: Actor) {
    return this.database.audit(
      actor,
      'Appointment',
      'DELETE',
      [],
      async (tx) => {
        const existing = found(
          (
            await tx
              .select()
              .from(appointments)
              .where(eq(appointments.id, id))
              .for('update')
          )[0],
        );
        if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(existing.status))
          throw new ConflictException(
            'Terminal appointment history cannot be deleted',
          );
        return found(
          (
            await tx
              .delete(appointments)
              .where(eq(appointments.id, id))
              .returning()
          )[0],
        );
      },
    );
  }
}
