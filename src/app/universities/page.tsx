import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { getCurrentUser } from "@/lib/auth/session";
import { listUniversities } from "@/lib/catalog/management";
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

export default async function UniversitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const universities = await listUniversities();

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Universities"
        subtitle="Manage university partners and their programs"
        actions={<Button>Add university</Button>}
      />

      <StatGrid>
        <Stat label="Total universities" value={universities.length} hint="In catalog" tone="brand" />
        <Stat
          label="Countries"
          value={new Set(universities.map((u) => u.country)).size}
          hint="With universities"
          tone="info"
        />
        <Stat
          label="Total programs"
          value={universities.reduce((t, u) => t + Number(u.programCount), 0)}
          hint="Across all universities"
          tone="ok"
        />
        <Stat
          label="With students"
          value={universities.filter((u) => Number(u.studentCount) > 0).length}
          hint="Have applicants"
          tone="warn"
        />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Table
          columns={[
            { key: "name", label: "University" },
            { key: "country", label: "Country" },
            { key: "city", label: "City" },
            { key: "programs", label: "Programs" },
            { key: "students", label: "Students" },
            { key: "ranking", label: "Ranking" },
            { key: "status", label: "Status" },
          ]}
        >
          {universities.map((u) => (
            <Row key={u.id}>
              <Cell>
                <div className="font-medium">{u.name}</div>
                {u.website ? (
                  <a href={u.website} target="_blank" rel="noopener" className="text-xs">
                    Website
                  </a>
                ) : null}
              </Cell>
              <Cell>
                <span className="text-sm">{u.country}</span>
              </Cell>
              <Cell>
                <span className="text-sm">{u.city ?? "-"}</span>
              </Cell>
              <Cell>
                <span className="tabular text-sm">{u.programCount}</span>
              </Cell>
              <Cell>
                <span className="tabular text-sm font-semibold">{u.studentCount}</span>
              </Cell>
              <Cell>
                <span className="tabular text-sm">{u.ranking ?? "-"}</span>
              </Cell>
              <Cell>
                <Status tone={u.isActive ? "ok" : "muted"}>
                  {u.isActive ? "Active" : "Inactive"}
                </Status>
              </Cell>
            </Row>
          ))}
        </Table>

        {universities.length === 0 ? (
          <div className="empty">
            No universities yet. Add one to start building your catalog.
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
