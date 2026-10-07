import { prisma } from "@/lib/db/prisma";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
} from "./password";
import {
  sendEmail,
  inviteEmail,
  resetPasswordEmail,
  welcomeEmail,
} from "@/lib/email/mailer";
import type { LoginInput } from "./validation";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RESET_TTL_MS = 1000 * 60 * 30; // 30 minutes
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_FAILED_LOGINS = 8;
const LOCKOUT_MS = 1000 * 60 * 15; // 15 minutes

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string | null;
  orgName: string | null;
  orgPath: string | null;
  avatarUrl: string | null;
  isActive: boolean;
};

export async function login(input: LoginInput, meta: { ip?: string; userAgent?: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: { org: true },
  });

  if (!user || !user.passwordHash || !user.isActive) {
    return { ok: false as const, error: "Invalid email or password" };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      ok: false as const,
      error: "Account temporarily locked. Try again later.",
    };
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: { increment: 1 },
        lockedUntil:
          user.failedLogins + 1 >= MAX_FAILED_LOGINS
            ? new Date(Date.now() + LOCKOUT_MS)
            : null,
      },
    });
    return { ok: false as const, error: "Invalid email or password" };
  }

  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      ip: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      failedLogins: 0,
      lockedUntil: null,
    },
  });

  return {
    ok: true as const,
    token,
    user: toSessionUser(user),
  };
}

export async function logout(token: string) {
  const tokenHash = await hashToken(token);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const tokenHash = await hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: { include: { org: true } },
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt < new Date()) return null;
  if (!session.user.isActive) return null;

  return toSessionUser(session.user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentToken: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return { ok: false as const, error: "User not found" };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false as const, error: "Current password is incorrect" };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  // Revoke all other sessions
  const currentHash = await hashToken(currentToken);
  await prisma.session.updateMany({
    where: { userId, tokenHash: { not: currentHash }, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { ok: true as const };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  // Always return success to avoid account enumeration
  if (!user) return { ok: true as const, token: null };

  const token = generateToken();
  const resetTokenHash = await hashToken(token);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash,
      resetTokenExpires: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail(
    resetPasswordEmail({
      to: user.email,
      name: user.name,
      token,
      resetUrl,
    }),
  );

  return { ok: true as const, token };
}

export async function resetPassword(token: string, newPassword: string) {
  const resetTokenHash = await hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      resetTokenHash,
      resetTokenExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return { ok: false as const, error: "Reset link is invalid or expired" };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      resetTokenHash: null,
      resetTokenExpires: null,
    },
  });

  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { ok: true as const };
}

export async function createInvite(input: {
  name: string;
  email: string;
  role: "FIRM_MANAGER" | "AGENCY_MANAGER" | "COUNSELLOR" | "AGENT";
  orgId: string;
  invitedById: string;
}) {
  const org = await prisma.organization.findUnique({
    where: { id: input.orgId },
  });
  if (!org) return { ok: false as const, error: "Organization not found" };

  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) return { ok: false as const, error: "Email already in use" };

  const token = generateToken();
  const inviteTokenHash = await hashToken(token);

  await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      orgId: input.orgId,
      inviteTokenHash,
      inviteTokenExpires: new Date(Date.now() + INVITE_TTL_MS),
      invitedById: input.invitedById,
      isActive: true,
    },
  });

  await prisma.organization.update({
    where: { id: input.orgId },
    data: { seatsUsed: { increment: 1 } },
  });

  await prisma.auditLog.create({
    data: {
      orgPath: org.orgPath,
      actorId: input.invitedById,
      action: "user.invited",
      entityType: "User",
      entityId: input.email,
      after: { name: input.name, role: input.role, orgId: input.orgId },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
  const acceptUrl = `${appUrl}/accept-invite?token=${encodeURIComponent(token)}`;
  await sendEmail(
    inviteEmail({
      to: input.email,
      name: input.name,
      orgName: org.name,
      token,
      acceptUrl,
    }),
  );

  return { ok: true as const, token };
}

export async function acceptInvite(
  token: string,
  name: string,
  password: string,
) {
  const inviteTokenHash = await hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      inviteTokenHash,
      inviteTokenExpires: { gt: new Date() },
    },
    include: { org: true },
  });

  if (!user) {
    return { ok: false as const, error: "Invite link is invalid or expired" };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      passwordHash,
      passwordChangedAt: new Date(),
      inviteTokenHash: null,
      inviteTokenExpires: null,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
  await sendEmail(
    welcomeEmail({
      to: user.email,
      name,
      orgName: user.org?.name ?? "AdmissionDeck",
      loginUrl: `${appUrl}/login`,
    }),
  );

  return { ok: true as const };
}

export async function updateProfile(
  userId: string,
  data: { name: string; email: string; phone?: string; avatarUrl?: string },
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      avatarUrl: data.avatarUrl || null,
    },
    include: { org: true },
  });
  return toSessionUser(updated);
}

export async function updateOrgSettings(
  orgId: string,
  data: Record<string, unknown>,
  actorId: string,
) {
  const before = await prisma.organization.findUnique({ where: { id: orgId } });
  const updated = await prisma.organization.update({
    where: { id: orgId },
    data,
  });

  await prisma.auditLog.create({
    data: {
      orgPath: before?.orgPath ?? null,
      actorId,
      action: "organization.updated",
      entityType: "Organization",
      entityId: orgId,
      before: before as object,
      after: updated as object,
    },
  });

  return updated;
}

export async function listSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ip: true,
      createdAt: true,
      expiresAt: true,
    },
  });
}

export async function revokeSession(userId: string, sessionId: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, userId },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string, exceptToken?: string) {
  const exceptHash = exceptToken ? await hashToken(exceptToken) : null;
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptHash ? { tokenHash: { not: exceptHash } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

function toSessionUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  org?: { name: string; orgPath: string } | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId,
    orgName: user.org?.name ?? null,
    orgPath: user.org?.orgPath ?? null,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
  };
}
