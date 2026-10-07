import "server-only";
import { prisma } from "@/lib/db/prisma";

export type OrgLookup = {
  id: string;
  name: string;
  identifier: string | null;
  orgPath: string;
  kind: string;
} | null;

/**
 * Resolve organization from identifier (used on admissiondeck.com login).
 */
export async function findOrgByIdentifier(identifier: string): Promise<OrgLookup> {
  const org = await prisma.organization.findFirst({
    where: {
      identifier: identifier.toLowerCase().trim(),
    },
    select: {
      id: true,
      name: true,
      identifier: true,
      orgPath: true,
      kind: true,
    },
  });
  return org;
}

/**
 * Resolve organization from custom domain hostname.
 * Called when user logs in from a custom domain.
 */
export async function findOrgByHostname(hostname: string): Promise<OrgLookup> {
  const domain = await prisma.customDomain.findFirst({
    where: {
      hostname: hostname.toLowerCase(),
      verifiedAt: { not: null },
    },
    select: {
      orgId: true,
      org: {
        select: {
          id: true,
          name: true,
          identifier: true,
          orgPath: true,
          kind: true,
        },
      },
    },
  });

  return domain?.org ?? null;
}

/**
 * Get all organizations with their identifiers (for admin).
 */
export async function listOrgIdentifiers() {
  return prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      identifier: true,
      displayName: true,
      orgPath: true,
      kind: true,
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Update organization identifier.
 */
export async function setOrgIdentifier(
  orgId: string,
  identifier: string,
  displayName?: string,
) {
  return prisma.organization.update({
    where: { id: orgId },
    data: {
      identifier: identifier.toLowerCase().trim(),
      displayName: displayName ?? undefined,
    },
  });
}

/**
 * Validate identifier format: lowercase alphanumeric with hyphens.
 */
export function isValidIdentifier(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(id);
}
