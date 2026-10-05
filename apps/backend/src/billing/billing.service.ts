import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { billings, appointments } from '../database/schema';
import { found, Actor } from '../database/access';
import { CreateBillingDto } from './dto/create-billing.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
type Bill = typeof billings.$inferSelect;
// Legacy amounts remain available verbatim until a staff member confirms currency and precision.
const present = (bill: Bill) => ({
  ...bill,
  legacyAmount: bill.amount,
  amount: bill.amountMinor === null ? bill.amount : bill.amountMinor / 100,
  requiresReview: bill.amountMinor === null || bill.currency === null,
});
const minor = (amount: number) => {
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 9999999999.99 ||
    !/^\d+(\.\d{1,2})?$/.test(String(amount))
  )
    throw new BadRequestException(
      'Enter a PHP amount with at most two decimal places',
    );
  return Math.round(amount * 100);
};
@Injectable()
export class BillingService {
  constructor(private readonly database: DatabaseService) {}
  private async validateAppointment(
    patientId: string,
    appointmentId?: string | null,
  ) {
    if (appointmentId) {
      const appointment = await this.database.db.query.appointments.findFirst({
        where: eq(appointments.id, appointmentId),
      });
      if (!appointment || appointment.patientId !== patientId)
        throw new BadRequestException('Appointment does not match the patient');
    }
  }
  async create(dto: CreateBillingDto, actor: Actor) {
    await this.validateAppointment(dto.patientId, dto.appointmentId);
    return present(
      await this.database.audit(
        actor,
        'Billing',
        'CREATE',
        Object.keys(dto),
        async (tx) =>
          (
            await tx
              .insert(billings)
              .values({
                ...dto,
                currency: 'PHP',
                amountMinor: minor(dto.amount),
                paidAt: dto.status === 'PAID' ? new Date() : null,
              })
              .returning()
          )[0],
      ),
    );
  }
  async findAll() {
    const rows = await this.database.db.query.billings.findMany({
      with: {
        patient: { columns: { id: true, firstName: true, lastName: true } },
      },
    });
    return rows.map((row) => ({ ...present(row), patient: row.patient }));
  }
  async findOne(id: string) {
    return present(
      found(
        await this.database.db.query.billings.findFirst({
          where: eq(billings.id, id),
        }),
      ),
    );
  }
  async update(id: string, dto: UpdateBillingDto, actor: Actor) {
    if (!Object.keys(dto).length)
      throw new BadRequestException('No changes supplied');
    return present(
      await this.database.audit(
        actor,
        'Billing',
        'UPDATE',
        Object.keys(dto),
        async (tx) => {
          const existing = found(
            (
              await tx
                .select()
                .from(billings)
                .where(eq(billings.id, id))
                .for('update')
            )[0],
          );
          const legacy =
            existing.amountMinor === null || existing.currency === null;
          if (legacy && (dto.amount === undefined || dto.currency !== 'PHP'))
            throw new ConflictException(
              'Review this legacy bill: explicitly confirm its PHP amount and currency before updating it',
            );
          if (
            !legacy &&
            existing.status === 'PAID' &&
            (dto.amount !== undefined ||
              (dto.status && dto.status !== 'PAID') ||
              dto.patientId !== undefined ||
              dto.appointmentId !== undefined)
          )
            throw new ConflictException(
              'Paid bills cannot be changed; use a separate adjustment bill',
            );
          if (
            existing.status === 'CANCELLED' &&
            dto.status &&
            dto.status !== 'CANCELLED'
          )
            throw new ConflictException('Cancelled bills cannot be reopened');
          await this.validateAppointment(
            dto.patientId ?? existing.patientId,
            dto.appointmentId === undefined
              ? existing.appointmentId
              : dto.appointmentId,
          );
          const { amount, currency: _currency, ...data } = dto;
          return found(
            (
              await tx
                .update(billings)
                .set({
                  ...data,
                  amountMinor: amount === undefined ? undefined : minor(amount),
                  currency: amount === undefined ? undefined : 'PHP',
                  paidAt:
                    dto.status === 'PAID'
                      ? (existing.paidAt ?? new Date())
                      : undefined,
                })
                .where(eq(billings.id, id))
                .returning()
            )[0],
          );
        },
      ),
    );
  }
  async remove(id: string, actor: Actor) {
    return present(
      await this.database.audit(actor, 'Billing', 'DELETE', [], async (tx) => {
        const existing = found(
          (
            await tx
              .select()
              .from(billings)
              .where(eq(billings.id, id))
              .for('update')
          )[0],
        );
        if (existing.status === 'PAID')
          throw new ConflictException('Paid bills cannot be deleted');
        return found(
          (await tx.delete(billings).where(eq(billings.id, id)).returning())[0],
        );
      }),
    );
  }
}
