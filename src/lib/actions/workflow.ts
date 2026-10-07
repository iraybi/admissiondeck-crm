"use server";

import { prisma } from "@/lib/db/prisma";




import { revalidatePath } from "next/cache";
import { getCurrentUser, canManageUsers } from "@/lib/auth/session";
import { resolveScope } from "@/lib/db/scope";
import {
  createTask,
  updateTaskStatus,
  deleteTask,
} from "@/lib/tasks/queries";
import {
  createNotification,
  markRead,
  markAllRead,
} from "@/lib/notifications/queries";
import {
  createStudent as createStudentRecord,
  updateStudentStatus,
  assignCounsellor,
  addNote,
} from "@/lib/students/queries";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function createTaskAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (!user.orgPath) return { ok: false, error: "No organization" };

  const title = formData.get("title")?.toString().trim();
  if (!title) return { ok: false, error: "Title is required" };

  const dueRaw = formData.get("dueAt")?.toString();
  const dueAt = dueRaw ? new Date(dueRaw) : undefined;

  await createTask({
    orgPath: user.orgPath,
    assigneeId: formData.get("assigneeId")?.toString() || user.id,
    title,
    description: formData.get("description")?.toString() || undefined,
    studentId: formData.get("studentId")?.toString() || undefined,
    dueAt: dueAt && !isNaN(dueAt.getTime()) ? dueAt : undefined,
    priority: (formData.get("priority")?.toString() as never) || "MEDIUM",
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true, message: "Task created." };
}

export async function toggleTaskAction(taskId: string, done: boolean) {
  const user = await getCurrentUser();
  if (!user) return;
  await updateTaskStatus(taskId, done ? "DONE" : "OPEN");
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTaskAction(taskId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await deleteTask(taskId);
  revalidatePath("/tasks");
}

export async function createStudentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (!user.orgId || !user.orgPath) {
    return { ok: false, error: "No organization" };
  }

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const targetCountry = formData.get("targetCountry")?.toString().trim();

  if (!name || !email || !targetCountry) {
    return { ok: false, error: "Name, email and target country are required" };
  }

  // Student orgPath is agency path + student id suffix for RLS
  const tempSuffix = `s${Date.now().toString(36)}`;
  const orgPath = `${user.orgPath}.${tempSuffix}`;

  await createStudentRecord({
    orgId: user.orgId,
    orgPath,
    name,
    email,
    phone: formData.get("phone")?.toString() || undefined,
    targetCountry,
    targetUniversity: formData.get("targetUniversity")?.toString() || undefined,
    targetProgram: formData.get("targetProgram")?.toString() || undefined,
    targetIntake: formData.get("targetIntake")?.toString() || undefined,
    counsellorId: formData.get("counsellorId")?.toString() || undefined,
    agentId: formData.get("agentId")?.toString() || undefined,
  });

  revalidatePath("/students");
  return { ok: true, message: "Student created." };
}

export async function changeStudentStatusAction(
  studentId: string,
  status: string,
) {
  const user = await getCurrentUser();
  if (!user) return;
  await updateStudentStatus(studentId, status, user.id);
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
}

export async function assignCounsellorAction(
  studentId: string,
  counsellorId: string,
) {
  const user = await getCurrentUser();
  if (!user) return;
  await assignCounsellor(studentId, counsellorId, user.id);
  revalidatePath(`/students/${studentId}`);
}

export async function addNoteAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const studentId = formData.get("studentId")?.toString();
  const body = formData.get("body")?.toString().trim();
  if (!studentId || !body) {
    return { ok: false, error: "Note text is required" };
  }

  await addNote({ studentId, authorId: user.id, body });

  const student = await getCurrentStudentName(studentId);
  await createNotification({
    userId: user.id,
    type: "note",
    title: "Note added",
    body: `You added a note on ${student ?? "a student"}.`,
    link: `/students/${studentId}`,
  });

  revalidatePath(`/students/${studentId}`);
  return { ok: true, message: "Note added." };
}

export async function markNotificationRead(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await markRead(notificationId, user.id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await markAllRead(user.id);
  revalidatePath("/notifications");
}

async function getCurrentStudentName(id: string): Promise<string | null> {
  const { prisma } = await import("@/lib/db/prisma");
  const s = await prisma.student.findUnique({
    where: { id },
    select: { name: true },
  });
  return s?.name ?? null;
}

export async function deactivateUserAction(userId: string) {
  const actor = await getCurrentUser();
  if (!actor || !canManageUsers(actor)) return;
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "user.deactivated",
      entityType: "User",
      entityId: userId,
    },
  });
}
