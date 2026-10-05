"use client";
import type { QueueStatus } from "@hospital/shared";
import { CheckCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  Metric,
  PageHeader,
  QueryRefresh,
  QueryState,
  RecordToolbar,
  StatusBadge,
} from "@/components/care-ui";
import {
  useCallNext,
  useCompleteQueue,
  useQueue,
  useUpdateQueueStatus,
} from "@/hooks/use-queue";

export default function QueuePage() {
  const queue = useQueue();
  const update = useUpdateQueueStatus();
  const call = useCallNext();
  const complete = useCompleteQueue();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const active = ["WAITING", "CALLED", "IN_PROGRESS"];
  const filtered = (queue.data || [])
    .filter(
      (item) =>
        (status === "ALL" ||
          (status === "ACTIVE"
            ? active.includes(item.status)
            : item.status === status)) &&
        `${item.queueNumber} ${item.patient?.firstName || ""} ${item.patient?.lastName || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.queueNumber - b.queueNumber);
  const waiting = (queue.data || []).filter(
    (item) => item.status === "WAITING",
  ).length;
  return (
    <div className="workspace">
      <PageHeader
        title="Patient Queue"
        eyebrow="Patient flow"
        description="Call the next waiting patient, track care in progress, and close completed visits."
        action={
          <button
            type="button"
            className="btn-primary"
            disabled={call.isPending || !waiting}
            onClick={() =>
              call.mutate(undefined, {
                onSuccess: (data) =>
                  data
                    ? toast.success(`Called patient #${data.queueNumber}`)
                    : toast.info("No patients waiting"),
                onError: (error) => toast.error(error.message),
              })
            }
          >
            <Phone className="size-4" />
            {call.isPending ? "Calling…" : "Call Next"}
          </button>
        }
      />
      <QueryRefresh query={queue} />
      {queue.isLoading ? (
        <QueryState loading message="Loading queue…" />
      ) : queue.isError ? (
        <QueryState
          message="Unable to load the patient queue."
          retry={() => {
            void queue.refetch();
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="Waiting"
              value={waiting}
              description="Ready to be called"
            />
            <Metric
              label="In care"
              value={
                (queue.data || []).filter((item) =>
                  ["CALLED", "IN_PROGRESS"].includes(item.status),
                ).length
              }
              description="Called or in progress"
            />
            <Metric
              label="Completed"
              value={
                (queue.data || []).filter((item) => item.status === "COMPLETED")
                  .length
              }
              description="Recorded in this queue"
            />
          </div>
          <RecordToolbar
            label="Search name or queue number"
            query={query}
            onQueryChange={setQuery}
            status={status}
            onStatusChange={setStatus}
            statuses={[
              "ACTIVE",
              "WAITING",
              "CALLED",
              "IN_PROGRESS",
              "COMPLETED",
              "NO_SHOW",
            ]}
            count={filtered.length}
          />
          {(update.isError || complete.isError || call.isError) && (
            <p role="alert" className="panel p-4 text-sm text-destructive">
              {update.error?.message ||
                complete.error?.message ||
                call.error?.message}
            </p>
          )}
          {!filtered.length && (
            <EmptyState
              title={
                status === "ACTIVE" && !query
                  ? "No patients waiting or in care"
                  : "No matching queue entries"
              }
              description="Add a registered patient to the queue from the patient directory, or adjust the filters to review completed entries."
              action={
                <Link href="/dashboard/patients" className="btn-secondary">
                  Open patients
                </Link>
              }
            />
          )}
          <ul className="space-y-3">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="panel flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/5 text-primary">
                    <span className="text-[10px] font-semibold uppercase">
                      Queue
                    </span>
                    <span className="text-xl font-semibold tabular-nums">
                      {item.queueNumber}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold">
                      {item.patient?.firstName} {item.patient?.lastName}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Arrived{" "}
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {item.notes && (
                      <p className="mt-2 max-w-lg break-words text-sm text-muted-foreground">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={item.status} />
                  {item.status === "IN_PROGRESS" && (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={complete.isPending}
                      onClick={() =>
                        complete.mutate(item.id, {
                          onSuccess: () =>
                            toast.success(
                              `Patient #${item.queueNumber} completed`,
                            ),
                        })
                      }
                    >
                      <CheckCircle className="size-4" />
                      Complete
                    </button>
                  )}
                  <select
                    className="field w-auto"
                    aria-label={`Status for queue number ${item.queueNumber}`}
                    value={item.status}
                    disabled={update.isPending}
                    onChange={(e) =>
                      update.mutate({
                        id: item.id,
                        status: e.target.value as QueueStatus,
                      })
                    }
                  >
                    <option value="WAITING">Waiting</option>
                    <option value="CALLED">Called</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="NO_SHOW">No Show</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
