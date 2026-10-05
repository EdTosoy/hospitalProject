"use client";
import type { Bill, CreateBillInput } from "@hospital/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ConfirmAction,
  EmptyState,
  Metric,
  PageHeader,
  QueryState,
  RecordToolbar,
  StatusBadge,
} from "@/components/care-ui";
import { usePatientSelectors } from "@/hooks/use-patients";
import { apiAuthFetch } from "@/lib/api";

const amount = (value: number) =>
  value.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
function LegacyReview({ bill }: { bill: Bill }) {
  const client = useQueryClient();
  const [confirmed, setConfirmed] = useState("");
  const review = useMutation({
    mutationFn: () =>
      apiAuthFetch(`/billing/${bill.id}`, {
        method: "PATCH",
        body: JSON.stringify({ amount: Number(confirmed), currency: "PHP" }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["billing"] });
      toast.success("PHP amount confirmed; original amount preserved");
    },
  });
  return (
    <details className="mt-4 rounded-lg border p-3">
      <summary className="cursor-pointer font-medium">
        Review legacy bill
      </summary>
      <p className="mt-3 text-sm">
        Original amount: <strong>{String(bill.legacyAmount)}</strong>. Currency
        was not recorded. Confirm the agreed PHP amount explicitly; the original
        value will remain preserved.
      </p>
      <form
        className="mt-3 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          review.mutate();
        }}
      >
        <label className="block text-sm" htmlFor={`review-${bill.id}`}>
          Confirmed PHP amount
        </label>
        <input
          id={`review-${bill.id}`}
          className="field"
          type="number"
          required
          min="0"
          max="9999999999.99"
          step="0.01"
          value={confirmed}
          onChange={(event) => setConfirmed(event.target.value)}
        />
        {review.isError && (
          <p role="alert" className="text-sm text-destructive">
            {review.error.message}
          </p>
        )}
        <button
          className="btn-primary"
          type="submit"
          disabled={review.isPending}
        >
          {review.isPending ? "Saving…" : "Confirm PHP amount"}
        </button>
      </form>
    </details>
  );
}
export default function BillingPage() {
  const client = useQueryClient();
  const bills = useQuery({
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    queryKey: ["billing"],
    queryFn: () => apiAuthFetch<Bill[]>("/billing"),
  });
  const patients = usePatientSelectors();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBillInput>();
  const create = useMutation({
    mutationFn: (data: CreateBillInput) =>
      apiAuthFetch("/billing", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      reset();
      void client.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Bill created");
    },
  });
  const pay = useMutation({
    mutationFn: (id: string) =>
      apiAuthFetch(`/billing/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PAID" }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Payment recorded");
    },
  });
  const filtered = (bills.data || []).filter(
    (item) =>
      (status === "ALL" || item.status === status) &&
      `${item.patient.firstName} ${item.patient.lastName} ${item.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pending = (bills.data || []).filter((item) =>
    ["PENDING", "OVERDUE"].includes(item.status),
  );
  return (
    <div className="workspace">
      <PageHeader
        title="Billing"
        eyebrow="Billing workspace"
        description="Create patient charges, review outstanding balances, and record payments received."
        action={
          <a className="btn-primary" href="#bill-form">
            New bill
          </a>
        }
      />
      {bills.isLoading || patients.isLoading ? (
        <QueryState loading message="Loading billing…" />
      ) : bills.isError || patients.isError ? (
        <QueryState
          message="Unable to load billing records."
          retry={() => {
            void bills.refetch();
            void patients.refetch();
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="Outstanding bills"
              value={pending.length}
              description="Pending and overdue"
            />
            <Metric
              label="Outstanding amount"
              value={amount(
                pending.reduce(
                  (sum, item) => sum + (item.amountMinor ?? 0),
                  0,
                ) / 100,
              )}
              description="Confirmed PHP charges; legacy bills excluded"
            />
            <Metric
              label="Paid bills"
              value={
                (bills.data || []).filter((item) => item.status === "PAID")
                  .length
              }
              description="Payments recorded by staff"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>
              Refreshes every 5 seconds.{" "}
              {(bills.data || []).filter((item) => item.requiresReview).length}{" "}
              legacy bills need currency review.
            </p>
            <button
              className="btn-secondary"
              type="button"
              disabled={bills.isFetching}
              onClick={() => void bills.refetch()}
            >
              Refresh bills
            </button>
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0 space-y-4">
              <RecordToolbar
                label="Search patient or bill description"
                query={query}
                onQueryChange={setQuery}
                status={status}
                onStatusChange={setStatus}
                statuses={["PENDING", "OVERDUE", "PAID", "CANCELLED"]}
                count={filtered.length}
              />
              {!filtered.length && (
                <EmptyState
                  title={
                    bills.data?.length ? "No matching bills" : "No bills yet"
                  }
                  description="Create a charge using the form, or adjust your search to find an existing bill."
                />
              )}
              {filtered.map((item) => (
                <article key={item.id} className="panel p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">
                        {item.patient.firstName} {item.patient.lastName}
                      </h2>
                      <p className="mt-2 break-words text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <p className="text-xl font-semibold tabular-nums">
                      {item.requiresReview
                        ? `${String(item.legacyAmount)} · currency unconfirmed`
                        : amount(item.amount)}
                    </p>
                    {["PENDING", "OVERDUE"].includes(item.status) &&
                      !item.requiresReview && (
                        <ConfirmAction
                          label="Mark paid"
                          title="Record this bill as paid?"
                          description={`Confirm that payment of ${item.requiresReview ? `${String(item.legacyAmount)} · currency unconfirmed` : amount(item.amount)} for ${item.patient.firstName} ${item.patient.lastName} has been received. This records a payment; it does not process one.`}
                          disabled={pay.isPending}
                          onConfirm={() => pay.mutateAsync(item.id)}
                        />
                      )}
                  </div>
                  {item.requiresReview && <LegacyReview bill={item} />}
                </article>
              ))}
            </section>
            <form
              id="bill-form"
              onSubmit={handleSubmit((data) => create.mutate(data))}
              className="panel scroll-mt-24 space-y-4 p-5 sm:p-6"
            >
              <div className="border-b pb-4">
                <p className="eyebrow">New charge</p>
                <h2 className="mt-2 text-xl font-semibold">Create bill</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Select the patient and describe the charge clearly.
                </p>
              </div>
              <div>
                <label
                  htmlFor="bill-patient"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Patient
                </label>
                <select
                  id="bill-patient"
                  required
                  {...register("patientId", { required: "Select a patient" })}
                  className="field"
                >
                  <option value="">Select patient</option>
                  {patients.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.firstName} {item.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="bill-description"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Description
                </label>
                <input
                  id="bill-description"
                  required
                  {...register("description", {
                    validate: (value) =>
                      !!value.trim() || "Enter a description",
                  })}
                  className="field"
                  placeholder="Consultation or service"
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="bill-amount"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Amount
                </label>
                <input
                  id="bill-amount"
                  type="number"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  required
                  {...register("amount", {
                    valueAsNumber: true,
                    min: { value: 0, message: "Amount cannot be negative" },
                    validate: (value) =>
                      (Number.isFinite(value) &&
                        /^\d+(\.\d{1,2})?$/.test(String(value))) ||
                      "Enter a PHP amount with at most two decimal places",
                  })}
                  className="field"
                />
                {errors.amount && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Amounts are recorded in PHP (Philippine peso).
              </p>
              {create.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {create.error.message}
                </p>
              )}
              <button
                type="submit"
                disabled={create.isPending || !patients.data?.length}
                className="btn-primary w-full"
              >
                {create.isPending ? "Saving…" : "Create bill"}
              </button>
              {!patients.data?.length && (
                <p className="text-xs text-muted-foreground">
                  A patient must be registered before a bill can be created.
                </p>
              )}
            </form>
          </div>
        </>
      )}
    </div>
  );
}
