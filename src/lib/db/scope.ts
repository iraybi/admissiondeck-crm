import "server-only";
import type { SessionUser } from "@/lib/auth/account";
import { prisma } from "@/lib/db/prisma";

export type UserScope = {
  orgPaths: string[];
  orgIds: string[];
};

/**
 * Resolve the organization subtree a user can see using ltree descendant matching.
 */
export async function resolveScope(user: SessionUser): Promise<UserScope> {
  if (!user.orgPath) {
    return { orgPaths: [], orgIds: [] };
  }

  const orgs = await prisma.$queryRaw<
    { id: string; orgPath: string }[]
  >`
    SELECT id, "orgPath"::text as "orgPath"
    FROM "Organization"
    WHERE "orgPath" <@ ${user.orgPath}::ltree
       OR "orgPath" = ${user.orgPath}::ltree
  `;

  return {
    orgPaths: orgs.map((o) => o.orgPath),
    orgIds: orgs.map((o) => o.id),
  };
}

export async function resolveScopeForOrg(orgPath: string): Promise<UserScope> {
  const orgs = await prisma.$queryRaw<
    { id: string; orgPath: string }[]
  >`
    SELECT id, "orgPath"::text as "orgPath"
    FROM "Organization"
    WHERE "orgPath" <@ ${orgPath}::ltree
       OR "orgPath" = ${orgPath}::ltree
  `;

  return {
    orgPaths: orgs.map((o) => o.orgPath),
    orgIds: orgs.map((o) => o.id),
  };
}
