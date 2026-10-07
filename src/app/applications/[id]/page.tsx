import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Status } from "@/components/ui/Status";
import { getCurrentUser } from "@/lib/auth/session";
import { getApplicationDetail } from "@/lib/applications/management";
import { ApplicationActions } from "@/components/domain/ApplicationActions";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/students", label: "Students" },
  { href: "/settings", label: "Settings" },
];

const STATUS_TONE: Record<string, "ok" | "brand" | "warn" | "bad" | "info" | "muted"> = {
  DRAFT: "muted",
  SUBMITTED: "brand",
  UNDER_REVIEW: "info",
  OFFER: "ok",
  OFFER_ACCEPTED: "ok",
  REJECTED: "bad",
  WITHDRAWN: "muted",
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const app = await getApplicationDetail(id);
  if (!app) notFound();

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <div style={{ marginBottom: "var(--space-3)" }}>
        <Link href={`/students/${app.student.id}`} className="text-sm">
          Back to {app.student.name}
        </Link>
      </div>

      <PageHead
        title={app.university.name}
        subtitle={`${app.program.name} · ${app.program.level} · ${app.university.country}`}
        actions={<ApplicationActions applicationId={app.id} currentStatus={app.status} />}
      />

      <div className="grid-2">
        <div className="stack">
          {/* Application details */}
          <section className="card">
            <div className="card-head">
              <h2>Application details</h2>
              <div className="card-head-aside">
                <Status tone={STATUS_TONE[app.status] ?? "neutral"}>{app.status}</Status>
              </div>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: "var(--text-base)" }}>
              <dt className="muted">Student</dt>
              <dd style={{ margin: 0 }}>
                <Link href={`/students/${app.student.id}`}>{app.student.name}</Link>
              </dd>
              <dt className="muted">University</dt>
              <dd style={{ margin: 0 }}>
                {app.university.website ? (
                  <a href={app.university.website} target="_blank" rel="noopener">
                    {app.university.name}
                  </a>
                ) : (
                  app.university.name
                )}
              </dd>
              <dt className="muted">Program</dt>
              <dd style={{ margin: 0 }}>{app.program.name}</dd>
              <dt className="muted">Level</dt>
              <dd style={{ margin: 0 }}>{app.program.level}</dd>
              <dt className="muted">Duration</dt>
              <dd style={{ margin: 0 }}>
                {app.program.durationMonths ? `${app.program.durationMonths} months` : "-"}
              </dd>
              <dt className="muted">Tuition</dt>
              <dd style={{ margin: 0 }}>
                {app.program.tuitionAmount
                  ? formatMoney(Number(app.program.tuitionAmount), app.program.currency)
                  : "-"}
              </dd>
              <dt className="muted">Submitted</dt>
              <dd style={{ margin: 0 }}>
                {app.submittedAt ? formatDate(app.submittedAt) : "Not submitted"}
              </dd>
              <dt className="muted">Decided</dt>
              <dd style={{ margin: 0 }}>
                {app.decidedAt ? formatDate(app.decidedAt) : "Pending"}
              </dd>
            </dl>
          </section>

          {/* Offers */}
          <section className="card">
            <div className="card-head">
              <h2>Offers ({app.offers.length})</h2>
            </div>
            {app.offers.length === 0 ? (
              <p className="text-sm muted">No offers yet.</p>
            ) : (
              <div className="divided">
                {app.offers.map((o) => (
                  <div key={o.id} className="divided-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-medium text-sm">
                        {o.amount ? formatMoney(Number(o.amount), o.currency) : "Conditional offer"}
                      </div>
                      <div className="text-xs muted">
                        Issued {formatDate(o.issuedAt)}
                        {o.expiresAt ? ` · Expires ${formatDate(o.expiresAt)}` : ""}
                      </div>
                    </div>
                    <Status tone={o.status === "ACCEPTED" ? "ok" : o.status === "REJECTED" ? "bad" : "info"}>
                      {o.status}
                    </Status>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          {/* Payments */}
          <section className="card">
            <div className="card-head">
              <h2>Payments ({app.payments.length})</h2>
            </div>
            {app.payments.length === 0 ? (
              <p className="text-sm muted">No payments recorded.</p>
            ) : (
              <div className="divided">
                {app.payments.map((p) => (
                  <div key={p.id} className="divided-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-medium text-sm">{p.title}</div>
                      <div className="text-xs muted">
                        {formatMoney(Number(p.amount), p.currency)}
                      </div>
                    </div>
                    <Status tone={p.state === "VERIFIED" ? "ok" : p.state === "REJECTED" ? "bad" : "warn"}>
                      {p.state}
                    </Status>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick stats */}
          <section className="card">
            <div className="card-head">
              <h2>Summary</h2>
            </div>
            <div className="stack-sm">
              <div className="status-row is-brand">
                <div>
                  <div className="text-sm font-medium">Status</div>
                  <div className="text-sm muted">{app.status}</div>
                </div>
              </div>
              <div className="status-row is-info">
                <div>
                  <div className="text-sm font-medium">Offers</div>
                  <div className="text-sm muted">{app.offers.length} received</div>
                </div>
              </div>
              <div className="status-row is-ok">
                <div>
                  <div className="text-sm font-medium">Payments</div>
                  <div className="text-sm muted">{app.payments.length} recorded</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
