import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  children,
  registration = false,
}: {
  children: ReactNode;
  registration?: boolean;
}) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r bg-[#e9f2ef] p-12 lg:flex">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-semibold"
        >
          <Activity className="size-6 text-primary" />
          Pulse Medical
        </Link>
        <div className="max-w-lg">
          <p className="eyebrow">
            {registration ? "Your patient portal" : "Care, connected"}
          </p>
          <h2 className="mt-4 text-4xl leading-tight font-semibold tracking-tight">
            {registration
              ? "A simple start to your next visit."
              : "The next step in care starts here."}
          </h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            {registration
              ? "Create your account, complete your patient profile, then request an appointment."
              : "Patients manage their visits. Care teams coordinate appointments, consultations, queues, and billing."}
          </p>
          <div className="mt-8 space-y-4">
            {[
              { icon: UserRound, text: "Your details, in one place" },
              { icon: CalendarDays, text: "Clear appointment status" },
              { icon: ClipboardCheck, text: "Dedicated care team workflows" },
            ].map((item) => (
              <p key={item.text} className="flex items-center gap-3 text-sm">
                <item.icon className="size-5 text-primary" />
                {item.text}
              </p>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Pulse Medical Center · Patient portal & staff access
        </p>
      </section>
      <section className="flex min-h-screen flex-col p-4 sm:p-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to Pulse
        </Link>
        <div className="flex flex-1 items-center justify-center py-8">
          {children}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {registration
            ? "Staff accounts are managed by your administrator."
            : "Use the account assigned to you. Sign out when using a shared device."}
        </p>
      </section>
    </main>
  );
}
