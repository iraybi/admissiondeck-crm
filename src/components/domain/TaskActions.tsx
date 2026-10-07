"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toggleTaskAction, deleteTaskAction } from "@/lib/actions/workflow";

export function TaskActions({ taskId }: { taskId: string }) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          await toggleTaskAction(taskId, true);
          router.refresh();
        }}
      >
        Done
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          await deleteTaskAction(taskId);
          router.refresh();
        }}
      >
        Delete
      </Button>
    </div>
  );
}
