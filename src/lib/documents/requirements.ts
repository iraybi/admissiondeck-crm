import "server-only";
import { prisma } from "@/lib/db/prisma";

export type DocumentRequirementRule = {
  id: string;
  scope: string;
  scopeId: string | null;
  docType: string;
  label: string;
  description: string | null;
  isRequired: boolean;
  maxFiles: number;
  allowedMimes: string[];
  maxBytes: number;
  sortOrder: number;
  validDays: number | null;
  conditions: unknown;
};

/**
 * Resolve the effective document checklist for a student by merging
 * requirements from global down to student level.
 *
 * Scope precedence (most specific wins):
 *   GLOBAL < COUNTRY < UNIVERSITY < PROGRAMME < INTAKE < STUDENT
 */
export async function resolveChecklist(input: {
  country: string;
  university?: string | null;
  programme?: string | null;
  intake?: string | null;
  studentId?: string | null;
}): Promise<DocumentRequirementRule[]> {
  // Fetch all applicable requirements in one query
  const requirements = await prisma.documentRequirement.findMany({
    where: {
      isActive: true,
      OR: [
        { scope: "GLOBAL" as never },
        { scope: "COUNTRY" as never, scopeId: input.country },
        ...(input.university
          ? [{ scope: "UNIVERSITY" as never, scopeId: input.university }]
          : []),
        ...(input.programme
          ? [{ scope: "PROGRAMME" as never, scopeId: input.programme }]
          : []),
        ...(input.intake
          ? [{ scope: "INTAKE" as never, scopeId: input.intake }]
          : []),
        ...(input.studentId
          ? [{ scope: "STUDENT" as never, scopeId: input.studentId }]
          : []),
      ],
    },
    orderBy: [{ scope: "asc" }, { sortOrder: "asc" }],
  });

  // Merge by docType: more specific scope overrides less specific
  const scopeOrder: Record<string, number> = {
    GLOBAL: 0,
    COUNTRY: 1,
    UNIVERSITY: 2,
    PROGRAMME: 3,
    INTAKE: 4,
    STUDENT: 5,
  };

  const merged = new Map<string, DocumentRequirementRule>();

  for (const req of requirements) {
    const rule: DocumentRequirementRule = {
      id: req.id,
      scope: req.scope,
      scopeId: req.scopeId,
      docType: req.docType,
      label: req.label,
      description: req.description,
      isRequired: req.isRequired,
      maxFiles: req.maxFiles,
      allowedMimes: req.allowedMimes,
      maxBytes: req.maxBytes,
      sortOrder: req.sortOrder,
      validDays: req.validDays,
      conditions: req.conditions,
    };

    const existing = merged.get(req.docType);
    if (!existing || scopeOrder[req.scope] >= scopeOrder[existing.scope]) {
      merged.set(req.docType, rule);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Validate a file upload against a document requirement.
 */
export function validateAgainstRequirement(
  file: { name: string; type: string; size: number },
  requirement: DocumentRequirementRule,
): { ok: true } | { ok: false; error: string } {
  if (!requirement.allowedMimes.includes(file.type)) {
    return {
      ok: false,
      error: `File type ${file.type} is not allowed for ${requirement.label}`,
    };
  }
  if (file.size > requirement.maxBytes) {
    const mb = Math.round(requirement.maxBytes / 1024 / 1024);
    return {
      ok: false,
      error: `File must be ${mb}MB or smaller`,
    };
  }
  return { ok: true };
}

/**
 * List all document requirements (for the admin editor).
 */
export async function listRequirements(opts?: {
  scope?: string;
  scopeId?: string;
  docType?: string;
}) {
  return prisma.documentRequirement.findMany({
    where: {
      ...(opts?.scope ? { scope: opts.scope as never } : {}),
      ...(opts?.scopeId ? { scopeId: opts.scopeId } : {}),
      ...(opts?.docType ? { docType: opts.docType } : {}),
    },
    orderBy: [{ scope: "asc" }, { sortOrder: "asc" }],
  });
}

/**
 * Create or update a document requirement.
 */
export async function upsertRequirement(input: {
  id?: string;
  scope: string;
  scopeId: string | null;
  docType: string;
  label: string;
  description?: string;
  isRequired: boolean;
  maxFiles: number;
  allowedMimes: string[];
  maxBytes: number;
  sortOrder: number;
  validDays?: number | null;
  conditions?: unknown;
}) {
  const data = {
    scope: input.scope as never,
    scopeId: input.scopeId,
    docType: input.docType,
    label: input.label,
    description: input.description || null,
    isRequired: input.isRequired,
    maxFiles: input.maxFiles,
    allowedMimes: input.allowedMimes,
    maxBytes: input.maxBytes,
    sortOrder: input.sortOrder,
    validDays: input.validDays || null,
    conditions: input.conditions ?? undefined,
    isActive: true,
  };

  if (input.id) {
    return prisma.documentRequirement.update({
      where: { id: input.id },
      data,
    });
  }
  return prisma.documentRequirement.create({ data });
}

export async function deleteRequirement(id: string) {
  return prisma.documentRequirement.delete({ where: { id } });
}
