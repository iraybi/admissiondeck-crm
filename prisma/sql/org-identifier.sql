-- Organization identifier for multi-tenant login
-- Non-destructive.

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "identifier" TEXT UNIQUE;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "displayName" TEXT;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_organization_identifier ON "Organization" ("identifier");

-- Set default identifiers for existing orgs (matching orgPath)
UPDATE "Organization" SET "identifier" = 'org.chs', "displayName" = name WHERE "orgPath" = 'org.chs';
UPDATE "Organization" SET "identifier" = 'org.chs.dhaka', "displayName" = name WHERE "orgPath" = 'org.chs.dhaka';
UPDATE "Organization" SET "identifier" = 'org.chs.ctg', "displayName" = name WHERE "orgPath" = 'org.chs.ctg';
UPDATE "Organization" SET "identifier" = 'org.chs.sylhet', "displayName" = name WHERE "orgPath" = 'org.chs.sylhet';
