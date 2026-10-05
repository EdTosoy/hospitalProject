import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { DatabaseErrorFilter } from '../src/database/database-error.filter';
import {
  users,
  auditLogs,
  billings,
  consultNotes,
} from '../src/database/schema';

describe('Code-quality regressions against PostgreSQL', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let patient: string;
  let patientId: string;
  let doctor: string;
  let otherDoctor: string;
  let billing: string;
  let doctorId: string;
  const unique = randomUUID();
  const api = () => request(app.getHttpServer());
  beforeAll(async () => {
    if (
      !process.env.DATABASE_URL ||
      !new URL(process.env.DATABASE_URL).pathname.includes('test')
    )
      throw new Error('Dedicated test DB required');
    process.env.JWT_SECRET = 'quality-test-secret-at-least-32-characters';
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
    for (const [name, role] of [
      ['patient', 'PATIENT'],
      ['doctor', 'DOCTOR'],
      ['other', 'DOCTOR'],
      ['billing', 'BILLING'],
    ] as const) {
      const email = `${name}-quality-${unique}@example.test`;
      const result = await api()
        .post('/auth/register')
        .send({ email, password: 'quality-test-password', name })
        .expect(201);
      if (role !== 'PATIENT')
        await database.db
          .update(users)
          .set({ role })
          .where(eq(users.id, result.body.id));
      const login = await api()
        .post('/auth/login')
        .send({ email, password: 'quality-test-password' })
        .expect(201);
      if (name === 'patient') patient = login.body.access_token;
      if (name === 'doctor') {
        doctor = login.body.access_token;
        doctorId = result.body.id;
      }
      if (name === 'other') otherDoctor = login.body.access_token;
      if (name === 'billing') billing = login.body.access_token;
    }
    const profile = await api()
      .post('/patients')
      .auth(patient, { type: 'bearer' })
      .send({
        firstName: 'Quality',
        lastName: 'Patient',
        dob: '1990-01-01',
        gender: 'OTHER',
        phone: '09123456789',
      })
      .expect(201);
    patientId = profile.body.id;
  });
  afterAll(async () => {
    await app?.close();
  });
  const book = () =>
    api()
      .post('/appointments')
      .auth(patient, { type: 'bearer' })
      .send({
        patientId,
        dateTime: new Date(Date.now() + 86400000 * 3).toISOString(),
        reason: 'Quality regression',
      })
      .expect(201);
  it('lets only one doctor claim an unassigned appointment', async () => {
    for (let i = 0; i < 3; i++) {
      const visit = await book();
      const claims = await Promise.all(
        [doctor, otherDoctor].map((token) =>
          api()
            .patch(`/appointments/${visit.body.id}`)
            .auth(token, { type: 'bearer' })
            .send({ status: 'CONFIRMED' }),
        ),
      );
      expect(claims.map((result) => result.status).sort()).toEqual([200, 403]);
    }
  });
  it('rejects cancellation of completed appointments and reopening terminal visits', async () => {
    const visit = await book();
    await api()
      .patch(`/appointments/${visit.body.id}`)
      .auth(doctor, { type: 'bearer' })
      .send({ status: 'CONFIRMED' })
      .expect(200);
    await api()
      .patch(`/appointments/${visit.body.id}`)
      .auth(doctor, { type: 'bearer' })
      .send({ status: 'COMPLETED' })
      .expect(200);
    await api()
      .patch(`/appointments/${visit.body.id}`)
      .auth(patient, { type: 'bearer' })
      .send({ status: 'CANCELLED' })
      .expect(409);
    await api()
      .patch(`/appointments/${visit.body.id}`)
      .auth(doctor, { type: 'bearer' })
      .send({ status: 'PENDING' })
      .expect(409);
  });
  it('rejects blank content and empty SOAP updates on the server', async () => {
    await api()
      .post('/appointments')
      .auth(patient, { type: 'bearer' })
      .send({
        patientId,
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        reason: '   ',
      })
      .expect(400);
    await api()
      .post('/consult-notes')
      .auth(doctor, { type: 'bearer' })
      .send({ patientId, doctorId })
      .expect(400);
    const note = await api()
      .post('/consult-notes')
      .auth(doctor, { type: 'bearer' })
      .send({ patientId, doctorId, assessment: 'Assessment' })
      .expect(201);
    await api()
      .patch(`/consult-notes/${note.body.id}`)
      .auth(doctor, { type: 'bearer' })
      .send({ assessment: '   ' })
      .expect(400);
  });
  it('rejects fractional cents and records overdue payments', async () => {
    await api()
      .post('/billing')
      .auth(billing, { type: 'bearer' })
      .send({ patientId, amount: 17.125, description: 'Invalid precision' })
      .expect(400);
    const bill = await api()
      .post('/billing')
      .auth(billing, { type: 'bearer' })
      .send({
        patientId,
        amount: 17.12,
        description: 'Overdue',
        status: 'OVERDUE',
      })
      .expect(201);
    const paid = await api()
      .patch(`/billing/${bill.body.id}`)
      .auth(billing, { type: 'bearer' })
      .send({ status: 'PAID' })
      .expect(200);
    const repeat = await api()
      .patch(`/billing/${bill.body.id}`)
      .auth(billing, { type: 'bearer' })
      .send({ status: 'PAID' })
      .expect(200);
    expect(repeat.body.paidAt).toBe(paid.body.paidAt);
    await api()
      .patch(`/billing/${bill.body.id}`)
      .auth(billing, { type: 'bearer' })
      .send({ amount: 18 })
      .expect(409);
  });
  it('returns only patient selectors to billing staff', async () => {
    const result = await api()
      .get('/patients')
      .auth(billing, { type: 'bearer' })
      .expect(200);
    expect(
      Object.keys(
        result.body.find((row: { id: string }) => row.id === patientId),
      ).sort(),
    ).toEqual(['firstName', 'id', 'lastName']);
    await api()
      .get(`/patients/${patientId}`)
      .auth(billing, { type: 'bearer' })
      .expect(403);
  });
  it('records mutation metadata without clinical text in the same transaction', async () => {
    const note = await api()
      .post('/consult-notes')
      .auth(doctor, { type: 'bearer' })
      .send({ patientId, doctorId, assessment: 'Private clinical content' })
      .expect(201);
    const rows = await database.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.resourceId, note.body.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorId: doctorId,
      resource: 'ConsultNote',
      action: 'CREATE',
    });
    expect(JSON.stringify(rows)).not.toContain('Private clinical content');
  });
  it('preserves legacy amounts and requires an explicit PHP review', async () => {
    const [legacy] = await database.db
      .insert(billings)
      .values({ patientId, amount: 17.125, description: 'Legacy precision' })
      .returning();
    const original = await api()
      .get(`/billing/${legacy.id}`)
      .auth(billing, { type: 'bearer' })
      .expect(200);
    expect(original.body).toMatchObject({
      requiresReview: true,
      amount: 17.125,
      currency: null,
      amountMinor: null,
    });
    await api()
      .patch(`/billing/${legacy.id}`)
      .auth(billing, { type: 'bearer' })
      .send({ status: 'PAID' })
      .expect(409);
    await api()
      .patch(`/billing/${legacy.id}`)
      .auth(billing, { type: 'bearer' })
      .send({ amount: 17.13 })
      .expect(409);
    const review = await api()
      .patch(`/billing/${legacy.id}`)
      .auth(billing, { type: 'bearer' })
      .send({ amount: 17.13, currency: 'PHP' })
      .expect(200);
    expect(review.body).toMatchObject({
      amount: 17.13,
      amountMinor: 1713,
      currency: 'PHP',
      legacyAmount: 17.125,
      requiresReview: false,
    });
    expect(
      (
        await database.db
          .select()
          .from(billings)
          .where(eq(billings.id, legacy.id))
      )[0].amount,
    ).toBe(17.125);
    await expect(
      database.db
        .update(billings)
        .set({ amountMinor: -1 })
        .where(eq(billings.id, legacy.id)),
    ).rejects.toThrow();
    await expect(
      database.db
        .update(billings)
        .set({ currency: null })
        .where(eq(billings.id, legacy.id)),
    ).rejects.toThrow();
  });
  it('rolls back the record change if the audit entry cannot be written', async () => {
    const note = await api()
      .post('/consult-notes')
      .auth(doctor, { type: 'bearer' })
      .send({ patientId, doctorId, assessment: 'Original' })
      .expect(201);
    await expect(
      database.audit(
        {
          userId: 'nonexistent-actor',
          email: 'fake@example.test',
          role: 'DOCTOR',
        },
        'ConsultNote',
        'UPDATE',
        ['assessment'],
        async (tx) =>
          (
            await tx
              .update(consultNotes)
              .set({ assessment: 'Must roll back' })
              .where(eq(consultNotes.id, note.body.id))
              .returning()
          )[0],
      ),
    ).rejects.toThrow();
    expect(
      (
        await database.db
          .select()
          .from(consultNotes)
          .where(eq(consultNotes.id, note.body.id))
      )[0].assessment,
    ).toBe('Original');
  });
  it('uses HttpOnly cookies, blocks forged origins, restores identity and revokes logout tokens', async () => {
    const email = `patient-quality-${unique}@example.test`;
    const login = await api()
      .post('/auth/login')
      .set('Origin', 'http://localhost:3001')
      .send({ email, password: 'quality-test-password' })
      .expect(201);
    const cookie = login.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const cookieHeader = cookie.split(';')[0];
    await api().get('/auth/me').set('Cookie', cookieHeader).expect(200);
    await api()
      .post('/auth/logout')
      .set('Cookie', cookieHeader)
      .set('Origin', 'https://untrusted.example.test')
      .expect(403);
    await api().post('/auth/logout').set('Cookie', cookieHeader).expect(403);
    await api()
      .post('/auth/login')
      .set('Origin', 'https://untrusted.example.test')
      .send({ email, password: 'quality-test-password' })
      .expect(403);
    await api()
      .post('/auth/logout')
      .set('Cookie', cookieHeader)
      .set('Origin', 'http://localhost:3001')
      .expect(201);
    await api().get('/auth/me').set('Cookie', cookieHeader).expect(401);
    await api()
      .get('/auth/me')
      .auth(login.body.access_token, { type: 'bearer' })
      .expect(401);
  });
  it('rate limits repeated login attempts without disabling validation', async () => {
    let limited = false;
    for (let i = 0; i < 21; i++) {
      const result = await api().post('/auth/login').send({
        email: 'nonexistent-quality@example.test',
        password: 'invalid-password',
      });
      if (result.status === 429) {
        expect(result.headers['retry-after']).toBeDefined();
        limited = true;
        break;
      }
      expect(result.status).toBe(401);
    }
    expect(limited).toBe(true);
  });

  it('keeps clinical reads shared while excluding billing from clinical routes', async () => {
    for (const route of ['/appointments', '/queue', '/consult-notes'])
      await api().get(route).auth(billing, { type: 'bearer' }).expect(403);
    const result = await api()
      .get('/billing')
      .auth(billing, { type: 'bearer' })
      .expect(200);
    for (const bill of result.body)
      expect(Object.keys(bill.patient).sort()).toEqual([
        'firstName',
        'id',
        'lastName',
      ]);
    await api()
      .get(`/consult-notes/patient/${patientId}`)
      .auth(otherDoctor, { type: 'bearer' })
      .expect(200);
  });
});
