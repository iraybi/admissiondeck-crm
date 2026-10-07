-- Phase 2b: Add DocumentRequirement and extend CustomDomain
-- Applied after Prisma schema. Non-destructive.

-- 1. DocumentRequirement scope enum ---------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocScope') THEN
    CREATE TYPE "DocScope" AS ENUM ('GLOBAL', 'COUNTRY', 'UNIVERSITY', 'PROGRAMME', 'INTAKE', 'STUDENT');
  END IF;
END
$$;

-- 2. DocumentRequirement table ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "DocumentRequirement" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scope        "DocScope" NOT NULL,
  "scopeId"    TEXT,
  "docType"    TEXT NOT NULL,
  label        TEXT NOT NULL,
  description  TEXT,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "maxFiles"   INTEGER NOT NULL DEFAULT 1,
  "allowedMimes" TEXT[] NOT NULL DEFAULT ARRAY['application/pdf','image/png','image/jpeg']::TEXT[],
  "maxBytes"   INTEGER NOT NULL DEFAULT 15728640,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  "validDays"  INTEGER,
  conditions   JSONB,
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_docreq_scope ON "DocumentRequirement" ("scope", "scopeId");
CREATE INDEX IF NOT EXISTS idx_docreq_doctype ON "DocumentRequirement" ("docType");
CREATE INDEX IF NOT EXISTS idx_docreq_active ON "DocumentRequirement" ("isActive");

-- 3. Extend CustomDomain with portal and pathPrefix ---------------------------------
ALTER TABLE "CustomDomain" ADD COLUMN IF NOT EXISTS "pathPrefix" TEXT;
ALTER TABLE "CustomDomain" ADD COLUMN IF NOT EXISTS "portal" TEXT NOT NULL DEFAULT 'student';
CREATE INDEX IF NOT EXISTS idx_customdomain_host_path ON "CustomDomain" (hostname, "pathPrefix");

-- 4. Remove Stripe columns from Subscription if they exist ---------------------------
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "stripeSubscriptionId";
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. Seed default document requirements ----------------------------------------------
INSERT INTO "DocumentRequirement" ("scope", "scopeId", "docType", label, description, "isRequired", "sortOrder")
SELECT 'GLOBAL', NULL, v.docType, v.label, v.description, true, v.ord
FROM (VALUES
  ('PASSPORT',        'Passport copy',           'Bio-page of your passport. Must be valid for at least 6 months.', 1),
  ('ACADEMIC',        'Academic documents',      'Transcripts, certificates, and mark sheets.', 2),
  ('ENGLISH',         'English certificate',     'IELTS, TOEFL, PTE, or equivalent English test result.', 3),
  ('BANK_STATEMENT',  'Bank statement',          'Last 6 months of bank statements showing sufficient funds.', 4),
  ('SWIFT',           'SWIFT copy',              'Proof of tuition or deposit payment via SWIFT transfer.', 5)
) AS v(docType, label, description, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM "DocumentRequirement" WHERE "scope" = 'GLOBAL' AND "docType" = v.docType
);

-- 6. Seed country-specific requirements -----------------------------------------------
INSERT INTO "DocumentRequirement" ("scope", "scopeId", "docType", label, description, "isRequired", "sortOrder")
SELECT 'COUNTRY', v.country, v.docType, v.label, v.description, true, v.ord
FROM (VALUES
  ('Cyprus',         'POLICE_CLEARANCE', 'Police clearance',        'Certificate of no criminal record.', 6),
  ('Cyprus',         'SPONSOR_LETTER',   'Sponsor letter',          'Letter from your financial sponsor.', 7),
  ('United Kingdom', 'IELTS_UKVI',       'IELTS UKVI result',       'IELTS for UKVI academic test result.', 6),
  ('United Kingdom', 'TB_TEST',          'TB test certificate',     'Tuberculosis test certificate from an approved clinic.', 7),
  ('United Kingdom', 'SOP',              'Statement of purpose',    'Personal statement for your application.', 8),
  ('Canada',         'GIC_CERT',         'GIC certificate',         'Guaranteed Investment Certificate from a Canadian bank.', 6),
  ('Canada',         'MEDICAL_EXAM',     'Medical exam',            'Immigration medical exam from a panel physician.', 7),
  ('Malaysia',       'MEDICAL_SCREEN',   'Medical screening',       'Medical screening report for EMGS.', 6)
) AS v(country, docType, label, description, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM "DocumentRequirement" WHERE "scope" = 'COUNTRY' AND "scopeId" = v.country AND "docType" = v.docType
);
