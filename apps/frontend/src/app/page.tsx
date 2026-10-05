import {
  Activity,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  ListOrdered,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
              <Activity className="size-5" />
            </span>
            <span>
              Pulse
              <span className="hidden text-muted-foreground sm:inline">
                {" "}
                Medical
              </span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex items-center gap-3 sm:gap-5"
          >
            <Link
              href="/login"
              className="whitespace-nowrap text-sm font-semibold hover:text-primary"
            >
              Log In
            </Link>
            <Link href="/register" className="btn-primary whitespace-nowrap">
              Get Started
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">Pulse Medical Center</p>
            <h1 className="mt-5 max-w-2xl text-4xl leading-[1.1] font-semibold tracking-tight sm:text-6xl">
              Your care.
              <br />
              <span className="text-primary">A clearer path.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Plan your next visit with confidence. Manage your patient profile,
              request an appointment, and keep track of its status in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                Create patient account
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/login" className="btn-secondary">
                Patient Portal
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Part of the care team?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary underline underline-offset-4"
              >
                Staff Access
              </Link>
            </p>
          </div>
          <div className="relative rounded-3xl border bg-[#e9f2ef] p-5 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Stethoscope className="size-5" />
                Care, connected
              </span>
              <span className="text-xs text-muted-foreground">
                Your visit journey
              </span>
            </div>
            <div className="space-y-3">
              {[
                {
                  icon: UserRound,
                  title: "Complete your profile",
                  text: "Share the details needed for your visit.",
                },
                {
                  icon: CalendarDays,
                  title: "Request an appointment",
                  text: "Choose a date, time, and preferred doctor.",
                },
                {
                  icon: ClipboardCheck,
                  title: "Check your confirmation",
                  text: "Follow your request in the patient portal.",
                },
              ].map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-start gap-4 rounded-2xl border bg-white p-5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                    <step.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Step {index + 1}
                    </p>
                    <h2 className="mt-1 font-semibold">{step.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Appointment requests are reviewed by the care team before
              confirmation.
            </p>
          </div>
        </section>
        <section className="border-y bg-card">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <div className="mb-8 max-w-xl">
              <p className="eyebrow">One coordinated workspace</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Less friction. More clarity.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Dedicated tools for patients and the people coordinating their
                care.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: CalendarDays,
                  title: "Know your next step",
                  text: "Book visits and follow pending, confirmed, and completed appointments.",
                },
                {
                  icon: ListOrdered,
                  title: "Keep visits moving",
                  text: "Staff can register arrivals and coordinate the patient queue.",
                },
                {
                  icon: Stethoscope,
                  title: "Support the care team",
                  text: "Doctors record consultations, nurses review notes, and billing staff manage charges.",
                },
              ].map((item) => (
                <div key={item.title}>
                  <item.icon className="mb-4 size-6 text-primary" />
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <p>© 2026 Pulse Medical Center</p>
        <p>Patient portal & care team workspace</p>
      </footer>
    </div>
  );
}
