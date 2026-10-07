import { Shell, PageHead } from "@/components/layout/Shell";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { StudentList } from "@/components/domain/StudentList";
import { students, agencies, users } from "@/lib/demo-data";
import type { NavItem } from "@/components/layout/SideNav";
import { formatMoney } from "@/lib/utils";

const agent = users.find((u) => u.role === "agent")!;
const agency = agencies.find((a) => a.id === agent.orgId)!;
const referred = students.filter((s) => s.agentId === agent.id);
const eligible = referred.filter(
  (s) => s.status === "visa" || s.status === "completed",
);

const nav: NavItem[] = [
  { href: "/agent", label: "My referrals" },
  { href: "/agent/payments", label: "Payments" },
];

export default function AgentPortal() {
  return (
    <Shell
      portal="agent"
      orgName={agency.name}
      orgPath={agency.path}
      user={{ name: agent.name, role: "Recruiting agent" }}
      nav={nav}
    >
      <PageHead
        title="My referrals"
        subtitle={`Students you referred to ${agency.name}`}
      />

      <StatGrid>
        <Stat
          label="Referred students"
          value={referred.length}
          hint="In your pipeline"
          tone="brand"
        />
        <Stat
          label="Commission eligible"
          value={eligible.length}
          hint="Visa granted or completed"
          tone="ok"
        />
        <Stat
          label="Commission earned"
          value={formatMoney(eligible.length * 15000, "BDT")}
          hint="Pending finance approval"
          tone="info"
        />
        <Stat
          label="Active"
          value={referred.filter((s) => s.status === "active").length}
          hint="Still in pipeline"
          tone="warn"
        />
      </StatGrid>

      <div style={{ marginTop: "var(--space-6)" }}>
        <StudentList students={referred} />
      </div>
    </Shell>
  );
}
