import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function listNotifications(userId: string, take = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body || null,
      link: input.link || null,
    },
  });
}

export async function notifyMany(
  userIds: string[],
  input: Omit<Parameters<typeof createNotification>[0], "userId">,
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body || null,
      link: input.link || null,
    })),
  });
}

export async function markRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function notifyOrgManagers(
  orgId: string,
  input: Omit<Parameters<typeof createNotification>[0], "userId">,
) {
  const managers = await prisma.user.findMany({
    where: {
      orgId,
      role: { in: ["AGENCY_MANAGER", "FIRM_MANAGER"] },
      isActive: true,
    },
    select: { id: true },
  });
  await notifyMany(
    managers.map((m) => m.id),
    input,
  );
}
