import {
  PrismaClient,
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
  await prisma.consultNote.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.billing.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // ─── Users ────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: 'admin@hospital.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const doctor = await prisma.user.create({
    data: {
      email: 'doctor@hospital.com',
      name: 'Dr. House',
      password: hashedPassword,
      role: 'DOCTOR',
    },
  });

  await prisma.user.create({
    data: {
      email: 'nurse@hospital.com',
      name: 'Nurse Joy',
      password: hashedPassword,
      role: 'NURSE',
    },
  });

  await prisma.user.create({
    data: {
      email: 'frontdesk@hospital.com',
      name: 'Pam Beesly',
      password: hashedPassword,
      role: 'FRONT_DESK',
    },
  });

  await prisma.user.create({
    data: {
      email: 'billing@hospital.com',
      name: 'Oscar Martinez',
      password: hashedPassword,
      role: 'BILLING',
    },
  });

  // ─── Patients (with User accounts) ────────────────
  const patient = await prisma.user.create({
    data: {
      email: 'patient@hospital.com',
      name: 'John Doe',
      password: hashedPassword,
      role: 'PATIENT',
    },
  });

  // Create Patient Profile
  const patientProfile = await prisma.patient.create({
    data: {
      userId: patient.id,
      firstName: 'John', // Added firstName
      lastName: 'Doe', // Added lastName
      dob: new Date('1990-01-01'), // Renamed dateOfBirth to dob
      gender: Gender.MALE, // Changed 'MALE' to Gender.MALE
      phone: '555-0123',
      address: '123 Main St',
    },
  });

  // ─── Appointments ─────────────────────────────────
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.appointment.createMany({
    data: [
      {
        patientId: patientProfile.id,
        doctorId: doctor.id,
        dateTime: new Date(today.setHours(9, 0, 0)),
        reason: 'Annual checkup',
        status: AppointmentStatus.CONFIRMED,
      },
    ],
  });

  // ─── Queue ────────────────────────────────────────
  await prisma.queue.createMany({
    data: [
      {
        patientId: patientProfile.id,
        queueNumber: 1,
        status: QueueStatus.COMPLETED,
      },
    ],
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📋 Test Accounts (password: password123):');
  console.log('  Admin:      admin@hospital.com');
  console.log('  Doctor:     doctor@hospital.com');
  console.log('  Nurse:      nurse@hospital.com');
  console.log('  Front Desk: frontdesk@hospital.com');
  console.log('  Billing:    billing@hospital.com');
  console.log('  Patient:    patient@hospital.com');
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
