import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { StatusRow } from "@/components/ui/Status";
import { SubscriptionAlerts, SubscriptionBanner } from "@/components/domain/SubscriptionAlerts";
import { getSubscriptionAlerts, getSubscriptionSummary } from "@/lib/billing/subscription-alerts";
import { OrgTree } from "@/components/domain/OrgTree";
import { SeatUsage } from "@/components/domain/SeatUsage";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import {
  getFirmStats,
  getRecentActivity,
  getAgencyStats,
} from "@/lib/analytics/stats";
import { prisma } from "@/lib/db/prisma";
import { adminNav } from "@/lib/portal";
import { formatDate, pct } from "@/lib/utils";
import type { NavItem } from "@/components/layout/SideNav";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const stats = await getFirmStats({
    orgPaths: scope.orgPaths,
    role: user.role,
    userId: user.id,
    orgId: user.orgId,
  });

  const orgs = await prisma.organization.findMany({
    where: { id: { in: scope.orgIds } },
    orderBy: { orgPath: "asc" },
    select: {
      id: true,
      name: true,
      kind: true,
      orgPath: true,
      parentId: true,
      city: true,
      seatsUsed: true,
      seatsBilled: true,
      logoUrl: true,
      users: {
        where: { role: "AGENCY_MANAGER", isActive: true },
        select: { name: true },
        take: 1,
      },
    },
  });

  const firm = orgs.find((o) => o.kind === "FIRM") ?? orgs[0];
  const agencies = orgs.filter((o) => o.kind === "AGENCY");

  const activity = await getRecentActivity(scope.orgPaths, 8);
  const subscriptionAlerts = await getSubscriptionAlerts(user.orgId ?? "");
  const subscriptionSummary = await getSubscriptionSummary(user.orgId ?? "");

  const nav: NavItem[] = [
    ...adminNav,
  ];

  return (
    <Shell
      portal="admin"
      orgName={firm?.name ?? "Workspace"}
      orgPath={firm?.orgPath ?? ""}
      user={{ name: user.name, role: "Firm manager" }}
      nav={nav}
      logoUrl={firm?.logoUrl ?? null}
    >
      <PageHead
        title="Firm overview"
        subtitle={`${firm?.name ?? ""} across ${agencies.length} agencies`}
        actions={
          <>
            <Link href="/agencies">
              <Button variant="secondary">Manage agencies</Button>
            </Link>
            <Link href="/billing">
              <Button>Seats and billing</Button>
            </Link>
          </>
        }
      />

      <StatGrid>
        <Stat
          label="Active students"
          value={stats.activeStudents}
          hint={`${stats.totalStudents} total in scope`}
          tone="brand"
        />
        <Stat
          label="Visa success rate"
          value={`${stats.visaRate}%`}
          hint="Of decided cases"
          tone="ok"
        />
        <Stat
          label="Agencies"
          value={stats.orgs}
          hint={`${stats.users} active staff`}
          tone="info"
        />
        <Stat
          label="Payments in review"
          value={stats.paymentsInReview}
          hint="Manual verification"
          tone="warn"
        />
      </StatGrid>

      {/* Subscription alerts */}
      {subscriptionAlerts.length > 0 ? (
        <SubscriptionAlerts alerts={subscriptionAlerts} />
      ) : null}

      {/* Subscription banner */}
      {subscriptionSummary ? (
        <SubscriptionBanner
          status={subscriptionSummary.status}
          plan={subscriptionSummary.plan}
          daysRemaining={subscriptionSummary.daysRemaining}
          currentPeriodEnd={subscriptionSummary.currentPeriodEnd}
        />
      ) : null}

      <div className="grid-2" style={{ marginTop: "var(--space-6)" }}>
        <section className="card">
          <div className="card-head">
            <h2>Organization tree</h2>
            <div className="card-head-aside">
              <span className="text-xs muted">ltree paths</span>
            </div>
          </div>
          <OrgTree
            root={{
              id: firm?.id ?? "",
              name: firm?.name ?? "",
              kind: "firm",
              path: firm?.orgPath ?? "",
              parentId: null,
              seatsUsed: firm?.seatsUsed ?? 0,
              seatsBilled: firm?.seatsBilled ?? 10,
            }}
            children={agencies.map((a) => ({
              id: a.id,
              name: a.name,
              kind: "agency",
              path: a.orgPath,
              parentId: a.parentId,
              city: a.city ?? undefined,
              managerName: a.users[0]?.name ?? undefined,
              seatsUsed: a.seatsUsed,
              seatsBilled: a.seatsBilled,
            }))}
          />
          <p className="text-sm muted" style={{ marginTop: "var(--space-4)" }}>
            Access checks use the descendant operator on organization paths.
            Sister agencies cannot read each other&rsquo;s rows.
          </p>
        </section>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Seat allocation</h2>
            </div>
            <SeatUsage
              used={stats.users}
              billed={agencies.reduce((t, a) => t + a.seatsBilled, 0) || 10}
            />
            <Link
              href="/billing"
              style={{ display: "block", marginTop: "var(--space-4)" }}
            >
              <Button variant="secondary" block>
                Open seat billing
              </Button>
            </Link>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Recent activity</h2>
            </div>
            <div className="stack-sm">
              {activity.length === 0 ? (
                <p className="text-sm muted">No activity yet.</p>
              ) : (
                activity.map((entry) => (
                  <StatusRow
                    key={entry.id}
                    tone={entry.action.includes("reject") ? "bad" : "brand"}
                    title={entry.action.replace(/_/g, " ")}
                    detail={`${entry.actor?.name ?? "System"} · ${formatDate(entry.createdAt)}`}
                  />
                ))
              )}
            </div>
            <p className="text-sm muted" style={{ marginTop: "var(--space-4)" }}>
              Every mutation is written to an append-only audit ledger.
            </p>
          </section>
        </div>
      </div>
    </Shell>
  );
}
