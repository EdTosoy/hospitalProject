import { BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { DatabaseTransaction } from './database.service';
import { appointments } from './schema';

// SHARE conflicts with parent UPDATE/DELETE, including non-key patient/doctor changes.
// Keep the lock until the dependent write and its audit entry commit together.
export async function validateAppointmentLink(
  tx: DatabaseTransaction,
  patientId: string,
  appointmentId?: string | null,
  doctorId?: string,
) {
  if (appointmentId === undefined || appointmentId === null) return;
  const [appointment] = await tx
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .for('share');
  if (
    !appointment ||
    appointment.patientId !== patientId ||
    (doctorId && appointment.doctorId && appointment.doctorId !== doctorId)
  )
    throw new BadRequestException(
      'Appointment does not match the patient or consulting doctor',
    );
}
