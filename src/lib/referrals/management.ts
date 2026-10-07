import "server-only";
import { prisma } from "@/lib/db/prisma";

export type ReferralWithStats = {
  id: string;
  referrerName: string;
  referrerEmail: string | null;
  referrerPhone: string | null;
  referrerType: string;
  company: string | null;
  commissionRate: number;
  createdAt: Date;
  totalConversions: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  conversions: {
    id: string;
    tenantName: string;
    plan: string;
    seatCount: number;
    monthlyValue: number;
    commissionAmount: number;
    status: string;
    paidAt: Date | null;
    createdAt: Date;
  }[];
};

/**
 * List all referrals with commission stats.
 */
export async function listReferrals(): Promise<ReferralWithStats[]> {
  const referrals = await prisma.$queryRaw<any[]>`
    SELECT
      r.id,
      r."referrerName",
      r."referrerEmail",
      r."referrerPhone",
      r."referrerType",
      r.company,
      r."commissionRate",
      r."createdAt",
      COALESCE(rc.total_conversions, 0) as "totalConversions",
      COALESCE(rc.total_commission, 0) as "totalCommission",
      COALESCE(rc.paid_commission, 0) as "paidCommission",
      COALESCE(rc.pending_commission, 0) as "pendingCommission"
    FROM "Referral" r
    LEFT JOIN (
      SELECT
        "referralId",
        COUNT(*) as total_conversions,
        SUM("commissionAmount") as total_commission,
        SUM(CASE WHEN status = 'PAID' THEN "commissionAmount" ELSE 0 END) as paid_commission,
        SUM(CASE WHEN status != 'PAID' THEN "commissionAmount" ELSE 0 END) as pending_commission
      FROM "ReferralConversion"
      GROUP BY "referralId"
    ) rc ON rc."referralId" = r.id
    ORDER BY r."createdAt" DESC
  `;

  // Get conversions for each referral
  const conversions = await prisma.$queryRaw<any[]>`
    SELECT
      id,
      "referralId",
      "tenantName",
      plan,
      "seatCount",
      "monthlyValue",
      "commissionAmount",
      status,
      "paidAt",
      "createdAt"
    FROM "ReferralConversion"
    ORDER BY "createdAt" DESC
  `;

  return referrals.map((r) => ({
    id: r.id,
    referrerName: r.referrerName,
    referrerEmail: r.referrerEmail,
    referrerPhone: r.referrerPhone,
    referrerType: r.referrerType,
    company: r.company,
    commissionRate: Number(r.commissionRate),
    createdAt: r.createdAt,
    totalConversions: Number(r.totalConversions),
    totalCommission: Number(r.totalCommission),
    paidCommission: Number(r.paidCommission),
    pendingCommission: Number(r.pendingCommission),
    conversions: conversions
      .filter((c) => c.referralId === r.id)
      .map((c) => ({
        id: c.id,
        tenantName: c.tenantName,
        plan: c.plan,
        seatCount: c.seatCount,
        monthlyValue: Number(c.monthlyValue),
        commissionAmount: Number(c.commissionAmount),
        status: c.status,
        paidAt: c.paidAt,
        createdAt: c.createdAt,
      })),
  }));
}

/**
 * Create a new referral.
 */
export async function createReferral(input: {
  referrerName: string;
  referrerEmail?: string;
  referrerPhone?: string;
  referrerType?: string;
  company?: string;
  commissionRate?: number;
  notes?: string;
}) {
  return prisma.$executeRaw`
    INSERT INTO "Referral" (id, "referrerName", "referrerEmail", "referrerPhone", "referrerType", company, "commissionRate", notes, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      ${input.referrerName},
      ${input.referrerEmail || null},
      ${input.referrerPhone || null},
      ${input.referrerType || 'PARTNER'},
      ${input.company || null},
      ${input.commissionRate ?? 0.1000},
      ${input.notes || null},
      now(), now()
    )
  `;
}

/**
 * Record a referral conversion (new tenant signed up).
 */
export async function recordReferralConversion(input: {
  referralId: string;
  tenantId: string;
  tenantName: string;
  plan: string;
  seatCount: number;
  monthlyValue: number;
  notes?: string;
}) {
  // Get referral commission rate
  const referral = await prisma.$queryRaw<any[]>`
    SELECT "commissionRate" FROM "Referral" WHERE id = ${input.referralId}
  `;
  if (!referral[0]) throw new Error("Referral not found");

  const commissionAmount = input.monthlyValue * Number(referral[0].commissionRate);

  return prisma.$executeRaw`
    INSERT INTO "ReferralConversion" (id, "referralId", "tenantId", "tenantName", plan, "seatCount", "monthlyValue", "commissionAmount", status, notes, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      ${input.referralId},
      ${input.tenantId},
      ${input.tenantName},
      ${input.plan},
      ${input.seatCount},
      ${input.monthlyValue},
      ${commissionAmount},
      'PENDING',
      ${input.notes || null},
      now(), now()
    )
  `;
}

/**
 * Mark a referral conversion as paid.
 */
export async function markReferralPaid(
  conversionId: string,
  actorId: string,
  notes?: string,
) {
  return prisma.$executeRaw`
    UPDATE "ReferralConversion"
    SET status = 'PAID',
        "paidAt" = now(),
        "paidById" = ${actorId}::text,
        notes = COALESCE(${notes || null}, notes),
        "updatedAt" = now()
    WHERE id = ${conversionId}
  `;
}

/**
 * Get referral summary stats.
 */
export async function getReferralStats() {
  const stats = await prisma.$queryRaw<any[]>`
    SELECT
      COUNT(DISTINCT r.id) as total_referrals,
      COALESCE(SUM(rc.total_conversions), 0) as total_conversions,
      COALESCE(SUM(rc.total_commission), 0) as total_commission,
      COALESCE(SUM(rc.paid_commission), 0) as paid_commission,
      COALESCE(SUM(rc.pending_commission), 0) as pending_commission
    FROM "Referral" r
    LEFT JOIN (
      SELECT
        "referralId",
        COUNT(*) as total_conversions,
        SUM("commissionAmount") as total_commission,
        SUM(CASE WHEN status = 'PAID' THEN "commissionAmount" ELSE 0 END) as paid_commission,
        SUM(CASE WHEN status != 'PAID' THEN "commissionAmount" ELSE 0 END) as pending_commission
      FROM "ReferralConversion"
      GROUP BY "referralId"
    ) rc ON rc."referralId" = r.id
  `;

  return {
    totalReferrals: Number(stats[0]?.total_referrals ?? 0),
    totalConversions: Number(stats[0]?.total_conversions ?? 0),
    totalCommission: Number(stats[0]?.total_commission ?? 0),
    paidCommission: Number(stats[0]?.paid_commission ?? 0),
    pendingCommission: Number(stats[0]?.pending_commission ?? 0),
  };
}

/**
 * Get available tenants for conversion recording.
 */
export async function getAvailableTenants() {
  return prisma.organization.findMany({
    where: { kind: "FIRM" },
    select: {
      id: true,
      name: true,
      subscription: {
        select: { plan: true, seatQuantity: true },
      },
    },
    orderBy: { name: "asc" },
    take: 50,
  });
}
