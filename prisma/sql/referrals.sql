-- Platform referral system
-- Tracks who referred new tenants to AdmissionDeck

CREATE TABLE IF NOT EXISTS "Referral" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "referrerName"  TEXT NOT NULL,
  "referrerEmail" TEXT,
  "referrerPhone" TEXT,
  "referrerType"  TEXT NOT NULL DEFAULT 'PARTNER',
  company         TEXT,
  notes           TEXT,
  "commissionRate" DECIMAL(5,4) DEFAULT 0.1000,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_name ON "Referral" ("referrerName");

CREATE TABLE IF NOT EXISTS "ReferralConversion" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "referralId"    TEXT NOT NULL REFERENCES "Referral"(id) ON DELETE CASCADE,
  "tenantId"      TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  "tenantName"    TEXT NOT NULL,
  plan            TEXT NOT NULL,
  "seatCount"     INTEGER NOT NULL DEFAULT 10,
  "monthlyValue"  DECIMAL(12,2) NOT NULL DEFAULT 0,
  "commissionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'PENDING',
  "paidAt"        TIMESTAMP(3),
  "paidById"      TEXT REFERENCES "User"(id),
  notes           TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refconv_referral ON "ReferralConversion" ("referralId");
CREATE INDEX IF NOT EXISTS idx_refconv_tenant ON "ReferralConversion" ("tenantId");
CREATE INDEX IF NOT EXISTS idx_refconv_status ON "ReferralConversion" (status);

-- Seed some example referrals
INSERT INTO "Referral" ("referrerName", "referrerEmail", "referrerType", company, "commissionRate")
SELECT v.name, v.email, v.type, v.company, v.rate
FROM (VALUES
  ('Ahmed Hassan', 'ahmed@partner.com', 'PARTNER', 'EduConsult Partners', 0.1500),
  ('Sarah Johnson', 'sarah@agency.com', 'AGENCY', 'Global Study Agency', 0.1000),
  ('Mohammed Ali', 'mohammed@referral.com', 'INDIVIDUAL', NULL, 0.0500)
) AS v(name, email, type, company, rate)
WHERE NOT EXISTS (
  SELECT 1 FROM "Referral" WHERE "referrerEmail" = v.email
);
