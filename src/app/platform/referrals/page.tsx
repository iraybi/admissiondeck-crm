import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { getCurrentUser } from "@/lib/auth/session";
import { listReferrals, getReferralStats } from "@/lib/referrals/management";
import { ReferralActions } from "@/components/domain/ReferralActions";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/platform", label: "Overview" },
  { href: "/platform/tenants", label: "Tenants" },
  { href: "/platform/referrals", label: "Referrals" },
  { href: "/platform/subscriptions", label: "Subscriptions" },
  { href: "/platform/security", label: "Security" },
  { href: "/platform/leads", label: "Leads" },
];

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "PLATFORM_ADMIN") redirect("/");

  const [referrals, stats] = await Promise.all([
    listReferrals(),
    getReferralStats(),
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
        title="Referral program"
        subtitle="Track who referred new tenants and manage commission payouts"
        actions={<ReferralActions />}
      />

      <StatGrid>
        <Stat label="Referrers" value={stats.totalReferrals} hint="Total partners" tone="brand" />
        <Stat label="Conversions" value={stats.totalConversions} hint="Tenants referred" tone="info" />
        <Stat label="Total commission" value={formatMoney(stats.totalCommission, "BDT")} hint="All time" tone="ok" />
        <Stat label="Pending payout" value={formatMoney(stats.pendingCommission, "BDT")} hint="Awaiting payment" tone="warn" />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        {referrals.length === 0 ? (
          <div className="empty">
            No referrals yet. Add a referrer to start tracking commissions.
          </div>
        ) : (
          referrals.map((r) => (
            <section key={r.id} className="card" style={{ marginBottom: "var(--space-4)" }}>
              <div className="card-head">
                <h2>{r.referrerName}</h2>
                <div className="card-head-aside">
                  <Status tone="brand">{r.referrerType}</Status>
                  <span className="text-sm muted">
                    {Math.round(r.commissionRate * 100)}% commission
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                <div className="status-row is-brand">
                  <div>
                    <div className="kicker">Conversions</div>
                    <div className="font-semibold tabular">{r.totalConversions}</div>
                  </div>
                </div>
                <div className="status-row is-ok">
                  <div>
                    <div className="kicker">Total earned</div>
                    <div className="font-semibold tabular">{formatMoney(r.totalCommission, "BDT")}</div>
                  </div>
                </div>
                <div className="status-row is-info">
                  <div>
                    <div className="kicker">Paid</div>
                    <div className="font-semibold tabular">{formatMoney(r.paidCommission, "BDT")}</div>
                  </div>
                </div>
                <div className="status-row is-warn">
                  <div>
                    <div className="kicker">Pending</div>
                    <div className="font-semibold tabular">{formatMoney(r.pendingCommission, "BDT")}</div>
                  </div>
                </div>
              </div>

              {r.company ? (
                <div className="text-sm muted" style={{ marginBottom: "var(--space-3)" }}>
                  {r.company} · {r.referrerEmail ?? "No email"}
                </div>
              ) : null}

              {r.conversions.length > 0 ? (
                <Table
                  columns={[
                    { key: "tenant", label: "Tenant" },
                    { key: "plan", label: "Plan" },
                    { key: "seats", label: "Seats" },
                    { key: "value", label: "Monthly value" },
                    { key: "commission", label: "Commission" },
                    { key: "status", label: "Status" },
                  ]}
                >
                  {r.conversions.map((c) => (
                    <Row key={c.id}>
                      <Cell>
                        <div className="font-medium">{c.tenantName}</div>
                        <div className="text-xs muted">{formatDate(c.createdAt)}</div>
                      </Cell>
                      <Cell>
                        <span className="text-sm">{c.plan}</span>
                      </Cell>
                      <Cell>
                        <span className="tabular text-sm">{c.seatCount}</span>
                      </Cell>
                      <Cell>
                        <span className="tabular text-sm">{formatMoney(c.monthlyValue, "BDT")}</span>
                      </Cell>
                      <Cell>
                        <span className="tabular text-sm font-semibold">{formatMoney(c.commissionAmount, "BDT")}</span>
                      </Cell>
                      <Cell>
                        <Status tone={c.status === "PAID" ? "ok" : "warn"}>
                          {c.status === "PAID" ? "Paid" : "Pending"}
                        </Status>
                      </Cell>
                    </Row>
                  ))}
                </Table>
              ) : (
                <div className="empty" style={{ padding: "var(--space-5)" }}>
                  No conversions recorded yet.
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </Shell>
  );
}
