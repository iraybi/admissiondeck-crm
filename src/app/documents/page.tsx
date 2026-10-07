import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { listDocumentsForReview } from "@/lib/documents/pipeline";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/agencies", label: "Agencies" },
  { href: "/staff", label: "Staff" },
  { href: "/students", label: "Students" },
  { href: "/documents", label: "Documents" },
  { href: "/settings", label: "Settings" },
];

const DOC_TONE: Record<string, "ok" | "brand" | "warn" | "bad"> = {
  AVAILABLE: "ok",
  UPLOADED: "brand",
  QUARANTINED: "warn",
  REJECTED: "bad",
};

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const documents = await listDocumentsForReview({
    orgPaths: scope.orgPaths,
    take: 100,
  });

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Documents"
        subtitle="Review uploaded documents across all students"
        actions={<Button variant="secondary">Request upload URL</Button>}
      />

      <Table
        columns={[
          { key: "name", label: "Document" },
          { key: "student", label: "Student" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "uploaded", label: "Uploaded" },
        ]}
      >
        {documents.map((d) => (
          <Row key={d.id}>
            <Cell>
              <div className="font-medium">{d.fileName}</div>
              <div className="text-sm muted">{d.type}</div>
            </Cell>
            <Cell>
              <div className="text-sm">{d.student?.name ?? "Unknown"}</div>
              <div className="text-xs muted">{d.student?.targetCountry ?? ""}</div>
            </Cell>
            <Cell>
              <div className="text-sm">{d.type}</div>
            </Cell>
            <Cell>
              <Status tone={DOC_TONE[d.status] ?? "neutral"}>{d.status}</Status>
            </Cell>
            <Cell>
              <div className="text-sm">{formatDate(d.createdAt)}</div>
              <div className="text-xs muted">{d.uploadedBy?.name ?? ""}</div>
            </Cell>
          </Row>
        ))}
      </Table>

      {documents.length === 0 ? (
        <div className="empty">No documents in scope.</div>
      ) : null}
    </Shell>
  );
}
