import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Table, Row, Cell } from "@/components/ui/Table";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { listAgenciesWithCounts } from "@/lib/analytics/deep-queries";
import type { NavItem } from "@/components/layout/SideNav";
import { pct } from "@/lib/utils";

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

export default async function AgenciesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const rootPath = user.orgPath ?? "org";
  const agencies = await listAgenciesWithCounts(rootPath);

  const totals = agencies.reduce(
    (acc, a) => ({
      staff: acc.staff + a.staff.total,
      counsellors: acc.counsellors + a.staff.counsellors,
      agents: acc.agents + a.staff.agents,
      students: acc.students + a.students.total,
      active: acc.active + a.students.active,
    }),
    { staff: 0, counsellors: 0, agents: 0, students: 0, active: 0 },
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
        title="Agencies"
        subtitle={`${agencies.length} agencies under this firm`}
        actions={<Button>New agency</Button>}
      />

      <StatGrid>
        <Stat label="Agencies" value={agencies.length} hint="Child organizations" tone="brand" />
        <Stat label="Total staff" value={totals.staff} hint={`${totals.counsellors} counsellors, ${totals.agents} agents`} tone="info" />
        <Stat label="Total students" value={totals.students} hint={`${totals.active} active`} tone="ok" />
        <Stat label="Avg visa rate" value={`${agencies.length ? Math.round(agencies.reduce((t, a) => t + a.visaRate, 0) / agencies.length) : 0}%`} hint="Across all agencies" tone="warn" />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Table
          columns={[
            { key: "agency", label: "Agency" },
            { key: "manager", label: "Manager" },
            { key: "staff", label: "Staff breakdown" },
            { key: "students", label: "Students" },
            { key: "visa", label: "Visa rate" },
            { key: "seats", label: "Seats" },
            { key: "actions", label: "", width: "80px" },
          ]}
        >
          {agencies.map((a) => (
            <Row key={a.id}>
              <Cell>
                <Link href={`/agencies/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-sm muted">{a.city}, {a.country}</div>
                      <code className="text-xs muted">{a.orgPath}</code>
                    </div>
                  </div>
                </Link>
              </Cell>
              <Cell>
                <div className="text-sm">{a.managerName ?? "Unassigned"}</div>
              </Cell>
              <Cell>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className="text-xs" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                    {a.staff.counsellors} counsellors
                  </span>
                  <span className="text-xs" style={{ background: "var(--info-soft)", color: "var(--info)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                    {a.staff.agents} agents
                  </span>
                  <span className="text-xs" style={{ background: "var(--surface)", color: "var(--muted)", padding: "2px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
                    {a.staff.managers} managers
                  </span>
                </div>
              </Cell>
              <Cell>
                <div className="text-sm">
                  <span className="tabular font-semibold">{a.students.total}</span>
                  <span className="muted"> total</span>
                </div>
                <div className="text-xs muted">
                  {a.students.active} active, {a.students.visa} visa, {a.students.refused} refused
                </div>
              </Cell>
              <Cell>
                <ProgressBar value={a.visaRate} showValue />
              </Cell>
              <Cell>
                <div className="text-sm tabular">{a.seatsUsed}/{a.seatsBilled}</div>
              </Cell>
              <Cell>
                <Link href={`/agencies/${a.id}`}>
                  <Button variant="secondary" size="sm">Open</Button>
                </Link>
              </Cell>
            </Row>
          ))}
        </Table>

        {agencies.length === 0 ? (
          <div style={{ padding: "var(--space-10)", textAlign: "center", color: "var(--muted)" }}>
            No agencies yet. Create one to get started.
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
