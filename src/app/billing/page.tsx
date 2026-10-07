import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { StatusRow } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { SeatUsage } from "@/components/domain/SeatUsage";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { listAgenciesWithCounts } from "@/lib/analytics/deep-queries";
import { prisma } from "@/lib/db/prisma";
import type { NavItem } from "@/components/layout/SideNav";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/agencies", label: "Agencies" },
  { href: "/staff", label: "Staff" },
  { href: "/students", label: "Students" },
  { href: "/billing", label: "Seats & billing" },
  { href: "/settings", label: "Settings" },
];

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const agencies = await listAgenciesWithCounts(user.orgPath ?? "org");

  const subscription = await prisma.subscription.findFirst({
    where: { orgId: user.orgId ?? "" },
  });

  const totalSeats = agencies.reduce((t, a) => t + a.seatsBilled, 0);
  const usedSeats = agencies.reduce((t, a) => t + a.seatsUsed, 0);
  const monthlyCost = totalSeats * 2500;

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Seats & billing"
        subtitle="Manage your subscription and seat allocation"
        actions={<Button variant="secondary">Contact us</Button>}
      />

      <StatGrid>
        <Stat label="Total seats" value={totalSeats} hint="Provisioned" tone="brand" />
        <Stat label="Seats used" value={usedSeats} hint={`${totalSeats - usedSeats} available`} tone="info" />
        <Stat label="Monthly cost" value={formatMoney(monthlyCost, "BDT")} hint="All agencies" tone="ok" />
        <Stat label="Plan" value={subscription?.plan ?? "Not set"} hint="Current plan" tone="warn" />
      </StatGrid>

      <div className="grid-2" style={{ marginTop: "var(--space-6)" }}>
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Agency seat breakdown</h2>
            </div>
            <Table
              columns={[
                { key: "agency", label: "Agency" },
                { key: "used", label: "Used", align: "right" },
                { key: "billed", label: "Billed", align: "right" },
                { key: "monthly", label: "Monthly", align: "right" },
              ]}
            >
              {agencies.map((a) => (
                <Row key={a.id}>
                  <Cell>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs muted">{a.orgPath}</div>
                  </Cell>
                  <Cell align="right">
                    <span className="tabular">{a.seatsUsed}</span>
                  </Cell>
                  <Cell align="right">
                    <span className="tabular">{a.seatsBilled}</span>
                  </Cell>
                  <Cell align="right">
                    <span className="tabular">{formatMoney(a.seatsBilled * 2500, "BDT")}</span>
                  </Cell>
                </Row>
              ))}
              <Row>
                <Cell>
                  <span className="font-semibold">Total</span>
                </Cell>
                <Cell align="right">
                  <span className="tabular font-semibold">{usedSeats}</span>
                </Cell>
                <Cell align="right">
                  <span className="tabular font-semibold">{totalSeats}</span>
                </Cell>
                <Cell align="right">
                  <span className="tabular font-semibold">{formatMoney(monthlyCost, "BDT")}</span>
                </Cell>
              </Row>
            </Table>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>How seat billing works</h2>
            </div>
            <div className="stack-sm">
              <StatusRow tone="brand" title="1. Invite a counsellor or agent" detail="Agency manager opens the team invite flow" />
              <StatusRow tone="brand" title="2. Check active users against seats" detail="Server action compares headcount to provisioned seats" />
              <StatusRow tone="brand" title="3. Contact us to add seats" detail="No self-service upgrade, we manage billing manually" />
              <StatusRow tone="brand" title="4. Seats update immediately" detail="Your subscription reflects the change" />
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Need more seats?</h2>
            </div>
            <p className="text-sm muted" style={{ marginBottom: "var(--space-4)" }}>
              Contact us to adjust your seat count or upgrade your plan. We
              handle billing manually to ensure you get the right setup.
            </p>
            <Button block>Contact us</Button>
          </section>
        </div>
      </div>
    </Shell>
  );
}
