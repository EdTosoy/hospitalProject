"use client";
import { ArrowLeft, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ConfirmAction,
  EmptyState,
  PageHeader,
  QueryState,
} from "@/components/care-ui";
import {
  useConsultNotes,
  useCreateConsultNote,
} from "@/hooks/use-consult-notes";
import { usePatients } from "@/hooks/use-patients";
import { useAuthStore } from "@/stores/auth-store";

const emptyNote = { subjective: "", objective: "", assessment: "", plan: "" };
const sections = [
  ["subjective", "Subjective", "Symptoms, history, and the patient's account"],
  [
    "objective",
    "Objective",
    "Observed findings, examination, and measurements",
  ],
  ["assessment", "Assessment", "Clinical assessment and working diagnosis"],
  ["plan", "Plan", "Treatment, next steps, and follow-up"],
] as const;
export default function ConsultPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const user = useAuthStore((state) => state.user);
  const patients = usePatients();
  const notes = useConsultNotes(patientId);
  const create = useCreateConsultNote();
  const patient = patients.data?.find((item) => item.id === patientId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyNote);
  const dirty = Object.values(form).some((value) => !!value.trim());
  const [validation, setValidation] = useState("");
  if (patients.isLoading || notes.isLoading)
    return (
      <div className="workspace">
        <QueryState loading message="Loading consultation…" />
      </div>
    );
  if (patients.isError || notes.isError)
    return (
      <div className="workspace">
        <QueryState
          message="Unable to load consultation records. Please retry."
          retry={() => {
            void patients.refetch();
            void notes.refetch();
          }}
        />
      </div>
    );
  if (!patient)
    return (
      <div className="workspace">
        <EmptyState
          title="Patient not found"
          description="This record may no longer be available to your account."
          action={
            <Link href="/dashboard/patients" className="btn-secondary">
              Back to patients
            </Link>
          }
        />
      </div>
    );
  return (
    <div className="workspace">
      <Link
        href="/dashboard/patients"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeft className="size-4" />
        Back to patients
      </Link>
      <PageHeader
        title={`${patient.firstName} ${patient.lastName}`}
        eyebrow="Patient consultation"
        description="Review clinical notes and document care in the SOAP format."
        action={
          user?.role === "DOCTOR" &&
          !showForm && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setShowForm(true);
                create.reset();
              }}
            >
              <Plus className="size-4" />
              Add SOAP Note
            </button>
          )
        }
      />
      <section className="panel p-5">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Date of birth</dt>
            <dd className="mt-1 text-sm font-semibold">
              {new Date(patient.dob).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Gender</dt>
            <dd className="mt-1 text-sm font-semibold capitalize">
              {patient.gender.toLowerCase()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="mt-1 text-sm font-semibold">{patient.phone}</dd>
          </div>
        </dl>
      </section>
      {showForm && (
        <form
          className="panel p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!dirty) {
              setValidation(
                "Enter at least one section before saving a consultation note.",
              );
              return;
            }
            setValidation("");
            create.mutate(
              { patientId, doctorId: user?.id || "", ...form },
              {
                onSuccess: () => {
                  toast.success("Note saved");
                  setShowForm(false);
                  setForm(emptyNote);
                },
              },
            );
          }}
        >
          <div className="mb-5 border-b pb-5">
            <h2 className="text-xl font-semibold">New SOAP note</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Record relevant findings in your own words. Your name and the save
              time will be attached to this note.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {sections.map(([key, label, hint], index) => (
              <div key={key}>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-xs text-primary"
                  >
                    {index + 1}
                  </span>
                  <label
                    htmlFor={`soap-${key}`}
                    className="text-sm font-semibold"
                  >
                    {label}
                  </label>
                </div>
                <p
                  id={`soap-${key}-hint`}
                  className="mb-2 mt-2 text-xs text-muted-foreground"
                >
                  {hint}
                </p>
                <textarea
                  id={`soap-${key}`}
                  className="field min-h-32"
                  aria-describedby={`soap-${key}-hint`}
                  value={form[key]}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              </div>
            ))}
          </div>
          {(validation || create.isError) && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {validation || create.error?.message}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t pt-5">
            {dirty ? (
              <ConfirmAction
                label="Cancel"
                title="Discard this unsaved note?"
                description="The text in this draft will be discarded. Saved consultation notes will remain available."
                destructive
                disabled={create.isPending}
                onConfirm={async () => {
                  setShowForm(false);
                  setForm(emptyNote);
                  setValidation("");
                }}
              />
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={create.isPending}
            >
              {create.isPending ? "Saving…" : "Save Note"}
            </button>
          </div>
        </form>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Consultation Notes</h2>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />
          {user?.role === "DOCTOR" ? "Clinical record" : "Read-only access"}
        </p>
      </div>
      {!notes.data?.length ? (
        <EmptyState
          title="No consultation notes yet"
          description={
            user?.role === "DOCTOR"
              ? "Add a SOAP note to document this patient's consultation."
              : "Saved notes will appear here after a doctor records a consultation."
          }
        />
      ) : (
        <div className="space-y-4">
          {[...(notes.data || [])]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((note) => (
              <article key={note.id} className="panel overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
                  <p className="text-sm font-semibold">
                    {note.doctor?.name || "Consulting doctor"}
                  </p>
                  <time
                    dateTime={note.createdAt}
                    className="text-xs text-muted-foreground"
                  >
                    {new Date(note.createdAt).toLocaleString()}
                  </time>
                </header>
                <dl className="grid gap-5 p-5 lg:grid-cols-2">
                  {sections.map(
                    ([key, label]) =>
                      note[key] && (
                        <div key={key}>
                          <dt className="eyebrow">{label}</dt>
                          <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {note[key]}
                          </dd>
                        </div>
                      ),
                  )}
                </dl>
              </article>
            ))}
        </div>
      )}
    </div>
  );
}
