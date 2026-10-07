-- Organization identifier for multi-tenant login
-- Non-destructive.

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "identifier" TEXT UNIQUE;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "displayName" TEXT;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_organization_identifier ON "Organization" ("identifier");

-- Set default identifiers for existing orgs
UPDATE "Organization" SET "identifier" = 'chs', "displayName" = name WHERE "orgPath" = 'org.chs' AND "identifier" IS NULL;
UPDATE "Organization" SET "identifier" = 'dhaka-central', "displayName" = name WHERE "orgPath" = 'org.chs.dhaka' AND "identifier" IS NULL;
UPDATE "Organization" SET "identifier" = 'chattogram-branch', "displayName" = name WHERE "orgPath" = 'org.chs.ctg' AND "identifier" IS NULL;
UPDATE "Organization" SET "identifier" = 'sylhet-desk', "displayName" = name WHERE "orgPath" = 'org.chs.sylhet' AND "identifier" IS NULL;
