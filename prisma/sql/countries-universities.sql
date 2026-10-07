-- Country and University management
-- Non-destructive. Applied after Prisma schema.

-- 1. Country table
CREATE TABLE IF NOT EXISTS "Country" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  flag          TEXT,
  continent     TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "customFields" JSONB DEFAULT '{}',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_country_name ON "Country" (name);
CREATE INDEX IF NOT EXISTS idx_country_active ON "Country" ("isActive");

-- 2. CountryOrg junction
CREATE TABLE IF NOT EXISTS "CountryOrg" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "countryId" TEXT NOT NULL REFERENCES "Country"(id) ON DELETE CASCADE,
  "orgId"     TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  UNIQUE("countryId", "orgId")
);

CREATE INDEX IF NOT EXISTS idx_countryorg_org ON "CountryOrg" ("orgId");
CREATE INDEX IF NOT EXISTS idx_countryorg_country ON "CountryOrg" ("countryId");

-- 3. University table
CREATE TABLE IF NOT EXISTS "University" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  country       TEXT NOT NULL,
  city          TEXT,
  website       TEXT,
  ranking       INTEGER,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "customFields" JSONB DEFAULT '{}',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_university_country ON "University" (country);
CREATE INDEX IF NOT EXISTS idx_university_name ON "University" (name);
CREATE INDEX IF NOT EXISTS idx_university_active ON "University" ("isActive");

-- 4. UniversityOrg junction
CREATE TABLE IF NOT EXISTS "UniversityOrg" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "universityId" TEXT NOT NULL REFERENCES "University"(id) ON DELETE CASCADE,
  "orgId"       TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  notes         TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  UNIQUE("universityId", "orgId")
);

CREATE INDEX IF NOT EXISTS idx_universityorg_org ON "UniversityOrg" ("orgId");
CREATE INDEX IF NOT EXISTS idx_universityorg_university ON "UniversityOrg" ("universityId");

-- 5. Program table
CREATE TABLE IF NOT EXISTS "Program" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "universityId" TEXT NOT NULL REFERENCES "University"(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  level         TEXT NOT NULL DEFAULT 'BACHELOR',
  "durationMonths" INTEGER,
  "tuitionAmount" DECIMAL(12,2),
  currency      TEXT DEFAULT 'USD',
  requirements  JSONB DEFAULT '{}',
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_university ON "Program" ("universityId");
CREATE INDEX IF NOT EXISTS idx_program_level ON "Program" (level);

-- 6. Seed default countries
INSERT INTO "Country" (code, name, flag, continent, "sortOrder")
SELECT v.code, v.name, v.flag, v.continent, v.ord
FROM (VALUES
  ('CY', 'Cyprus', NULL, 'Europe', 1),
  ('GB', 'United Kingdom', NULL, 'Europe', 2),
  ('MY', 'Malaysia', NULL, 'Asia', 3),
  ('CA', 'Canada', NULL, 'North America', 4),
  ('AU', 'Australia', NULL, 'Oceania', 5),
  ('US', 'United States', NULL, 'North America', 6),
  ('DE', 'Germany', NULL, 'Europe', 7),
  ('FR', 'France', NULL, 'Europe', 8),
  ('IE', 'Ireland', NULL, 'Europe', 9),
  ('NZ', 'New Zealand', NULL, 'Oceania', 10)
) AS v(code, name, flag, continent, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM "Country" WHERE code = v.code
);

-- 7. Link countries to the firm
INSERT INTO "CountryOrg" ("countryId", "orgId", "isActive")
SELECT c.id, o.id, true
FROM "Country" c, "Organization" o
WHERE o.kind = 'FIRM' AND o."orgPath" = 'org.chs'
  AND c.code IN ('CY', 'GB', 'MY', 'CA')
  AND NOT EXISTS (
    SELECT 1 FROM "CountryOrg" WHERE "countryId" = c.id AND "orgId" = o.id
  );
