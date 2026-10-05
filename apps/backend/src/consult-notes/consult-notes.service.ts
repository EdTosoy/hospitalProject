import { Injectable, BadRequestException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { consultNotes, appointments } from '../database/schema';
import {
  Actor,
  found,
  requireOwner,
  publicUserColumns,
} from '../database/access';
import { CreateConsultNoteDto } from './dto/create-consult-note.dto';
import { UpdateConsultNoteDto } from './dto/update-consult-note.dto';
@Injectable()
export class ConsultNotesService {
  constructor(private readonly database: DatabaseService) {}
  private async validateAppointment(
    patientId: string,
    doctorId: string,
    appointmentId?: string | null,
  ) {
    if (appointmentId) {
      const appointment = await this.database.db.query.appointments.findFirst({
        where: eq(appointments.id, appointmentId),
      });
      if (
        !appointment ||
        appointment.patientId !== patientId ||
        (appointment.doctorId && appointment.doctorId !== doctorId)
      )
        throw new BadRequestException(
          'Appointment does not match the patient and doctor',
        );
    }
  }
  private content(data: {
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
  }) {
    if (
      ![data.subjective, data.objective, data.assessment, data.plan].some(
        (value) => value?.trim(),
      )
    )
      throw new BadRequestException('Enter at least one nonblank SOAP section');
  }
  async create(dto: CreateConsultNoteDto, actor: Actor) {
    this.content(dto);
    await this.validateAppointment(
      dto.patientId,
      actor.userId,
      dto.appointmentId,
    );
    return this.database.audit(
      actor,
      'ConsultNote',
      'CREATE',
      Object.keys(dto),
      async (tx) =>
        found(
          (
            await tx
              .insert(consultNotes)
              .values({ ...dto, doctorId: actor.userId })
              .returning()
          )[0],
        ),
    );
  }
  findAll() {
    return this.database.db.query.consultNotes.findMany({
      with: { patient: true, doctor: { columns: publicUserColumns } },
    });
  }
  findByPatient(patientId: string) {
    return this.database.db.query.consultNotes.findMany({
      where: eq(consultNotes.patientId, patientId),
      with: { doctor: { columns: publicUserColumns } },
      orderBy: desc(consultNotes.createdAt),
    });
  }
  async findOne(id: string) {
    return found(
      await this.database.db.query.consultNotes.findFirst({
        where: eq(consultNotes.id, id),
        with: { patient: true, doctor: { columns: publicUserColumns } },
      }),
    );
  }
  async update(id: string, dto: UpdateConsultNoteDto, actor: Actor) {
    const { doctorId: _doctorId, ...data } = dto;
    if (!Object.keys(data).length)
      throw new BadRequestException('No note changes supplied');
    return this.database.audit(
      actor,
      'ConsultNote',
      'UPDATE',
      Object.keys(data),
      async (tx) => {
        const existing = found(
          (
            await tx
              .select()
              .from(consultNotes)
              .where(eq(consultNotes.id, id))
              .for('update')
          )[0],
        );
        requireOwner(actor, existing.doctorId);
        this.content({ ...existing, ...data });
        await this.validateAppointment(
          data.patientId ?? existing.patientId,
          existing.doctorId,
          data.appointmentId === undefined
            ? existing.appointmentId
            : data.appointmentId,
        );
        return found(
          (
            await tx
              .update(consultNotes)
              .set(data)
              .where(eq(consultNotes.id, id))
              .returning()
          )[0],
        );
      },
    );
  }
  async remove(id: string, actor: Actor) {
    requireOwner(actor, (await this.findOne(id)).doctorId);
    return this.database.audit(actor, 'ConsultNote', 'DELETE', [], async (tx) =>
      found(
        (
          await tx
            .delete(consultNotes)
            .where(eq(consultNotes.id, id))
            .returning()
        )[0],
      ),
    );
  }
}
