-- Phase 5: MFA support and CommissionEntry table
-- Non-destructive. Applied after Prisma schema.

-- 1. MFA fields on User ----------------------------------------------------------
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaVerifiedAt" TIMESTAMP(3);

-- 2. CommissionEntry table --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CommissionEntry" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId"     TEXT NOT NULL REFERENCES "Student"(id) ON DELETE CASCADE,
  "orgPath"       LTREE NOT NULL,
  "agentId"       TEXT REFERENCES "User"(id),
  "applicationId" TEXT,
  "baseAmount"    DECIMAL(12,2) NOT NULL,
  "totalCommission" DECIMAL(12,2) NOT NULL,
  "platformCut"   DECIMAL(12,2) NOT NULL DEFAULT 0,
  "holdingCut"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  "originCut"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  "agentCut"      DECIMAL(12,2) NOT NULL DEFAULT 0,
  "referralCut"   DECIMAL(12,2) NOT NULL DEFAULT 0,
  "rate"          DECIMAL(5,4) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'ELIGIBLE',
  "eligibleAt"    TIMESTAMP(3) NOT NULL DEFAULT now(),
  "paidAt"        TIMESTAMP(3),
  "clawbackAt"    TIMESTAMP(3),
  "clawbackReason" TEXT,
  "paidById"      TEXT REFERENCES "User"(id),
  notes           TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_student ON "CommissionEntry" ("studentId");
CREATE INDEX IF NOT EXISTS idx_commission_agent ON "CommissionEntry" ("agentId");
CREATE INDEX IF NOT EXISTS idx_commission_org ON "CommissionEntry" ("orgPath");
CREATE INDEX IF NOT EXISTS idx_commission_status ON "CommissionEntry" (status);

-- 3. CommissionEntry RLS ------------------------------------------------------------
ALTER TABLE "CommissionEntry" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commission_entry_isolation ON "CommissionEntry";
CREATE POLICY commission_entry_isolation ON "CommissionEntry"
  USING (app_is_tenant_row("CommissionEntry"."orgPath"))
  WITH CHECK (app_is_tenant_row("CommissionEntry"."orgPath"));

-- 4. Index for MFA lookups -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_mfa ON "User" ("mfaEnabled") WHERE "mfaEnabled" = true;
