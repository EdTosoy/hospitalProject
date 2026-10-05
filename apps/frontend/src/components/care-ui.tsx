"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, ArrowRight, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";

export function PageHeader({
  title,
  description,
  eyebrow = "Care workspace",
  action,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function QueryState({
  loading,
  message,
  retry,
}: {
  loading?: boolean;
  message?: string;
  retry?: () => void;
}) {
  return (
    <div
      className="panel flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center"
      role={loading ? "status" : "alert"}
      aria-live="polite"
    >
      {loading ? (
        <Loader2 className="size-6 animate-spin text-primary" />
      ) : (
        <AlertCircle className="size-6 text-destructive" />
      )}
      <p className="font-medium">
        {loading
          ? message || "Loading your workspace…"
          : message || "Unable to load records."}
      </p>
      {retry && !loading && (
        <button type="button" className="btn-secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel border-dashed p-8 text-center sm:p-12">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color = ["COMPLETED", "PAID"].includes(status)
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : ["CONFIRMED", "CALLED", "IN_PROGRESS"].includes(status)
      ? "bg-teal-50 text-teal-800 border-teal-200"
      : ["PENDING", "WAITING", "OVERDUE"].includes(status)
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function RecordToolbar({
  query,
  onQueryChange,
  label,
  status,
  onStatusChange,
  statuses,
  count,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  label: string;
  status?: string;
  onStatusChange?: (value: string) => void;
  statuses?: string[];
  count: number;
}) {
  return (
    <div className="panel flex flex-wrap items-center gap-3 p-3 sm:p-4">
      <div className="relative min-w-0 flex-1 basis-52">
        <Search
          className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          className="field pl-10"
          type="search"
          aria-label={label}
          placeholder={label}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      {statuses && onStatusChange && (
        <select
          className="field w-auto max-w-full"
          aria-label="Filter by status"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      )}
      <output className="text-xs text-muted-foreground">
        {count} {count === 1 ? "result" : "results"}
      </output>
    </div>
  );
}

export function Metric({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="my-2 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function TaskLink({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="panel group flex items-center justify-between gap-4 p-5 transition-colors hover:border-primary/40"
    >
      <div>
        <p className="font-semibold group-hover:text-primary">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
      <ArrowRight className="size-5 shrink-0 text-primary" />
    </Link>
  );
}

export function ConfirmAction({
  label,
  title,
  description,
  onConfirm,
  destructive = false,
  disabled = false,
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => Promise<unknown>;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError("");
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={destructive ? "btn-danger" : "btn-secondary"}
        >
          {label}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content className="panel fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6">
          <Dialog.Title className="pr-8 text-xl font-semibold">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </Dialog.Description>
          <Dialog.Close asChild>
            <button
              type="button"
              disabled={pending}
              className="absolute right-3 top-3 rounded-lg p-2"
              aria-label="Close confirmation"
            >
              <X className="size-4" />
            </button>
          </Dialog.Close>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={pending}
                className="btn-secondary"
              >
                Go back
              </button>
            </Dialog.Close>
            <button
              type="button"
              className={destructive ? "btn-danger" : "btn-primary"}
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Unable to save. Please try again.",
                  );
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? "Saving…" : "Confirm action"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function QueryRefresh({
  query,
}: {
  query: {
    dataUpdatedAt: number;
    isFetching: boolean;
    refetch: () => Promise<unknown>;
  };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <p>
        Refreshes every 5 seconds.
        {query.dataUpdatedAt > 0 &&
          ` Last updated ${new Date(query.dataUpdatedAt).toLocaleTimeString()}.`}
      </p>
      <button
        type="button"
        className="btn-secondary"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        Refresh records
      </button>
    </div>
  );
}
