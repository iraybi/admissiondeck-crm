import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Status } from "@/components/ui/Status";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/student", label: "My journey" },
  { href: "/student/documents", label: "Documents" },
  { href: "/student/payments", label: "Payments" },
  { href: "/settings", label: "Settings" },
];

const STATE_TONE: Record<string, "ok" | "brand" | "warn" | "bad" | "info"> = {
  VERIFIED: "ok",
  IN_REVIEW: "brand",
  PENDING: "warn",
  AWAITING_PROOF: "warn",
  REJECTED: "bad",
  REFUNDED: "info",
};

const STATE_LABEL: Record<string, string> = {
  VERIFIED: "Verified",
  IN_REVIEW: "In review",
  PENDING: "Awaiting proof",
  AWAITING_PROOF: "Proof submitted",
  REJECTED: "Rejected",
  REFUNDED: "Refunded",
};

export default async function StudentPaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const student = await prisma.student.findFirst({
    where: { email: user.email },
    select: {
      id: true,
      name: true,
      org: { select: { name: true, orgPath: true, logoUrl: true } },
    },
  });

  if (!student) {
    return (
      <Shell
        portal="student"
        orgName={user.orgName ?? "Workspace"}
        orgPath={user.orgPath ?? ""}
        user={{ name: user.name, role: "Student" }}
        nav={nav}
      >
        <PageHead title="Payments" />
        <section className="card">
          <p className="text-sm muted">
            No student profile linked to your account yet.
          </p>
        </section>
      </Shell>
    );
  }

  const payments = await prisma.payment.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    include: {
      verifiedBy: { select: { name: true } },
      proofDocument: { select: { fileName: true } },
    },
  });

  return (
    <Shell
      portal="student"
      orgName={student.org.name}
      orgPath={student.org.orgPath}
      user={{ name: user.name, role: "Student" }}
      nav={nav}
      logoUrl={student.org.logoUrl}
    >
      <PageHead
        title="Payments"
        subtitle="View your payment obligations and upload proof"
      />

      <section className="card">
        <div className="divided">
          {payments.length === 0 ? (
            <p className="text-sm muted">No payment obligations yet.</p>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="divided-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-sm muted">
                    {formatMoney(Number(p.amount), p.currency)} · {p.method}
                  </div>
                  {p.milestone ? (
                    <div className="text-xs muted">Milestone: {p.milestone}</div>
                  ) : null}
                  {p.rejectReason ? (
                    <div className="text-xs" style={{ color: "var(--brand-ink)", marginTop: 4 }}>
                      {p.rejectReason}
                    </div>
                  ) : null}
                </div>
                <Status tone={STATE_TONE[p.state] ?? "neutral"}>
                  {STATE_LABEL[p.state] ?? p.state}
                </Status>
                {p.state === "PENDING" || p.state === "REJECTED" ? (
                  <Button size="sm">Upload proof</Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </Shell>
  );
}
