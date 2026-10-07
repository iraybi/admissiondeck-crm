import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Avatar } from "@/components/ui/Avatar";
import { Table, Row, Cell } from "@/components/ui/Table";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import {
  getPerformanceRanking,
  getAgencyPerformance,
} from "@/lib/analytics/performance";
import { listAgenciesWithCounts } from "@/lib/analytics/deep-queries";
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

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const rootPath = user.orgPath ?? "org";

  const [rankings, agencies] = await Promise.all([
    getPerformanceRanking(scope.orgPaths),
    listAgenciesWithCounts(rootPath),
  ]);

  const totalStudents = agencies.reduce((t, a) => t + a.students.total, 0);
  const totalActive = agencies.reduce((t, a) => t + a.students.active, 0);
  const avgVisaRate = agencies.length
    ? Math.round(agencies.reduce((t, a) => t + a.visaRate, 0) / agencies.length)
    : 0;

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: "Firm manager" }}
      nav={nav}
    >
      <PageHead
        title="Analytics"
        subtitle="Performance across agencies, staff, and students"
        actions={<Button variant="secondary">Export report</Button>}
      />

      <StatGrid>
        <Stat label="Total students" value={totalStudents} hint="All agencies" tone="brand" />
        <Stat label="Active pipeline" value={totalActive} hint="Currently in progress" tone="info" />
        <Stat label="Avg visa rate" value={`${avgVisaRate}%`} hint="Across agencies" tone="ok" />
        <Stat label="Staff ranked" value={rankings.length} hint="Counsellors" tone="warn" />
      </StatGrid>

      <div className="grid-2" style={{ marginTop: "var(--space-6)" }}>
        <div className="stack">
          {/* Counsellor leaderboards */}
          <section className="card">
            <div className="card-head">
              <h2>Counsellor leaderboards</h2>
              <div className="card-head-aside text-sm muted">
                Ranked by students, visa rate, activity
              </div>
            </div>
            <Table
              columns={[
                { key: "rank", label: "#" },
                { key: "name", label: "Counsellor" },
                { key: "agency", label: "Agency" },
                { key: "students", label: "Students" },
                { key: "visa", label: "Visa rate" },
                { key: "score", label: "Score" },
              ]}
            >
              {rankings.map((r, i) => (
                <Row key={r.id}>
                  <Cell>
                    <span className="tabular font-semibold" style={{ color: i < 3 ? "var(--brand)" : "var(--muted)" }}>
                      {i + 1}
                    </span>
                  </Cell>
                  <Cell>
                    <Link href={`/staff/${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Avatar name={r.name} size={30} />
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs muted">{r.email}</div>
                        </div>
                      </div>
                    </Link>
                  </Cell>
                  <Cell>
                    <div className="text-sm">{r.org?.name ?? "-"}</div>
                  </Cell>
                  <Cell>
                    <div className="text-sm">
                      <span className="tabular font-semibold">{r.performance.students}</span>
                    </div>
                  </Cell>
                  <Cell>
                    <ProgressBar value={r.performance.visaRate} showValue />
                  </Cell>
                  <Cell>
                    <span className="tabular font-semibold">{r.score}</span>
                  </Cell>
                </Row>
              ))}
            </Table>
          </section>

          {/* Agency comparison */}
          <section className="card">
            <div className="card-head">
              <h2>Agency comparison</h2>
            </div>
            <Table
              columns={[
                { key: "agency", label: "Agency" },
                { key: "staff", label: "Staff" },
                { key: "students", label: "Students" },
                { key: "visa", label: "Visa rate" },
                { key: "active", label: "Active" },
              ]}
            >
              {agencies.map((a) => (
                <Row key={a.id}>
                  <Cell>
                    <Link href={`/agencies/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs muted">{a.city}</div>
                    </Link>
                  </Cell>
                  <Cell>
                    <div className="text-sm">
                      {a.staff.counsellors} counsellors, {a.staff.agents} agents
                    </div>
                  </Cell>
                  <Cell>
                    <span className="tabular font-semibold">{a.students.total}</span>
                  </Cell>
                  <Cell>
                    <ProgressBar value={a.visaRate} showValue />
                  </Cell>
                  <Cell>
                    <span className="tabular">{a.students.active}</span>
                  </Cell>
                </Row>
              ))}
            </Table>
          </section>
        </div>

        <div className="stack">
          {/* Quick stats */}
          <section className="card">
            <div className="card-head">
              <h2>Top performers</h2>
            </div>
            {rankings.slice(0, 5).map((r, i) => (
              <div key={r.id} className="status-row is-brand" style={{ marginBottom: "var(--space-2)" }}>
                <div style={{ flex: 1 }}>
                  <div className="font-medium text-sm">
                    #{i + 1} {r.name}
                  </div>
                  <div className="text-xs muted">
                    {r.performance.students} students · {r.performance.visaRate}% visa rate
                  </div>
                </div>
                <span className="tabular font-semibold">{r.score}</span>
              </div>
            ))}
          </section>

          {/* Pipeline health */}
          <section className="card">
            <div className="card-head">
              <h2>Pipeline health</h2>
            </div>
            <div className="stack-sm">
              {agencies.slice(0, 5).map((a) => (
                <div key={a.id} className="status-row is-brand">
                  <div style={{ flex: 1 }}>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs muted">
                      {a.students.active} active, {a.students.visa} visa, {a.students.refused} refused
                    </div>
                  </div>
                  <ProgressBar value={a.visaRate} showValue />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
