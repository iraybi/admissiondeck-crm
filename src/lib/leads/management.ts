import "server-only";
import { prisma } from "@/lib/db/prisma";
import { underPaths } from "@/lib/db/paths";

export type LeadWithDetails = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  targetCountry: string | null;
  targetProgram: string | null;
  status: string;
  createdAt: Date;
  counsellorId: string | null;
  agentId: string | null;
  orgName: string | null;
  convertedStudentId: string | null;
};

/**
 * List leads with full details.
 */
export async function listLeads(opts: {
  orgPaths: string[];
  status?: string;
  counsellorId?: string;
  search?: string;
  take?: number;
}): Promise<LeadWithDetails[]> {
  const and: Record<string, unknown>[] = [underPaths(opts.orgPaths)];
  if (opts.status && opts.status !== "all") and.push({ status: opts.status });
  if (opts.counsellorId) and.push({ counsellorId: opts.counsellorId });
  if (opts.search) {
    and.push({
      OR: [
        { name: { contains: opts.search, mode: "insensitive" as const } },
        { email: { contains: opts.search, mode: "insensitive" as const } },
      ],
    });
  }

  const leads = await prisma.lead.findMany({
    where: { AND: and },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 100,
    include: {
      org: { select: { name: true } },
    },
  });

  // Get counsellor/agent names separately
  const userIds = [...new Set(leads.flatMap((l) => [l.counsellorId, l.agentId].filter(Boolean)))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds as string[] } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return leads.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    source: l.source,
    targetCountry: l.targetCountry,
    targetProgram: l.targetProgram,
    status: l.status,
    createdAt: l.createdAt,
    counsellorId: l.counsellorId,
    agentId: l.agentId,
    orgName: l.org?.name ?? null,
    convertedStudentId: l.convertedStudentId,
  }));
}

/**
 * Get lead detail.
 */
export async function getLeadDetail(leadId: string) {
  return prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      org: { select: { id: true, name: true, orgPath: true } },
    },
  });
}

/**
 * Create a new lead.
 */
export async function createLead(input: {
  name: string;
  email: string;
  phone?: string;
  source?: string;
  targetCountry?: string;
  targetProgram?: string;
  orgId: string;
  orgPath: string;
  counsellorId?: string;
  agentId?: string;
}) {
  return prisma.lead.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone || null,
      source: input.source || null,
      targetCountry: input.targetCountry || null,
      targetProgram: input.targetProgram || null,
      orgId: input.orgId,
      orgPath: input.orgPath,
      counsellorId: input.counsellorId || null,
      agentId: input.agentId || null,
      status: "NEW",
    },
  });
}

/**
 * Update lead status.
 */
export async function updateLeadStatus(
  leadId: string,
  status: string,
  actorId: string,
) {
  const before = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!before) throw new Error("Lead not found");

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { status: status as never },
  });

  await prisma.auditLog.create({
    data: {
      orgPath: before.orgPath,
      actorId,
      action: "lead.status_changed",
      entityType: "Lead",
      entityId: leadId,
      before: { status: before.status },
      after: { status },
    },
  });

  return updated;
}

/**
 * Invite a lead to join the platform.
 */
export async function inviteLead(leadId: string, actorId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { org: { select: { name: true } } },
  });
  if (!lead) throw new Error("Lead not found");

  const existingUser = await prisma.user.findUnique({
    where: { email: lead.email.toLowerCase() },
  });

  if (existingUser) {
    return {
      ok: true,
      message: "Lead already has an account. You can convert to student now.",
      userExists: true,
    };
  }

  const { generateToken, hashToken } = await import("@/lib/auth/password");
  const token = generateToken();
  const inviteTokenHash = await hashToken(token);

  const user = await prisma.user.create({
    data: {
      email: lead.email.toLowerCase(),
      name: lead.name,
      role: "STUDENT",
      orgId: lead.orgId,
      inviteTokenHash,
      inviteTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: false,
    },
  });

  const { sendEmail, inviteEmail } = await import("@/lib/email/mailer");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
  await sendEmail(
    inviteEmail({
      to: lead.email,
      name: lead.name,
      orgName: lead.org?.name ?? "AdmissionDeck",
      token,
      acceptUrl: `${appUrl}/accept-invite?token=${encodeURIComponent(token)}&lead=${leadId}`,
    }),
  );

  await prisma.auditLog.create({
    data: {
      orgPath: lead.orgPath,
      actorId,
      action: "lead.invited",
      entityType: "Lead",
      entityId: leadId,
      after: { email: lead.email, userId: user.id },
    },
  });

  return {
    ok: true,
    message: `Invitation sent to ${lead.email}. When they register, you can convert to student.`,
    userExists: false,
    token,
  };
}

/**
 * Convert a lead to a student.
 */
export async function convertLeadToStudent(
  leadId: string,
  actorId: string,
  opts?: {
    counsellorId?: string;
    targetCountry?: string;
    targetProgram?: string;
  },
) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      org: { select: { id: true, name: true, orgPath: true } },
    },
  });

  if (!lead) throw new Error("Lead not found");
  if (lead.convertedStudentId) {
    throw new Error("Lead is already converted");
  }

  const user = await prisma.user.findUnique({
    where: { email: lead.email.toLowerCase() },
  });

  if (!user) {
    throw new Error("Lead has not registered yet. Send an invitation first.");
  }

  if (!user.isActive) {
    throw new Error("Lead has not accepted the invitation yet.");
  }

  const suffix = `stu${Date.now().toString(36)}`;
  const student = await prisma.student.create({
    data: {
      orgId: lead.orgId,
      orgPath: `${lead.org.orgPath}.${suffix}`,
      userId: user.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      targetCountry: opts?.targetCountry ?? lead.targetCountry ?? "Cyprus",
      targetProgram: opts?.targetProgram ?? lead.targetProgram,
      status: "ACTIVE",
      counsellorId: opts?.counsellorId ?? lead.counsellorId,
      agentId: lead.agentId,
    },
    include: {
      org: { select: { name: true, orgPath: true } },
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "CONVERTED",
      convertedStudentId: student.id,
      studentId: student.id,
    },
  });

  if (user.role !== "STUDENT") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "STUDENT" },
    });
  }

  await prisma.auditLog.create({
    data: {
      orgPath: lead.orgPath,
      actorId,
      action: "lead.converted",
      entityType: "Lead",
      entityId: leadId,
      after: {
        studentId: student.id,
        studentName: student.name,
      },
    },
  });

  return student;
}

/**
 * Get lead statistics.
 */
export async function getLeadStats(orgPaths: string[]) {
  const where = underPaths(orgPaths);

  const [total, byStatus] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ["status"],
      where,
      _count: true,
    }),
  ]);

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
  };
}
