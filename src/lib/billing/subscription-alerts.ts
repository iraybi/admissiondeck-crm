import "server-only";
import { prisma } from "@/lib/db/prisma";

export type SubscriptionAlert = {
  level: "critical" | "warning" | "info";
  title: string;
  message: string;
  daysRemaining: number | null;
  action?: string;
};

/**
 * Check subscription status and return alerts for the UI.
 * Shows warnings when subscription is expiring or cancelled.
 */
export async function getSubscriptionAlerts(orgId: string): Promise<SubscriptionAlert[]> {
  const alerts: SubscriptionAlert[] = [];

  const sub = await prisma.subscription.findUnique({
    where: { orgId },
    select: {
      status: true,
      plan: true,
      currentPeriodEnd: true,
      cancelAt: true,
      seatQuantity: true,
    },
  });

  if (!sub) {
    alerts.push({
      level: "info",
      title: "No active subscription",
      message:
        "Your organization does not have an active subscription. Contact us to set up billing.",
      daysRemaining: null,
      action: "Contact us",
    });
    return alerts;
  }

  const now = new Date();

  // Check if cancelled
  if (sub.status === "CANCELED") {
    const endDate = sub.currentPeriodEnd ?? sub.cancelAt;
    const daysRemaining = endDate
      ? Math.ceil((endDate.getTime() - now.getTime()) / 864e5)
      : null;

    alerts.push({
      level: "critical",
      title: "Subscription cancelled",
      message:
        daysRemaining !== null && daysRemaining > 0
          ? `Your subscription ends in ${daysRemaining} days. Renew to continue using the platform.`
          : "Your subscription has ended. Contact us to reactivate.",
      daysRemaining,
      action: "Contact us",
    });
    return alerts;
  }

  // Check if past due
  if (sub.status === "PAST_DUE") {
    alerts.push({
      level: "critical",
      title: "Payment overdue",
      message:
        "Your subscription payment is overdue. Please contact us to resolve this.",
      daysRemaining: null,
      action: "Contact us",
    });
    return alerts;
  }

  // Check if trial
  if (sub.status === "TRIALING") {
    const endDate = sub.currentPeriodEnd;
    const daysRemaining = endDate
      ? Math.ceil((endDate.getTime() - now.getTime()) / 864e5)
      : null;

    if (daysRemaining !== null && daysRemaining <= 7) {
      alerts.push({
        level: daysRemaining <= 3 ? "critical" : "warning",
        title: `Trial ends in ${daysRemaining} days`,
        message: `Your trial ends ${endDate ? new Date(endDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "soon"}. Contact us to upgrade to a paid plan.`,
        daysRemaining,
        action: "Contact us",
      });
    } else if (daysRemaining !== null && daysRemaining <= 14) {
      alerts.push({
        level: "info",
        title: `Trial ends in ${daysRemaining} days`,
        message: "Your trial is ending soon. Contact us to continue without interruption.",
        daysRemaining,
        action: "Contact us",
      });
    }
    return alerts;
  }

  // Check upcoming renewal
  if (sub.status === "ACTIVE" && sub.currentPeriodEnd) {
    const daysRemaining = Math.ceil(
      (sub.currentPeriodEnd.getTime() - now.getTime()) / 864e5,
    );

    if (daysRemaining <= 0) {
      alerts.push({
        level: "critical",
        title: "Subscription expired",
        message:
          "Your subscription has expired. Contact us to renew and restore full access.",
        daysRemaining: 0,
        action: "Contact us",
      });
    } else if (daysRemaining <= 3) {
      alerts.push({
        level: "critical",
        title: `Renewal in ${daysRemaining} days`,
        message: `Your subscription renews on ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. Contact us if you need to make changes.`,
        daysRemaining,
        action: "Contact us",
      });
    } else if (daysRemaining <= 7) {
      alerts.push({
        level: "warning",
        title: `Renewal in ${daysRemaining} days`,
        message: `Your subscription renews on ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.`,
        daysRemaining,
        action: "Contact us",
      });
    } else if (daysRemaining <= 14) {
      alerts.push({
        level: "info",
        title: `Renewal in ${daysRemaining} days`,
        message: `Your subscription renews on ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.`,
        daysRemaining,
        action: "Contact us",
      });
    }
  }

  // Check seat usage
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { seatsUsed: true, seatsBilled: true },
  });

  if (org && org.seatsUsed >= org.seatsBilled) {
    alerts.push({
      level: "warning",
      title: "Seat limit reached",
      message: `You are using all ${org.seatsBilled} provisioned seats. Contact us to add more seats.`,
      daysRemaining: null,
      action: "Contact us",
    });
  } else if (org && org.seatsUsed >= org.seatsBilled - 2) {
    alerts.push({
      level: "info",
      title: "Running low on seats",
      message: `${org.seatsBilled - org.seatsUsed} seats remaining. Contact us if you need to add more.`,
      daysRemaining: null,
      action: "Contact us",
    });
  }

  return alerts;
}

/**
 * Get subscription status summary for display.
 */
export async function getSubscriptionSummary(orgId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { orgId },
    select: {
      status: true,
      plan: true,
      seatQuantity: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAt: true,
      notes: true,
    },
  });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { seatsUsed: true, seatsBilled: true },
  });

  if (!sub) {
    return {
      status: "NONE",
      plan: "Not set",
      seatQuantity: 0,
      seatsUsed: org?.seatsUsed ?? 0,
      seatsBilled: org?.seatsBilled ?? 0,
      currentPeriodEnd: null,
      daysRemaining: null,
      isExpiringSoon: false,
    };
  }

  const daysRemaining = sub.currentPeriodEnd
    ? Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / 864e5)
    : null;

  return {
    status: sub.status,
    plan: sub.plan,
    seatQuantity: sub.seatQuantity,
    seatsUsed: org?.seatsUsed ?? 0,
    seatsBilled: org?.seatsBilled ?? 0,
    currentPeriodEnd: sub.currentPeriodEnd,
    daysRemaining,
    isExpiringSoon: daysRemaining !== null && daysRemaining <= 14,
  };
}
