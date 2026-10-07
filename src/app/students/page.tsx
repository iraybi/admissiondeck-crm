import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import { listStudents } from "@/lib/students/queries";
import { getFirmStats } from "@/lib/analytics/stats";
import { prisma } from "@/lib/db/prisma";
import { StudentsClient } from "@/components/domain/StudentsClient";
import { StudentCreateForm } from "@/components/domain/UserActions";
import { Shell, PageHead } from "@/components/layout/Shell";
import { adminNav } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = await resolveScope(user);
  const [students, stats, orgs, templates] = await Promise.all([
    listStudents({ orgPaths: scope.orgPaths, take: 100 }),
    getFirmStats({
      orgPaths: scope.orgPaths,
      role: user.role,
      userId: user.id,
      orgId: user.orgId,
    }),
    prisma.organization.findMany({
      where: { id: { in: scope.orgIds }, kind: "AGENCY" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.pipelineTemplate.findMany({
      where: { isActive: true },
      select: { country: true },
      orderBy: { country: "asc" },
    }),
  ]);

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: "Firm manager" }}
      nav={adminNav}
    >
      <PageHead
        title="Students"
        subtitle={`${students.length} in current scope`}
      />
      <StudentsClient
        students={students.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          orgId: s.orgId,
          orgName: s.org.name,
          counsellorName: s.counsellor?.name ?? null,
          country: s.targetCountry,
          university: s.targetUniversity ?? "",
          programme: s.targetProgram ?? "",
          intake: s.targetIntake ?? "",
          status: s.status,
          createdAt: s.createdAt.toISOString(),
        }))}
        orgs={orgs}
        countries={templates.map((t) => t.country)}
        stats={stats}
      />
    </Shell>
  );
}
