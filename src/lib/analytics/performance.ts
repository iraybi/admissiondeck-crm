import "server-only";
import { prisma } from "@/lib/db/prisma";
import { underPaths } from "@/lib/db/paths";

/**
 * Deep analytics queries for firm/agency/staff performance.
 * Every metric links to a drill-down query.
 */

export async function getAgencyPerformance(orgPath: string) {
  const where = underPaths([orgPath]);

  const [students, byStatus, payments, documents, tasks, leads, staff] =
    await Promise.all([
      prisma.student.count({ where }),
      prisma.student.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ["state"],
        where,
        _count: true,
        _sum: { amount: true },
      }),
      prisma.document.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.task.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { org: { orgPath: { startsWith: orgPath + "." } } },
            { org: { orgPath } },
          ],
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
          lastLoginAt: true,
          _count: {
            select: {
              assignedStudents: true,
              referredStudents: true,
            },
          },
        },
      }),
    ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const paymentMap = Object.fromEntries(payments.map((p) => [p.state, p._count]));
  const paymentSum = Object.fromEntries(payments.map((p) => [p.state, Number(p._sum.amount ?? 0)]));

  const decided = (statusMap.VISA ?? 0) + (statusMap.COMPLETED ?? 0) + (statusMap.REFUSED ?? 0);
  const won = (statusMap.VISA ?? 0) + (statusMap.COMPLETED ?? 0);

  return {
    students,
    byStatus: statusMap,
    visaRate: decided > 0 ? Math.round((won / decided) * 100) : 0,
    payments: {
      total: payments.reduce((t, p) => t + p._count, 0),
      byState: paymentMap,
      totalAmount: payments.reduce((t, p) => t + Number(p._sum.amount ?? 0), 0),
    },
    documents: Object.fromEntries(documents.map((d) => [d.status, d._count])),
    tasks: Object.fromEntries(tasks.map((t) => [t.status, t._count])),
    leads: Object.fromEntries(leads.map((l) => [l.status, l._count])),
    staff,
  };
}

