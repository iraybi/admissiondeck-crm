import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Status } from "@/components/ui/Status";
import { Avatar } from "@/components/ui/Avatar";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { PipelineStepper } from "@/components/domain/PipelineStepper";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getStudentTimeline } from "@/lib/analytics/performance";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate, formatMoney, pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/agencies", label: "Agencies" },
  { href: "/staff", label: "Staff" },
  { href: "/students", label: "Students" },
  { href: "/countries", label: "Countries" },
  { href: "/universities", label: "Universities" },
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

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      org: { select: { id: true, name: true, orgPath: true, city: true } },
      counsellor: { select: { id: true, name: true, email: true } },
      agent: { select: { id: true, name: true, email: true } },
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { verifiedBy: { select: { name: true } } },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
        take: 10,
      },
      tasks: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { dueAt: "asc" },
        include: { assignee: { select: { name: true } } },
      },
    },
  });

  if (!student) notFound();

  const timeline = await getStudentTimeline(student.id);
  const doneStages = 0; // Stages come from pipeline template, tracked separately
  const progress = student.status === "COMPLETED" || student.status === "VISA" ? 100 : 50;

  return (
    <Shell
      portal="admin"
      orgName={student.org.name}
      orgPath={student.org.orgPath}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <div style={{ marginBottom: "var(--space-3)" }}>
        <Link href="/students" className="text-sm">Back to students</Link>
      </div>

      <div className="banner">
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ fontSize: "var(--text-xl)" }}>{student.name}</h1>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
            <Status tone={STATUS_TONE[student.status] ?? "neutral"}>{student.status}</Status>
            {student.org ? (
              <Link href={`/agencies/${student.org.id}`}>
                <Status tone="info">{student.org.name}</Status>
              </Link>
            ) : null}
            {student.counsellor ? (
              <Link href={`/staff/${student.counsellor.id}`}>
                <Status tone="brand">{student.counsellor.name}</Status>
              </Link>
            ) : null}
          </div>
          <div className="text-sm muted" style={{ marginTop: "var(--space-1)" }}>
            {student.email} · {student.phone ?? "No phone"} · {student.targetCountry}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 600 }}>{progress}%</div>
          <div className="text-sm muted">journey complete</div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button variant="secondary">Edit</Button>
          <Button variant="secondary">Message</Button>
          <Button>Advance stage</Button>
        </div>
      </div>

      <StatGrid>
        <Stat label="Target country" value={student.targetCountry} hint={student.targetUniversity ?? ""} tone="brand" />
        <Stat label="Documents" value={student.documents.length} hint={`${student.documents.filter((d) => d.status === "AVAILABLE").length} approved`} tone="info" />
        <Stat label="Payments" value={student.payments.length} hint={`${student.payments.filter((p) => p.state === "VERIFIED").length} verified`} tone="ok" />
        <Stat label="Open tasks" value={student.tasks.length} hint="In progress" tone="warn" />
      </StatGrid>

      <div className="grid-2" style={{ marginTop: "var(--space-6)" }}>
        <div className="stack">
          {/* Pipeline */}
          <section className="card">
            <div className="card-head">
              <h2>Pipeline</h2>
              <div className="card-head-aside">
                <Status tone={STATUS_TONE[student.status] ?? "neutral"}>{student.status}</Status>
              </div>
            </div>
            <ProgressBar value={progress} label="Overall progress" />
            <div className="note" style={{ marginTop: "var(--space-3)" }}>
              Stage transitions are gated: mandatory documents and prior stages must complete before the next step unlocks.
            </div>
          </section>

          {/* Documents */}
          <section className="card">
            <div className="card-head">
              <h2>Documents ({student.documents.length})</h2>
            </div>
            {student.documents.length === 0 ? (
              <p className="text-sm muted">No documents uploaded.</p>
            ) : (
              <div className="divided">
                {student.documents.map((d) => (
                  <div key={d.id} className="divided-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-medium text-sm">{d.type}</div>
                      <div className="text-xs muted">{d.fileName} · {formatDate(d.createdAt)}</div>
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
              <h2>Payments ({student.payments.length})</h2>
            </div>
            {student.payments.length === 0 ? (
              <p className="text-sm muted">No payment obligations.</p>
            ) : (
              <div className="divided">
                {student.payments.map((p) => (
                  <div key={p.id} className="divided-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-medium text-sm">{p.title}</div>
                      <div className="text-xs muted">{formatMoney(Number(p.amount), p.currency)} · {p.method}</div>
                    </div>
                    <Status tone={p.state === "VERIFIED" ? "ok" : p.state === "REJECTED" ? "bad" : "warn"}>{p.state}</Status>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="card">
            <div className="card-head">
              <h2>Notes</h2>
            </div>
            {student.notes.length === 0 ? (
              <p className="text-sm muted">No notes yet.</p>
            ) : (
              <div className="stack-sm">
                {student.notes.map((n) => (
                  <div key={n.id} className="status-row is-brand">
                    <div>
                      <div className="text-sm font-medium">{n.author.name}</div>
                      <div className="text-sm">{n.body}</div>
                      <div className="text-xs muted">{formatDate(n.createdAt)}</div>
                    </div>
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
              <dt className="muted">Passport</dt>
              <dd style={{ margin: 0 }}>{student.passportNumber ?? "-"}</dd>
              <dt className="muted">Nationality</dt>
              <dd style={{ margin: 0 }}>{student.nationality ?? "-"}</dd>
              <dt className="muted">Agency</dt>
              <dd style={{ margin: 0 }}>
                <Link href={`/agencies/${student.org.id}`}>{student.org.name}</Link>
              </dd>
              <dt className="muted">Counsellor</dt>
              <dd style={{ margin: 0 }}>
                {student.counsellor ? (
                  <Link href={`/staff/${student.counsellor.id}`}>{student.counsellor.name}</Link>
                ) : "Unassigned"}
              </dd>
              <dt className="muted">Agent</dt>
              <dd style={{ margin: 0 }}>
                {student.agent ? (
                  <Link href={`/staff/${student.agent.id}`}>{student.agent.name}</Link>
                ) : "Direct"}
              </dd>
              <dt className="muted">Org path</dt>
              <dd style={{ margin: 0 }}><code className="text-xs">{student.orgPath}</code></dd>
            </dl>
          </section>

          {/* Tasks */}
          <section className="card">
            <div className="card-head">
              <h2>Open tasks</h2>
            </div>
            {student.tasks.length === 0 ? (
              <p className="text-sm muted">No open tasks.</p>
            ) : (
              <div className="stack-sm">
                {student.tasks.map((t) => (
                  <div key={t.id} className="status-row is-warn">
                    <div>
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-xs muted">
                        {t.assignee.name} · Due {t.dueAt ? formatDate(t.dueAt) : "No date"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Activity timeline */}
          <section className="card">
            <div className="card-head">
              <h2>Activity</h2>
            </div>
            {timeline.length === 0 ? (
              <p className="text-sm muted">No activity yet.</p>
            ) : (
              <div className="stack-sm" style={{ maxHeight: 400, overflow: "auto" }}>
                {timeline.slice(0, 20).map((e, i) => (
                  <div key={i} className="divided-row" style={{ padding: "8px 0" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-sm">{e.title}</div>
                      <div className="text-xs muted">{e.actor} · {formatDate(e.at)}</div>
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
