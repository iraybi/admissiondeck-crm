import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { listPaymentsForReview } from "@/lib/payments/state-machine";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { PaymentActions, PaymentCreateForm } from "@/components/domain/PaymentActions";
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

const STATE_TONE: Record<string, "warn" | "brand" | "ok" | "bad" | "info"> = {
  PENDING: "warn",
  AWAITING_PROOF: "warn",
  IN_REVIEW: "brand",
  VERIFIED: "ok",
  REJECTED: "bad",
  REFUNDED: "info",
};

const STATE_LABEL: Record<string, string> = {
  PENDING: "Awaiting proof",
  AWAITING_PROOF: "Proof submitted",
  IN_REVIEW: "In review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  REFUNDED: "Refunded",
};

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const payments = await listPaymentsForReview({
    orgPaths: scope.orgPaths,
    take: 100,
  });

  const counts = {
    pending: payments.filter((p) => p.state === "PENDING").length,
    awaiting: payments.filter((p) => p.state === "AWAITING_PROOF").length,
    inReview: payments.filter((p) => p.state === "IN_REVIEW").length,
    verified: payments.filter((p) => p.state === "VERIFIED").length,
    rejected: payments.filter((p) => p.state === "REJECTED").length,
    total: payments.reduce((t, p) => t + Number(p.amount), 0),
  };

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Payment verification"
        subtitle="Manual receipts and bank transfers with full audit trail"
      />

      <StatGrid>
        <Stat label="Awaiting proof" value={counts.pending} hint="Student action needed" tone="warn" />
        <Stat label="In review" value={counts.inReview} hint="Staff verification" tone="brand" />
        <Stat label="Verified" value={counts.verified} hint="Funds confirmed" tone="ok" />
        <Stat label="Total value" value={formatMoney(counts.total, "BDT")} hint="All obligations" tone="info" />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Table
          columns={[
            { key: "title", label: "Obligation" },
            { key: "student", label: "Student" },
            { key: "amount", label: "Amount", align: "right" },
            { key: "state", label: "State" },
            { key: "proof", label: "Proof" },
            { key: "actions", label: "", width: "160px" },
          ]}
        >
          {payments.map((p) => (
            <Row key={p.id}>
              <Cell>
                <div className="font-medium">{p.title}</div>
                <div className="text-sm muted">{p.method}</div>
                {p.milestone ? (
                  <div className="text-xs muted">Milestone: {p.milestone}</div>
                ) : null}
              </Cell>
              <Cell>
                <div className="text-sm">{p.student.name}</div>
                <div className="text-xs muted">{p.student.targetCountry}</div>
              </Cell>
              <Cell align="right">
                <span className="tabular">{formatMoney(Number(p.amount), p.currency)}</span>
              </Cell>
              <Cell>
                <Status tone={STATE_TONE[p.state] ?? "neutral"}>
                  {STATE_LABEL[p.state] ?? p.state}
                </Status>
              </Cell>
              <Cell>
                {p.proofDocument ? (
                  <div className="text-sm">{p.proofDocument.fileName}</div>
                ) : (
                  <span className="text-sm muted">None</span>
                )}
              </Cell>
              <Cell>
                <PaymentActions paymentId={p.id} state={p.state} />
              </Cell>
            </Row>
          ))}
        </Table>

        {payments.length === 0 ? (
          <div
            style={{
              padding: "var(--space-10)",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            No payment obligations in scope.
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
