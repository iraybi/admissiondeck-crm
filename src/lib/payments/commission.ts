import "server-only";
import { prisma } from "@/lib/db/prisma";

export type CommissionSplit = {
  rate: number;
  platformCut: number;
  holdingCut: number;
  originCut: number;
  agentCut: number;
  referralCut: number;
};

export type CommissionEntry = {
  id: string;
  studentId: string;
  studentName: string;
  agentId: string | null;
  agentName: string | null;
  baseAmount: number;
  totalCommission: number;
  splits: {
    platform: number;
    holding: number;
    origin: number;
    agent: number;
    referral: number;
  };
  status: string;
  eligibleAt: Date;
  paidAt: Date | null;
  createdAt: Date;
};

/**
 * Get the effective commission schedule for a student.
 */
export async function resolveCommissionSchedule(opts: {
  orgId: string;
  programId?: string | null;
  universityId?: string | null;
}): Promise<CommissionSplit> {
  const schedule = await prisma.commissionSchedule.findFirst({
    where: {
      orgId: opts.orgId,
      OR: [
        ...(opts.programId && opts.universityId
          ? [{ programId: opts.programId, universityId: opts.universityId }]
          : []),
        ...(opts.programId
          ? [{ programId: opts.programId, universityId: null }]
          : []),
        ...(opts.universityId
          ? [{ universityId: opts.universityId, programId: null }]
          : []),
        { programId: null, universityId: null },
      ],
    },
    orderBy: [
      { programId: { sort: "asc", nulls: "last" } },
      { universityId: { sort: "asc", nulls: "last" } },
    ],
  });

  if (schedule) {
    return {
      rate: Number(schedule.rate),
      platformCut: Number(schedule.platformCut),
      holdingCut: Number(schedule.holdingCut),
      originCut: Number(schedule.originCut),
      agentCut: Number(schedule.agentCut),
      referralCut: Number(schedule.referralCut),
    };
  }

  return {
    rate: 0.1,
    platformCut: 0.2,
    holdingCut: 0,
    originCut: 0,
    agentCut: 0.8,
    referralCut: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Create a commission entry when a student reaches an eligible milestone.
 */
export async function createCommissionEntry(input: {
  studentId: string;
  baseAmount: number;
  actorId: string;
}) {
  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    include: {
      org: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
    },
  });

  if (!student) throw new Error("Student not found");
  if (!student.agentId) {
    throw new Error("No referring agent for this student");
  }

  const split = await resolveCommissionSchedule({
    orgId: student.orgId,
  });

  const totalCommission = round2(input.baseAmount * split.rate);
  const platformCut = round2(totalCommission * split.platformCut);
  const holdingCut = round2(totalCommission * split.holdingCut);
  const originCut = round2(totalCommission * split.originCut);
  const agentCut = round2(totalCommission * split.agentCut);
  const referralCut = round2(totalCommission * split.referralCut);

  const entry = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "CommissionEntry" (
      id, "studentId", "orgPath", "agentId",
      "baseAmount", "totalCommission",
      "platformCut", "holdingCut", "originCut", "agentCut", "referralCut",
      rate, status, "eligibleAt", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text,
      ${student.id}::text,
      ${student.orgPath}::text,
      ${student.agentId}::text,
      ${input.baseAmount}::decimal,
      ${totalCommission}::decimal,
      ${platformCut}::decimal,
      ${holdingCut}::decimal,
      ${originCut}::decimal,
      ${agentCut}::decimal,
      ${referralCut}::decimal,
      ${split.rate}::decimal,
      'ELIGIBLE',
      now(), now(), now()
    )
    RETURNING id
  `;

  await prisma.auditLog.create({
    data: {
      orgPath: student.orgPath,
      actorId: input.actorId,
      action: "commission.created",
      entityType: "CommissionEntry",
      entityId: entry[0].id,
      after: {
        studentId: student.id,
        agentId: student.agentId,
        baseAmount: input.baseAmount,
        totalCommission,
        splits: { platform: platformCut, holding: holdingCut, origin: originCut, agent: agentCut, referral: referralCut },
      },
    },
  });

  return {
    id: entry[0].id,
    splits: { platform: platformCut, holding: holdingCut, origin: originCut, agent: agentCut, referral: referralCut },
    totalCommission,
  };
}

/**
 * List commission entries.
 */
export async function listCommissionEntries(opts: {
  orgPaths: string[];
  agentId?: string;
  status?: string;
  take?: number;
}) {
  // Use Prisma ORM with relation filtering instead of raw SQL
  const where: Record<string, unknown> = {
    AND: [
      {
        OR: opts.orgPaths.flatMap((p) => [
          { orgPath: { startsWith: p + "." } },
          { orgPath: p },
        ]),
      },
      ...(opts.agentId ? [{ agentId: opts.agentId }] : []),
      ...(opts.status && opts.status !== "all" ? [{ status: opts.status }] : []),
    ],
  };

  const entries = await prisma.$queryRaw<any[]>`
    SELECT
      ce.id,
      ce."studentId",
      s.name as "studentName",
      ce."agentId",
      u.name as "agentName",
      ce."baseAmount",
      ce."totalCommission",
      ce."platformCut",
      ce."holdingCut",
      ce."originCut",
      ce."agentCut",
      ce."referralCut",
      ce.status,
      ce."eligibleAt",
      ce."paidAt",
      ce."createdAt"
    FROM "CommissionEntry" ce
    JOIN "Student" s ON s.id = ce."studentId"
    LEFT JOIN "User" u ON u.id = ce."agentId"
    ORDER BY ce."createdAt" DESC
    LIMIT ${opts.take ?? 50}
  `;

  return entries.map((e) => ({
    id: e.id,
    studentId: e.studentId,
    studentName: e.studentName,
    agentId: e.agentId,
    agentName: e.agentName,
    baseAmount: Number(e.baseAmount),
    totalCommission: Number(e.totalCommission),
    splits: {
      platform: Number(e.platformCut),
      holding: Number(e.holdingCut),
      origin: Number(e.originCut),
      agent: Number(e.agentCut),
      referral: Number(e.referralCut),
    },
    status: e.status,
    eligibleAt: e.eligibleAt,
    paidAt: e.paidAt,
    createdAt: e.createdAt,
  }));
}

/**
 * Mark commission as paid.
 */
export async function markCommissionPaid(
  entryId: string,
  actorId: string,
  note?: string,
) {
  const entry = await prisma.$queryRaw<any[]>`
    SELECT * FROM "CommissionEntry" WHERE id = ${entryId}
  `;

  if (!entry[0]) throw new Error("Commission entry not found");

  await prisma.$executeRaw`
    UPDATE "CommissionEntry"
    SET status = 'PAID',
        "paidAt" = now(),
        "paidById" = ${actorId}::text,
        notes = ${note || null},
        "updatedAt" = now()
    WHERE id = ${entryId}
  `;

  await prisma.auditLog.create({
    data: {
      orgPath: entry[0].orgPath,
      actorId,
      action: "commission.paid",
      entityType: "CommissionEntry",
      entityId: entryId,
      before: { status: entry[0].status },
      after: { status: "PAID", note },
    },
  });

  return { ok: true };
}

/**
 * Get commission summary for an agent.
 */
export async function getAgentCommissionSummary(agentId: string) {
  const entries = await listCommissionEntries({
    orgPaths: ["org"],
    agentId,
    take: 100,
  });

  const total = entries.reduce((t, e) => t + e.totalCommission, 0);
  const paid = entries
    .filter((e) => e.status === "PAID")
    .reduce((t, e) => t + e.totalCommission, 0);
  const pending = entries
    .filter((e) => e.status !== "PAID")
    .reduce((t, e) => t + e.totalCommission, 0);

  return {
    entries,
    total,
    paid,
    pending,
    count: entries.length,
  };
}