export async function getStaffPerformance(userId: string) {
  const [students, byStatus, payments, documents, tasks, leads, notes] =
    await Promise.all([
      prisma.student.count({
        where: { counsellorId: userId },
      }),
      prisma.student.groupBy({
        by: ["status"],
        where: { counsellorId: userId },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ["state"],
        where: {
          student: { counsellorId: userId },
        },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.document.groupBy({
        by: ["status"],
        where: {
          student: { counsellorId: userId },
        },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ["status"],
        where: { assigneeId: userId },
        _count: true,
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { counsellorId: userId },
        _count: true,
      }),
      prisma.note.count({
        where: { authorId: userId },
      }),
    ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const decided = (statusMap.VISA ?? 0) + (statusMap.COMPLETED ?? 0) + (statusMap.REFUSED ?? 0);
  const won = (statusMap.VISA ?? 0) + (statusMap.COMPLETED ?? 0);

  return {
    students,
    byStatus: statusMap,
    visaRate: decided > 0 ? Math.round((won / decided) * 100) : 0,
    payments: {
      total: payments.reduce((t, p) => t + p._count, 0),
      totalAmount: payments.reduce((t, p) => t + Number(p._sum.amount ?? 0), 0),
    },
    documents: Object.fromEntries(documents.map((d) => [d.status, d._count])),
    tasks: Object.fromEntries(tasks.map((t) => [t.status, t._count])),
    leads: Object.fromEntries(leads.map((l) => [l.status, l._count])),
    notesWritten: notes,
  };
}

export async function getAgentPerformance(userId: string) {
  const [students, byStatus, commissions] = await Promise.all([
    prisma.student.count({ where: { agentId: userId } }),
    prisma.student.groupBy({
      by: ["status"],
      where: { agentId: userId },
      _count: true,
    }),
    prisma.$queryRaw<any[]>`
      SELECT
        COALESCE(SUM("totalCommission"), 0) as "totalCommission",
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN "totalCommission" ELSE 0 END), 0) as "paidCommission",
        COUNT(*) as "entryCount"
      FROM "CommissionEntry"
      WHERE "agentId" = ${userId}
    `,
  ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const decided = (statusMap.VISA ?? 0) + (statusMap.COMPLETED ?? 0) + (statusMap.REFUSED ?? 0);
  const won = (statusMap.VISA ?? 0) + (statusMap.COMPLETED ?? 0);

  return {
    students,
    byStatus: statusMap,
    conversionRate: decided > 0 ? Math.round((won / decided) * 100) : 0,
    commissions: {
      total: Number(commissions[0]?.totalCommission ?? 0),
      paid: Number(commissions[0]?.paidCommission ?? 0),
      pending: Number(commissions[0]?.totalCommission ?? 0) - Number(commissions[0]?.paidCommission ?? 0),
      entries: Number(commissions[0]?.entryCount ?? 0),
    },
  };
}

export async function getStudentTimeline(studentId: string) {
  const [transitions, notes, payments, documents, tasks, auditLogs] =
    await Promise.all([
      prisma.stateTransition.findMany({
        where: { entityType: "Student", entityId: studentId },
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      }),
      prisma.note.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      }),
      prisma.payment.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        include: { verifiedBy: { select: { name: true } } },
      }),
      prisma.document.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      }),
      prisma.task.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        include: { assignee: { select: { name: true } } },
      }),
      prisma.auditLog.findMany({
        where: {
          entityType: "Student",
          entityId: studentId,
        },
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      }),
    ]);

  // Merge into a single timeline
  const events = [
    ...transitions.map((t) => ({
      type: "transition" as const,
      at: t.createdAt,
      actor: t.actor?.name ?? "System",
      title: `Status: ${t.fromState ?? "new"} → ${t.toState}`,
      detail: t.reason ?? "",
    })),
    ...notes.map((n) => ({
      type: "note" as const,
      at: n.createdAt,
      actor: n.author.name,
      title: "Note added",
      detail: n.body.slice(0, 120),
    })),
    ...payments.map((p) => ({
      type: "payment" as const,
      at: p.createdAt,
      actor: p.verifiedBy?.name ?? "Student",
      title: `Payment: ${p.title} (${p.state})`,
      detail: `${p.amount} ${p.currency}`,
    })),
    ...documents.map((d) => ({
      type: "document" as const,
      at: d.createdAt,
      actor: d.uploadedBy.name,
      title: `Document: ${d.type} (${d.status})`,
      detail: d.fileName,
    })),
    ...tasks.map((t) => ({
      type: "task" as const,
      at: t.createdAt,
      actor: t.assignee.name,
      title: `Task: ${t.title} (${t.status})`,
      detail: t.description ?? "",
    })),
    ...auditLogs.map((a) => ({
      type: "audit" as const,
      at: a.createdAt,
      actor: a.actor?.name ?? "System",
      title: a.action.replace(/_/g, " "),
      detail: "",
    })),
  ];

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export async function getPerformanceRanking(orgPaths: string[]) {
  // Rank counsellors by students managed, visa rate, activity
  const counsellors = await prisma.user.findMany({
    where: {
      OR: [
        { org: { orgPath: { in: orgPaths } } },
        { org: { parent: { orgPath: { in: orgPaths } } } },
      ],
      role: "COUNSELLOR",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      lastLoginAt: true,
      org: { select: { name: true, orgPath: true } },
    },
  });

  const rankings = await Promise.all(
    counsellors.map(async (c) => {
      const perf = await getStaffPerformance(c.id);
      return {
        ...c,
        performance: perf,
        score:
          perf.students * 10 +
          perf.visaRate +
          (perf.tasks.OPEN ?? 0) * -2 +
          (perf.notesWritten ?? 0),
      };
    }),
  );

  return rankings.sort((a, b) => b.score - a.score);
}
