import "server-only";
import { cache } from "react";
import { getSessionToken } from "./cookies";
import { getSessionUser, type SessionUser } from "./account";

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  return getSessionUser(token);
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function isPlatformAdmin(user: SessionUser): boolean {
  return user.role === "PLATFORM_ADMIN";
}

export function canManageOrg(user: SessionUser): boolean {
  return (
    user.role === "PLATFORM_ADMIN" ||
    user.role === "FIRM_MANAGER" ||
    user.role === "AGENCY_MANAGER"
  );
}

export function canManageUsers(user: SessionUser): boolean {
  return canManageOrg(user);
}
