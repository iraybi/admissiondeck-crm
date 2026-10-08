"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import {
  login as loginAccount,
  logout as logoutAccount,
  changePassword as changePasswordAccount,
  requestPasswordReset as requestPasswordResetAccount,
  resetPassword as resetPasswordAccount,
  updateProfile as updateProfileAccount,
  updateOrgSettings as updateOrgSettingsAccount,
  createInvite as createInviteAccount,
  revokeSession as revokeSessionAccount,
  revokeAllSessions as revokeAllSessionsAccount,
} from "@/lib/auth/account";
import {
  setSessionToken,
  clearSessionToken,
  getSessionToken,
} from "@/lib/auth/cookies";
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
  orgSettingsSchema,
  inviteUserSchema,
} from "@/lib/auth/validation";
import { getCurrentUser, canManageUsers } from "@/lib/auth/session";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  // Check for organization identifier (required on admissiondeck.com, optional on custom domains)
  const identifier = formData.get("identifier")?.toString().trim();
  let requestedOrg: { id: string } | null = null;

  // If identifier provided, validate it exists
  if (identifier) {
    const { findOrgByIdentifier, isValidIdentifier } = await import(
      "./organization"
    );

    if (!isValidIdentifier(identifier)) {
      return {
        ok: false,
        error:
          "Invalid identifier format. Use lowercase letters, numbers, hyphens, and dots.",
      };
    }

    requestedOrg = await findOrgByIdentifier(identifier);
    if (!requestedOrg) {
      return {
        ok: false,
        error: "Organization not found. Check your identifier.",
      };
    }
  }

  const result = await loginAccount(parsed.data, {
    ip: formData.get("ip")?.toString(),
    userAgent: formData.get("userAgent")?.toString(),
    orgId: requestedOrg?.id,
  });

  if (!result.ok) return { ok: false, error: result.error };

  // Check MFA
  const { verifyMfa } = await import("./mfa-service");
  const mfaResult = await verifyMfa(result.user.id, {
    token: formData.get("mfaToken")?.toString(),
    backupCode: formData.get("mfaBackupCode")?.toString(),
  });
  if (!mfaResult.ok) {
    return { ok: false, error: mfaResult.error ?? "MFA verification failed" };
  }

  const role = formData.get("role")?.toString();
  await setSessionToken(result.token);
  if (result.user.role === "PLATFORM_ADMIN" || role === "super") {
    redirect("/platform");
  }
  if (result.user.role === "STUDENT" || role === "student") {
    redirect("/student");
  }
  redirect("/dash");
}

export async function logoutAction() {
  const token = await getSessionToken();
  if (token) await logoutAccount(token);
  await clearSessionToken();
  redirect("/login");
}

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const token = await getSessionToken();
  if (!token) return { ok: false, error: "Not authenticated" };

  const result = await changePasswordAccount(
    user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
    token,
  );
  if (!result.ok) return result;

  return { ok: true, message: "Password changed. Other sessions were signed out." };
}

export async function forgotPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const result = await requestPasswordResetAccount(parsed.data.email);
  if (!result.ok) return result;

  // In development, surface the token so the flow can be tested end to end.
  if (result.token && process.env.NODE_ENV !== "production") {
    return {
      ok: true,
      message: `Reset link created. Token: ${result.token}`,
    };
  }
  return { ok: true, message: "If that email exists, a reset link was sent." };
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const result = await resetPasswordAccount(parsed.data.token, parsed.data.password);
  if (!result.ok) return result;
  return { ok: true, message: "Password reset. You can sign in now." };
}

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  await updateProfileAccount(user.id, parsed.data);
  return { ok: true, message: "Profile updated." };
}

export async function updateOrgAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user?.orgId) return { ok: false, error: "Not authenticated" };

  const parsed = orgSettingsSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website") ?? "",
    supportEmail: formData.get("supportEmail") ?? "",
    phone: formData.get("phone") ?? "",
    addressLine1: formData.get("addressLine1") ?? "",
    city: formData.get("city") ?? "",
    country: formData.get("country") ?? "",
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
    brandColor: formData.get("brandColor") ?? "",
    logoUrl: formData.get("logoUrl") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  await updateOrgSettingsAccount(
    user.orgId,
    {
      name: parsed.data.name,
      website: parsed.data.website || null,
      supportEmail: parsed.data.supportEmail || null,
      phone: parsed.data.phone || null,
      addressLine1: parsed.data.addressLine1 || null,
      city: parsed.data.city || null,
      country: parsed.data.country || null,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      brandColor: parsed.data.brandColor || null,
      logoUrl: parsed.data.logoUrl || null,
    },
    user.id,
  );

  return { ok: true, message: "Organization settings saved." };
}

export async function inviteUserAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (!canManageUsers(user)) {
    return { ok: false, error: "You do not have permission to invite users." };
  }

  const parsed = inviteUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    orgId: formData.get("orgId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const result = await createInviteAccount({
    ...parsed.data,
    invitedById: user.id,
  });
  if (!result.ok) return result;

  if (process.env.NODE_ENV !== "production" && result.token) {
    return {
      ok: true,
      message: `Invite created. Accept token: ${result.token}`,
    };
  }
  return { ok: true, message: "Invite sent." };
}

export async function revokeSessionAction(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await revokeSessionAccount(user.id, sessionId);
}

export async function revokeAllSessionsAction() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user) return;
  await revokeAllSessionsAccount(user.id, token ?? undefined);
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

export async function switchOrgAction(targetOrgId: string) {
  const token = await getSessionToken();
  if (!token) return { ok: false, error: "Not authenticated" };
  const { switchSessionOrg } = await import("./account");
  const res = await switchSessionOrg(token, targetOrgId);
  if (!res.ok) return res;
  redirect("/");
}
