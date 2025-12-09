import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Stethoscope,
  User,
  Calendar,
  ShieldCheck,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4 md:px-6 mx-auto">
          <div className="flex items-center gap-2 font-bold text-xl mr-8">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            Pulse Medical
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground ml-auto">
            <Link
              href="/login"
              className="hover:text-primary transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Modern Healthcare <br />
                    <span className="text-primary">Reimagined</span>
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Experience seamless medical care with Pulse Medical Center.
                    Manage appointments, view records, and consult with top
                    specialists—all in one secure platform.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    Patient Portal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    Staff Access
                  </Link>
                </div>
              </div>
              {/* Hero Visual - Abstract Representation */}
              <div className="flex items-center justify-center relative">
                <div className="absolute w-full max-w-[500px] aspect-square bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl opacity-50 z-[-1]" />
                <div className="grid gap-6 p-6 border rounded-2xl bg-card/50 backdrop-blur-sm shadow-2xl w-full max-w-[400px]">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">Hello, Sarah</div>
                      <div className="text-sm text-muted-foreground">
                        Upcoming Appointment
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Date
                      </span>
                      <span className="font-medium">Tomorrow, 10:00 AM</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" /> Doctor
                      </span>
                      <span className="font-medium">Dr. Emily Chen</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4">
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[75%] rounded-full" />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Check-in Complete</span>
                      <span>Waiting Room</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:px-10 md:gap-16 md:grid-cols-3">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 p-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Easy Scheduling</h3>
                <p className="text-muted-foreground">
                  Book appointments with your preferred doctors instantly.
                  Reschedule or cancel with just a few clicks.
                </p>
              </div>
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 p-3">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Secure Records</h3>
                <p className="text-muted-foreground">
                  Your medical history, prescriptions, and lab results are
                  stored securely and accessible only to you.
                </p>
              </div>
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 p-3">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Expert Care</h3>
                <p className="text-muted-foreground">
                  Access a network of top-tier specialists and general
                  practitioners dedicated to your well-being.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 Pulse Medical Center. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
