import { sql, relations } from 'drizzle-orm';
import {
  pgTable,
  bigint,
  check,
  index,
  pgEnum,
  text,
  timestamp,
  integer,
  doublePrecision,
} from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
export const Role = {
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  FRONT_DESK: 'FRONT_DESK',
  BILLING: 'BILLING',
  PATIENT: 'PATIENT',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const roleEnum = pgEnum('Role', [
  'ADMIN',
  'DOCTOR',
  'NURSE',
  'FRONT_DESK',
  'BILLING',
  'PATIENT',
]);
export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];
export const genderEnum = pgEnum('Gender', ['MALE', 'FEMALE', 'OTHER']);
export const AppointmentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];
export const appointmentStatusEnum = pgEnum('AppointmentStatus', [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);
export const QueueStatus = {
  WAITING: 'WAITING',
  CALLED: 'CALLED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type QueueStatus = (typeof QueueStatus)[keyof typeof QueueStatus];
export const queueStatusEnum = pgEnum('QueueStatus', [
  'WAITING',
  'CALLED',
  'IN_PROGRESS',
  'COMPLETED',
  'NO_SHOW',
]);
export const BillingStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  OVERDUE: 'OVERDUE',
} as const;
export type BillingStatus = (typeof BillingStatus)[keyof typeof BillingStatus];
export const billingStatusEnum = pgEnum('BillingStatus', [
  'PENDING',
  'PAID',
  'CANCELLED',
  'OVERDUE',
]);
const id = () => text('id').primaryKey().$defaultFn(randomUUID);
const createdAt = () =>
  timestamp('createdAt', { precision: 3 }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updatedAt', { precision: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const users = pgTable('User', {
  id: id(),
  email: text('email').notNull().unique('User_email_key'),
  name: text('name'),
  password: text('password').notNull(),
  role: roleEnum('role').notNull().default('PATIENT'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const patients = pgTable('Patient', {
  id: id(),
  userId: text('userId')
    .unique('Patient_userId_key')
    .references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  dob: timestamp('dob', { precision: 3 }).notNull(),
  gender: genderEnum('gender').notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const appointments = pgTable('Appointment', {
  id: id(),
  patientId: text('patientId')
    .notNull()
    .references(() => patients.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  doctorId: text('doctorId').references(() => users.id, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
  dateTime: timestamp('dateTime', { precision: 3 }).notNull(),
  reason: text('reason').notNull(),
  status: appointmentStatusEnum('status').notNull().default('PENDING'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const queues = pgTable('Queue', {
  id: id(),
  patientId: text('patientId')
    .notNull()
    .references(() => patients.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  queueNumber: integer('queueNumber').notNull(),
  status: queueStatusEnum('status').notNull().default('WAITING'),
  notes: text('notes'),
  createdAt: createdAt(),
  calledAt: timestamp('calledAt', { precision: 3 }),
});
export const consultNotes = pgTable('ConsultNote', {
  id: id(),
  patientId: text('patientId')
    .notNull()
    .references(() => patients.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  doctorId: text('doctorId')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  appointmentId: text('appointmentId').unique('ConsultNote_appointmentId_key'),
  subjective: text('subjective'),
  objective: text('objective'),
  assessment: text('assessment'),
  plan: text('plan'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const billings = pgTable(
  'Billing',
  {
    id: id(),
    patientId: text('patientId')
      .notNull()
      .references(() => patients.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    appointmentId: text('appointmentId'),
    amount: doublePrecision('amount').notNull(),
    amountMinor: bigint('amountMinor', { mode: 'number' }),
    currency: text('currency'),
    description: text('description').notNull(),
    status: billingStatusEnum('status').notNull().default('PENDING'),
    createdAt: createdAt(),
    paidAt: timestamp('paidAt', { precision: 3 }),
  },
  (table) => [
    check(
      'Billing_exact_money_check',
      sql`(${table.amountMinor} IS NULL AND ${table.currency} IS NULL) OR (${table.amountMinor} IS NOT NULL AND ${table.amountMinor} >= 0 AND ${table.amountMinor} <= 999999999999 AND ${table.currency} IS NOT NULL AND ${table.currency} = 'PHP')`,
    ),
  ],
);
export const sessions = pgTable(
  'Session',
  {
    id: id(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    expiresAt: timestamp('expiresAt', { precision: 3 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('Session_userId_idx').on(table.userId),
    index('Session_expiresAt_idx').on(table.expiresAt),
  ],
);
export const auditLogs = pgTable('AuditLog', {
  id: id(),
  actorId: text('actorId')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resourceId').notNull(),
  details: text('details'),
  timestamp: timestamp('timestamp', { precision: 3 }).notNull().defaultNow(),
});
export const patientRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  appointments: many(appointments),
  queue: many(queues),
  billing: many(billings),
  consultNotes: many(consultNotes),
}));
export const userRelations = relations(users, ({ one, many }) => ({
  patient: one(patients),
  doctorAppointments: many(appointments),
  consultNotes: many(consultNotes),
  auditLogs: many(auditLogs),
}));
export const appointmentRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [appointments.doctorId],
    references: [users.id],
  }),
}));
export const queueRelations = relations(queues, ({ one }) => ({
  patient: one(patients, {
    fields: [queues.patientId],
    references: [patients.id],
  }),
}));
export const noteRelations = relations(consultNotes, ({ one }) => ({
  patient: one(patients, {
    fields: [consultNotes.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [consultNotes.doctorId],
    references: [users.id],
  }),
}));
export const billingRelations = relations(billings, ({ one }) => ({
  patient: one(patients, {
    fields: [billings.patientId],
    references: [patients.id],
  }),
}));
export const auditRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));
