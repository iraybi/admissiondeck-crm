import { redirect } from "next/navigation";
import { getCurrentUser, canManageUsers } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { InviteUserForm } from "@/components/settings/InviteUserForm";
import { Avatar } from "@/components/ui/Avatar";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: "Platform admin",
  FIRM_MANAGER: "Firm manager",
  AGENCY_MANAGER: "Agency manager",
  COUNSELLOR: "Counsellor",
  AGENT: "Recruiting agent",
  STUDENT: "Student",
};

export default async function SettingsTeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const users = user.orgId
    ? await prisma.user.findMany({
        where: { orgId: user.orgId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          inviteTokenExpires: true,
        },
      })
    : [];

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>Team</h2>
          <div className="card-head-aside text-sm muted">
            {users.length} member{users.length === 1 ? "" : "s"}
          </div>
        </div>

        <Table
          columns={[
            { key: "member", label: "Member" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status" },
            { key: "last", label: "Last seen" },
          ]}
        >
          {users.map((u) => (
            <Row key={u.id}>
              <Cell>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Avatar name={u.name} size={32} />
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-sm muted">{u.email}</div>
                  </div>
                </div>
              </Cell>
              <Cell>{ROLE_LABEL[u.role] ?? u.role}</Cell>
              <Cell>
                {!u.isActive ? (
                  <Status tone="bad">Deactivated</Status>
                ) : u.inviteTokenExpires && u.inviteTokenExpires > new Date() ? (
                  <Status tone="warn">Invite pending</Status>
                ) : (
                  <Status tone="ok">Active</Status>
                )}
              </Cell>
              <Cell>
                <span className="text-sm muted">
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Never"}
                </span>
              </Cell>
            </Row>
          ))}
        </Table>
      </section>

      {canManageUsers(user) ? (
        <section className="card">
          <div className="card-head">
            <h2>Invite a teammate</h2>
          </div>
          <InviteUserForm orgId={user.orgId ?? ""} canInvite={!!user.orgId} />
        </section>
      ) : null}
    </>
  );
}
