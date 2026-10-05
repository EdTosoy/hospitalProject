import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { DatabaseErrorFilter } from '../src/database/database-error.filter';
import { appointments, users, patients } from '../src/database/schema';
import { eq } from 'drizzle-orm';
// Deliberately additive: use a dedicated migrated test DB; never truncate shared data.
describe('PostgreSQL application workflows', () => {
  let app: INestApplication;
  let database: DatabaseService;
  const unique = randomUUID();
  const credentials = {
    email: `patient-${unique}@example.test`,
    password: 'test-password-123',
    name: 'Integration Patient',
  };
  let patientToken: string;
  let otherToken: string;
  let doctorToken: string;
  let staffToken: string;
  let billingToken: string;
  let userId: string;
  let patientId: string;
  let doctorId: string;
  let appointmentId: string;
  let noteId: string;
  beforeAll(async () => {
    if (
      !process.env.DATABASE_URL ||
      !new URL(process.env.DATABASE_URL).pathname.includes('test')
    )
      throw new Error('Use a dedicated database with test in its name');
    process.env.JWT_SECRET = 'integration-test-secret-at-least-32-characters';
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
  });
  afterAll(async () => {
    await app?.close();
  });
  const api = () => request(app.getHttpServer());
  it('protects clinical and financial routes from anonymous users', async () => {
    for (const route of [
      'patients',
      'appointments',
      'queue',
      'billing',
      'users',
      'consult-notes',
    ])
      await api().get(`/${route}`).expect(401);
  });
  it('registers patients without granting requested staff privileges', async () => {
    const result = await api()
      .post('/auth/register')
      .send({ ...credentials, role: 'ADMIN' })
      .expect(201);
    expect(result.body.role).toBe('PATIENT');
    expect(result.body.password).toBeUndefined();
    userId = result.body.id;
    await api().post('/auth/register').send(credentials).expect(409);
    await api()
      .post('/auth/register')
      .send({ email: 'invalid', password: 'tiny' })
      .expect(400);
    await api()
      .post('/auth/login')
      .send({ ...credentials, name: undefined, password: 'wrong-password' })
      .expect(401);
    const login = await api()
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(201);
    patientToken = login.body.access_token;
    for (const role of [
      'DOCTOR',
      'FRONT_DESK',
      'BILLING',
      'PATIENT',
    ] as const) {
      const email = `${role}-${unique}@example.test`;
      await api()
        .post('/auth/register')
        .send({ email, password: credentials.password })
        .expect(201);
      if (role !== 'PATIENT')
        await database.db
          .update(users)
          .set({ role })
          .where(eq(users.email, email));
      const response = await api()
        .post('/auth/login')
        .send({ email, password: credentials.password })
        .expect(201);
      if (role === 'DOCTOR') {
        doctorToken = response.body.access_token;
        doctorId = response.body.user.id;
      }
      if (role === 'FRONT_DESK') staffToken = response.body.access_token;
      if (role === 'BILLING') billingToken = response.body.access_token;
      if (role === 'PATIENT') otherToken = response.body.access_token;
    }
  });
  it('creates and scopes patient profiles with date validation', async () => {
    await api()
      .get('/patients')
      .auth(patientToken, { type: 'bearer' })
      .expect(200, []);
    const profile = {
      firstName: 'Test',
      lastName: 'Patient',
      dob: '1990-01-01',
      gender: 'OTHER',
      phone: '09123456789',
    };
    await api()
      .post('/patients')
      .auth(patientToken, { type: 'bearer' })
      .send({ ...profile, dob: 'not-a-date' })
      .expect(400);
    await api()
      .post('/patients')
      .auth(patientToken, { type: 'bearer' })
      .send({ ...profile, dob: '1990-02-31' })
      .expect(400);
    const response = await api()
      .post('/patients')
      .auth(patientToken, { type: 'bearer' })
      .send(profile)
      .expect(201);
    patientId = response.body.id;
    await api()
      .post('/patients')
      .auth(patientToken, { type: 'bearer' })
      .send(profile)
      .expect(400);
    await api()
      .get(`/patients/${patientId}`)
      .auth(otherToken, { type: 'bearer' })
      .expect(403);
    const updated = await api()
      .patch(`/patients/${patientId}`)
      .auth(patientToken, { type: 'bearer' })
      .send({ dob: '1991-02-03' })
      .expect(200);
    expect(updated.body.dob).toContain('1991-02-03');
  });
  it('books using patient IDs and legacy user IDs, preserves relationships and private fields', async () => {
    const payload = {
      patientId,
      doctorId,
      dateTime: new Date(Date.now() + 86400000).toISOString(),
      reason: 'Integration check',
    };
    await api()
      .post('/appointments')
      .auth(otherToken, { type: 'bearer' })
      .send(payload)
      .expect(403);
    await api()
      .post('/appointments')
      .auth(patientToken, { type: 'bearer' })
      .send({ ...payload, doctorId: userId })
      .expect(400);
    const response = await api()
      .post('/appointments')
      .auth(patientToken, { type: 'bearer' })
      .send(payload)
      .expect(201);
    appointmentId = response.body.id;
    expect(response.body.status).toBe('PENDING');
    await api()
      .post('/appointments')
      .auth(patientToken, { type: 'bearer' })
      .send({ ...payload, patientId: userId })
      .expect(201);
    const list = await api()
      .get('/appointments')
      .auth(doctorToken, { type: 'bearer' })
      .expect(200);
    expect(
      list.body.find((row: { id: string }) => row.id === appointmentId).doctor
        .password,
    ).toBeUndefined();
    const confirmed = await api()
      .patch(`/appointments/${appointmentId}`)
      .auth(doctorToken, { type: 'bearer' })
      .send({ status: 'CONFIRMED' })
      .expect(200);
    expect(confirmed.body.status).toBe('CONFIRMED');
    await api()
      .get(`/appointments/${appointmentId}`)
      .auth(otherToken, { type: 'bearer' })
      .expect(403);
    await api()
      .patch(`/appointments/${appointmentId}`)
      .auth(patientToken, { type: 'bearer' })
      .send({ status: 'COMPLETED' })
      .expect(403);
  });
  it('enforces profile ownership and never returns password hashes', async () => {
    await api()
      .patch(`/patients/${patientId}`)
      .auth(billingToken, { type: 'bearer' })
      .send({ firstName: 'Unauthorized' })
      .expect(403);
    await api()
      .delete(`/patients/${patientId}`)
      .auth(billingToken, { type: 'bearer' })
      .expect(403);
    await api()
      .patch(`/users/${userId}`)
      .auth(patientToken, { type: 'bearer' })
      .send({ email: null })
      .expect(400);
    const result = await api()
      .patch(`/users/${userId}`)
      .auth(patientToken, { type: 'bearer' })
      .send({ name: 'Updated Patient' })
      .expect(200);
    expect(result.body.password).toBeUndefined();
    await api()
      .patch(`/users/${doctorId}`)
      .auth(patientToken, { type: 'bearer' })
      .send({ name: 'Attack' })
      .expect(403);
    await api()
      .patch(`/users/${userId}`)
      .auth(patientToken, { type: 'bearer' })
      .send({ role: 'ADMIN' })
      .expect(400);
  });
  it('serializes duplicate queue insertion and atomically calls the next patient', async () => {
    const add = () =>
      api()
        .post('/queue/add-to-queue')
        .auth(staffToken, { type: 'bearer' })
        .send({ patientId });
    const responses = await Promise.all([add(), add()]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    await api()
      .post('/queue/add-to-queue')
      .auth(patientToken, { type: 'bearer' })
      .send({ patientId })
      .expect(403);
    await api()
      .post('/queue/add-to-queue')
      .auth(staffToken, { type: 'bearer' })
      .send({})
      .expect(400);
    const next = await api()
      .post('/queue/call-next')
      .auth(doctorToken, { type: 'bearer' })
      .expect(201);
    expect(next.body.patient.id).toBe(patientId);
    expect(next.body.status).toBe('IN_PROGRESS');
    await api()
      .patch(`/queue/${next.body.id}`)
      .auth(staffToken, { type: 'bearer' })
      .send({ status: 'CANCELLED' })
      .expect(400);
    await api()
      .patch(`/queue/${next.body.id}/complete`)
      .auth(staffToken, { type: 'bearer' })
      .expect(200);
    const second = await add().expect(201);
    await api()
      .patch(`/queue/${next.body.id}`)
      .auth(staffToken, { type: 'bearer' })
      .send({ status: 'WAITING' })
      .expect(409);
    await api()
      .patch(`/queue/${second.body.id}/complete`)
      .auth(staffToken, { type: 'bearer' })
      .expect(200);
  });
  it('stores SOAP notes with authenticated authors and scoped access', async () => {
    const response = await api()
      .post('/consult-notes')
      .auth(doctorToken, { type: 'bearer' })
      .send({
        patientId,
        doctorId: userId,
        appointmentId,
        assessment: 'Test assessment',
        plan: 'Follow up',
      })
      .expect(201);
    noteId = response.body.id;
    expect(response.body.doctorId).toBe(doctorId);
    await api()
      .post('/consult-notes')
      .auth(doctorToken, { type: 'bearer' })
      .send({
        patientId,
        doctorId,
        appointmentId,
        assessment: 'Duplicate assessment',
      })
      .expect(409);
    await api()
      .get(`/consult-notes/${noteId}`)
      .auth(patientToken, { type: 'bearer' })
      .expect(403);
    const list = await api()
      .get(`/consult-notes/patient/${patientId}`)
      .auth(doctorToken, { type: 'bearer' })
      .expect(200);
    expect(list.body[0].doctor.password).toBeUndefined();
  });
  it('supports decimal billing, payment timestamps, and database constraints', async () => {
    const response = await api()
      .post('/billing')
      .auth(billingToken, { type: 'bearer' })
      .send({
        patientId,
        appointmentId,
        amount: 123.45,
        description: 'Consultation',
      })
      .expect(201);
    expect(response.body.amount).toBe(123.45);
    const [otherPatient] = await database.db
      .insert(patients)
      .values({
        firstName: 'Other',
        lastName: 'Patient',
        dob: new Date('1990-01-01'),
        gender: 'OTHER',
        phone: '09123456789',
      })
      .returning();
    await api()
      .patch(`/billing/${response.body.id}`)
      .auth(billingToken, { type: 'bearer' })
      .send({ patientId: otherPatient.id })
      .expect(400);
    await api()
      .patch(`/consult-notes/${noteId}`)
      .auth(doctorToken, { type: 'bearer' })
      .send({ patientId: otherPatient.id })
      .expect(400);
    const paid = await api()
      .patch(`/billing/${response.body.id}`)
      .auth(billingToken, { type: 'bearer' })
      .send({ status: 'PAID' })
      .expect(200);
    expect(paid.body.paidAt).toBeTruthy();
    await api()
      .get('/billing')
      .auth(patientToken, { type: 'bearer' })
      .expect(403);
    await api()
      .delete(`/patients/${patientId}`)
      .auth(staffToken, { type: 'bearer' })
      .expect(409);
    const before = await database.db.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
    });
    await database.db
      .update(appointments)
      .set({ reason: 'Updated transaction test' })
      .where(eq(appointments.id, appointmentId));
    const after = await database.db.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
    });
    expect(after!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before!.updatedAt.getTime(),
    );
    await expect(
      database.db.transaction(async (tx) => {
        await tx
          .update(patients)
          .set({ firstName: 'Rolled back' })
          .where(eq(patients.id, patientId));
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(
      (await database.db.query.patients.findFirst({
        where: eq(patients.id, patientId),
      }))!.firstName,
    ).toBe('Test');
  });
});
