import "server-only";
import { prisma } from "@/lib/db/prisma";
import { underPaths } from "@/lib/db/paths";

export async function listTasks(opts: {
  assigneeId?: string;
  orgPaths: string[];
  status?: string;
  take?: number;
}) {
  return prisma.task.findMany({
    where: {
      AND: [
        underPaths(opts.orgPaths),
        ...(opts.assigneeId ? [{ assigneeId: opts.assigneeId }] : []),
        ...(opts.status && opts.status !== "all"
          ? [{ status: opts.status as never }]
          : [{ status: { in: ["OPEN", "IN_PROGRESS"] as never } }]),
      ],
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: opts.take ?? 50,
    include: {
      assignee: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
    },
  });
}

export async function createTask(input: {
  orgPath: string;
  assigneeId: string;
  title: string;
  description?: string;
  studentId?: string;
  dueAt?: Date;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}) {
  return prisma.task.create({
    data: {
      orgPath: input.orgPath,
      assigneeId: input.assigneeId,
      title: input.title,
      description: input.description || null,
      studentId: input.studentId || null,
      dueAt: input.dueAt || null,
      priority: input.priority ?? "MEDIUM",
    },
    include: {
      assignee: { select: { name: true } },
      student: { select: { name: true } },
    },
  });
}

export async function updateTaskStatus(
  taskId: string,
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED",
) {
  return prisma.task.update({
    where: { id: taskId },
    data: { status },
  });
}

export async function deleteTask(taskId: string) {
  return prisma.task.delete({ where: { id: taskId } });
}
