import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Avatar } from "@/components/ui/Avatar";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { listStaffWithCounts } from "@/lib/analytics/deep-queries";
import { prisma } from "@/lib/db/prisma";
import { InviteUserForm } from "@/components/settings/InviteUserForm";
import { DeactivateUserButton } from "@/components/domain/UserActions";
import type { NavItem } from "@/components/layout/SideNav";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/agencies", label: "Agencies" },
  { href: "/staff", label: "Staff" },
  { href: "/students", label: "Students" },
  { href: "/settings", label: "Settings" },
];

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: "Platform admin",
  FIRM_MANAGER: "Firm manager",
  AGENCY_MANAGER: "Agency manager",
  COUNSELLOR: "Counsellor",
  AGENT: "Agent",
};

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const staff = await listStaffWithCounts({ orgPaths: scope.orgPaths });

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Team"
        subtitle={`${staff.length} team members`}
      />

      <StatGrid>
        <Stat label="Total staff" value={staff.length} hint="All roles" tone="brand" />
        <Stat label="Counsellors" value={staff.filter((s) => s.role === "COUNSELLOR").length} hint="Student-facing" tone="info" />
        <Stat label="Agents" value={staff.filter((s) => s.role === "AGENT").length} hint="External recruiters" tone="warn" />
        <Stat label="Managers" value={staff.filter((s) => s.role.includes("MANAGER")).length} hint="Leadership" tone="ok" />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Table
          columns={[
            { key: "name", label: "Member" },
            { key: "role", label: "Role" },
            { key: "agency", label: "Agency" },
            { key: "students", label: "Students" },
            { key: "status", label: "Status" },
          ]}
        >
          {staff.map((s) => (
            <Row key={s.id}>
              <Cell>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Avatar name={s.name} size={32} />
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm muted">{s.email}</div>
                  </div>
                </div>
              </Cell>
              <Cell>
                <Status tone={s.role === "AGENT" ? "peach" : s.role.includes("MANAGER") ? "info" : "brand"}>
                  {ROLE_LABEL[s.role] ?? s.role}
                </Status>
              </Cell>
              <Cell>
                <div className="text-sm">{s.orgName ?? "Unassigned"}</div>
              </Cell>
              <Cell>
                <div className="text-sm">
                  <span className="tabular">{s.studentsAssigned + s.studentsReferred}</span>
                </div>
              </Cell>
              <Cell>
                <Status tone={s.isActive ? "ok" : "bad"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Status>
              </Cell>
            </Row>
          ))}
        </Table>
      </div>

      {user.orgId ? (
        <section className="card" style={{ marginTop: "var(--space-6)" }}>
          <div className="card-head">
            <h2>Invite a teammate</h2>
          </div>
          <InviteUserForm orgId={user.orgId} canInvite={true} />
        </section>
      ) : null}
    </Shell>
  );
}
