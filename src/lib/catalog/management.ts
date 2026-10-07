import "server-only";
import { prisma } from "@/lib/db/prisma";

export type CountryWithOrgs = {
  id: string;
  code: string;
  name: string;
  continent: string | null;
  isActive: boolean;
  orgCount: number;
  studentCount: number;
  customFields: Record<string, unknown>;
};

/**
 * List all countries with org and student counts.
 */
export async function listCountries(opts?: {
  orgId?: string;
  activeOnly?: boolean;
}): Promise<CountryWithOrgs[]> {
  const countries = await prisma.$queryRaw<any[]>`
    SELECT
      c.id,
      c.code,
      c.name,
      c.continent,
      c."isActive",
      c."customFields"::text as "customFieldsText",
      COALESCE(org_counts.org_count, 0) as "orgCount",
      COALESCE(student_counts.student_count, 0) as "studentCount"
    FROM "Country" c
    LEFT JOIN (
      SELECT "countryId", COUNT(*) as org_count
      FROM "CountryOrg"
      GROUP BY "countryId"
    ) org_counts ON org_counts."countryId" = c.id
    LEFT JOIN (
      SELECT "targetCountry", COUNT(*) as student_count
      FROM "Student"
      GROUP BY "targetCountry"
    ) student_counts ON student_counts."targetCountry" = c.name
    ORDER BY c."sortOrder", c.name
  `;

  return countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    continent: c.continent,
    isActive: c.isActive,
    orgCount: Number(c.orgCount),
    studentCount: Number(c.studentCount),
    customFields: JSON.parse(c.customFieldsText ?? "{}"),
  }));
}

/**
 * List countries available to a specific org.
 */
export async function listOrgCountries(orgId: string) {
  return prisma.$queryRaw<any[]>`
    SELECT
      c.id,
      c.code,
      c.name,
      c.continent,
      co."isActive",
      co.notes
    FROM "Country" c
    JOIN "CountryOrg" co ON co."countryId" = c.id
    WHERE co."orgId" = ${orgId}
    ORDER BY c."sortOrder", c.name
  `;
}

/**
 * Add a country to an org's offerings.
 */
export async function addCountryToOrg(
  countryId: string,
  orgId: string,
  notes?: string,
) {
  return prisma.$executeRaw`
    INSERT INTO "CountryOrg" ("countryId", "orgId", "isActive", notes, "createdAt", "updatedAt")
    VALUES (${countryId}, ${orgId}, true, ${notes || null}, now(), now())
    ON CONFLICT ("countryId", "orgId") DO UPDATE
    SET "isActive" = true, notes = COALESCE(EXCLUDED.notes, "CountryOrg".notes), "updatedAt" = now()
  `;
}

/**
 * Remove a country from an org.
 */
export async function removeCountryFromOrg(countryId: string, orgId: string) {
  return prisma.$executeRaw`
    UPDATE "CountryOrg" SET "isActive" = false, "updatedAt" = now()
    WHERE "countryId" = ${countryId} AND "orgId" = ${orgId}
  `;
}

/**
 * Update country custom fields.
 */
export async function updateCountryFields(
  countryId: string,
  customFields: Record<string, unknown>,
) {
  return prisma.$executeRaw`
    UPDATE "Country"
    SET "customFields" = ${JSON.stringify(customFields)}::jsonb, "updatedAt" = now()
    WHERE id = ${countryId}
  `;
}

/**
 * List universities with optional country filter.
 */
export async function listUniversities(opts?: {
  country?: string;
  orgId?: string;
  search?: string;
}) {
  const conditions: string[] = [];
  const params: string[] = [];

  if (opts?.country && opts.country !== "all") {
    conditions.push(`u.country = $${params.length + 1}`);
    params.push(opts.country);
  }
  if (opts?.search) {
    conditions.push(`u.name ILIKE $${params.length + 1}`);
    params.push(`%${opts.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return prisma.$queryRawUnsafe<any[]>(
    `SELECT
      u.id, u.name, u.country, u.city, u.website, u.ranking,
      u."isActive", u."customFields",
      COALESCE(prog_counts.prog_count, 0) as "programCount",
      COALESCE(student_counts.student_count, 0) as "studentCount"
    FROM "University" u
    LEFT JOIN (
      SELECT "universityId", COUNT(*) as prog_count
      FROM "Program"
      GROUP BY "universityId"
    ) prog_counts ON prog_counts."universityId" = u.id
    LEFT JOIN (
      SELECT "targetUniversity", COUNT(*) as student_count
      FROM "Student"
      GROUP BY "targetUniversity"
    ) student_counts ON student_counts."targetUniversity" = u.name
    ${where}
    ORDER BY u.name
    LIMIT 100`,
    ...params,
  );
}

/**
 * Add a university.
 */
export async function addUniversity(input: {
  name: string;
  country: string;
  city?: string;
  website?: string;
  ranking?: number;
  customFields?: Record<string, unknown>;
}) {
  return prisma.$executeRaw`
    INSERT INTO "University" (id, name, country, city, website, ranking, "customFields", "isActive", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      ${input.name},
      ${input.country},
      ${input.city || null},
      ${input.website || null},
      ${input.ranking || null},
      ${JSON.stringify(input.customFields ?? {})}::jsonb,
      true, now(), now()
    )
  `;
}

/**
 * Update university custom fields.
 */
export async function updateUniversityFields(
  universityId: string,
  customFields: Record<string, unknown>,
) {
  return prisma.$executeRaw`
    UPDATE "University"
    SET "customFields" = ${JSON.stringify(customFields)}::jsonb, "updatedAt" = now()
    WHERE id = ${universityId}
  `;
}

/**
 * List programs for a university.
 */
export async function listPrograms(universityId: string) {
  return prisma.$queryRaw<any[]>`
    SELECT id, name, level, "durationMonths", "tuitionAmount", currency, requirements, "isActive"
    FROM "Program"
    WHERE "universityId" = ${universityId}
    ORDER BY level, name
  `;
}
