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
import { getStaffPerformance, getAgentPerformance } from "@/lib/analytics/performance";
import { prisma } from "@/lib/db/prisma";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate, formatMoney, pct } from "@/lib/utils";

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

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: "Platform admin",
  FIRM_MANAGER: "Firm manager",
  AGENCY_MANAGER: "Agency manager",
  COUNSELLOR: "Counsellor",
  AGENT: "Agent",
};

const STATUS_TONE: Record<string, "ok" | "brand" | "warn" | "bad" | "info"> = {
  VISA: "ok",
  COMPLETED: "info",
  ACTIVE: "brand",
  LEAD: "warn",
  REFUSED: "bad",
};

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const staff = await prisma.user.findUnique({
    where: { id },
    include: {
      org: { select: { id: true, name: true, orgPath: true, city: true } },
    },
  });

  if (!staff) {
    return (
      <Shell portal="admin" orgName={user.orgName ?? ""} orgPath={user.orgPath ?? ""} user={{ name: user.name, role: "Firm manager" }} nav={nav}>
        <PageHead title="Staff member not found" />
      </Shell>
    );
  }

  const isAgent = staff.role === "AGENT";
  const perf = isAgent
    ? await getAgentPerformance(staff.id)
    : await getStaffPerformance(staff.id);

  // Get assigned students
  const students = await prisma.student.findMany({
    where: {
      OR: [{ counsellorId: staff.id }, { agentId: staff.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      targetCountry: true,
      targetUniversity: true,
      status: true,
      createdAt: true,
    },
  });

  // Get recent tasks
  const tasks = await prisma.task.findMany({
    where: { assigneeId: staff.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { student: { select: { name: true } } },
  });

  // Get recent leads
  const leads = await prisma.lead.findMany({
    where: { counsellorId: staff.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <Shell
      portal="admin"
      orgName={staff.org?.name ?? user.orgName ?? ""}
      orgPath={staff.org?.orgPath ?? user.orgPath ?? ""}
      user={{ name: user.name, role: "Firm manager" }}
      nav={nav}
    >
      <div style={{ marginBottom: "var(--space-3)" }}>
        <Link href="/staff" className="text-sm">Back to staff</Link>
      </div>

      <div className="banner" style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--surface) 75%)" }}>
        <div style={{ flex: 1, display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
          <Avatar name={staff.name} size={56} />
          <div>
            <h1 style={{ fontSize: "var(--text-xl)" }}>{staff.name}</h1>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
              <Status tone="brand">{ROLE_LABEL[staff.role] ?? staff.role}</Status>
              <Status tone={staff.isActive ? "ok" : "bad"}>{staff.isActive ? "Active" : "Inactive"}</Status>
              {staff.org ? (
                <Link href={`/agencies/${staff.org.id}`}>
                  <Status tone="info">{staff.org.name}</Status>
                </Link>
              ) : null}
            </div>
            <div className="text-sm muted" style={{ marginTop: "var(--space-1)" }}>
              {staff.email} · {staff.phone ?? "No phone"} · Last login: {staff.lastLoginAt ? formatDate(staff.lastLoginAt) : "Never"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button variant="secondary">Edit profile</Button>
          <Button variant="secondary">Send message</Button>
          <Button>Assign students</Button>
        </div>
      </div>

      {/* Performance metrics */}
      <StatGrid>
        <Link href={`/students?counsellor=${staff.id}`} style={{ textDecoration: "none" }}>
          <Stat
            label="Students"
            value={isAgent ? perf.students : (perf as any).students}
            hint="Tap to view all"
            tone="brand"
          />
        </Link>
        <Stat
          label={isAgent ? "Conversion rate" : "Visa rate"}
          value={`${isAgent ? (perf as any).conversionRate : (perf as any).visaRate}%`}
          hint="Of decided cases"
          tone="ok"
        />
        {isAgent ? (
          <Link href={`/commissions?agent=${staff.id}`} style={{ textDecoration: "none" }}>
            <Stat label="Commission earned" value={formatMoney((perf as any).commissions.total, "BDT")} hint="Tap to view" tone="warn" />
          </Link>
        ) : (
          <Link href={`/tasks?assignee=${staff.id}`} style={{ textDecoration: "none" }}>
            <Stat label="Open tasks" value={(perf as any).tasks.OPEN ?? 0} hint="Tap to view" tone="warn" />
          </Link>
        )}
        <Stat
          label={isAgent ? "Commission paid" : "Leads open"}
          value={isAgent ? formatMoney((perf as any).commissions.paid, "BDT") : (perf as any).leads.CONTACTED ?? 0}
          hint={isAgent ? "Disbursed" : "In pipeline"}
          tone="info"
        />
      </StatGrid>

      <div className="grid-2" style={{ marginTop: "var(--space-6)" }}>
        <div className="stack">
          {/* Students list */}
          <section className="card">
            <div className="card-head">
              <h2>Students ({students.length})</h2>
              <div className="card-head-aside">
                <Link href={`/students?counsellor=${staff.id}`}>
                  <Button variant="secondary" size="sm">View all</Button>
                </Link>
              </div>
            </div>
            <Table
              columns={[
                { key: "name", label: "Student" },
                { key: "dest", label: "Destination" },
                { key: "status", label: "Status" },
              ]}
            >
              {students.slice(0, 10).map((s) => (
                <Row key={s.id}>
                  <Cell>
                    <Link href={`/students/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-sm muted">{s.targetUniversity}</div>
                    </Link>
                  </Cell>
                  <Cell>
                    <div className="text-sm">{s.targetCountry}</div>
                  </Cell>
                  <Cell>
                    <Status tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status}</Status>
                  </Cell>
                </Row>
              ))}
            </Table>
            {students.length === 0 ? (
              <div className="empty" style={{ padding: "var(--space-5)", textAlign: "center", color: "var(--muted)" }}>
                No students assigned yet.
              </div>
            ) : null}
          </section>

          {/* Recent tasks */}
          <section className="card">
            <div className="card-head">
              <h2>Recent tasks</h2>
              <div className="card-head-aside">
                <Link href={`/tasks?assignee=${staff.id}`}>
                  <Button variant="secondary" size="sm">View all</Button>
                </Link>
              </div>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm muted">No tasks.</p>
            ) : (
              <div className="divided">
                {tasks.map((t) => (
                  <div key={t.id} className="divided-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-medium text-sm">{t.title}</div>
                      <div className="text-xs muted">
                        {t.student?.name ?? "No student"} · Due {t.dueAt ? formatDate(t.dueAt) : "No date"}
                      </div>
                    </div>
                    <Status tone={t.status === "DONE" ? "ok" : t.status === "OPEN" ? "warn" : "info"}>
                      {t.status}
                    </Status>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          {/* Performance breakdown */}
          <section className="card">
            <div className="card-head">
              <h2>Performance breakdown</h2>
            </div>
            <div className="stack-sm">
              {Object.entries((perf as any).byStatus ?? {}).map(([status, count]) => (
                <div key={status} className="status-row is-brand">
                  <div style={{ flex: 1 }}>
                    <div className="text-sm">{status}</div>
                  </div>
                  <span className="tabular font-semibold">{count as number}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Activity summary */}
          <section className="card">
            <div className="card-head">
              <h2>Activity summary</h2>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: "var(--text-base)" }}>
              <dt className="muted">Email</dt>
              <dd style={{ margin: 0 }}>{staff.email}</dd>
              <dt className="muted">Phone</dt>
              <dd style={{ margin: 0 }}>{staff.phone ?? "-"}</dd>
              <dt className="muted">Agency</dt>
              <dd style={{ margin: 0 }}>
                {staff.org ? (
                  <Link href={`/agencies/${staff.org.id}`}>{staff.org.name}</Link>
                ) : "-"}
              </dd>
              <dt className="muted">Joined</dt>
              <dd style={{ margin: 0 }}>{formatDate(staff.createdAt)}</dd>
              <dt className="muted">Last login</dt>
              <dd style={{ margin: 0 }}>{staff.lastLoginAt ? formatDate(staff.lastLoginAt) : "Never"}</dd>
              {!isAgent && (perf as any).notesWritten ? (
                <>
                  <dt className="muted">Notes written</dt>
                  <dd style={{ margin: 0 }}>{(perf as any).notesWritten}</dd>
                </>
              ) : null}
            </dl>
          </section>

          {/* Recent leads for counsellors */}
          {!isAgent && leads.length > 0 ? (
            <section className="card">
              <div className="card-head">
                <h2>Recent leads</h2>
              </div>
              <div className="divided">
                {leads.map((l) => (
                  <div key={l.id} className="divided-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-medium text-sm">{l.name}</div>
                      <div className="text-xs muted">{l.targetCountry} · {l.targetProgram}</div>
                    </div>
                    <Status tone={l.status === "QUALIFIED" ? "ok" : l.status === "LOST" ? "bad" : "info"}>
                      {l.status}
                    </Status>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
