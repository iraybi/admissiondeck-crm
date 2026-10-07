import "server-only";
import { prisma } from "@/lib/db/prisma";

export type ApplicationWithDetails = {
  id: string;
  status: string;
  submittedAt: Date | null;
  decidedAt: Date | null;
  createdAt: Date;
  universityName: string;
  universityCountry: string;
  universityCity: string | null;
  programName: string;
  programLevel: string;
  tuitionAmount: number | null;
  tuitionCurrency: string;
  intakeTerm: string | null;
  offerCount: number;
  paymentCount: number;
};

/**
 * List all applications for a student with full details.
 * Returns a tree-friendly flat list sorted by country > university > program.
 */
export async function listStudentApplications(
  studentId: string,
): Promise<ApplicationWithDetails[]> {
  const apps = await prisma.application.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: {
      university: { select: { name: true, country: true, city: true } },
      program: {
        select: {
          name: true,
          level: true,
          tuitionAmount: true,
          currency: true,
        },
      },
      offers: true,
      payments: true,
    },
  });

  return apps.map((a) => ({
    id: a.id,
    status: a.status,
    submittedAt: a.submittedAt,
    decidedAt: a.decidedAt,
    createdAt: a.createdAt,
    universityName: a.university.name,
    universityCountry: a.university.country,
    universityCity: a.university.city,
    programName: a.program.name,
    programLevel: a.program.level,
    tuitionAmount: a.program.tuitionAmount ? Number(a.program.tuitionAmount) : null,
    tuitionCurrency: a.program.currency,
    intakeTerm: null,
    offerCount: a.offers.length,
    paymentCount: a.payments.length,
  }));
}

/**
 * Get applications grouped by country for tree display.
 */
export async function getApplicationTree(studentId: string) {
  const apps = await listStudentApplications(studentId);

  const byCountry = apps.reduce(
    (acc, app) => {
      const country = app.universityCountry;
      if (!acc[country]) acc[country] = [];
      acc[country].push(app);
      return acc;
    },
    {} as Record<string, ApplicationWithDetails[]>,
  );

  return Object.entries(byCountry)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([country, apps]) => ({
      country,
      applications: apps,
      counts: {
        total: apps.length,
        submitted: apps.filter((a) => a.status === "SUBMITTED").length,
        offers: apps.filter((a) => a.status === "OFFER").length,
        accepted: apps.filter((a) => a.status === "OFFER_ACCEPTED").length,
        rejected: apps.filter((a) => a.status === "REJECTED").length,
      },
    }));
}

/**
 * Create a new application for a student.
 */
export async function createApplication(input: {
  studentId: string;
  universityId: string;
  programId: string;
  intakeId?: string;
  actorId: string;
}) {
  // Check if application already exists for this university/program
  const existing = await prisma.application.findFirst({
    where: {
      studentId: input.studentId,
      universityId: input.universityId,
      programId: input.programId,
    },
  });

  if (existing) {
    throw new Error("An application for this university/program already exists");
  }

  const app = await prisma.application.create({
    data: {
      studentId: input.studentId,
      universityId: input.universityId,
      programId: input.programId,
      intakeId: input.intakeId,
      status: "DRAFT",
    },
    include: {
      university: { select: { name: true, country: true } },
      program: { select: { name: true, level: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: "application.created",
      entityType: "Application",
      entityId: app.id,
      after: {
        studentId: input.studentId,
        university: app.university.name,
        program: app.program.name,
      },
    },
  });

  return app;
}

/**
 * Update application status.
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  actorId: string,
  reason?: string,
) {
  const before = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { status: true },
  });

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: status as never,
      submittedAt: status === "SUBMITTED" ? new Date() : undefined,
      decidedAt:
        status === "OFFER" || status === "REJECTED"
          ? new Date()
          : undefined,
    },
    include: {
      university: { select: { name: true, country: true } },
      program: { select: { name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "application.status_changed",
      entityType: "Application",
      entityId: applicationId,
      before: { status: before?.status },
      after: { status, reason },
    },
  });

  return updated;
}

/**
 * Get universities and programs for the application form.
 */
export async function getUniversitiesForApplication(country?: string) {
  return prisma.university.findMany({
    where: {
      isActive: true,
      ...(country ? { country } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      country: true,
      city: true,
      programs: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          level: true,
          tuitionAmount: true,
          currency: true,
        },
      },
    },
    take: 100,
  });
}

/**
 * Get application detail with offers and payments.
 */
export async function getApplicationDetail(applicationId: string) {
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      student: { select: { id: true, name: true, email: true } },
      university: { select: { name: true, country: true, city: true, website: true } },
      program: {
        select: {
          name: true,
          level: true,
          durationMonths: true,
          tuitionAmount: true,
          currency: true,
        },
      },
      offers: {
        orderBy: { issuedAt: "desc" },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { verifiedBy: { select: { name: true } } },
      },
    },
  });
}

/**
 * Add an offer to an application.
 */
export async function addOffer(input: {
  applicationId: string;
  universityId: string;
  programId: string;
  amount?: number;
  currency?: string;
  conditions?: unknown;
  expiresAt?: Date;
  actorId: string;
}) {
  const offer = await prisma.offer.create({
    data: {
      applicationId: input.applicationId,
      universityId: input.universityId,
      programId: input.programId,
      amount: input.amount,
      currency: input.currency ?? "USD",
      conditions: input.conditions ?? undefined,
      expiresAt: input.expiresAt,
      status: "ISSUED",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: "offer.created",
      entityType: "Offer",
      entityId: offer.id,
      after: { applicationId: input.applicationId, amount: input.amount },
    },
  });

  return offer;
}

/**
 * Update offer status (accept/reject).
 */
export async function updateOfferStatus(
  offerId: string,
  status: string,
  actorId: string,
) {
  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: {
      status,
      respondedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "offer.status_changed",
      entityType: "Offer",
      entityId: offerId,
      after: { status },
    },
  });

  return updated;
}
