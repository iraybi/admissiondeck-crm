import { prisma } from "@/lib/db/prisma";
import {
  generateMfaSecret,
  verifyTotp,
  generateBackupCodes,
} from "./mfa";
import {
  encryptSecret,
  decryptSecret,
  hashBackupCode,
  verifyBackupCodeHash,
} from "./mfa-crypto";

export type MfaSetupResult = {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
};

/**
 * Generate MFA secret for a user. Returns QR code URL and backup codes.
 * Secret is NOT saved until `enableMfa` is called with a valid token.
 */
export async function setupMfa(userId: string): Promise<MfaSetupResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) throw new Error("User not found");

  return generateMfaSecret(user.email);
}

/**
 * Enable MFA after verifying the first TOTP token.
 */
export async function enableMfa(
  userId: string,
  secret: string,
  token: string,
  backupCodes: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!verifyTotp(token, secret)) {
    return { ok: false, error: "Invalid verification code" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      mfaSecret: encryptSecret(secret),
      mfaBackupCodes: backupCodes.map((c) => hashBackupCode(c)),
      mfaVerifiedAt: new Date(),
    },
  });

  return { ok: true };
}

/**
 * Disable MFA.
 */
export async function disableMfa(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: [],
      mfaVerifiedAt: null,
    },
  });
}

/**
 * Verify MFA during login. Supports TOTP and backup codes.
 */
export async function verifyMfa(
  userId: string,
  input: { token?: string; backupCode?: string },
): Promise<{ ok: boolean; error?: string; usedBackupCode?: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true, mfaSecret: true, mfaBackupCodes: true },
  });

  if (!user?.mfaEnabled) {
    return { ok: true }; // MFA not enabled, skip
  }

  // Try backup code
  if (input.backupCode) {
    const hashedCodes = user.mfaBackupCodes ?? [];
    const { valid, index } = verifyBackupCodeHash(input.backupCode, hashedCodes);
    if (!valid) {
      return { ok: false, error: "Invalid backup code" };
    }
    // Remove used backup code
    const remaining = [...hashedCodes];
    remaining.splice(index, 1);
    await prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: remaining },
    });
    return { ok: true, usedBackupCode: true };
  }

  // Try TOTP token
  if (input.token) {
    if (!user.mfaSecret) {
      return { ok: false, error: "MFA is misconfigured" };
    }
    const secret = decryptSecret(user.mfaSecret);
    if (!verifyTotp(input.token, secret)) {
      return { ok: false, error: "Invalid verification code" };
    }
    return { ok: true };
  }

  return { ok: false, error: "MFA code is required" };
}

/**
 * Check if a user has MFA enabled.
 */
export async function hasMfa(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true },
  });
  return user?.mfaEnabled ?? false;
}

/**
 * Regenerate backup codes. Requires MFA to be enabled.
 */
export async function regenerateBackupCodes(
  userId: string,
): Promise<{ ok: boolean; codes?: string[]; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true },
  });
  if (!user?.mfaEnabled) {
    return { ok: false, error: "MFA is not enabled" };
  }

  const codes = generateBackupCodes();

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaBackupCodes: codes.map((c) => hashBackupCode(c)),
    },
  });

  return { ok: true, codes };
}
