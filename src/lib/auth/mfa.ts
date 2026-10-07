import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238) implementation using Node.js crypto.
 * No external dependency. Compatible with Google Authenticator, Authy, etc.
 */

const STEP = 30; // seconds
const DIGITS = 6;
const ALGORITHM = "sha1";
const WINDOW = 1; // allow 1 step of drift

export type MfaSecret = {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
};

/**
 * Generate a base32-encoded secret.
 */
export function generateMfaSecret(email: string, issuer = "AdmissionDeck"): MfaSecret {
  const bytes = randomBytes(20);
  const secret = base32Encode(bytes);
  const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP}`;
  const backupCodes = generateBackupCodes();

  return { secret, qrCodeUrl, backupCodes };
}

/**
 * Generate a TOTP token for the current time step.
 */
export function generateTotp(secret: string, time = Date.now()): string {
  const counter = Math.floor(time / 1000 / STEP);
  return generateTotpAtCounter(secret, counter);
}

/**
 * Verify a TOTP token. Accepts ±1 time step of drift.
 */
export function verifyTotp(token: string, secret: string, time = Date.now()): boolean {
  const cleanToken = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const counter = Math.floor(time / 1000 / STEP);

  // Check current, previous, and next time steps
  for (let i = -WINDOW; i <= WINDOW; i++) {
    const expected = generateTotpAtCounter(secret, counter + i);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(cleanToken))) {
      return true;
    }
  }
  return false;
}

function generateTotpAtCounter(secret: string, counter: number): string {
  const secretBytes = base32Decode(secret);

  // Pack counter into 8-byte big-endian buffer
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  // HMAC-SHA1
  const hmac = createHmac(ALGORITHM, secretBytes).update(buf).digest();

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/**
 * Generate backup codes for account recovery.
 */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString("hex");
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Verify a backup code against a list.
 */
export function verifyBackupCode(
  code: string,
  backupCodes: string[],
): { valid: boolean; remaining: string[] } {
  const normalized = code.replace(/\s/g, "").toLowerCase();
  const index = backupCodes.findIndex(
    (c) => c.replace(/-/g, "").toLowerCase() === normalized.replace(/-/g, ""),
  );

  if (index === -1) {
    return { valid: false, remaining: backupCodes };
  }

  const remaining = [...backupCodes];
  remaining.splice(index, 1);
  return { valid: true, remaining };
}

/**
 * Constant-time comparison.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/* Base32 encoding (RFC 4648) */
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of clean) {
    const index = BASE32_CHARS.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}
