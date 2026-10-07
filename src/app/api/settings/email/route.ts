import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Email settings API.
 * Platform admins configure platform email.
 * Firm/agency managers configure their org's email.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Return current email config for the user's org
  const { getOrgEmailConfig, getPlatformEmailConfig } = await import(
    "@/lib/email/config"
  );

  const config =
    user.role === "PLATFORM_ADMIN"
      ? getPlatformEmailConfig()
      : await getOrgEmailConfig(user.orgId ?? "");

  return NextResponse.json({
    config: {
      provider: config.provider,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      replyTo: config.replyTo,
      hasApiKey: !!config.apiKey,
      hasSmtp: !!config.smtpHost,
    },
  });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only firm managers and platform admins can update email settings
  if (!["FIRM_MANAGER", "PLATFORM_ADMIN", "AGENCY_MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { provider, fromName, fromEmail, replyTo, apiKey, smtpHost, smtpPort, smtpUser, smtpPass } = body;

    // For now, store in org customFields
    // In production, use a dedicated EmailConfig table or env vars for platform
    if (user.orgId) {
      const org = await prisma.organization.findUnique({
        where: { id: user.orgId },
        select: { id: true },
      });

      if (org) {
        await prisma.$executeRaw`
          UPDATE "Organization"
          SET "customFields" = COALESCE("customFields", '{}'::jsonb) || ${JSON.stringify({
            email: {
              provider,
              fromName,
              fromEmail,
              replyTo,
              smtpHost,
              smtpPort,
              smtpUser,
              // Never store passwords in plain text - use secret manager
            },
          })}::jsonb
          WHERE id = ${user.orgId}
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Email config update error:", e);
    return NextResponse.json(
      { error: "Failed to update email settings" },
      { status: 500 },
    );
  }
}
