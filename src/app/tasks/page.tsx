import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { listTasks } from "@/lib/tasks/queries";
import { TaskActions } from "@/components/domain/TaskActions";
import { CreateTaskForm } from "@/components/domain/CreateTaskForm";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/students", label: "Students" },
  { href: "/tasks", label: "Tasks" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Settings" },
];

const PRIORITY_TONE: Record<string, "bad" | "warn" | "info" | "neutral"> = {
  URGENT: "bad",
  HIGH: "warn",
  MEDIUM: "info",
  LOW: "neutral",
};

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const tasks = await listTasks({
    orgPaths: scope.orgPaths,
    assigneeId: user.role === "COUNSELLOR" ? user.id : undefined,
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
        title="Tasks"
        subtitle={`${tasks.length} open task${tasks.length === 1 ? "" : "s"}`}
      />

      <CreateTaskForm orgPath={user.orgPath ?? ""} />

      <div style={{ marginTop: "var(--space-5)" }}>
        <Table
          columns={[
            { key: "title", label: "Task" },
            { key: "assignee", label: "Assignee" },
            { key: "due", label: "Due" },
            { key: "priority", label: "Priority" },
            { key: "actions", label: "", width: "140px" },
          ]}
        >
          {tasks.map((t) => (
            <Row key={t.id}>
              <Cell>
                <div className="font-medium">{t.title}</div>
                {t.description ? (
                  <div className="text-sm muted">{t.description}</div>
                ) : null}
                {t.student ? (
                  <Link
                    href={`/students/${t.student.id}`}
                    className="text-sm"
                  >
                    {t.student.name}
                  </Link>
                ) : null}
              </Cell>
              <Cell>
                <span className="text-sm">{t.assignee.name}</span>
              </Cell>
              <Cell>
                <span className="text-sm">
                  {t.dueAt ? formatDate(t.dueAt) : "No due date"}
                </span>
              </Cell>
              <Cell>
                <Status tone={PRIORITY_TONE[t.priority] ?? "neutral"}>
                  {t.priority}
                </Status>
              </Cell>
              <Cell>
                <TaskActions taskId={t.id} />
              </Cell>
            </Row>
          ))}
        </Table>

        {tasks.length === 0 ? (
          <div
            style={{
              padding: "var(--space-10)",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            No open tasks. Create one above.
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
