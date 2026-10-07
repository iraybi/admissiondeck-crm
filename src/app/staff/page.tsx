import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { listStaffWithCounts } from "@/lib/analytics/deep-queries";
import { StaffClient } from "@/components/domain/StaffClient";
import { prisma } from "@/lib/db/prisma";
import type { NavItem } from "@/components/layout/SideNav";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/agencies", label: "Agencies" },
  { href: "/staff", label: "Staff" },
  { href: "/students", label: "Students" },
  { href: "/payments", label: "Payments" },
  { href: "/commissions", label: "Commissions" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export default async function StaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const staff = await listStaffWithCounts({ orgPaths: scope.orgPaths });

  const orgs = await prisma.organization.findMany({
    where: { kind: "AGENCY" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const byRole = staff.reduce(
    (acc, s) => {
      acc[s.role] = (acc[s.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: "Firm manager" }}
      nav={nav}
    >
      <PageHead
        title="Staff"
        subtitle={`${staff.length} team members across ${orgs.length} agencies`}
        actions={<Button>Invite staff</Button>}
      />

      <StatGrid>
        <Stat label="Total staff" value={staff.length} hint="All agencies" tone="brand" />
        <Stat label="Counsellors" value={byRole.COUNSELLOR ?? 0} hint="Student-facing" tone="info" />
        <Stat label="Agents" value={byRole.AGENT ?? 0} hint="External recruiters" tone="warn" />
        <Stat label="Managers" value={(byRole.AGENCY_MANAGER ?? 0) + (byRole.FIRM_MANAGER ?? 0)} hint="Leadership" tone="ok" />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        <StaffClient
          staff={staff.map((s) => ({
            ...s,
            lastLoginAt: s.lastLoginAt?.toISOString() ?? null,
          }))}
          orgs={orgs}
        />
      </div>
    </Shell>
  );
}
