"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { markAllNotificationsRead } from "@/lib/actions/workflow";

export function NotificationActions() {
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await markAllNotificationsRead();
        router.refresh();
      }}
    >
      Mark all read
    </Button>
  );
}
