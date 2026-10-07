import "server-only";
import { prisma } from "@/lib/db/prisma";

export type PaymentState =
  | "PENDING"
  | "AWAITING_PROOF"
  | "IN_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "REFUNDED";

export type StateTransition = {
  from: PaymentState;
  to: PaymentState;
  actor: string;
  reason?: string;
  at: Date;
};

/**
 * Allowed state transitions for the payment verification machine.
 *
 * PENDING ──submit proof──▶ AWAITING_PROOF ──start review──▶ IN_REVIEW
 *                                                              │
 *                                         ┌────────────────────┴───────────────────┐
 *                                         ▼                                        ▼
 *                                      VERIFIED                                  REJECTED
 *                                         │                                        │
 *                                         │                              mandatory reason
 *                                         ▼                                        ▼
 *                                    (milestone)                              back to PENDING
 *
 * REFUNDED is reachable from VERIFIED only (correction path).
 */
const ALLOWED_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  PENDING: ["AWAITING_PROOF"],
  AWAITING_PROOF: ["IN_REVIEW", "PENDING"],
  IN_REVIEW: ["VERIFIED", "REJECTED", "AWAITING_PROOF"],
  VERIFIED: ["REFUNDED"],
  REJECTED: ["PENDING"],
  REFUNDED: [],
};

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStates(from: PaymentState): PaymentState[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

/**
 * Create a payment obligation for a student milestone.
 */
export async function createPaymentObligation(input: {
  studentId: string;
  orgPath: string;
  title: string;
  amount: number;
  currency?: string;
  method?: string;
  milestone?: string;
  dueAt?: Date;
  applicationId?: string;
}) {
  return prisma.payment.create({
    data: {
      studentId: input.studentId,
      orgPath: input.orgPath,
      title: input.title,
      amount: input.amount,
      currency: input.currency ?? "BDT",
      method: (input.method ?? "OTHER") as never,
      state: "PENDING" as never,
      milestone: input.milestone || null,
      dueAt: input.dueAt || null,
      applicationId: input.applicationId || null,
    },
    include: {
      student: { select: { name: true, email: true } },
    },
  });
}

/**
 * Submit proof of payment (student action).
 * Transitions PENDING -> AWAITING_PROOF.
 */
export async function submitProof(
  paymentId: string,
  proofDocumentId: string,
  actorId: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });
  if (!payment) throw new Error("Payment not found");

  if (!canTransition(payment.state as PaymentState, "AWAITING_PROOF")) {
    throw new Error(
      `Cannot submit proof for payment in state ${payment.state}`,
    );
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      state: "AWAITING_PROOF" as never,
      proofDocumentId,
    },
    include: {
      student: { select: { name: true, email: true, orgPath: true } },
    },
  });

  await recordTransition({
    entityType: "PAYMENT",
    entityId: paymentId,
    from: payment.state,
    to: "AWAITING_PROOF",
    actorId,
  });

  return updated;
}

/**
 * Start staff review.
 * Transitions AWAITING_PROOF -> IN_REVIEW.
 */
export async function startReview(paymentId: string, actorId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });
  if (!payment) throw new Error("Payment not found");

  if (!canTransition(payment.state as PaymentState, "IN_REVIEW")) {
    throw new Error(`Cannot start review for payment in state ${payment.state}`);
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { state: "IN_REVIEW" as never },
    include: {
      student: { select: { name: true, email: true, orgPath: true } },
    },
  });

  await recordTransition({
    entityType: "PAYMENT",
    entityId: paymentId,
    from: payment.state,
    to: "IN_REVIEW",
    actorId,
  });

  return updated;
}

/**
 * Verify a payment.
 * Transitions IN_REVIEW -> VERIFIED. Records verifier and timestamp.
 */
export async function verifyPayment(
  paymentId: string,
  actorId: string,
  note?: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });
  if (!payment) throw new Error("Payment not found");

  if (!canTransition(payment.state as PaymentState, "VERIFIED")) {
    throw new Error(`Cannot verify payment in state ${payment.state}`);
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      state: "VERIFIED" as never,
      verifiedById: actorId,
      verifiedAt: new Date(),
      rejectReason: note || null,
    },
    include: {
      student: {
        select: {
          name: true,
          email: true,
          orgPath: true,
          targetCountry: true,
          targetUniversity: true,
        },
      },
      proofDocument: { select: { fileName: true } },
    },
  });

  await recordTransition({
    entityType: "PAYMENT",
    entityId: paymentId,
    from: payment.state,
    to: "VERIFIED",
    actorId,
    reason: note,
  });

  await prisma.auditLog.create({
    data: {
      orgPath: payment.orgPath,
      actorId,
      action: "payment.verified",
      entityType: "Payment",
      entityId: paymentId,
      before: { state: payment.state },
      after: { state: "VERIFIED", verifiedBy: actorId, note },
    },
  });

  return updated;
}

