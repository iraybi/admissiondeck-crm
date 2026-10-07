-- AdmissionDeck CRM: RLS and tenant isolation
-- Applied after Prisma migrate. Requires the ltree extension.

-- 1. Extensions ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Platform admin role (BYPASSRLS, no login until granted) --------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_admin') THEN
    CREATE ROLE platform_admin NOLOGIN BYPASSRLS;
  END IF;
END
$$;

-- 3. Drop existing policies so we can alter column types ------------------------
DROP POLICY IF EXISTS org_isolation ON "Organization";
DROP POLICY IF EXISTS user_isolation ON "User";
DROP POLICY IF EXISTS student_isolation ON "Student";
DROP POLICY IF EXISTS application_isolation ON "Application";
DROP POLICY IF EXISTS document_isolation ON "Document";
DROP POLICY IF EXISTS payment_isolation ON "Payment";
DROP POLICY IF EXISTS lead_isolation ON "Lead";
DROP POLICY IF EXISTS note_isolation ON "Note";
DROP POLICY IF EXISTS task_isolation ON "Task";
DROP POLICY IF EXISTS transition_isolation ON "StateTransition";
DROP POLICY IF EXISTS audit_isolation ON "AuditLog";
DROP POLICY IF EXISTS subscription_isolation ON "Subscription";
DROP POLICY IF EXISTS commission_isolation ON "CommissionSchedule";
DROP POLICY IF EXISTS domain_isolation ON "CustomDomain";

-- 4. Promote orgPath columns to ltree ------------------------------------------
ALTER TABLE "Organization" ALTER COLUMN "orgPath" TYPE ltree USING "orgPath"::ltree;
ALTER TABLE "Student" ALTER COLUMN "orgPath" TYPE ltree USING "orgPath"::ltree;
ALTER TABLE "Document" ALTER COLUMN "orgPath" TYPE ltree USING "orgPath"::ltree;
ALTER TABLE "Payment" ALTER COLUMN "orgPath" TYPE ltree USING "orgPath"::ltree;
ALTER TABLE "Lead" ALTER COLUMN "orgPath" TYPE ltree USING "orgPath"::ltree;
ALTER TABLE "Task" ALTER COLUMN "orgPath" TYPE ltree USING "orgPath"::ltree;
ALTER TABLE "AuditLog" ALTER COLUMN "orgPath" TYPE ltree USING "orgPath"::ltree;

-- 5. GiST indexes ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_organization_orgpath_gist ON "Organization" USING GIST ("orgPath");
CREATE INDEX IF NOT EXISTS idx_student_orgpath_gist ON "Student" USING GIST ("orgPath");
CREATE INDEX IF NOT EXISTS idx_document_orgpath_gist ON "Document" USING GIST ("orgPath");
CREATE INDEX IF NOT EXISTS idx_payment_orgpath_gist ON "Payment" USING GIST ("orgPath");
CREATE INDEX IF NOT EXISTS idx_lead_orgpath_gist ON "Lead" USING GIST ("orgPath");
CREATE INDEX IF NOT EXISTS idx_task_orgpath_gist ON "Task" USING GIST ("orgPath");
CREATE INDEX IF NOT EXISTS idx_audit_orgpath_gist ON "AuditLog" USING GIST ("orgPath");

-- 6. Helpers --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_tenant_path()
RETURNS ltree
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_path', true), '')::ltree;
$$;

CREATE OR REPLACE FUNCTION app_is_tenant_row(row_org_path ltree)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app_current_tenant_path() IS NOT NULL
     AND row_org_path <@ app_current_tenant_path();
$$;

-- 7. Enable RLS ------------------------------------------------------------------
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StateTransition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommissionSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomDomain" ENABLE ROW LEVEL SECURITY;

-- 8. Policies --------------------------------------------------------------------
CREATE POLICY org_isolation ON "Organization"
  USING (app_is_tenant_row("orgPath"))
  WITH CHECK (app_is_tenant_row("orgPath"));

CREATE POLICY user_isolation ON "User"
  USING (
    EXISTS (
      SELECT 1 FROM "Organization" o
      WHERE o.id = "User"."orgId"
        AND app_is_tenant_row(o."orgPath")
    )
    OR "User"."orgId" IS NULL
  );

CREATE POLICY student_isolation ON "Student"
  USING (app_is_tenant_row("Student"."orgPath"))
  WITH CHECK (app_is_tenant_row("Student"."orgPath"));

CREATE POLICY application_isolation ON "Application"
  USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = "Application"."studentId"
        AND app_is_tenant_row(s."orgPath")
    )
  );

CREATE POLICY document_isolation ON "Document"
  USING (app_is_tenant_row("Document"."orgPath"))
  WITH CHECK (app_is_tenant_row("Document"."orgPath"));

CREATE POLICY payment_isolation ON "Payment"
  USING (app_is_tenant_row("Payment"."orgPath"))
  WITH CHECK (app_is_tenant_row("Payment"."orgPath"));

CREATE POLICY lead_isolation ON "Lead"
  USING (app_is_tenant_row("Lead"."orgPath"))
  WITH CHECK (app_is_tenant_row("Lead"."orgPath"));

CREATE POLICY note_isolation ON "Note"
  USING (
    EXISTS (
      SELECT 1 FROM "Student" s
      WHERE s.id = "Note"."studentId"
        AND app_is_tenant_row(s."orgPath")
    )
  );

CREATE POLICY task_isolation ON "Task"
  USING (app_is_tenant_row("Task"."orgPath"))
  WITH CHECK (app_is_tenant_row("Task"."orgPath"));

CREATE POLICY transition_isolation ON "StateTransition"
  USING (true);

CREATE POLICY audit_isolation ON "AuditLog"
  USING (
    "AuditLog"."orgPath" IS NULL
    OR app_is_tenant_row("AuditLog"."orgPath")
  );

CREATE POLICY subscription_isolation ON "Subscription"
  USING (
    EXISTS (
      SELECT 1 FROM "Organization" o
      WHERE o.id = "Subscription"."orgId"
        AND app_is_tenant_row(o."orgPath")
    )
  );

CREATE POLICY commission_isolation ON "CommissionSchedule"
  USING (
    EXISTS (
      SELECT 1 FROM "Organization" o
      WHERE o.id = "CommissionSchedule"."orgId"
        AND app_is_tenant_row(o."orgPath")
    )
  );

CREATE POLICY domain_isolation ON "CustomDomain"
  USING (
    EXISTS (
      SELECT 1 FROM "Organization" o
      WHERE o.id = "CustomDomain"."orgId"
        AND app_is_tenant_row(o."orgPath")
    )
  );

-- 9. Append-only enforcement -------------------------------------------------------
CREATE OR REPLACE FUNCTION app_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'table % is append-only', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS audit_no_update ON "AuditLog";
CREATE TRIGGER audit_no_update
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION app_reject_mutation();

DROP TRIGGER IF EXISTS transition_no_update ON "StateTransition";
CREATE TRIGGER transition_no_update
  BEFORE UPDATE OR DELETE ON "StateTransition"
  FOR EACH ROW EXECUTE FUNCTION app_reject_mutation();
