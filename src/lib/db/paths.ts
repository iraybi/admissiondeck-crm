import "server-only";

/**
 * Build a Prisma `where` fragment that matches rows whose orgPath lives
 * at or below any of the given ancestor paths.
 *
 * Students, documents, payments, leads and tasks store a descendant path
 * like `org.chs.dhaka.stu1`, so equality against `org.chs.dhaka` misses them.
 */
export function underPaths(orgPaths: string[]) {
  return {
    OR: orgPaths.flatMap((p) => [
      { orgPath: { startsWith: p + "." } },
      { orgPath: p },
    ]),
  };
}

/** Same, but for queries that need to AND it with other filters. */
export function underPathsAnd(orgPaths: string[], extra: Record<string, unknown> = {}) {
  return {
    AND: [underPaths(orgPaths), extra],
  };
}
