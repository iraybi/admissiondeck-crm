import "server-only";
import { prisma } from "@/lib/db/prisma";
import { underPaths } from "@/lib/db/paths";

export async function listStudents(opts: {
  orgPaths: string[];
  status?: string;
  country?: string;
  counsellorId?: string;
  agentId?: string;
  search?: string;
  take?: number;
  cursor?: string;
}) {
  const and: Record<string, unknown>[] = [underPaths(opts.orgPaths)];
  if (opts.status && opts.status !== "all") and.push({ status: opts.status });
  if (opts.country && opts.country !== "all") {
    and.push({ targetCountry: opts.country });
  }
  if (opts.counsellorId) and.push({ counsellorId: opts.counsellorId });
  if (opts.agentId) and.push({ agentId: opts.agentId });
  if (opts.search) {
    and.push({
      OR: [
        { name: { contains: opts.search, mode: "insensitive" } },
        { email: { contains: opts.search, mode: "insensitive" } },
        { targetUniversity: { contains: opts.search, mode: "insensitive" } },
        { targetProgram: { contains: opts.search, mode: "insensitive" } },
      ],
    });
  }

  return prisma.student.findMany({
    where: { AND: and },
    orderBy: [{ createdAt: "desc" }],
    take: opts.take ?? 50,
    ...(opts.cursor
      ? { skip: 1, cursor: { id: opts.cursor } }
      : {}),
    include: {
      counsellor: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
      org: { select: { id: true, name: true, orgPath: true } },
    },
  });
}

export async function getStudent(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: {
      counsellor: { select: { id: true, name: true, email: true } },
      agent: { select: { id: true, name: true, email: true } },
      org: {
        select: { id: true, name: true, orgPath: true, logoUrl: true },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { verifiedBy: { select: { name: true } } },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
        take: 20,
      },
      tasks: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { dueAt: "asc" },
        include: { assignee: { select: { name: true } } },
      },
    },
  });
}

export async function createStudent(input: {
  orgId: string;
  orgPath: string;
  name: string;
  email: string;
  phone?: string;
  targetCountry: string;
  targetUniversity?: string;
  targetProgram?: string;
  targetIntake?: string;
  counsellorId?: string;
  agentId?: string;
  passportNumber?: string;
  nationality?: string;
}) {
  return prisma.student.create({
    data: {
      ...input,
      phone: input.phone || null,
      targetUniversity: input.targetUniversity || null,
      targetProgram: input.targetProgram || null,
      targetIntake: input.targetIntake || null,
      counsellorId: input.counsellorId || null,
      agentId: input.agentId || null,
      passportNumber: input.passportNumber || null,
      nationality: input.nationality || null,
      status: "ACTIVE",
    },
  });
}

export async function updateStudentStatus(
  studentId: string,
  status: string,
  actorId: string,
  reason?: string,
) {
  const before = await prisma.student.findUnique({ where: { id: studentId } });
  if (!before) throw new Error("Student not found");

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: { status: status as never },
  });

  await prisma.stateTransition.create({
    data: {
      entityType: "STUDENT",
      entityId: studentId,
      fromState: before.status,
      toState: status,
      actorId,
      reason: reason || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      orgPath: before.orgPath,
      actorId,
      action: "student.status_changed",
      entityType: "Student",
      entityId: studentId,
      before: { status: before.status },
      after: { status: updated.status },
    },
  });

  return updated;
}

export async function assignCounsellor(
  studentId: string,
  counsellorId: string,
  actorId: string,
) {
  const before = await prisma.student.findUnique({ where: { id: studentId } });
  const updated = await prisma.student.update({
    where: { id: studentId },
    data: { counsellorId },
    include: { counsellor: { select: { name: true } } },
  });

  await prisma.auditLog.create({
    data: {
      orgPath: before?.orgPath ?? null,
      actorId,
      action: "student.assigned",
      entityType: "Student",
      entityId: studentId,
      before: { counsellorId: before?.counsellorId },
      after: { counsellorId },
    },
  });

  return updated;
}

export async function addNote(input: {
  studentId: string;
  authorId: string;
  body: string;
  isPinned?: boolean;
}) {
  return prisma.note.create({
    data: {
      studentId: input.studentId,
      authorId: input.authorId,
      body: input.body,
      isPinned: input.isPinned ?? false,
    },
    include: { author: { select: { name: true } } },
  });
}

export async function listPipelineTemplates() {
  return prisma.pipelineTemplate.findMany({
    where: { isActive: true },
    orderBy: { country: "asc" },
  });
}

export async function listUniversities(country?: string) {
  return prisma.university.findMany({
    where: {
      isActive: true,
      ...(country && country !== "all" ? { country } : {}),
    },
    orderBy: { name: "asc" },
    take: 100,
    include: {
      programs: {
        where: { isActive: true },
        select: { id: true, name: true, level: true, tuitionAmount: true, currency: true },
        take: 20,
      },
    },
  });
}
