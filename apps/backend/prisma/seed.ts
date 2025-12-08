import {
  PrismaClient,
  Role,
  Gender,
  QueueStatus,
  AppointmentStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

// Setup Prisma with pg adapter (same as PrismaService)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (in order due to foreign keys)
  await prisma.queue.deleteMany();
  await prisma.billing.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // ─── Users ────────────────────────────────────────
  const _admin = await prisma.user.create({
    data: {
      email: 'admin@pulse.com',
      name: 'System Admin',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  const doctor1 = await prisma.user.create({
    data: {
      email: 'dr.santos@pulse.com',
      name: 'Dr. Maria Santos',
      password: hashedPassword,
      role: Role.DOCTOR,
    },
  });

  const doctor2 = await prisma.user.create({
    data: {
      email: 'dr.reyes@pulse.com',
      name: 'Dr. Jose Reyes',
      password: hashedPassword,
      role: Role.DOCTOR,
    },
  });

  const _nurse = await prisma.user.create({
    data: {
      email: 'nurse.garcia@pulse.com',
      name: 'Nurse Ana Garcia',
      password: hashedPassword,
      role: Role.NURSE,
    },
  });

  const _frontDesk = await prisma.user.create({
    data: {
      email: 'frontdesk@pulse.com',
      name: 'Juan Dela Cruz',
      password: hashedPassword,
      role: Role.FRONT_DESK,
    },
  });

  const _billing = await prisma.user.create({
    data: {
      email: 'billing@pulse.com',
      name: 'Carmen Lim',
      password: hashedPassword,
      role: Role.BILLING,
    },
  });

  // ─── Patients (with User accounts) ────────────────
  const patientUser1 = await prisma.user.create({
    data: {
      email: 'pedro@email.com',
      name: 'Pedro Penduko',
      password: hashedPassword,
      role: Role.PATIENT,
    },
  });

  const patient1 = await prisma.patient.create({
    data: {
      userId: patientUser1.id,
      firstName: 'Pedro',
      lastName: 'Penduko',
      dob: new Date('1985-03-15'),
      gender: Gender.MALE,
      phone: '+639171234567',
      address: '123 Rizal St, Manila',
    },
  });

  const patientUser2 = await prisma.user.create({
    data: {
      email: 'maria@email.com',
      name: 'Maria Clara',
      password: hashedPassword,
      role: Role.PATIENT,
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      userId: patientUser2.id,
      firstName: 'Maria',
      lastName: 'Clara',
      dob: new Date('1990-07-22'),
      gender: Gender.FEMALE,
      phone: '+639189876543',
      address: '456 Bonifacio Ave, Quezon City',
    },
  });

  const patientUser3 = await prisma.user.create({
    data: {
      email: 'jose@email.com',
      name: 'Jose Manalo',
      password: hashedPassword,
      role: Role.PATIENT,
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      userId: patientUser3.id,
      firstName: 'Jose',
      lastName: 'Manalo',
      dob: new Date('1978-11-08'),
      gender: Gender.MALE,
      phone: '+639151112222',
      address: '789 Mabini Blvd, Makati',
    },
  });

  // ─── Walk-in Patients (no User account) ───────────
  const walkIn1 = await prisma.patient.create({
    data: {
      firstName: 'Rosa',
      lastName: 'Villareal',
      dob: new Date('1965-02-28'),
      gender: Gender.FEMALE,
      phone: '+639173334444',
      address: '321 Luna St, Pasig',
    },
  });

  const walkIn2 = await prisma.patient.create({
    data: {
      firstName: 'Carlos',
      lastName: 'Mendoza',
      dob: new Date('1995-09-10'),
      gender: Gender.MALE,
      phone: '+639185556666',
    },
  });

  // ─── Appointments ─────────────────────────────────
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.appointment.createMany({
    data: [
      {
        patientId: patient1.id,
        doctorId: doctor1.id,
        dateTime: new Date(today.setHours(9, 0, 0)),
        reason: 'Annual checkup',
        status: AppointmentStatus.CONFIRMED,
      },
      {
        patientId: patient2.id,
        doctorId: doctor1.id,
        dateTime: new Date(today.setHours(10, 30, 0)),
        reason: 'Follow-up consultation',
        status: AppointmentStatus.PENDING,
      },
      {
        patientId: patient3.id,
        doctorId: doctor2.id,
        dateTime: new Date(today.setHours(14, 0, 0)),
        reason: 'Blood pressure monitoring',
        status: AppointmentStatus.CONFIRMED,
      },
      {
        patientId: walkIn1.id,
        doctorId: doctor2.id,
        dateTime: new Date(tomorrow.setHours(9, 0, 0)),
        reason: 'Flu symptoms',
        status: AppointmentStatus.PENDING,
      },
    ],
  });

  // ─── Queue ────────────────────────────────────────
  await prisma.queue.createMany({
    data: [
      {
        patientId: patient1.id,
        queueNumber: 1,
        status: QueueStatus.COMPLETED,
      },
      {
        patientId: patient2.id,
        queueNumber: 2,
        status: QueueStatus.IN_PROGRESS,
        calledAt: new Date(),
      },
      {
        patientId: patient3.id,
        queueNumber: 3,
        status: QueueStatus.WAITING,
      },
      {
        patientId: walkIn1.id,
        queueNumber: 4,
        status: QueueStatus.WAITING,
      },
      {
        patientId: walkIn2.id,
        queueNumber: 5,
        status: QueueStatus.WAITING,
      },
    ],
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📋 Test Accounts (password: password123):');
  console.log('  Admin:      admin@pulse.com');
  console.log('  Doctor:     dr.santos@pulse.com');
  console.log('  Doctor:     dr.reyes@pulse.com');
  console.log('  Nurse:      nurse.garcia@pulse.com');
  console.log('  Front Desk: frontdesk@pulse.com');
  console.log('  Billing:    billing@pulse.com');
  console.log('  Patient:    pedro@email.com');
  console.log('  Patient:    maria@email.com');
  console.log('  Patient:    jose@email.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
