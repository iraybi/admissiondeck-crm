import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { SubscriptionAlerts, SubscriptionBanner } from "@/components/domain/SubscriptionAlerts";
import { Button } from "@/components/ui/Button";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { StatusRow } from "@/components/ui/Status";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { getFirmStats, getRecentActivity } from "@/lib/analytics/stats";
import { listAgenciesWithCounts } from "@/lib/analytics/deep-queries";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Unified dashboard hub at dash.domainname.com
 * Routes to role-specific views after login.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Role-based navigation
  const nav: NavItem[] = getNavForRole(user.role);

  // Render role-specific dashboard
  switch (user.role) {
    case "PLATFORM_ADMIN":
      return <PlatformDashboard user={user} nav={nav} />;
    case "FIRM_MANAGER":
      return <FirmDashboard user={user} nav={nav} />;
    case "AGENCY_MANAGER":
      return <AgencyDashboard user={user} nav={nav} />;
    case "COUNSELLOR":
      return <CounsellorDashboard user={user} nav={nav} />;
    case "AGENT":
      return <AgentDashboard user={user} nav={nav} />;
    case "STUDENT":
      return <StudentDashboard user={user} nav={nav} />;
    default:
      return <FirmDashboard user={user} nav={nav} />;
  }
}

function getNavForRole(role: string): NavItem[] {
  const base: NavItem[] = [
    { href: "/", label: "Overview" },
    { href: "/students", label: "Students" },
    { href: "/settings", label: "Settings" },
  ];

  switch (role) {
    case "PLATFORM_ADMIN":
      return [
        { href: "/", label: "Overview" },
        { href: "/agencies", label: "Tenants" },
        { href: "/staff", label: "Users" },
        { href: "/analytics", label: "Analytics" },
        { href: "/settings", label: "Settings" },
      ];
    case "FIRM_MANAGER":
      return [
        { href: "/", label: "Overview" },
        { href: "/agencies", label: "Agencies" },
        { href: "/staff", label: "Staff" },
        { href: "/leads", label: "Leads" },
        { href: "/students", label: "Students" },
        { href: "/countries", label: "Countries" },
        { href: "/universities", label: "Universities" },
        { href: "/payments", label: "Payments" },
        { href: "/commissions", label: "Commissions" },
        { href: "/analytics", label: "Analytics" },
        { href: "/settings", label: "Settings" },
      ];
    case "AGENCY_MANAGER":
      return [
        { href: "/", label: "Overview" },
        { href: "/staff", label: "Staff" },
        { href: "/leads", label: "Leads" },
        { href: "/students", label: "Students" },
        { href: "/payments", label: "Payments" },
        { href: "/tasks", label: "Tasks" },
        { href: "/settings", label: "Settings" },
      ];
    case "COUNSELLOR":
      return [
        { href: "/", label: "Overview" },
        { href: "/leads", label: "Leads" },
        { href: "/students", label: "My students" },
        { href: "/tasks", label: "Tasks" },
        { href: "/notifications", label: "Notifications" },
        { href: "/settings", label: "Settings" },
      ];
    case "AGENT":
      return [
        { href: "/", label: "Overview" },
        { href: "/students", label: "My referrals" },
        { href: "/commissions", label: "Commissions" },
        { href: "/settings", label: "Settings" },
      ];
    case "STUDENT":
      return [
        { href: "/", label: "My journey" },
        { href: "/student/documents", label: "Documents" },
        { href: "/settings", label: "Settings" },
      ];
    default:
      return base;
  }
}

/* ===== Platform Admin Dashboard ===== */
async function PlatformDashboard({ user, nav }: { user: any; nav: NavItem[] }) {
  return (
    <Shell portal="manage" orgName="AdmissionDeck" orgPath="manage" user={{ name: user.name, role: "Platform admin" }} nav={nav}>
      <PageHead title="Platform health" subtitle="SaaS operator console" />
      <div className="status-row is-brand">
        <div>
          <div className="font-medium">Welcome back, {user.name}</div>
          <div className="text-sm muted">Manage tenants, subscriptions, and platform health.</div>
        </div>
      </div>
    </Shell>
  );
}

