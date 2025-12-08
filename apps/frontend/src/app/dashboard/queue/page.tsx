"use client";

import {
  useCallNext,
  useCompleteQueue,
  useQueue,
  useUpdateQueueStatus,
} from "@/hooks/use-queue";
import { QueueStatus } from "@hospital/shared";
import { CheckCircle, Clock, Hash, Phone, StickyNote } from "lucide-react";
import { toast } from "sonner";

function getStatusColor(status: string) {
  switch (status) {
    case "WAITING":
      return "bg-amber-100 text-amber-700";
    case "IN_PROGRESS":
      return "bg-primary/10 text-primary";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function QueuePage() {
  const { data: queue, isLoading, isError } = useQueue();

  const updateStatus = useUpdateQueueStatus();
  const callNext = useCallNext();
  const completeQueue = useCompleteQueue();

  const handleStatusChange = (id: string, status: QueueStatus) => {
    updateStatus.mutate({ id, status });
  };

  if (isLoading) return <div className="p-8">Loading queue...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patient Queue</h1>
        <p className="text-muted-foreground">{queue?.length || 0} patients</p>
        <button
          onClick={() => {
            callNext.mutate(undefined, {
              onSuccess: (data) => {
                if (data) {
                  toast.success(`Called patient #${data.queueNumber}`);
                } else {
                  toast.info("No patients waiting");
                }
              },
              onError: () => {
                toast.error("Failed to call next patient");
              },
            });
          }}
          disabled={
            callNext.isPending || !queue?.some((e) => e.status === "WAITING")
          }
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Phone className="w-4 h-4" />
          {callNext.isPending ? "Calling..." : "Call Next"}
        </button>
      </div>
      {queue?.length === 0 && (
        <div className="text-center py-12 border rounded-lg text-muted-foreground">
          No patients in queue
        </div>
      )}

      <ul className="space-y-2">
        {queue?.map((entry) => (
          <li
            key={entry.id}
            className="border p-4 rounded flex justify-between items-center hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 min-w-[80px]">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl font-bold">{entry.queueNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
              </div>

              {entry.notes && (
                <div className="flex items-center gap-2 text-muted-foreground max-w-[200px]">
                  <StickyNote className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">{entry.notes}</span>
                </div>
              )}
              {entry.status === "IN_PROGRESS" && (
                <button
                  onClick={() => {
                    completeQueue.mutate(entry.id, {
                      onSuccess: () => {
                        toast.success(
                          `Patient #${entry.queueNumber} completed`
                        );
                      },
                      onError: () => {
                        toast.error("Failed to complete");
                      },
                    });
                  }}
                  disabled={completeQueue.isPending}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors ml-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </button>
              )}
            </div>

            <select
              value={entry.status}
              onChange={(e) =>
                handleStatusChange(entry.id, e.target.value as QueueStatus)
              }
              className={`px-3 py-2 rounded-full text-sm font-medium cursor-pointer ${getStatusColor(entry.status)}`}
            >
              <option value="WAITING">Waiting</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
