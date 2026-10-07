import "server-only";
import { prisma } from "@/lib/db/prisma";
import { underPaths } from "@/lib/db/paths";

export type StatsScope = {
  orgPaths: string[];
  role: string;
  userId: string;
  orgId: string | null;
};

function scopeWhere(scope: StatsScope) {
  return { orgPath: { in: scope.orgPaths } };
}

export async function getFirmStats(scope: StatsScope) {
  const orgWhere = underPaths(scope.orgPaths);

  const [
    totalStudents,
    activeStudents,
    visaGranted,
    completed,
    refused,
    orgs,
    users,
    leads,
    paymentsInReview,
  ] = await Promise.all([
    prisma.student.count({ where: orgWhere }),
    prisma.student.count({ where: { ...orgWhere, status: "ACTIVE" } }),
    prisma.student.count({ where: { ...orgWhere, status: "VISA" } }),
    prisma.student.count({ where: { ...orgWhere, status: "COMPLETED" } }),
    prisma.student.count({
      where: { ...orgWhere, status: { in: ["REFUSED", "WITHDRAWN", "DROPOUT"] } },
    }),
    prisma.organization.count({
      where: {
        OR: [
          { orgPath: { in: scope.orgPaths } },
          { parent: { orgPath: { in: scope.orgPaths } } },
        ],
      },
    }),
    prisma.user.count({
      where: {
        OR: [
          { org: { orgPath: { in: scope.orgPaths } } },
          { org: { parent: { orgPath: { in: scope.orgPaths } } } },
        ],
        isActive: true,
        role: { not: "STUDENT" },
      },
    }),
    prisma.lead.count({
      where: { ...orgWhere, status: { notIn: ["CONVERTED", "LOST"] } },
    }),
    prisma.payment.count({
      where: { ...orgWhere, state: "IN_REVIEW" },
    }),
  ]);

  const decided = visaGranted + completed + refused;
  const visaRate = decided > 0 ? Math.round(((visaGranted + completed) / decided) * 100) : 0;

  return {
    totalStudents,
    activeStudents,
    visaGranted,
    completed,
    refused,
    visaRate,
    orgs,
    users,
    openLeads: leads,
    paymentsInReview,
  };
}

export async function getAgencyStats(orgId: string, orgPath: string) {
  const where = underPaths([orgPath]);

  const [students, active, visa, completed, refused, counsellors, agents, leads] =
    await Promise.all([
      prisma.student.count({ where }),
      prisma.student.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.student.count({ where: { ...where, status: "VISA" } }),
      prisma.student.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.student.count({
        where: { ...where, status: { in: ["REFUSED", "WITHDRAWN", "DROPOUT"] } },
      }),
      prisma.user.count({
        where: { orgId, role: "COUNSELLOR", isActive: true },
      }),
      prisma.user.count({ where: { orgId, role: "AGENT", isActive: true } }),
      prisma.lead.count({
        where: { ...where, status: { notIn: ["CONVERTED", "LOST"] } },
      }),
    ]);

  const decided = visa + completed + refused;
  return {
    students,
    active,
    visa,
    completed,
    refused,
    visaRate: decided > 0 ? Math.round(((visa + completed) / decided) * 100) : 0,
    counsellors,
    agents,
    openLeads: leads,
  };
}

export async function getCounsellorStats(userId: string, orgPath: string) {
  const where = { counsellorId: userId };

  const [students, active, visa, completed, leads, tasksDue, paymentsInReview] =
    await Promise.all([
      prisma.student.count({ where }),
      prisma.student.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.student.count({ where: { ...where, status: "VISA" } }),
      prisma.student.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.lead.count({
        where: { counsellorId: userId, status: { notIn: ["CONVERTED", "LOST"] } },
      }),
      prisma.task.count({
        where: {
          assigneeId: userId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          dueAt: { lte: new Date(Date.now() + 7 * 864e5) },
        },
      }),
      prisma.payment.count({
        where: {
          orgPath: { in: [orgPath] },
          state: "IN_REVIEW",
          student: { counsellorId: userId },
        },
      }),
    ]);

  return {
    students,
    active,
    visa,
    completed,
    openLeads: leads,
    tasksDue,
    paymentsInReview,
  };
}

export async function getAgentStats(userId: string) {
  const where = { agentId: userId };

  const [referred, active, visa, completed] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.count({ where: { ...where, status: "ACTIVE" } }),
    prisma.student.count({ where: { ...where, status: "VISA" } }),
    prisma.student.count({ where: { ...where, status: "COMPLETED" } }),
  ]);

  return {
    referred,
    active,
    visa,
    completed,
    eligible: visa + completed,
  };
}

export async function getPlatformStats() {
  const [firms, agencies, users, activeUsers, students] = await Promise.all([
    prisma.organization.count({ where: { kind: "FIRM" } }),
    prisma.organization.count({ where: { kind: "AGENCY" } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.student.count(),
  ]);

  const subscriptions = await prisma.subscription.findMany({
    select: { seatQuantity: true, plan: true, status: true },
  });

  const seats = subscriptions.reduce((t, s) => t + s.seatQuantity, 0);
  const mrr = subscriptions
    .filter((s) => s.status === "ACTIVE")
    .reduce((t, s) => t + s.seatQuantity * 2500, 0);

  return {
    firms,
    agencies,
    users,
    activeUsers,
    students,
    seats,
    mrr,
  };
}

export async function getRecentActivity(orgPaths: string[], take = 10) {
  return prisma.auditLog.findMany({
    where: {
      OR: [{ orgPath: { in: orgPaths } }, { orgPath: null }],
    },
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { name: true } } },
  });
}

export async function getTargets(orgId: string, period: string) {
  // Targets live on Organization for now; a dedicated Target table is a follow-up.
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { seatsUsed: true, seatsBilled: true },
  });
  return {
    period,
    seatsUsed: org?.seatsUsed ?? 0,
    seatsBilled: org?.seatsBilled ?? 10,
  };
}
