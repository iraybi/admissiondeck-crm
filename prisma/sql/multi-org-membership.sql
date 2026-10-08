-- Multi-organization membership for agents, counsellors, and staff
-- Non-destructive migration

CREATE TABLE IF NOT EXISTS "OrgMembership" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "orgId"     TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  role        "UserRole" NOT NULL DEFAULT 'AGENT',
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  UNIQUE("userId", "orgId")
);

CREATE INDEX IF NOT EXISTS idx_orgmembership_user ON "OrgMembership" ("userId");
CREATE INDEX IF NOT EXISTS idx_orgmembership_org ON "OrgMembership" ("orgId");

-- Add orgId and role to Session for multi-org session scoping
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "orgId" TEXT REFERENCES "Organization"(id) ON DELETE SET NULL;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS role "UserRole";
CREATE INDEX IF NOT EXISTS idx_session_org ON "Session" ("orgId");

-- Backfill existing users into OrgMembership
INSERT INTO "OrgMembership" ("userId", "orgId", role, "isActive")
SELECT id, "orgId", role, "isActive"
FROM "User"
WHERE "orgId" IS NOT NULL
ON CONFLICT ("userId", "orgId") DO NOTHING;
