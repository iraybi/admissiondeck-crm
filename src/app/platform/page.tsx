import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPlatformStats, getRecentActivity } from "@/lib/analytics/stats";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { StatusRow } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { prisma } from "@/lib/db/prisma";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/platform", label: "Overview" },
  { href: "/platform/tenants", label: "Tenants" },
  { href: "/platform/subscriptions", label: "Subscriptions" },
  { href: "/platform/security", label: "Security" },
  { href: "/platform/leads", label: "Leads" },
];

export default async function PlatformPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "PLATFORM_ADMIN") redirect("/");

  const stats = await getPlatformStats();

  const [orgs, subscriptions, domains, recentActivity] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        kind: true,
        orgPath: true,
        city: true,
        seatsUsed: true,
        seatsBilled: true,
        _count: { select: { users: true, students: true } },
      },
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        org: { select: { name: true, orgPath: true } },
      },
    }),
    prisma.customDomain.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { org: { select: { name: true } } },
    }),
    getRecentActivity(["org"], 10),
  ]);

  return (
    <Shell
      portal="manage"
      orgName="AdmissionDeck Platform"
      orgPath="manage"
      user={{ name: user.name, role: "Platform admin" }}
      nav={nav}
    >
      <PageHead
        title="Platform health"
        subtitle="SaaS operator console"
      />

      <StatGrid>
        <Stat label="Firms" value={stats.firms} hint="Enterprise tenants" tone="brand" />
        <Stat label="Agencies" value={stats.agencies} hint="Child organizations" tone="info" />
        <Stat label="Total users" value={stats.users} hint={`${stats.activeUsers} active`} tone="ok" />
        <Stat label="Students" value={stats.students} hint="Across all tenants" tone="warn" />
      </StatGrid>

      <div className="grid-2" style={{ marginTop: "var(--space-6)" }}>
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Tenant registry</h2>
              <div className="card-head-aside text-sm muted">
                {orgs.length} organizations
              </div>
            </div>
            <Table
              columns={[
                { key: "name", label: "Organization" },
                { key: "kind", label: "Type" },
                { key: "users", label: "Users" },
                { key: "students", label: "Students" },
                { key: "seats", label: "Seats" },
              ]}
            >
              {orgs.map((o) => (
                <Row key={o.id}>
                  <Cell>
                    <div className="font-medium">{o.name}</div>
                    <code className="text-xs muted">{o.orgPath}</code>
                  </Cell>
                  <Cell>
                    <span className="text-sm">
                      {o.kind === "FIRM" ? "Firm" : "Agency"}
                    </span>
                  </Cell>
                  <Cell>
                    <span className="tabular text-sm">{o._count.users}</span>
                  </Cell>
                  <Cell>
                    <span className="tabular text-sm">{o._count.students}</span>
                  </Cell>
                  <Cell>
                    <span className="tabular text-sm">
                      {o.seatsUsed}/{o.seatsBilled}
                    </span>
                  </Cell>
                </Row>
              ))}
            </Table>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Subscriptions</h2>
              <div className="card-head-aside text-sm muted">
                Managed manually
              </div>
            </div>
            <Table
              columns={[
                { key: "org", label: "Organization" },
                { key: "plan", label: "Plan" },
                { key: "seats", label: "Seats" },
                { key: "status", label: "Status" },
                { key: "notes", label: "Notes" },
              ]}
            >
              {subscriptions.map((s) => (
                <Row key={s.id}>
                  <Cell>
                    <div className="font-medium">{s.org.name}</div>
                  </Cell>
                  <Cell>
                    <span className="text-sm">
                      {s.plan === "ENTERPRISE_FIRM" ? "Enterprise" : "Agency"}
                    </span>
                  </Cell>
                  <Cell>
                    <span className="tabular text-sm">{s.seatQuantity}</span>
                  </Cell>
                  <Cell>
                    <StatusRow
                      tone={
                        s.status === "ACTIVE"
                          ? "ok"
                          : s.status === "TRIALING"
                            ? "warn"
                            : "bad"
                      }
                      title={s.status}
                    />
                  </Cell>
                  <Cell>
                    <span className="text-sm muted">{s.notes ?? "-"}</span>
                  </Cell>
                </Row>
              ))}
            </Table>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Security controls</h2>
            </div>
            <div className="stack-sm">
              <StatusRow tone="ok" title="Row-level security" detail="Enforced on all tenant tables" />
              <StatusRow tone="ok" title="ltree hierarchy" detail="GiST indexes on org paths" />
              <StatusRow tone="ok" title="Append-only audit" detail="Triggers on AuditLog and StateTransition" />
              <StatusRow tone="ok" title="Malware scanning" detail="Built-in ClamAV + heuristic" />
              <StatusRow tone="ok" title="Password policy" detail="scrypt, 12+ chars, lockout" />
              <StatusRow tone="warn" title="MFA" detail="Not yet enabled" />
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Custom domains</h2>
            </div>
            {domains.length === 0 ? (
              <p className="text-sm muted">No custom domains configured.</p>
            ) : (
              <div className="stack-sm">
                {domains.map((d) => (
                  <StatusRow
                    key={d.id}
                    tone={d.verifiedAt ? "ok" : "warn"}
                    title={d.hostname}
                    detail={`${d.org.name} · ${d.portal}${d.verifiedAt ? " · Verified" : " · Pending DNS"}`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Recent activity</h2>
            </div>
            <div className="stack-sm">
              {recentActivity.map((entry) => (
                <StatusRow
                  key={entry.id}
                  tone="brand"
                  title={entry.action.replace(/_/g, " ")}
                  detail={`${entry.actor?.name ?? "System"} · ${formatDate(entry.createdAt)}`}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
