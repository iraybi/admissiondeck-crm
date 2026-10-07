import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Status } from "@/components/ui/Status";
import { getCurrentUser } from "@/lib/auth/session";
import {
  listNotifications,
  unreadCount,
} from "@/lib/notifications/queries";
import { NotificationActions } from "@/components/domain/NotificationActions";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/students", label: "Students" },
  { href: "/tasks", label: "Tasks" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Settings" },
];

const TYPE_TONE: Record<string, "brand" | "ok" | "warn" | "info"> = {
  invite: "brand",
  payment: "warn",
  document: "info",
  note: "info",
  task: "brand",
  system: "info",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [items, unread] = await Promise.all([
    listNotifications(user.id, 50),
    unreadCount(user.id),
  ]);

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Notifications"
        subtitle={
          unread > 0
            ? `${unread} unread message${unread === 1 ? "" : "s"}`
            : "You are all caught up"
        }
        actions={<NotificationActions />}
      />

      {items.length === 0 ? (
        <section className="card">
          <p className="text-sm muted">No notifications yet.</p>
        </section>
      ) : (
        <section className="card">
          <div className="divided">
            {items.map((n) => (
              <div key={n.id} className="divided-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{n.title}</span>
                    {!n.readAt ? (
                      <Status tone="brand">Unread</Status>
                    ) : null}
                  </div>
                  {n.body ? (
                    <div className="text-sm muted" style={{ marginTop: 2 }}>
                      {n.body}
                    </div>
                  ) : null}
                  <div className="text-xs muted" style={{ marginTop: 4 }}>
                    {formatDate(n.createdAt)}
                  </div>
                </div>
                {n.link ? (
                  <Link href={n.link} className="text-sm">
                    Open
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