/* ===== Firm Manager Dashboard ===== */
async function FirmDashboard({ user, nav }: { user: any; nav: NavItem[] }) {
  const scope = await resolveScope(user);
  const [stats, agencies, activity] = await Promise.all([
    getFirmStats({ orgPaths: scope.orgPaths, role: user.role, userId: user.id, orgId: user.orgId }),
    listAgenciesWithCounts(user.orgPath ?? "org"),
    getRecentActivity(scope.orgPaths, 6),
  ]);

  return (
    <Shell portal="admin" orgName={user.orgName ?? ""} orgPath={user.orgPath ?? ""} user={{ name: user.name, role: "Firm manager" }} nav={nav}>
      <PageHead
        title="Firm overview"
        subtitle={`${user.orgName} across ${agencies.length} agencies`}
        actions={
          <>
            <Link href="/agencies"><Button variant="secondary">Manage agencies</Button></Link>
            <Link href="/analytics"><Button>View analytics</Button></Link>
          </>
        }
      />

      <StatGrid>
        <Link href="/students" style={{ textDecoration: "none" }}>
          <Stat label="Active students" value={stats.activeStudents} hint="Tap to view" tone="brand" />
        </Link>
        <Link href="/analytics" style={{ textDecoration: "none" }}>
          <Stat label="Visa success rate" value={`${stats.visaRate}%`} hint="Tap for details" tone="ok" />
        </Link>
        <Link href="/agencies" style={{ textDecoration: "none" }}>
          <Stat label="Agencies" value={stats.orgs} hint="Tap to manage" tone="info" />
        </Link>
        <Link href="/payments" style={{ textDecoration: "none" }}>
          <Stat label="Payments in review" value={stats.paymentsInReview} hint="Tap to review" tone="warn" />
        </Link>
      </StatGrid>

      <div className="grid-2" style={{ marginTop: "var(--space-6)" }}>
        <section className="card">
          <div className="card-head">
            <h2>Agencies</h2>
            <div className="card-head-aside">
              <Link href="/agencies"><Button variant="secondary" size="sm">View all</Button></Link>
            </div>
          </div>
          {agencies.slice(0, 5).map((a) => (
            <Link key={a.id} href={`/agencies/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="status-row is-brand" style={{ marginBottom: "var(--space-2)", cursor: "pointer" }}>
                <div style={{ flex: 1 }}>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs muted">
                    {a.staff.counsellors} counsellors, {a.staff.agents} agents, {a.students.total} students
                  </div>
                </div>
                <div className="text-sm tabular">{a.visaRate}%</div>
              </div>
            </Link>
          ))}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Recent activity</h2>
          </div>
          <div className="stack-sm">
            {activity.map((e) => (
              <StatusRow key={e.id} tone="brand" title={e.action.replace(/_/g, " ")} detail={`${e.actor?.name ?? "System"} · ${formatDate(e.createdAt)}`} />
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}

/* ===== Agency Manager Dashboard ===== */
async function AgencyDashboard({ user, nav }: { user: any; nav: NavItem[] }) {
  const { getSubscriptionAlerts, getSubscriptionSummary } = await import(
    "@/lib/billing/subscription-alerts"
  );
  const { getAgencyPerformance } = await import("@/lib/analytics/performance");
  const { listStaffWithCounts } = await import("@/lib/analytics/deep-queries");

  const [alerts, summary, perf, staff] = await Promise.all([
    getSubscriptionAlerts(user.orgId ?? ""),
    getSubscriptionSummary(user.orgId ?? ""),
    getAgencyPerformance(user.orgPath ?? "org"),
    listStaffWithCounts({ orgPaths: [user.orgPath ?? "org"] }),
  ]);

  return (
    <Shell portal="agency" orgName={user.orgName ?? ""} orgPath={user.orgPath ?? ""} user={{ name: user.name, role: "Agency manager" }} nav={nav}>
      <PageHead title="Agency dashboard" subtitle={user.orgName} />

      {/* Subscription alerts */}
      {alerts.length > 0 ? (
        <SubscriptionAlerts alerts={alerts} />
      ) : null}

      {/* Subscription banner */}
      {summary ? (
        <SubscriptionBanner
          status={summary.status}
          plan={summary.plan}
          daysRemaining={summary.daysRemaining}
          currentPeriodEnd={summary.currentPeriodEnd}
        />
      ) : null}

      {/* Quick stats */}
      <div className="stats three" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
        <div className="status-row is-brand">
          <div>
            <div className="kicker">Students</div>
            <div className="font-semibold tabular" style={{ fontSize: 24 }}>{perf.students}</div>
            <div className="text-xs muted">{perf.byStatus.ACTIVE ?? 0} active</div>
          </div>
        </div>
        <div className="status-row is-ok">
          <div>
            <div className="kicker">Visa rate</div>
            <div className="font-semibold tabular" style={{ fontSize: 24 }}>{perf.visaRate}%</div>
            <div className="text-xs muted">Of decided cases</div>
          </div>
        </div>
        <div className="status-row is-info">
          <div>
            <div className="kicker">Staff</div>
            <div className="font-semibold tabular" style={{ fontSize: 24 }}>{staff.length}</div>
            <div className="text-xs muted">Team members</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Welcome, {user.name}</h2>
          </div>
          <p className="text-sm muted">
            Manage your staff, students, and operations. Use the sidebar to navigate.
          </p>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Quick actions</h2>
          </div>
          <div className="stack-sm">
            <div className="status-row is-brand">
              <div>
                <div className="font-medium text-sm">Student pipeline</div>
                <div className="text-sm muted">View and manage all students</div>
              </div>
            </div>
            <div className="status-row is-brand">
              <div>
                <div className="font-medium text-sm">Staff management</div>
                <div className="text-sm muted">Invite and manage team members</div>
              </div>
            </div>
            <div className="status-row is-brand">
              <div>
                <div className="font-medium text-sm">Payment review</div>
                <div className="text-sm muted">Verify student payment proofs</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}

/* ===== Counsellor Dashboard ===== */
async function CounsellorDashboard({ user, nav }: { user: any; nav: NavItem[] }) {
  return (
    <Shell portal="counsellor" orgName={user.orgName ?? ""} orgPath={user.orgPath ?? ""} user={{ name: user.name, role: "Counsellor" }} nav={nav}>
      <PageHead title="My workspace" subtitle="Your students and tasks" />
      <div className="status-row is-brand">
        <div>
          <div className="font-medium">Welcome, {user.name}</div>
          <div className="text-sm muted">Manage your student cohort and track progress.</div>
        </div>
      </div>
    </Shell>
  );
}

/* ===== Agent Dashboard ===== */
async function AgentDashboard({ user, nav }: { user: any; nav: NavItem[] }) {
  return (
    <Shell portal="agent" orgName={user.orgName ?? ""} orgPath={user.orgPath ?? ""} user={{ name: user.name, role: "Agent" }} nav={nav}>
      <PageHead title="My referrals" subtitle="Students you've referred" />
      <div className="status-row is-brand">
        <div>
          <div className="font-medium">Welcome, {user.name}</div>
          <div className="text-sm muted">Track your referrals and commissions.</div>
        </div>
      </div>
    </Shell>
  );
}

/* ===== Student Dashboard ===== */
async function StudentDashboard({ user, nav }: { user: any; nav: NavItem[] }) {
  return (
    <Shell portal="student" orgName={user.orgName ?? ""} orgPath={user.orgPath ?? ""} user={{ name: user.name, role: "Student" }} nav={nav}>
      <PageHead title="My journey" subtitle="Track your application progress" />
      <div className="status-row is-brand">
        <div>
          <div className="font-medium">Welcome, {user.name}</div>
          <div className="text-sm muted">View your documents, payments, and application status.</div>
        </div>
      </div>
    </Shell>
  );
}
