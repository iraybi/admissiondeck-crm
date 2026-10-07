import { createCipheriv, createDecipheriv, randomBytes, createHmac } from "node:crypto";

/**
 * Encrypt/decrypt MFA secrets using AES-256-GCM.
 * The secret must be recoverable for TOTP verification.
 */

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "dev-secret-for-mfa-encryption";
  // Derive a 32-byte key from the secret
  return createHmac("sha256", "mfa-encryption").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptSecret(ciphertext: string): string {
  const key = getKey();
  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Hash backup codes for storage (one-way, safe to hash).
 */
export function hashBackupCode(code: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret")
    .update(code.replace(/-/g, "").toLowerCase())
    .digest("hex");
}

/**
 * Verify a backup code against hashed codes.
 */
export function verifyBackupCodeHash(
  code: string,
  hashedCodes: string[],
): { valid: boolean; index: number } {
  const hash = hashBackupCode(code);
  const index = hashedCodes.findIndex((h) => h === hash);
  return { valid: index !== -1, index };
}
