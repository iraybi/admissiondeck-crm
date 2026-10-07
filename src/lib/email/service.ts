import "server-only";
import {
  getPlatformEmailConfig,
  getOrgEmailConfig,
  sendEmailWithConfig,
  platformWelcomeEmail,
  orgBrandedEmail,
  type EmailConfig,
} from "./config";

/**
 * High-level email sending functions.
 * These use the appropriate config (platform or org-branded).
 */

export async function sendPlatformEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
) {
  const config = getPlatformEmailConfig();
  return sendEmailWithConfig(config, { to, subject, html, text });
}

export async function sendOrgEmail(
  orgId: string,
  to: string,
  subject: string,
  html: string,
  text?: string,
) {
  const config = await getOrgEmailConfig(orgId);
  return sendEmailWithConfig(config, { to, subject, html, text });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const config = getPlatformEmailConfig();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
  const payload = platformWelcomeEmail({
    to,
    name,
    loginUrl: `${appUrl}/login`,
  });
  return sendEmailWithConfig(config, payload);
}

export async function sendOrgBrandedEmail(opts: {
  orgId: string;
  to: string;
  name: string;
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const org = await getOrgEmailConfig(opts.orgId);
  const payload = orgBrandedEmail({
    to: opts.to,
    name: opts.name,
    orgName: org.fromName,
    subject: opts.subject,
    body: opts.body,
    ctaLabel: opts.ctaLabel,
    ctaUrl: opts.ctaUrl,
  });
  return sendEmailWithConfig(org, payload);
}

export { getPlatformEmailConfig, getOrgEmailConfig, sendEmailWithConfig };
export type { EmailConfig };
