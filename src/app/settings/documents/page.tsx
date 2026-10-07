import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listRequirements } from "@/lib/documents/requirements";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { DocRequirementsEditor } from "@/components/domain/DocRequirementsEditor";
import type { NavItem } from "@/components/layout/SideNav";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/organization", label: "Organization" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/documents", label: "Document rules" },
  { href: "/settings/sessions", label: "Sessions" },
];

const SCOPE_LABEL: Record<string, string> = {
  GLOBAL: "All countries",
  COUNTRY: "Country",
  UNIVERSITY: "University",
  PROGRAMME: "Programme",
  INTAKE: "Intake",
  STUDENT: "Student override",
};

export default async function DocumentRulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const requirements = await listRequirements();

  // Group by scope for display
  const byScope = requirements.reduce(
    (acc, r) => {
      const key = r.scope;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {} as Record<string, typeof requirements>,
  );

  return (
    <Shell
      portal="manage"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: "Admin" }}
      nav={nav}
    >
      <PageHead
        title="Document rules"
        subtitle="Fully customizable document requirements per country, university, programme, intake, and student"
        actions={<DocRequirementsEditor />}
      />

      <div className="stack">
        {Object.entries(byScope).map(([scope, rules]) => (
          <section key={scope} className="card">
            <div className="card-head">
              <h2>{SCOPE_LABEL[scope] ?? scope}</h2>
              <div className="card-head-aside text-sm muted">
                {rules.length} rule{rules.length === 1 ? "" : "s"}
              </div>
            </div>

            <Table
              columns={[
                { key: "type", label: "Document type" },
                { key: "label", label: "Label" },
                { key: "required", label: "Required" },
                { key: "scope", label: "Scope" },
                { key: "mimes", label: "Allowed types" },
                { key: "order", label: "Order" },
              ]}
            >
              {rules.map((r) => (
                <Row key={r.id}>
                  <Cell>
                    <code className="text-sm">{r.docType}</code>
                  </Cell>
                  <Cell>
                    <div className="font-medium">{r.label}</div>
                    {r.description ? (
                      <div className="text-sm muted">{r.description}</div>
                    ) : null}
                  </Cell>
                  <Cell>
                    <Status tone={r.isRequired ? "brand" : "neutral"}>
                      {r.isRequired ? "Required" : "Optional"}
                    </Status>
                  </Cell>
                  <Cell>
                    <span className="text-sm">
                      {r.scopeId ?? "Global"}
                    </span>
                  </Cell>
                  <Cell>
                    <span className="text-sm">
                      {r.allowedMimes.length} type{r.allowedMimes.length === 1 ? "" : "s"}
                    </span>
                  </Cell>
                  <Cell>
                    <span className="text-sm">{r.sortOrder}</span>
                  </Cell>
                </Row>
              ))}
            </Table>
          </section>
        ))}
      </div>
    </Shell>
  );
}
