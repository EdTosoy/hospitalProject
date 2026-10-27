import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { DatabaseErrorFilter } from '../src/database/database-error.filter';
import {
  appointments,
  auditLogs,
  billings,
  consultNotes,
  patients,
  queues,
  users,
  Role,
} from '../src/database/schema';

describe('Phase 1A integrity against PostgreSQL', () => {
  let app: INestApplication;
  let database: DatabaseService;
  const tokens: Partial<Record<Role, string>> = {};
  const ids: Partial<Record<Role, string>> = {};
  let patientId: string;
  let otherPatientId: string;
  const api = () => request(app.getHttpServer());
  const auth = (role: Role = 'ADMIN') => tokens[role]!;

  beforeAll(async () => {
    if (
      !process.env.DATABASE_URL ||
      !new URL(process.env.DATABASE_URL).pathname.includes('test')
    )
      throw new Error('A verified disposable test database is required');
    process.env.JWT_SECRET =
      'phase1a-isolated-test-secret-at-least-32-characters';
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new DatabaseErrorFilter());
    await app.init();
    database = app.get(DatabaseService);
    const password = await bcrypt.hash('phase1a-test-password', 4);
    for (const role of [
      'ADMIN',
      'DOCTOR',
      'BILLING',
      'FRONT_DESK',
      'PATIENT',
    ] as const) {
      const [user] = await database.db
        .insert(users)
        .values({
          email: `phase1a-${role}-${randomUUID()}@example.test`,
          password,
          role,
        })
        .returning();
      ids[role] = user.id;
      const login = await api()
        .post('/auth/login')
        .send({ email: user.email, password: 'phase1a-test-password' })
        .expect(201);
      tokens[role] = login.body.access_token;
    }
    const profiles = await database.db
      .insert(patients)
      .values([
        {
          firstName: 'Synthetic',
          lastName: 'First',
          dob: new Date('1990-01-01'),
          gender: 'OTHER',
          phone: '+63 912 345 6789',
        },
        {
          firstName: 'Synthetic',
          lastName: 'Second',
          dob: new Date('1990-01-01'),
          gender: 'OTHER',
          phone: '+81 (0)3 1234 5678 ext. 9',
        },
      ])
      .returning();
    [patientId, otherPatientId] = profiles.map((p) => p.id);
  });
  afterAll(async () => {
    await app?.close();
  });

  const visit = async (doctorId?: string) =>
    (
      await database.db
        .insert(appointments)
        .values({
          patientId,
          doctorId,
          dateTime: new Date(Date.now() + 86400000),
          reason: 'Synthetic phase 1A visit',
          status: 'CONFIRMED',
        })
        .returning()
    )[0];
  const legacy = async (
    status: 'PAID' | 'PENDING' = 'PAID',
    appointmentId?: string,
  ) =>
    (
      await database.db
        .insert(billings)
        .values({
          patientId,
          appointmentId,
          amount: 17.125,
          description: 'Synthetic legacy bill',
          status,
          paidAt:
            status === 'PAID' ? new Date('2020-01-03T12:34:56.789Z') : null,
        })
        .returning()
    )[0];
  const patchBill = (id: string, data: object) =>
    api()
      .patch(`/billing/${id}`)
      .auth(auth('BILLING'), { type: 'bearer' })
      .send(data);
  const audit = (id: string) =>
    database.db.select().from(auditLogs).where(eq(auditLogs.resourceId, id));

  it('rejects review combined with paid legacy reassignment, reopening, or other edits', async () => {
    const appointment = await visit();
    const bill = await legacy('PAID', appointment.id);
    for (const changes of [
      { patientId: otherPatientId, appointmentId: null },
      { patientId },
      { appointmentId: null },
      { status: 'PENDING' },
      { status: 'PAID' },
      { description: 'Changed history' },
    ]) {
      await patchBill(bill.id, {
        amount: 17.13,
        currency: 'PHP',
        ...changes,
      }).expect(409);
    }
    expect(
      (
        await database.db
          .select()
          .from(billings)
          .where(eq(billings.id, bill.id))
      )[0],
    ).toEqual(bill);
    expect(await audit(bill.id)).toHaveLength(0);
  });

  it('reviews paid legacy money explicitly and retries safely without losing legacy data or history', async () => {
    const appointment = await visit();
    const bill = await legacy('PAID', appointment.id);
    const confirmation = { amount: 17.13, currency: 'PHP' };
    const results = await Promise.all([
      patchBill(bill.id, confirmation),
      patchBill(bill.id, confirmation),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    const repeat = await patchBill(bill.id, confirmation).expect(200);
    expect(repeat.body).toMatchObject({
      patientId,
      appointmentId: appointment.id,
      status: 'PAID',
      paidAt: bill.paidAt!.toISOString(),
      legacyAmount: 17.125,
      amountMinor: 1713,
      currency: 'PHP',
    });
    await patchBill(bill.id, { status: 'PENDING' }).expect(409);
    await patchBill(bill.id, { amount: 18, currency: 'PHP' }).expect(409);
    await api()
      .delete(`/billing/${bill.id}`)
      .auth(auth('BILLING'), { type: 'bearer' })
      .expect(409);
    await patchBill(bill.id, { status: 'PAID' }).expect(200);
    expect(
      (
        await database.db
          .select()
          .from(billings)
          .where(eq(billings.id, bill.id))
      )[0],
    ).toMatchObject({ amount: 17.125, amountMinor: 1713, paidAt: bill.paidAt });
  });

  it('serializes competing paid reviews and concurrent review/payment with stable payment retries', async () => {
    const paid = await legacy();
    const reviews = await Promise.all(
      [17.13, 19.25].map((amount) =>
        patchBill(paid.id, { amount, currency: 'PHP' }),
      ),
    );
    expect(reviews.map((r) => r.status).sort()).toEqual([200, 409]);
    const pending = await legacy('PENDING');
    const outcomes = await Promise.all([
      patchBill(pending.id, { amount: 17.13, currency: 'PHP' }),
      patchBill(pending.id, { status: 'PAID' }),
    ]);
    expect(outcomes[0].status).toBe(200);
    expect([200, 409]).toContain(outcomes[1].status);
    const payment = await patchBill(pending.id, { status: 'PAID' }).expect(200);
    const retry = await patchBill(pending.id, { status: 'PAID' }).expect(200);
    expect(retry.body.paidAt).toBe(payment.body.paidAt);
    expect(retry.body).toMatchObject({
      legacyAmount: 17.125,
      amountMinor: 1713,
      status: 'PAID',
      patientId,
    });
    await patchBill(pending.id, { amount: 19.25, currency: 'PHP' }).expect(409);
  });

  const createDependent = (
    kind: 'note' | 'bill',
    appointmentId: string,
    selectedPatient = patientId,
  ) =>
    kind === 'note'
      ? api()
          .post('/consult-notes')
          .auth(auth('DOCTOR'), { type: 'bearer' })
          .send({
            patientId: selectedPatient,
            doctorId: ids.DOCTOR,
            appointmentId,
            assessment: 'Synthetic assessment',
          })
      : api().post('/billing').auth(auth('BILLING'), { type: 'bearer' }).send({
          patientId: selectedPatient,
          appointmentId,
          amount: 12.34,
          description: 'Synthetic charge',
        });

  it.each(['note', 'bill'] as const)(
    'protects appointment patient identity and deletion with a linked %s',
    async (kind) => {
      const appointment = await visit(ids.DOCTOR);
      await createDependent(kind, appointment.id).expect(201);
      await api()
        .patch(`/appointments/${appointment.id}`)
        .auth(auth(), { type: 'bearer' })
        .send({ patientId: otherPatientId })
        .expect(409);
      await api()
        .delete(`/appointments/${appointment.id}`)
        .auth(auth(), { type: 'bearer' })
        .expect(409);
      await api()
        .patch(`/appointments/${appointment.id}`)
        .auth(auth(), { type: 'bearer' })
        .send({ reason: 'Safe correction' })
        .expect(200);
      expect(
        (
          await database.db
            .select()
            .from(appointments)
            .where(eq(appointments.id, appointment.id))
        )[0].patientId,
      ).toBe(patientId);
      expect((await audit(appointment.id)).map((row) => row.action)).toEqual([
        'UPDATE',
      ]);
    },
  );

  it('preserves note-author compatibility when an unassigned appointment is claimed', async () => {
    const appointment = await visit();
    await createDependent('note', appointment.id).expect(201);
    const [otherDoctor] = await database.db
      .insert(users)
      .values({
        email: `other-${randomUUID()}@example.test`,
        password: 'fixture-not-used-for-login',
        role: 'DOCTOR',
      })
      .returning();
    await api()
      .patch(`/appointments/${appointment.id}`)
      .auth(auth(), { type: 'bearer' })
      .send({ doctorId: otherDoctor.id })
      .expect(409);
    await api()
      .patch(`/appointments/${appointment.id}`)
      .auth(auth('DOCTOR'), { type: 'bearer' })
      .send({ status: 'CONFIRMED' })
      .expect(200);
    expect(
      (
        await database.db
          .select()
          .from(appointments)
          .where(eq(appointments.id, appointment.id))
      )[0].doctorId,
    ).toBe(ids.DOCTOR);
  });

  it.each(['note', 'bill'] as const)(
    'rejects deleting an appointment that already has a linked %s',
    async (kind) => {
      const appointment = await visit();
      await createDependent(kind, appointment.id).expect(201);
      await api()
        .delete(`/appointments/${appointment.id}`)
        .auth(auth(), { type: 'bearer' })
        .expect(409);
    },
  );

  it('permits unlinked appointment corrections/deletion and rejects invalid child links', async () => {
    const appointment = await visit();
    await api()
      .patch(`/appointments/${appointment.id}`)
      .auth(auth(), { type: 'bearer' })
      .send({ patientId: otherPatientId })
      .expect(200);
    for (const kind of ['note', 'bill'] as const) {
      await createDependent(kind, appointment.id).expect(400);
      await createDependent(kind, '').expect(400);
      await createDependent(kind, randomUUID()).expect(400);
    }
    await api()
      .delete(`/appointments/${appointment.id}`)
      .auth(auth(), { type: 'bearer' })
      .expect(200);
    for (const kind of ['note', 'bill'] as const)
      await createDependent(kind, appointment.id).expect(400);
  });

  async function waitForAppointmentWaiter() {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const result = await database.pool.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%Appointment%'`,
      );
      if (result.rows[0].count > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Expected an appointment row-lock waiter');
  }

  for (const kind of ['note', 'bill'] as const) {
    for (const operation of ['reassign', 'delete'] as const) {
      it.each(['child-first', 'parent-first'] as const)(
        `serializes ${kind} creation versus appointment ${operation}: %s`,
        async (order) => {
          const appointment = await visit();
          const blocker = await database.pool.connect();
          let child: Promise<request.Response> | undefined;
          let parent: Promise<request.Response> | undefined;
          try {
            await blocker.query('BEGIN');
            await blocker.query(
              'SELECT id FROM "Appointment" WHERE id=$1 FOR UPDATE',
              [appointment.id],
            );
            const startParent = () =>
              operation === 'reassign'
                ? api()
                    .patch(`/appointments/${appointment.id}`)
                    .auth(auth(), { type: 'bearer' })
                    .send({ patientId: otherPatientId })
                    .then((r) => r)
                : api()
                    .delete(`/appointments/${appointment.id}`)
                    .auth(auth(), { type: 'bearer' })
                    .then((r) => r);
            if (order === 'child-first')
              child = createDependent(kind, appointment.id).then((r) => r);
            else parent = startParent();
            await waitForAppointmentWaiter();
            if (order === 'child-first') parent = startParent();
            else child = createDependent(kind, appointment.id).then((r) => r);
            await blocker.query('COMMIT');
            const [childResult, parentResult] = await Promise.all([
              child!,
              parent!,
            ]);
            expect(childResult.status).toBe(
              order === 'child-first' ? 201 : 400,
            );
            expect(parentResult.status).toBe(
              order === 'child-first' ? 409 : 200,
            );
            const mismatches = await database.pool.query(
              `SELECT c.id FROM "${kind === 'note' ? 'ConsultNote' : 'Billing'}" c LEFT JOIN "Appointment" a ON a.id=c."appointmentId" WHERE c."appointmentId"=$1 AND (a.id IS NULL OR a."patientId"<>c."patientId")`,
              [appointment.id],
            );
            expect(mismatches.rows).toHaveLength(0);
          } finally {
            await blocker.query('ROLLBACK');
            blocker.release();
            await Promise.allSettled(
              [child, parent].filter(
                (p): p is Promise<request.Response> => !!p,
              ),
            );
          }
        },
      );
    }
  }

  it.each(['COMPLETED', 'NO_SHOW'] as const)(
    'preserves %s queue history and rejects unauthorized deletion',
    async (status) => {
      const [entry] = await database.db
        .insert(queues)
        .values({ patientId, queueNumber: 100000, status })
        .returning();
      await api().delete(`/queue/${entry.id}`).expect(401);
      for (const role of ['PATIENT', 'BILLING'] as const)
        await api()
          .delete(`/queue/${entry.id}`)
          .auth(auth(role), { type: 'bearer' })
          .expect(403);
      for (const role of ['ADMIN', 'FRONT_DESK', 'DOCTOR'] as const)
        await api()
          .delete(`/queue/${entry.id}`)
          .auth(auth(role), { type: 'bearer' })
          .expect(409);
      await api()
        .patch(`/queue/${entry.id}`)
        .auth(auth(), { type: 'bearer' })
        .send({ status: 'WAITING' })
        .expect(409);
      expect(
        (
          await database.db.select().from(queues).where(eq(queues.id, entry.id))
        )[0],
      ).toEqual(entry);
      expect(await audit(entry.id)).toHaveLength(0);
    },
  );

  it('audits allowed active queue deletion and completion without allowing later deletion', async () => {
    const [entry] = await database.db
      .insert(queues)
      .values({ patientId, queueNumber: 100001 })
      .returning();
    await api()
      .delete(`/queue/${entry.id}`)
      .auth(auth('FRONT_DESK'), { type: 'bearer' })
      .expect(200);
    expect(await audit(entry.id)).toMatchObject([
      {
        actorId: ids.FRONT_DESK,
        action: 'DELETE',
        resource: 'Queue',
        resourceId: entry.id,
      },
    ]);
    const [active] = await database.db
      .insert(queues)
      .values({ patientId, queueNumber: 100002 })
      .returning();
    await api()
      .patch(`/queue/${active.id}/complete`)
      .auth(auth('FRONT_DESK'), { type: 'bearer' })
      .expect(200);
    await api()
      .delete(`/queue/${active.id}`)
      .auth(auth(), { type: 'bearer' })
      .expect(409);
    expect((await audit(active.id)).map((row) => row.action)).toEqual([
      'UPDATE',
    ]);
  });

  it('rejects blank/oversized demographic inputs and future DOBs on create and patch', async () => {
    const valid = {
      firstName: '李',
      lastName: 'D’Arcy-山田',
      dob: '2000-02-29',
      gender: 'OTHER',
      phone: '+81 (0)3 1234 5678 ext. 9',
      address: '東京都 · Łódź',
    };
    for (const invalid of [
      { firstName: '   ' },
      { lastName: '\t\n' },
      { phone: '  ' },
      { firstName: 'a'.repeat(201) },
      { lastName: 'a'.repeat(201) },
      { phone: '1'.repeat(65) },
      { address: 'a'.repeat(1001) },
      { dob: '2999-01-01' },
      { dob: '2000-02-30' },
    ]) {
      await api()
        .post('/patients/register')
        .auth(auth('FRONT_DESK'), { type: 'bearer' })
        .send({ ...valid, ...invalid })
        .expect(400);
      await api()
        .patch(`/patients/${patientId}`)
        .auth(auth(), { type: 'bearer' })
        .send(invalid)
        .expect(400);
    }
    const created = await api()
      .post('/patients/register')
      .auth(auth('FRONT_DESK'), { type: 'bearer' })
      .send({ ...valid, firstName: ' 李 ' })
      .expect(201);
    expect(created.body.firstName).toBe('李');
    expect(created.body.dob.slice(0, 10)).toBe('2000-02-29');
    const updated = await api()
      .patch(`/patients/${created.body.id}`)
      .auth(auth(), { type: 'bearer' })
      .send({ dob: '1990-01-02T00:00:00+08:00' })
      .expect(200);
    expect(updated.body.dob.slice(0, 10)).toBe('1990-01-02');
  });

  it('keeps legacy stored DOBs and unrelated demographic updates compatible', async () => {
    const [old] = await database.db
      .insert(patients)
      .values({
        firstName: 'Legacy',
        lastName: 'Fixture',
        dob: new Date('1980-05-06T14:15:16.123Z'),
        gender: 'OTHER',
        phone: '555-0123',
      })
      .returning();
    await api()
      .patch(`/patients/${old.id}`)
      .auth(auth(), { type: 'bearer' })
      .send({ address: 'Updated synthetic address' })
      .expect(200);
    expect(
      (
        await database.db.select().from(patients).where(eq(patients.id, old.id))
      )[0].dob,
    ).toEqual(old.dob);
    const [note] = await database.db
      .insert(consultNotes)
      .values({
        patientId: old.id,
        doctorId: ids.DOCTOR!,
        assessment: 'Synthetic legacy content',
      })
      .returning();
    expect(note.patientId).toBe(old.id);
  });
});
