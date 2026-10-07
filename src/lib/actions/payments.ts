"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createPaymentObligation,
  submitProof,
  startReview,
  verifyPayment,
  rejectPayment,
  refundPayment,
} from "@/lib/payments/state-machine";
import {
  createCommissionEntry,
  markCommissionPaid,
} from "@/lib/payments/commission";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function createPaymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (!user.orgPath) return { ok: false, error: "No organization" };

  const studentId = formData.get("studentId")?.toString();
  const title = formData.get("title")?.toString().trim();
  const amount = Number(formData.get("amount"));
  const method = formData.get("method")?.toString();
  const milestone = formData.get("milestone")?.toString();
  const dueRaw = formData.get("dueAt")?.toString();

  if (!studentId || !title || !amount || amount <= 0) {
    return { ok: false, error: "Student, title and a positive amount are required" };
  }

  const dueAt = dueRaw ? new Date(dueRaw) : undefined;

  await createPaymentObligation({
    studentId,
    orgPath: user.orgPath,
    title,
    amount,
    method: method || "OTHER",
    milestone,
    dueAt: dueAt && !isNaN(dueAt.getTime()) ? dueAt : undefined,
  });

  revalidatePath("/payments");
  return { ok: true, message: "Payment obligation created." };
}

export async function submitProofAction(
  paymentId: string,
  proofDocumentId: string,
) {
  const user = await getCurrentUser();
  if (!user) return;
  await submitProof(paymentId, proofDocumentId, user.id);
  revalidatePath("/payments");
  revalidatePath(`/payments/${paymentId}`);
}

export async function startReviewAction(paymentId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await startReview(paymentId, user.id);
  revalidatePath("/payments");
  revalidatePath(`/payments/${paymentId}`);
}

export async function verifyPaymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const paymentId = formData.get("paymentId")?.toString();
  const note = formData.get("note")?.toString().trim();

  if (!paymentId) return { ok: false, error: "Payment ID is required" };

  try {
    await verifyPayment(paymentId, user.id, note || undefined);
    revalidatePath("/payments");
    revalidatePath(`/payments/${paymentId}`);
    return { ok: true, message: "Payment verified." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function rejectPaymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const paymentId = formData.get("paymentId")?.toString();
  const reason = formData.get("reason")?.toString().trim();

  if (!paymentId) return { ok: false, error: "Payment ID is required" };
  if (!reason) {
    return { ok: false, error: "Rejection reason is mandatory" };
  }

  try {
    await rejectPayment(paymentId, user.id, reason);
    revalidatePath("/payments");
    revalidatePath(`/payments/${paymentId}`);
    return { ok: true, message: "Payment rejected. Student notified." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function refundPaymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const paymentId = formData.get("paymentId")?.toString();
  const reason = formData.get("reason")?.toString().trim();

  if (!paymentId) return { ok: false, error: "Payment ID is required" };
  if (!reason) return { ok: false, error: "Reason is required" };

  try {
    await refundPayment(paymentId, user.id, reason);
    revalidatePath("/payments");
    return { ok: true, message: "Payment refunded." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function createCommissionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const studentId = formData.get("studentId")?.toString();
  const baseAmount = Number(formData.get("baseAmount"));

  if (!studentId || !baseAmount || baseAmount <= 0) {
    return { ok: false, error: "Student and a positive base amount are required" };
  }

  try {
    const result = await createCommissionEntry({
      studentId,
      baseAmount,
      actorId: user.id,
    });
    revalidatePath("/commissions");
    return {
      ok: true,
      message: `Commission entry created: ${result.totalCommission.toFixed(2)} total`,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function markCommissionPaidAction(
  paymentId: string,
  note?: string,
) {
  const user = await getCurrentUser();
  if (!user) return;
  await markCommissionPaid(paymentId, user.id, note);
  revalidatePath("/commissions");
}
