import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { getCurrentUser } from "@/lib/auth/session";
import { listSessions } from "@/lib/auth/account";
import { Status } from "@/components/ui/Status";
import { SessionActions, RevokeAllButton } from "@/components/settings/SessionActions";
import type { NavItem } from "@/components/layout/SideNav";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/organization", label: "Organization" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/documents", label: "Document rules" },
  { href: "/settings/sessions", label: "Sessions" },
];

export default async function SessionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sessions = await listSessions(user.id);

  return (
    <Shell
      portal="manage"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Active sessions"
        subtitle="Manage your signed-in devices"
        actions={<RevokeAllButton />}
      />

      <section className="card">
        <div className="divided">
          {sessions.length === 0 ? (
            <p className="text-sm muted">No active sessions.</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="divided-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-medium text-sm">
                    {s.userAgent?.slice(0, 80) ?? "Unknown device"}
                  </div>
                  <div className="text-sm muted">
                    {s.ip ?? "Unknown IP"} · started{" "}
                    {new Date(s.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <Status tone="ok">Active</Status>
                <SessionActions sessionId={s.id} />
              </div>
            ))
          )}
        </div>
      </section>
    </Shell>
  );
}
