CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Billing" ADD COLUMN "amountMinor" bigint;--> statement-breakpoint
ALTER TABLE "Billing" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Session_userId_idx" ON "Session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Session_expiresAt_idx" ON "Session" USING btree ("expiresAt");--> statement-breakpoint
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_exact_money_check" CHECK (("Billing"."amountMinor" IS NULL AND "Billing"."currency" IS NULL) OR ("Billing"."amountMinor" IS NOT NULL AND "Billing"."amountMinor" >= 0 AND "Billing"."amountMinor" <= 999999999999 AND "Billing"."currency" IS NOT NULL AND "Billing"."currency" = 'PHP'));