CREATE TYPE "public"."AppointmentStatus" AS ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."BillingStatus" AS ENUM('PENDING', 'PAID', 'CANCELLED', 'OVERDUE');--> statement-breakpoint
CREATE TYPE "public"."Gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."QueueStatus" AS ENUM('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK', 'BILLING', 'PATIENT');--> statement-breakpoint
CREATE TABLE "Appointment" (
	"id" text PRIMARY KEY NOT NULL,
	"patientId" text NOT NULL,
	"doctorId" text,
	"dateTime" timestamp (3) NOT NULL,
	"reason" text NOT NULL,
	"status" "AppointmentStatus" DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"actorId" text NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resourceId" text NOT NULL,
	"details" text,
	"timestamp" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Billing" (
	"id" text PRIMARY KEY NOT NULL,
	"patientId" text NOT NULL,
	"appointmentId" text,
	"amount" double precision NOT NULL,
	"description" text NOT NULL,
	"status" "BillingStatus" DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"paidAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ConsultNote" (
	"id" text PRIMARY KEY NOT NULL,
	"patientId" text NOT NULL,
	"doctorId" text NOT NULL,
	"appointmentId" text,
	"subjective" text,
	"objective" text,
	"assessment" text,
	"plan" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "ConsultNote_appointmentId_key" UNIQUE("appointmentId")
);
--> statement-breakpoint
CREATE TABLE "Patient" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"dob" timestamp (3) NOT NULL,
	"gender" "Gender" NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "Patient_userId_key" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "Queue" (
	"id" text PRIMARY KEY NOT NULL,
	"patientId" text NOT NULL,
	"queueNumber" integer NOT NULL,
	"status" "QueueStatus" DEFAULT 'WAITING' NOT NULL,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"calledAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password" text NOT NULL,
	"role" "Role" DEFAULT 'PATIENT' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "User_email_key" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_Patient_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_User_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_User_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_patientId_Patient_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ConsultNote" ADD CONSTRAINT "ConsultNote_patientId_Patient_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ConsultNote" ADD CONSTRAINT "ConsultNote_doctorId_User_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_patientId_Patient_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE restrict ON UPDATE cascade;