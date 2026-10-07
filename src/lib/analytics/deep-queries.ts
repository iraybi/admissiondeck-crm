import "server-only";
import { prisma } from "@/lib/db/prisma";
import { underPaths } from "@/lib/db/paths";

/**
 * Deep relational queries. Every entity returns its full child counts
 * so lists can display relational data without N+1 calls.
 */

export type AgencyWithCounts = {
  id: string;
  name: string;
  orgPath: string;
  city: string | null;
  country: string | null;
  seatsUsed: number;
  seatsBilled: number;
  managerName: string | null;
  staff: { total: number; counsellors: number; agents: number; managers: number; invited: number };
  students: { total: number; active: number; visa: number; completed: number; refused: number };
  visaRate: number;
};

export async function listAgenciesWithCounts(firmPath: string): Promise<AgencyWithCounts[]> {
  const agencies = await prisma.organization.findMany({
    where: {
      kind: "AGENCY",
      OR: [
        { orgPath: { startsWith: firmPath + "." } },
        { orgPath: firmPath },
      ],
    },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    agencies.map(async (ag) => {
      const [staff, staffByRole, students, studentsByStatus] = await Promise.all([
        prisma.user.count({
          where: {
            OR: [{ orgId: ag.id }, { org: { orgPath: { startsWith: ag.orgPath + "." } } }],
            role: { not: "STUDENT" },
          },
        }),
        prisma.user.groupBy({
          by: ["role"],
          where: {
            OR: [{ orgId: ag.id }, { org: { orgPath: { startsWith: ag.orgPath + "." } } }],
            role: { not: "STUDENT" },
          },
          _count: true,
        }),
        prisma.student.count({
          where: { orgPath: { startsWith: ag.orgPath } },
        }),
        prisma.student.groupBy({
          by: ["status"],
          where: { orgPath: { startsWith: ag.orgPath } },
          _count: true,
        }),
      ]);

      const roleMap = Object.fromEntries(staffByRole.map((r) => [r.role, r._count]));
      const statusMap = Object.fromEntries(studentsByStatus.map((s) => [s.status, s._count]));
      const decided = (statusMap.VISA ?? 0) + (statusMap.COMPLETED ?? 0) + (statusMap.REFUSED ?? 0);
      const won = (statusMap.VISA ?? 0) + (statusMap.COMPLETED ?? 0);

      const manager = await prisma.user.findFirst({
        where: { orgId: ag.id, role: "AGENCY_MANAGER", isActive: true },
        select: { name: true },
      });

      return {
        id: ag.id,
        name: ag.name,
        orgPath: ag.orgPath,
        city: ag.city,
        country: ag.country,
        seatsUsed: ag.seatsUsed,
        seatsBilled: ag.seatsBilled,
        managerName: manager?.name ?? null,
        staff: {
          total: staff,
          counsellors: roleMap.COUNSELLOR ?? 0,
          agents: roleMap.AGENT ?? 0,
          managers: roleMap.AGENCY_MANAGER ?? 0,
          invited: 0,
        },
        students: {
          total: students,
          active: statusMap.ACTIVE ?? 0,
          visa: statusMap.VISA ?? 0,
          completed: statusMap.COMPLETED ?? 0,
          refused: statusMap.REFUSED ?? 0,
        },
        visaRate: decided > 0 ? Math.round((won / decided) * 100) : 0,
      };
    }),
  );
}

export type StaffWithCounts = {
  id: string;
  name: string;
  email: string;
  role: string;
  orgId: string | null;
  orgName: string | null;
  orgPath: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  studentsAssigned: number;
  studentsReferred: number;
  tasksOpen: number;
  leadsOpen: number;
  visaRate: number;
};

export async function listStaffWithCounts(opts: {
  orgPaths: string[];
  orgId?: string;
  role?: string;
  search?: string;
}): Promise<StaffWithCounts[]> {
  const users = await prisma.user.findMany({
    where: {
      AND: [
        {
          OR: opts.orgPaths.flatMap((p) => [
            { org: { orgPath: { startsWith: p + "." } } },
            { org: { orgPath: p } },
          ]),
        },
        { role: { not: "STUDENT" } },
        ...(opts.orgId ? [{ orgId: opts.orgId }] : []),
        ...(opts.role && opts.role !== "all" ? [{ role: opts.role as never }] : []),
        ...(opts.search
          ? [
              {
                OR: [
                  { name: { contains: opts.search, mode: "insensitive" as const } },
                  { email: { contains: opts.search, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
      ],
    },
    include: {
      org: { select: { id: true, name: true, orgPath: true } },
    },
    orderBy: { name: "asc" },
    take: 200,
  });

  return Promise.all(
    users.map(async (u) => {
      const [assigned, referred, tasksOpen, leadsOpen, studentsByStatus] =
        await Promise.all([
          prisma.student.count({ where: { counsellorId: u.id } }),
          prisma.student.count({ where: { agentId: u.id } }),
          prisma.task.count({
            where: { assigneeId: u.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
          }),
          prisma.lead.count({
            where: { counsellorId: u.id, status: { notIn: ["CONVERTED", "LOST"] } },
          }),
          prisma.student.groupBy({
            by: ["status"],
            where: {
              OR: [{ counsellorId: u.id }, { agentId: u.id }],
            },
            _count: true,
          }),
        ]);

      const statusMap = Object.fromEntries(studentsByStatus.map((s) => [s.status, s._count]));
      const decided = (statusMap.VISA ?? 0) + (statusMap.COMPLETED ?? 0) + (statusMap.REFUSED ?? 0);
      const won = (statusMap.VISA ?? 0) + (statusMap.COMPLETED ?? 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        orgId: u.orgId,
        orgName: u.org?.name ?? null,
        orgPath: u.org?.orgPath ?? null,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        studentsAssigned: assigned,
        studentsReferred: referred,
        tasksOpen,
        leadsOpen,
        visaRate: decided > 0 ? Math.round((won / decided) * 100) : 0,
      };
    }),
  );
}

export async function getAgencyStaffBreakdown(orgPath: string) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { org: { orgPath: { startsWith: orgPath + "." } } },
        { org: { orgPath } },
      ],
      role: { not: "STUDENT" },
    },
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      isActive: true,
      lastLoginAt: true,
    },
  });

  const byRole: Record<string, number> = {};
  for (const u of users) {
    byRole[u.role] = (byRole[u.role] ?? 0) + 1;
  }

  return {
    total: users.length,
    byRole,
    invited: users.filter((u) => !u.isActive).length,
    active: users.filter((u) => u.isActive).length,
    users,
  };
}
