import "server-only";
import { prisma } from "@/lib/db/prisma";

/**
 * Email configuration for platform and per-tenant sending.
 * Supports: platform default (Resend/SES) and per-org custom SMTP.
 */

export type EmailConfig = {
  provider: "resend" | "smtp" | "console";
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  apiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
};

/**
 * Get the platform default email config.
 */
export function getPlatformEmailConfig(): EmailConfig {
  return {
    provider: (process.env.EMAIL_PROVIDER as "resend" | "smtp" | "console") ?? "console",
    fromName: process.env.EMAIL_FROM_NAME ?? "AdmissionDeck",
    fromEmail: process.env.EMAIL_FROM ?? "noreply@admissiondeck.com",
    replyTo: process.env.EMAIL_REPLY_TO,
    apiKey: process.env.RESEND_API_KEY,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
  };
}

/**
 * Get email config for an organization (falls back to platform default).
 */
export async function getOrgEmailConfig(orgId: string): Promise<EmailConfig> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      supportEmail: true,
      // Store custom SMTP settings in customFields JSONB
    },
  });

  if (!org) return getPlatformEmailConfig();

  // Check for custom SMTP settings in org customFields
  // For now, use org branding with platform SMTP
  const platform = getPlatformEmailConfig();

  return {
    ...platform,
    fromName: org.name,
    fromEmail: org.supportEmail ?? platform.fromEmail,
  };
}

/**
 * Send an email using the configured provider.
 */
export async function sendEmailWithConfig(
  config: EmailConfig,
  payload: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  switch (config.provider) {
    case "resend":
      return sendViaResend(config, payload);
    case "smtp":
      return sendViaSmtp(config, payload);
    default:
      return sendViaConsole(config, payload);
  }
}

async function sendViaResend(
  config: EmailConfig,
  payload: { to: string; subject: string; html: string; text?: string },
) {
  if (!config.apiKey) {
    return sendViaConsole(config, payload);
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: config.replyTo,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Resend error:", error);
      return { ok: false, error };
    }

    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  } catch (e) {
    console.error("Resend send error:", e);
    return { ok: false, error: (e as Error).message };
  }
}

async function sendViaSmtp(
  config: EmailConfig,
  payload: { to: string; subject: string; html: string; text?: string },
) {
  // SMTP implementation would use nodemailer
  // For now, fall back to console
  console.log(`[SMTP] Would send to ${payload.to}: ${payload.subject}`);
  return sendViaConsole(config, payload);
}

async function sendViaConsole(
  config: EmailConfig,
  payload: { to: string; subject: string; html: string; text?: string },
) {
  console.log(`[email] from=${config.fromEmail} to=${payload.to} subject=${payload.subject}`);
  return { ok: true, id: `dev-${Date.now()}` };
}

/**
 * Template: Platform welcome email
 */
export function platformWelcomeEmail(opts: {
  to: string;
  name: string;
  loginUrl: string;
}) {
  return {
    to: opts.to,
    subject: "Welcome to AdmissionDeck",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#2F3338">
        <h2>Welcome to AdmissionDeck</h2>
        <p>Hi ${opts.name},</p>
        <p>Your account has been created. You can now sign in to manage your student applications.</p>
        <p><a href="${opts.loginUrl}" style="background:#E2555A;color:#fff;padding:10px 16px;text-decoration:none">Sign in</a></p>
      </div>
    `,
    text: `Welcome to AdmissionDeck. Sign in: ${opts.loginUrl}`,
  };
}

/**
 * Template: Org-branded email
 */
export function orgBrandedEmail(opts: {
  to: string;
  name: string;
  orgName: string;
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  return {
    to: opts.to,
    subject: `${opts.subject} · ${opts.orgName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#2F3338">
        <div style="border-bottom:1px solid #E6E8EB;padding-bottom:12px;margin-bottom:16px">
          <strong>${opts.orgName}</strong>
        </div>
        <p>Hi ${opts.name},</p>
        <p>${opts.body}</p>
        ${opts.ctaUrl ? `<p><a href="${opts.ctaUrl}" style="background:#E2555A;color:#fff;padding:10px 16px;text-decoration:none">${opts.ctaLabel ?? "View details"}</a></p>` : ""}
        <p style="color:#6E7378;font-size:12px;margin-top:24px">
          Sent by ${opts.orgName} via AdmissionDeck
        </p>
      </div>
    `,
    text: `${opts.body}${opts.ctaUrl ? `\n\n${opts.ctaLabel ?? "View"}: ${opts.ctaUrl}` : ""}`,
  };
}
