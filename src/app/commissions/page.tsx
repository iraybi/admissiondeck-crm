import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { listCommissionEntries } from "@/lib/payments/commission";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { CommissionPayButton } from "@/components/domain/CommissionPayButton";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/students", label: "Students" },
  { href: "/payments", label: "Payment review" },
  { href: "/commissions", label: "Commissions" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings", label: "Settings" },
];

const STATUS_TONE: Record<string, "ok" | "brand" | "warn" | "bad"> = {
  PAID: "ok",
  ELIGIBLE: "brand",
  PENDING: "warn",
  CLAWED_BACK: "bad",
};

export default async function CommissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const entries = await listCommissionEntries({
    orgPaths: scope.orgPaths,
    take: 100,
  });

  const total = entries.reduce((t, e) => t + e.totalCommission, 0);
  const paid = entries
    .filter((e) => e.status === "PAID")
    .reduce((t, e) => t + e.totalCommission, 0);
  const pending = entries
    .filter((e) => e.status !== "PAID")
    .reduce((t, e) => t + e.totalCommission, 0);

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Commission ledger"
        subtitle="Agent commissions based on visa grants and enrollments"
      />

      <StatGrid>
        <Stat label="Total commission" value={formatMoney(total, "BDT")} hint="All entries" tone="brand" />
        <Stat label="Paid" value={formatMoney(paid, "BDT")} hint="Disbursed" tone="ok" />
        <Stat label="Pending" value={formatMoney(pending, "BDT")} hint="Awaiting payout" tone="warn" />
        <Stat label="Entries" value={entries.length} hint="Commission records" tone="info" />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Table
          columns={[
            { key: "student", label: "Student" },
            { key: "agent", label: "Agent" },
            { key: "base", label: "Base", align: "right" },
            { key: "commission", label: "Commission", align: "right" },
            { key: "splits", label: "Split (agent/platform)" },
            { key: "status", label: "Status" },
            { key: "actions", label: "", width: "120px" },
          ]}
        >
          {entries.map((e) => (
            <Row key={e.id}>
              <Cell>
                <div className="font-medium">{e.studentName}</div>
                <div className="text-xs muted">{formatDate(e.createdAt)}</div>
              </Cell>
              <Cell>
                <div className="text-sm">{e.agentName ?? "Direct"}</div>
              </Cell>
              <Cell align="right">
                <span className="tabular">{formatMoney(e.baseAmount, "BDT")}</span>
              </Cell>
              <Cell align="right">
                <span className="tabular font-semibold">
                  {formatMoney(e.totalCommission, "BDT")}
                </span>
              </Cell>
              <Cell>
                <div className="text-xs">
                  Agent: {formatMoney(e.splits.agent, "BDT")}
                </div>
                <div className="text-xs muted">
                  Platform: {formatMoney(e.splits.platform, "BDT")}
                </div>
              </Cell>
              <Cell>
                <Status tone={STATUS_TONE[e.status] ?? "neutral"}>
                  {e.status === "PAID"
                    ? "Paid"
                    : e.status === "ELIGIBLE"
                      ? "Eligible"
                      : e.status}
                </Status>
              </Cell>
              <Cell>
                {e.status !== "PAID" ? (
                  <CommissionPayButton paymentId={e.id} />
                ) : (
                  <span className="text-xs muted">
                    {e.paidAt ? formatDate(e.paidAt) : ""}
                  </span>
                )}
              </Cell>
            </Row>
          ))}
        </Table>

        {entries.length === 0 ? (
          <div
            style={{
              padding: "var(--space-10)",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            No commission entries yet. Commissions are created when a referred
            student reaches VISA or COMPLETED status.
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
