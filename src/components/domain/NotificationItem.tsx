"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { markNotificationRead } from "@/lib/actions/workflow";

export function NotificationItem({ id, title, body, link, isRead, createdAt }: {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}) {
  const router = useRouter();

  async function handleMarkRead() {
    await markNotificationRead(id);
    router.refresh();
  }

  return (
    <div className="divided-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          {!isRead ? (
            <span className="st brand" style={{ fontSize: 11, padding: "2px 6px" }}>
              Unread
            </span>
          ) : null}
        </div>
        {body ? (
          <div className="text-sm muted" style={{ marginTop: 2 }}>{body}</div>
        ) : null}
        <div className="text-xs muted" style={{ marginTop: 4 }}>{createdAt}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {link ? (
          <Button variant="secondary" size="sm" onClick={() => router.push(link)}>
            Open
          </Button>
        ) : null}
        {!isRead ? (
          <Button variant="ghost" size="sm" onClick={handleMarkRead}>
            Mark read
          </Button>
        ) : null}
      </div>
    </div>
  );
}