/**
 * Reject a payment proof.
 * Transitions IN_REVIEW -> REJECTED. Requires a mandatory reason.
 */
export async function rejectPayment(
  paymentId: string,
  actorId: string,
  reason: string,
) {
  if (!reason.trim()) {
    throw new Error("Rejection reason is mandatory");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });
  if (!payment) throw new Error("Payment not found");

  if (!canTransition(payment.state as PaymentState, "REJECTED")) {
    throw new Error(`Cannot reject payment in state ${payment.state}`);
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      state: "REJECTED" as never,
      rejectReason: reason.trim(),
    },
    include: {
      student: { select: { name: true, email: true, orgPath: true } },
    },
  });

  await recordTransition({
    entityType: "PAYMENT",
    entityId: paymentId,
    from: payment.state,
    to: "REJECTED",
    actorId,
    reason: reason.trim(),
  });

  await prisma.auditLog.create({
    data: {
      orgPath: payment.orgPath,
      actorId,
      action: "payment.rejected",
      entityType: "Payment",
      entityId: paymentId,
      before: { state: payment.state },
      after: { state: "REJECTED", reason: reason.trim() },
    },
  });

  return updated;
}

/**
 * Refund a verified payment.
 * Transitions VERIFIED -> REFUNDED.
 */
export async function refundPayment(
  paymentId: string,
  actorId: string,
  reason: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });
  if (!payment) throw new Error("Payment not found");

  if (!canTransition(payment.state as PaymentState, "REFUNDED")) {
    throw new Error(`Cannot refund payment in state ${payment.state}`);
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      state: "REFUNDED" as never,
      rejectReason: reason.trim(),
    },
    include: {
      student: { select: { name: true, email: true, orgPath: true } },
    },
  });

  await recordTransition({
    entityType: "PAYMENT",
    entityId: paymentId,
    from: payment.state,
    to: "REFUNDED",
    actorId,
    reason: reason.trim(),
  });

  return updated;
}

/**
 * List payments for review (staff dashboard).
 */
export async function listPaymentsForReview(opts: {
  orgPaths: string[];
  state?: string;
  take?: number;
}) {
  return prisma.payment.findMany({
    where: {
      AND: [
        {
          OR: opts.orgPaths.flatMap((p) => [
            { orgPath: { startsWith: p + "." } },
            { orgPath: p },
          ]),
        },
        ...(opts.state && opts.state !== "all"
          ? [{ state: opts.state as never }]
          : [{ state: { in: ["PENDING", "AWAITING_PROOF", "IN_REVIEW"] as never } }]),
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    take: opts.take ?? 50,
    include: {
      student: {
        select: { id: true, name: true, targetCountry: true, targetUniversity: true },
      },
      proofDocument: { select: { fileName: true, status: true } },
      verifiedBy: { select: { name: true } },
    },
  });
}

/**
 * Get payment with full transition history.
 */
export async function getPaymentDetail(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          orgPath: true,
          targetCountry: true,
          targetUniversity: true,
        },
      },
      proofDocument: {
        select: { id: true, fileName: true, status: true, scanStatus: true },
      },
      verifiedBy: { select: { id: true, name: true } },
    },
  });

  if (!payment) return null;

  // Get transition history from AuditLog
  const transitions = await prisma.auditLog.findMany({
    where: {
      entityType: "PAYMENT",
      entityId: paymentId,
    },
    orderBy: { createdAt: "asc" },
    include: { actor: { select: { name: true } } },
  });

  return { payment, transitions };
}

/**
 * Record a state transition in the audit ledger.
 */
async function recordTransition(input: {
  entityType: string;
  entityId: string;
  from: string;
  to: string;
  actorId: string;
  reason?: string;
}) {
  await prisma.stateTransition.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      fromState: input.from,
      toState: input.to,
      actorId: input.actorId,
      reason: input.reason || null,
    },
  });
}
