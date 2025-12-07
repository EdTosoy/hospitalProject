"use client";

import { useQueue, useUpdateQueueStatus } from "@/hooks/use-queue";

export type QueueStatus = "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export default function QueuePage() {
  const { data: queue, isLoading, isError } = useQueue();

  const updateStatus = useUpdateQueueStatus();

  const handleStatusChange = (id: string, status: QueueStatus) => {
    updateStatus.mutate({ id, status });
  };

  if (isLoading) return <div className="p-8">Loading queue...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Queue</h1>
      {queue?.length === 0 && (
        <p className="text-muted-foreground">No patients in queue</p>
      )}

      <ul className="space-y-2">
        {queue?.map((entry) => (
          <li
            key={entry.id}
            className="border p-4 rounded flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{entry.queueNumber}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(entry.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <select
              value={entry.status}
              onChange={(e) =>
                handleStatusChange(entry.id, e.target.value as QueueStatus)
              }
              className="border p-2 rounded"
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
