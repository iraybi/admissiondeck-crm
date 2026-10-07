import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Status } from "@/components/ui/Status";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate, formatMoney, pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "My journey" },
  { href: "/student/documents", label: "Documents" },
  { href: "/settings", label: "Settings" },
];

const STATUS_TONE: Record<string, "ok" | "brand" | "warn" | "bad" | "info"> = {
  VISA: "ok",
  COMPLETED: "info",
  ACTIVE: "brand",
  LEAD: "warn",
  REFUSED: "bad",
};

const DOC_TONE: Record<string, "ok" | "brand" | "warn" | "bad"> = {
  AVAILABLE: "ok",
  UPLOADED: "brand",
  QUARANTINED: "warn",
  REJECTED: "bad",
};

const PAY_TONE: Record<string, "ok" | "brand" | "warn" | "bad"> = {
  VERIFIED: "ok",
  IN_REVIEW: "brand",
  PENDING: "warn",
  REJECTED: "bad",
};

export default async function StudentPortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Find student profile linked to this user
  const student = await prisma.student.findFirst({
    where: { email: user.email },
    include: {
      org: { select: { name: true, orgPath: true, logoUrl: true } },
      counsellor: { select: { name: true, email: true } },
      documents: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { verifiedBy: { select: { name: true } } },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { name: true } } },
      },
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
        <PageHead title="My journey" />
        <section className="card">
          <p className="text-sm muted">
            No student profile linked to your account yet. Contact your
            counsellor to get started.
          </p>
        </section>
      </Shell>
    );
  }

  const progress = student.status === "COMPLETED" || student.status === "VISA" ? 100 : 50;
  const approvedDocs = student.documents.filter((d) => d.status === "AVAILABLE").length;
  const verifiedPayments = student.payments.filter((p) => p.state === "VERIFIED").length;

  return (
    <Shell
      portal="student"
      orgName={student.org.name}
      orgPath={student.org.orgPath}
      user={{ name: user.name, role: "Student" }}
      nav={nav}
      logoUrl={student.org.logoUrl}
    >
      <div className="banner">
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ fontSize: "var(--text-xl)" }}>Hello, {student.name.split(" ")[0]}</h1>
          <div className="text-sm muted" style={{ marginTop: "var(--space-1)" }}>
            {student.targetCountry} · {student.targetProgram ?? "Program not set"} · {student.targetIntake ?? "Intake not set"}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 600 }}>{progress}%</div>
          <div className="text-sm muted">complete</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          {/* Journey */}
          <section className="card">
            <div className="card-head">
              <h2>Your journey</h2>
              <div className="card-head-aside">
                <Status tone={STATUS_TONE[student.status] ?? "neutral"}>
                  {student.status}
                </Status>
              </div>
            </div>
            <ProgressBar value={progress} label="Overall progress" />
            <div className="note" style={{ marginTop: "var(--space-3)" }}>
              Your counsellor will guide you through each stage. Upload required
              documents to keep moving forward.
            </div>
          </section>

          {/* Documents */}
          <section className="card">
            <div className="card-head">
              <h2>Documents</h2>
              <div className="card-head-aside">
                <Link href="/student/documents">
                  <Button variant="secondary" size="sm">View all</Button>
                </Link>
              </div>
            </div>
            {student.documents.length === 0 ? (
              <p className="text-sm muted">No documents uploaded yet.</p>
            ) : (
              <div className="divided">
                {student.documents.slice(0, 5).map((d) => (
                  <div key={d.id} className="divided-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-medium text-sm">{d.type}</div>
                      <div className="text-xs muted">{d.fileName}</div>
                    </div>
                    <Status tone={DOC_TONE[d.status] ?? "neutral"}>{d.status}</Status>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Payments */}
          <section className="card">
            <div className="card-head">
              <h2>Payments</h2>
            </div>
            {student.payments.length === 0 ? (
              <p className="text-sm muted">No payment obligations.</p>
            ) : (
              <div className="divided">
                {student.payments.map((p) => (
                  <div key={p.id} className="divided-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-medium text-sm">{p.title}</div>
                      <div className="text-xs muted">{formatMoney(Number(p.amount), p.currency)}</div>
                    </div>
                    <Status tone={PAY_TONE[p.state] ?? "neutral"}>{p.state}</Status>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          {/* Profile */}
          <section className="card">
            <div className="card-head">
              <h2>Profile</h2>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: "var(--text-base)" }}>
              <dt className="muted">Email</dt>
              <dd style={{ margin: 0 }}>{student.email}</dd>
              <dt className="muted">Phone</dt>
              <dd style={{ margin: 0 }}>{student.phone ?? "-"}</dd>
              <dt className="muted">Country</dt>
              <dd style={{ margin: 0 }}>{student.targetCountry}</dd>
              <dt className="muted">Counsellor</dt>
              <dd style={{ margin: 0 }}>{student.counsellor?.name ?? "Unassigned"}</dd>
            </dl>
          </section>

          {/* Messages */}
          <section className="card">
            <div className="card-head">
              <h2>Messages</h2>
            </div>
            {student.notes.length === 0 ? (
              <p className="text-sm muted">No messages yet.</p>
            ) : (
              <div className="stack-sm">
                {student.notes.map((n) => (
                  <div key={n.id} className="status-row is-brand">
                    <div>
                      <div className="font-medium text-sm">{n.author.name}</div>
                      <div className="text-sm">{n.body}</div>
                      <div className="text-xs muted">{formatDate(n.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}
