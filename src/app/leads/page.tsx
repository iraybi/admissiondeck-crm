import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { listLeads, getLeadStats } from "@/lib/leads/management";
import { LeadsClient } from "@/components/domain/LeadsClient";
import type { NavItem } from "@/components/layout/SideNav";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/agencies", label: "Agencies" },
  { href: "/staff", label: "Staff" },
  { href: "/leads", label: "Leads" },
  { href: "/students", label: "Students" },
  { href: "/countries", label: "Countries" },
  { href: "/universities", label: "Universities" },
  { href: "/settings", label: "Settings" },
];

export default async function LeadsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const [leads, stats] = await Promise.all([
    listLeads({ orgPaths: scope.orgPaths, take: 100 }),
    getLeadStats(scope.orgPaths),
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
        title="Leads"
        subtitle="Manage inquiries and convert to students"
      />

      <StatGrid>
        <Stat label="Total leads" value={stats.total} hint="All time" tone="brand" />
        <Stat label="New" value={stats.byStatus.NEW ?? 0} hint="Awaiting contact" tone="warn" />
        <Stat label="Qualified" value={stats.byStatus.QUALIFIED ?? 0} hint="Ready to convert" tone="info" />
        <Stat label="Converted" value={stats.byStatus.CONVERTED ?? 0} hint="Now students" tone="ok" />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        <LeadsClient
          leads={leads.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
          }))}
        />
      </div>
    </Shell>
  );
}
