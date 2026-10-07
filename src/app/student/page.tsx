import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Status } from "@/components/ui/Status";
import { PipelineStepper } from "@/components/domain/PipelineStepper";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { students, payments, agencies, users } from "@/lib/demo-data";
import type { DocStatus, PaymentState } from "@/lib/types";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate, formatMoney, pct } from "@/lib/utils";

const student = students[0];
const agency = agencies.find((a) => a.id === student.orgId)!;
const counsellor = users.find((u) => u.id === student.counsellorId);
const myPayments = payments.filter((p) => p.studentId === student.id);

const nav: NavItem[] = [
  { href: "/student", label: "My journey" },
  { href: "/student/documents", label: "Documents" },
  { href: "/student/payments", label: "Payments" },
];

const DOC_TONE: Record<DocStatus, "ok" | "brand" | "warn" | "bad"> = {
  approved: "ok",
  uploaded: "brand",
  missing: "warn",
  rejected: "bad",
};

const DOC_LABEL: Record<DocStatus, string> = {
  approved: "Accepted",
  uploaded: "Under review",
  missing: "Required",
  rejected: "Resubmit",
};

const PAY_TONE: Record<PaymentState, "ok" | "brand" | "warn" | "bad"> = {
  verified: "ok",
  in_review: "brand",
  pending: "warn",
  rejected: "bad",
};

const PAY_LABEL: Record<PaymentState, string> = {
  verified: "Verified",
  in_review: "In review",
  pending: "Action needed",
  rejected: "Rejected",
};

export default function StudentPortal() {
  const done = student.stages.filter((s) => s.done).length;
  const progress = pct(done, student.stages.length);
  const next = student.stages.find((s) => !s.done);

  return (
    <Shell
      portal="student"
      orgName={agency.name}
      orgPath={`${agency.path}.${student.id}`}
      user={{ name: student.name, role: "Student" }}
      nav={nav}
    >
      <PageHead
        title={`Hello, ${student.name.split(" ")[0]}`}
        subtitle={`${student.programme} · ${student.university} · ${student.intake}`}
      />

      <div className="grid-2">
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Your pipeline</h2>
              <div className="card-head-aside">
                <span className="text-sm muted tabular">{progress}% complete</span>
              </div>
            </div>
            <PipelineStepper stages={student.stages} />
            {next ? (
              <div className="status-row is-brand" style={{ marginTop: "var(--space-4)" }}>
                <div>
                  <div className="font-medium text-sm">Current step</div>
                  <div className="text-sm">
                    {next.name} · due {formatDate(next.due)}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Document checklist</h2>
            </div>
            <div className="divided">
              {student.docs.map((d) => (
                <div key={d.id} className="divided-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-medium">{d.name}</div>
                  </div>
                  {d.status === "missing" ? (
                    <Button variant="secondary" size="sm">
                      Upload
                    </Button>
                  ) : (
                    <Status tone={DOC_TONE[d.status]}>{DOC_LABEL[d.status]}</Status>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Payments</h2>
            </div>
            {myPayments.length === 0 ? (
              <p className="text-sm muted">No payments due.</p>
            ) : (
              <div className="stack-sm">
                {myPayments.map((p) => (
                  <div key={p.id} className="status-row is-brand">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-sm muted tabular">
                        {formatMoney(p.amount, p.currency)}
                      </div>
                    </div>
                    {p.state === "pending" ? (
                      <Button size="sm">Pay now</Button>
                    ) : (
                      <Status tone={PAY_TONE[p.state]}>{PAY_LABEL[p.state]}</Status>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Messages</h2>
            </div>
            <div className="stack-sm">
              <div className="status-row is-brand">
                <div>
                  <div className="font-medium text-sm">
                    {counsellor?.name ?? "Counsellor"}
                  </div>
                  <div className="text-sm">
                    Your tuition deposit is confirmed. Next step: prepare your
                    visa file. Please upload your police clearance and sponsor
                    letter.
                  </div>
                  <div className="text-xs muted" style={{ marginTop: 4 }}>
                    {formatDate(new Date(Date.now() - 2 * 864e5))}
                  </div>
                </div>
              </div>
              <div className="status-row">
                <div>
                  <div className="font-medium text-sm">AdmissionDeck</div>
                  <div className="text-sm">
                    Welcome. Your counsellor will guide each stage of the
                    application.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Progress</h2>
            </div>
            <ProgressBar value={progress} label="Overall journey" />
          </section>
        </div>
      </div>
    </Shell>
  );
}
