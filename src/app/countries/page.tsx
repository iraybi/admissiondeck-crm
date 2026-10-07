import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { getCurrentUser } from "@/lib/auth/session";
import { listCountries } from "@/lib/catalog/management";
import { CountryActions } from "@/components/domain/CountryActions";
import type { NavItem } from "@/components/layout/SideNav";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/agencies", label: "Agencies" },
  { href: "/staff", label: "Staff" },
  { href: "/students", label: "Students" },
  { href: "/countries", label: "Countries" },
  { href: "/universities", label: "Universities" },
  { href: "/documents", label: "Document rules" },
  { href: "/settings", label: "Settings" },
];

export default async function CountriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const countries = await listCountries();
  const active = countries.filter((c) => c.isActive);
  const totalStudents = countries.reduce((t, c) => t + c.studentCount, 0);

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Countries"
        subtitle="Manage destination countries and their document requirements"
        actions={<Button>Add country</Button>}
      />

      <StatGrid>
        <Stat label="Total countries" value={countries.length} hint="In catalog" tone="brand" />
        <Stat label="Active" value={active.length} hint="Available to agencies" tone="ok" />
        <Stat label="With students" value={countries.filter((c) => c.studentCount > 0).length} hint="Have applicants" tone="info" />
        <Stat label="Total students" value={totalStudents} hint="Across all countries" tone="warn" />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Table
          columns={[
            { key: "name", label: "Country" },
            { key: "continent", label: "Region" },
            { key: "orgs", label: "Agencies" },
            { key: "students", label: "Students" },
            { key: "fields", label: "Custom fields" },
            { key: "status", label: "Status" },
            { key: "actions", label: "", width: "120px" },
          ]}
        >
          {countries.map((c) => (
            <Row key={c.id}>
              <Cell>
                <div className="font-medium">{c.name}</div>
                <code className="text-xs muted">{c.code}</code>
              </Cell>
              <Cell>
                <span className="text-sm">{c.continent ?? "-"}</span>
              </Cell>
              <Cell>
                <span className="tabular text-sm">{c.orgCount}</span>
              </Cell>
              <Cell>
                <span className="tabular text-sm font-semibold">{c.studentCount}</span>
              </Cell>
              <Cell>
                <span className="text-sm muted">
                  {Object.keys(c.customFields).length > 0
                    ? `${Object.keys(c.customFields).length} fields`
                    : "None"}
                </span>
              </Cell>
              <Cell>
                <Status tone={c.isActive ? "ok" : "muted"}>
                  {c.isActive ? "Active" : "Inactive"}
                </Status>
              </Cell>
              <Cell>
                <CountryActions countryId={c.id} countryName={c.name} isActive={c.isActive} />
              </Cell>
            </Row>
          ))}
        </Table>
      </div>
    </Shell>
  );
}
