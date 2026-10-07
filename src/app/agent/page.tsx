import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { NavItem } from "@/components/layout/SideNav";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "My referrals" },
  { href: "/settings", label: "Settings" },
];

const STATUS_TONE: Record<string, "ok" | "brand" | "warn" | "bad" | "info"> = {
  VISA: "ok",
  COMPLETED: "info",
  ACTIVE: "brand",
  LEAD: "warn",
  REFUSED: "bad",
};

export default async function AgentPortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Get agent's referred students
  const referred = await prisma.student.findMany({
    where: { agentId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      targetCountry: true,
      targetUniversity: true,
      targetProgram: true,
      status: true,
      createdAt: true,
    },
  });

  const eligible = referred.filter(
    (s) => s.status === "VISA" || s.status === "COMPLETED",
  );

  // Get commissions
  const commissions = await prisma.$queryRaw<any[]>`
    SELECT
      COALESCE(SUM("totalCommission"), 0) as "totalCommission",
      COALESCE(SUM(CASE WHEN status = 'PAID' THEN "totalCommission" ELSE 0 END), 0) as "paidCommission",
      COUNT(*) as "entryCount"
    FROM "CommissionEntry"
    WHERE "agentId" = ${user.id}
  `;

  const totalCommission = Number(commissions[0]?.totalCommission ?? 0);
  const paidCommission = Number(commissions[0]?.paidCommission ?? 0);
  const pendingCommission = totalCommission - paidCommission;

  return (
    <Shell
      portal="agent"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: "Agent" }}
      nav={nav}
    >
      <PageHead
        title="My referrals"
        subtitle="Students you have referred to the agency"
      />

      <StatGrid>
        <Stat label="Referred students" value={referred.length} hint="All time" tone="brand" />
        <Stat label="Eligible for commission" value={eligible.length} hint="Visa granted or completed" tone="ok" />
        <Stat label="Commission earned" value={formatMoney(totalCommission, "BDT")} hint="Total" tone="info" />
        <Stat label="Pending payout" value={formatMoney(pendingCommission, "BDT")} hint="Awaiting payment" tone="warn" />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Table
          columns={[
            { key: "name", label: "Student" },
            { key: "dest", label: "Destination" },
            { key: "program", label: "Program" },
            { key: "status", label: "Status" },
          ]}
        >
          {referred.map((s) => (
            <Row key={s.id}>
              <Cell>
                <Link href={`/students/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm muted">{s.email}</div>
                </Link>
              </Cell>
              <Cell>
                <div className="text-sm">{s.targetCountry}</div>
                <div className="text-xs muted">{s.targetUniversity ?? ""}</div>
              </Cell>
              <Cell>
                <div className="text-sm">{s.targetProgram ?? "-"}</div>
              </Cell>
              <Cell>
                <Status tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status}</Status>
              </Cell>
            </Row>
          ))}
        </Table>

        {referred.length === 0 ? (
          <div className="empty">
            No referred students yet. Students you refer will appear here.
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
