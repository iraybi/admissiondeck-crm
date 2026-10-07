import "server-only";
import { prisma } from "@/lib/db/prisma";

export type DomainResolution = {
  orgId: string;
  orgName: string;
  orgPath: string;
  portal: string;
  pathPrefix: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  supportEmail: string | null;
} | null;

/**
 * Resolve a custom hostname (and optional path prefix) to a tenant.
 * This is the database lookup; Redis caching is an optimization layer.
 */
export async function resolveCustomDomain(
  hostname: string,
  pathPrefix?: string | null,
): Promise<DomainResolution> {
  const domain = await prisma.customDomain.findFirst({
    where: {
      hostname: hostname.toLowerCase(),
      ...(pathPrefix ? { pathPrefix } : {}),
      verifiedAt: { not: null },
    },
    include: {
      org: {
        select: {
          id: true,
          name: true,
          orgPath: true,
          logoUrl: true,
          brandColor: true,
          supportEmail: true,
        },
      },
    },
  });

  if (!domain) return null;

  return {
    orgId: domain.org.id,
    orgName: domain.org.name,
    orgPath: domain.org.orgPath,
    portal: domain.portal,
    pathPrefix: domain.pathPrefix,
    logoUrl: domain.org.logoUrl,
    brandColor: domain.org.brandColor,
    supportEmail: domain.org.supportEmail,
  };
}

/**
 * List all custom domains for an organization.
 */
export async function listCustomDomains(orgId: string) {
  return prisma.customDomain.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Register a new custom domain. Starts unverified.
 */
export async function registerCustomDomain(input: {
  orgId: string;
  hostname: string;
  pathPrefix?: string | null;
  portal?: string;
}) {
  const dnsToken = generateDnsToken();
  return prisma.customDomain.create({
    data: {
      orgId: input.orgId,
      hostname: input.hostname.toLowerCase(),
      pathPrefix: input.pathPrefix || null,
      portal: input.portal ?? "student",
      dnsToken,
    },
  });
}

/**
 * Verify a custom domain by checking for the DNS TXT record.
 * In production this performs a real DNS lookup.
 */
export async function verifyCustomDomain(
  domainId: string,
): Promise<{ ok: boolean; error?: string }> {
  const domain = await prisma.customDomain.findUnique({
    where: { id: domainId },
  });
  if (!domain) return { ok: false, error: "Domain not found" };

  // In development, auto-verify.
  if (process.env.NODE_ENV !== "production") {
    await prisma.customDomain.update({
      where: { id: domainId },
      data: {
        verifiedAt: new Date(),
        sslStatus: "ISSUED" as never,
      },
    });
    return { ok: true };
  }

  // Production: verify DNS TXT record
  try {
    const dns = await import("node:dns/promises");
    const records = await dns.resolveTxt(`_admissiondeck.${domain.hostname}`);
    const verified = records.some((r) =>
      r.join("").includes(domain.dnsToken),
    );

    if (!verified) {
      return {
        ok: false,
        error: `Add a TXT record: _admissiondeck.${domain.hostname} with value ${domain.dnsToken}`,
      };
    }

    await prisma.customDomain.update({
      where: { id: domainId },
      data: {
        verifiedAt: new Date(),
        sslStatus: "ISSUED" as never,
      },
    });
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: `Add a TXT record: _admissiondeck.${domain.hostname} with value ${domain.dnsToken}`,
    };
  }
}

/**
 * Remove a custom domain.
 */
export async function removeCustomDomain(domainId: string) {
  return prisma.customDomain.delete({ where: { id: domainId } });
}

function generateDnsToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ad-";
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
