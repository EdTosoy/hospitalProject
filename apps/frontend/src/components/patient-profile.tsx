"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { QueryState } from "@/components/care-ui";
import {
  useCreatePatient,
  usePatients,
  useUpdatePatient,
} from "@/hooks/use-patients";
import {
  type RegisterPatientInput,
  registerPatientSchema,
} from "@/lib/validations/patient";
import { useAuthStore } from "@/stores/auth-store";

export function PatientProfile() {
  const user = useAuthStore((state) => state.user);
  const patients = usePatients();
  const create = useCreatePatient();
  const update = useUpdatePatient();
  const [editing, setEditing] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterPatientInput>({
    resolver: zodResolver(registerPatientSchema),
  });
  if (user?.role !== "PATIENT") return null;
  if (patients.isLoading)
    return <QueryState loading message="Loading patient profile…" />;
  if (patients.isError)
    return (
      <QueryState
        message="Unable to load patient profile."
        retry={() => {
          void patients.refetch();
        }}
      />
    );
  const patient = patients.data?.[0];
  const fields = [
    ["firstName", "First name", "text"],
    ["lastName", "Last name", "text"],
    ["dob", "Date of birth", "date"],
    ["phone", "Phone", "tel"],
    ["address", "Address", "text"],
  ] as const;
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-5">
        <div>
          <p className="eyebrow">Patient details</p>
          <h2 className="mt-2 text-xl font-semibold">
            {patient ? "Patient profile" : "Complete your patient profile"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {patient
              ? "Your patient profile is ready for booking."
              : "Required before your first appointment. Use your own patient details."}
          </p>
        </div>
        {patient && !editing && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              reset({
                ...patient,
                dob: patient.dob.slice(0, 10),
                address: patient.address || "",
              });
              update.reset();
              setEditing(true);
            }}
          >
            Edit patient details
          </button>
        )}
      </div>
      {patient && !editing ? (
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([key, label]) => (
            <div key={key}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium">
                {key === "dob"
                  ? new Date(patient.dob).toLocaleDateString()
                  : patient[key] || "Not provided"}
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-muted-foreground">Gender</dt>
            <dd className="mt-1 text-sm font-medium capitalize">
              {patient.gender.toLowerCase()}
            </dd>
          </div>
        </dl>
      ) : (
        <form
          className="mt-5 space-y-5"
          onSubmit={handleSubmit((data) => {
            const options = {
              onSuccess: () => {
                toast.success(
                  patient
                    ? "Patient details updated"
                    : "Patient profile created",
                );
                setEditing(false);
              },
            };
            if (patient) update.mutate({ id: patient.id, ...data }, options);
            else create.mutate(data, options);
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label, type]) => (
              <div key={key}>
                <label
                  htmlFor={`patient-${key}`}
                  className="mb-1.5 block text-sm font-medium"
                >
                  {label}
                  {key === "address" && " (optional)"}
                </label>
                <input
                  id={`patient-${key}`}
                  type={type}
                  className="field"
                  aria-invalid={!!errors[key]}
                  aria-describedby={
                    errors[key] ? `patient-${key}-error` : undefined
                  }
                  {...register(key)}
                />
                {errors[key] && (
                  <p
                    id={`patient-${key}-error`}
                    className="mt-1 text-xs text-destructive"
                  >
                    {errors[key]?.message}
                  </p>
                )}
              </div>
            ))}
            <div>
              <label
                htmlFor="patient-gender"
                className="mb-1.5 block text-sm font-medium"
              >
                Gender
              </label>
              <select
                id="patient-gender"
                className="field"
                {...register("gender")}
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.gender.message}
                </p>
              )}
            </div>
          </div>
          {(create.isError || update.isError) && (
            <p role="alert" className="text-sm text-destructive">
              {create.error?.message || update.error?.message}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {patient && (
              <button
                type="button"
                disabled={update.isPending}
                className="btn-secondary"
                onClick={() => setEditing(false)}
              >
                Cancel patient edits
              </button>
            )}
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="btn-primary"
            >
              {create.isPending || update.isPending
                ? "Saving…"
                : patient
                  ? "Save patient details"
                  : "Save patient profile"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
