import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getStudentChecklist } from "@/lib/documents/pipeline";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Status } from "@/components/ui/Status";
import { DocumentUploader } from "@/components/domain/DocumentUploader";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/student", label: "My journey" },
  { href: "/student/documents", label: "Documents" },
  { href: "/student/payments", label: "Payments" },
];

const STATUS_TONE: Record<string, "ok" | "brand" | "warn" | "bad"> = {
  AVAILABLE: "ok",
  UPLOADED: "brand",
  QUARANTINED: "warn",
  REJECTED: "bad",
};

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Accepted",
  UPLOADED: "In review",
  QUARANTINED: "Scanning",
  REJECTED: "Rejected",
};

export default async function StudentDocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // For now, use the first student linked to this user.
  // In production this would come from the session's student profile.
  const { prisma } = await import("@/lib/db/prisma");
  const student = await prisma.student.findFirst({
    where: { email: user.email },
    select: { id: true },
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
        <PageHead title="Documents" />
        <section className="card">
          <p className="text-sm muted">
            No student profile linked to your account yet. Contact your
            counsellor.
          </p>
        </section>
      </Shell>
    );
  }

  const checklist = await getStudentChecklist(student.id);
  const complete = checklist?.filter((c) => c.isComplete).length ?? 0;
  const total = checklist?.length ?? 0;

  return (
    <Shell
      portal="student"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: "Student" }}
      nav={nav}
    >
      <PageHead
        title="Document checklist"
        subtitle={`${complete} of ${total} required documents accepted`}
      />

      <div className="stack">
        {checklist?.map((req) => (
          <section key={req.id} className="card">
            <div className="card-head">
              <h2>{req.label}</h2>
              <div className="card-head-aside">
                {req.isComplete ? (
                  <Status tone="ok">Complete</Status>
                ) : req.isRequired ? (
                  <Status tone="warn">Required</Status>
                ) : (
                  <Status tone="neutral">Optional</Status>
                )}
              </div>
            </div>

            {req.description ? (
              <p className="text-sm muted" style={{ marginBottom: "var(--space-3)" }}>
                {req.description}
              </p>
            ) : null}

            {req.uploads.length > 0 ? (
              <div className="divided" style={{ marginBottom: "var(--space-3)" }}>
                {req.uploads.map((u) => (
                  <div key={u.id} className="divided-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-medium text-sm">{u.fileName}</div>
                      <div className="text-xs muted">
                        Uploaded {formatDate(u.uploadedAt)} by {u.uploadedBy}
                      </div>
                    </div>
                    <Status tone={STATUS_TONE[u.status] ?? "neutral"}>
                      {STATUS_LABEL[u.status] ?? u.status}
                    </Status>
                  </div>
                ))}
              </div>
            ) : null}

            {!req.isComplete ? (
              <DocumentUploader
                studentId={student.id}
                docType={req.docType}
                label={req.label}
                allowedMimes={req.allowedMimes}
                maxBytes={req.maxBytes}
              />
            ) : null}
          </section>
        ))}
      </div>
    </Shell>
  );
}
