import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Status } from "@/components/ui/Status";
import { Avatar } from "@/components/ui/Avatar";
import { Table, Row, Cell } from "@/components/ui/Table";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCurrentUser } from "@/lib/auth/session";
import { getAgencyPerformance } from "@/lib/analytics/performance";
import { prisma } from "@/lib/db/prisma";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate, formatMoney, pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/agencies", label: "Agencies" },
  { href: "/staff", label: "Staff" },
  { href: "/students", label: "Students" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

const ROLE_LABEL: Record<string, string> = {
  FIRM_MANAGER: "Firm manager",
  AGENCY_MANAGER: "Agency manager",
  COUNSELLOR: "Counsellor",
  AGENT: "Agent",
};

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const agency = await prisma.organization.findUnique({
    where: { id },
    include: {
      parent: { select: { name: true, orgPath: true } },
      subscription: true,
    },
  });

  if (!agency) {
    return (
      <Shell portal="admin" orgName={user.orgName ?? ""} orgPath={user.orgPath ?? ""} user={{ name: user.name, role: "Firm manager" }} nav={nav}>
        <PageHead title="Agency not found" />
      </Shell>
    );
  }

  const perf = await getAgencyPerformance(agency.orgPath);

  return (
    <Shell
      portal="admin"
      orgName={agency.name}
      orgPath={agency.orgPath}
      user={{ name: user.name, role: "Firm manager" }}
      nav={nav}
    >
      <div style={{ marginBottom: "var(--space-3)" }}>
        <Link href="/agencies" className="text-sm">Back to agencies</Link>
      </div>

      <PageHead
        title={agency.name}
        subtitle={`${agency.city ?? ""} ${agency.country ?? ""} · ${agency.orgPath}`}
        actions={
          <>
            <Button variant="secondary">Edit settings</Button>
            <Button>Invite staff</Button>
          </>
        }
      />

      {/* Clickable metric cards */}
      <StatGrid>
        <Link href={`/students?agency=${agency.id}`} style={{ textDecoration: "none" }}>
          <Stat label="Students" value={perf.students} hint="Tap to view all" tone="brand" />
        </Link>
        <Link href={`/students?agency=${agency.id}&status=active`} style={{ textDecoration: "none" }}>
          <Stat label="Active" value={perf.byStatus.ACTIVE ?? 0} hint="In pipeline" tone="info" />
        </Link>
        <Link href={`/students?agency=${agency.id}&status=visa`} style={{ textDecoration: "none" }}>
          <Stat label="Visa rate" value={`${perf.visaRate}%`} hint="Tap to view cases" tone="ok" />
        </Link>
        <Link href={`/payments?agency=${agency.id}`} style={{ textDecoration: "none" }}>
          <Stat label="Payments" value={formatMoney(perf.payments.totalAmount, "BDT")} hint="Tap to review" tone="warn" />
        </Link>
      </StatGrid>

      <div className="grid-2" style={{ marginTop: "var(--space-6)" }}>
        <div className="stack">
          {/* Staff table with drill-down */}
          <section className="card">
            <div className="card-head">
              <h2>Staff ({perf.staff.length})</h2>
              <div className="card-head-aside">
                <Link href={`/staff?agency=${agency.id}`}>
                  <Button variant="secondary" size="sm">View all</Button>
                </Link>
              </div>
            </div>
            <Table
              columns={[
                { key: "name", label: "Member" },
                { key: "role", label: "Role" },
                { key: "students", label: "Students" },
                { key: "last", label: "Last active" },
              ]}
            >
              {perf.staff.slice(0, 8).map((s) => (
                <Row key={s.id}>
                  <Cell>
                    <Link href={`/staff/${s.id}`} style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                      <Avatar name={s.name} size={32} />
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-sm muted">{s.email}</div>
                      </div>
                    </Link>
                  </Cell>
                  <Cell>
                    <span className="text-sm">{ROLE_LABEL[s.role] ?? s.role}</span>
                  </Cell>
                  <Cell>
                    <span className="tabular text-sm">
                      {s._count.assignedStudents + s._count.referredStudents}
                    </span>
                  </Cell>
                  <Cell>
                    <span className="text-sm muted">
                      {s.lastLoginAt ? formatDate(s.lastLoginAt) : "Never"}
                    </span>
                  </Cell>
                </Row>
              ))}
            </Table>
          </section>

          {/* Student pipeline breakdown */}
          <section className="card">
            <div className="card-head">
              <h2>Pipeline breakdown</h2>
            </div>
            <div className="stack-sm">
              {Object.entries(perf.byStatus).map(([status, count]) => (
                <Link key={status} href={`/students?agency=${agency.id}&status=${status.toLowerCase()}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="status-row is-brand" style={{ cursor: "pointer" }}>
                    <div style={{ flex: 1 }}>
                      <div className="font-medium text-sm">{status}</div>
                    </div>
                    <span className="tabular font-semibold">{count}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Payment summary */}
          <section className="card">
            <div className="card-head">
              <h2>Payments</h2>
              <div className="card-head-aside">
                <Link href={`/payments?agency=${agency.id}`}>
                  <Button variant="secondary" size="sm">View all</Button>
                </Link>
              </div>
            </div>
            <div className="moneyrow" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)" }}>
              <div className="status-row is-ok">
                <div>
                  <div className="kicker">Verified</div>
                  <div className="font-semibold tabular">{formatMoney(perf.payments.byState.VERIFIED ?? 0, "BDT")}</div>
                </div>
              </div>
              <div className="status-row is-brand">
                <div>
                  <div className="kicker">In review</div>
                  <div className="font-semibold tabular">{perf.payments.byState.IN_REVIEW ?? 0}</div>
                </div>
              </div>
              <div className="status-row is-warn">
                <div>
                  <div className="kicker">Pending</div>
                  <div className="font-semibold tabular">{perf.payments.byState.PENDING ?? 0}</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="stack">
          {/* Agency metadata */}
          <section className="card">
            <div className="card-head">
              <h2>Agency details</h2>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: "var(--text-base)" }}>
              <dt className="muted">Path</dt>
              <dd style={{ margin: 0 }}><code className="text-xs">{agency.orgPath}</code></dd>
              <dt className="muted">City</dt>
              <dd style={{ margin: 0 }}>{agency.city ?? "-"}</dd>
              <dt className="muted">Country</dt>
              <dd style={{ margin: 0 }}>{agency.country ?? "-"}</dd>
              <dt className="muted">Timezone</dt>
              <dd style={{ margin: 0 }}>{agency.timezone}</dd>
              <dt className="muted">Currency</dt>
              <dd style={{ margin: 0 }}>{agency.currency}</dd>
              <dt className="muted">Seats</dt>
              <dd style={{ margin: 0 }}>{agency.seatsUsed} / {agency.seatsBilled}</dd>
              <dt className="muted">Plan</dt>
              <dd style={{ margin: 0 }}>{agency.subscription?.plan ?? "Not set"}</dd>
            </dl>
          </section>

          {/* Task summary */}
          <section className="card">
            <div className="card-head">
              <h2>Tasks</h2>
            </div>
            <div className="stack-sm">
              {Object.entries(perf.tasks).map(([status, count]) => (
                <div key={status} className="status-row is-brand">
                  <div style={{ flex: 1 }}>
                    <div className="text-sm">{status}</div>
                  </div>
                  <span className="tabular">{count}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Lead summary */}
          <section className="card">
            <div className="card-head">
              <h2>Leads</h2>
            </div>
            <div className="stack-sm">
              {Object.entries(perf.leads).map(([status, count]) => (
                <div key={status} className="status-row is-info">
                  <div style={{ flex: 1 }}>
                    <div className="text-sm">{status}</div>
                  </div>
                  <span className="tabular">{count}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Document summary */}
          <section className="card">
            <div className="card-head">
              <h2>Documents</h2>
            </div>
            <div className="stack-sm">
              {Object.entries(perf.documents).map(([status, count]) => (
                <div key={status} className="status-row is-brand">
                  <div style={{ flex: 1 }}>
                    <div className="text-sm">{status}</div>
                  </div>
                  <span className="tabular">{count}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
