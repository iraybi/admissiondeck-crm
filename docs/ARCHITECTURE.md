# AdmissionDeck CRM: System Architecture

Industrial-grade multi-tenant SaaS for international student consulting.
Target: 100,000+ users across all roles, hierarchical tenancy, custom domains.

Status: locked for implementation
Last updated: 2026-10 (v2: manual billing, subdomain portals, custom doc pipeline, built-in malware scanner)

---

## 1. Purpose and scope

AdmissionDeck CRM connects:

- Platform administrators (SaaS operator)
- Firms (wholesale, multi-agency owners)
- Agencies (localized, sometimes white-label)
- Counsellors (operational staff)
- Recruiting agents (external affiliates)
- Students (applicants)

Every interaction is tenant-scoped. No user can read or write data outside
their organizational subtree.

The platform manages:

- Lead and student pipelines with country-specific stage templates
- Fully customizable document collection with built-in malware scanning
- Manual payment verification (cheque, SWIFT, bank transfer)
- Manual subscription and seat management (no payment gateway)
- Commission and referral tracking
- Role-targeted analytics
- White-label custom domains per agency

---

## 2. Non-functional requirements

| Requirement | Target |
|---|---|
| Scale | 100,000+ total users, 10,000+ concurrent |
| Tenancy | Strict isolation, enforced at the database |
| Availability | 99.9% |
| Latency | p95 < 200ms for reads, < 500ms for writes |
| Data residency | Configurable region |
| Compliance | Full audit trail on financial and identity data |
| Extensibility | New countries, roles, and billing models without rewrites |

---

## 3. Technology stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 22 LTS | Native async, first-class Next.js support |
| Framework | Next.js 15 App Router | RSC, Server Actions, middleware, typed |
| Language | TypeScript strict | End-to-end type safety |
| ORM | Prisma | Typed queries, migrations, RLS-aware |
| Database | PostgreSQL 16 | ltree, RLS, triggers, JSONB, full-text |
| Cache / rate limit | Redis (Upstash or Valkey) | Sessions, domain lookup, throttling |
| Object storage | Cloudflare R2 or AWS S3 | Presigned uploads, quarantine buckets |
| Malware scan | Built-in ClamAV container | Zero-trust, no external dependency |
| Billing | Manual (no payment gateway) | Subscription managed by operator |
| Email | Resend or Amazon SES | Transactional and digest |
| Queue | BullMQ (Redis) or QStash | Documents, scanning, notifications |
| Auth | Auth.js v5 (NextAuth) | Credentials, JWT, optional OIDC |
| Hosting | Vercel or AWS (ECS/App Runner) | Edge middleware, regional DB |
| Observability | Sentry + OpenTelemetry + Grafana | Errors, traces, metrics |

PostgreSQL is mandatory. The product depends on `ltree` hierarchy and
Row-Level Security. Document-shaped data (OCR output, extracted fields)
uses JSONB. Everything relational stays relational.

**Billing is fully manual.** There is no payment gateway. Every pricing
page leads to "Contact us". Subscription state (active, trial, suspended)
is managed by the SaaS operator in the admin console. Seat counts are
set manually per tenant.

---

## 4. Multi-tenancy

### 4.1 Model

Shared database, shared schema, row-level isolation.

Rejected alternatives:

- Schema-per-tenant: linear migration burden, partial failure states.
- Database-per-tenant: operational explosion at 1000s of agencies.
- Flat tenant_id filter: single missing WHERE clause leaks data.

### 4.2 Hierarchical ltree paths

Every organization has a materialized path.

```
org.chs                  (firm)
org.chs.dhaka            (agency)
org.chs.ctg              (agency)
org.chs.sylhet           (agency)
```

Operations:

- `@>` ancestor of
- `<@` descendant of
- GiST index on `org_path` for O(log n) subtree queries

Firm Manager sees all rows where `org_path <@ 'org.chs'`.
Agency Manager sees `org_path <@ 'org.chs.dhaka'`.
Sister agencies are invisible to each other.

### 4.3 Row-Level Security

Every tenant-scoped table carries `org_path ltree` and an RLS policy.

Session establishes claims in a transaction:

```sql
SELECT set_config('app.hmac_secret', $secret, true);
SELECT app.authenticate($token);   -- verifies HMAC + expiry + membership
```

Policy shape:

```sql
CREATE POLICY tenant_isolation ON "Student"
  USING (
    org_path <@ current_setting('app.current_tenant_path')::ltree
    OR current_user = 'platform_admin'
  );
```

Platform admin is a separate PostgreSQL login role with BYPASSRLS.
It is not a spoofable session claim.

Trust boundary: application code cannot bypass RLS. Even `SELECT *`
returns only authorized rows.

### 4.4 Portal routing (decentralized subdomains)

Each role has its own login surface on a dedicated subdomain:

| Subdomain | Portal | Audience |
|---|---|---|
| `manage.crm.admissiondeck.com` | SaaS management | Platform operator |
| `firm.crm.admissiondeck.com` | Firm console | Firm managers |
| `agency.crm.admissiondeck.com` | Agency workspace | Agency managers |
| `counsellor.crm.admissiondeck.com` | Counsellor workspace | Counsellors |
| `agent.crm.admissiondeck.com` | Agent portal | Recruiting agents |
| `student.crm.admissiondeck.com` | Student portal | Applicants |
| `crm.admissiondeck.com` | Marketing + pricing | Public, leads to "Contact us" |

Login is scoped per subdomain. Each surface only accepts its own role,
enforced server-side from the Host header at authorize time. A user who
lands on the wrong subdomain gets redirected to their correct portal.

### 4.5 Custom domains (white-label)

Agencies can map their own domain to any portal:

| Pattern | Example | Use case |
|---|---|---|
| Subdomain | `students.someeduagency.com` | Student portal on client domain |
| Path prefix | `someeduagency.com/students` | Student portal under client site |
| Full domain | `apply.someeduagency.com` | Standalone student portal |
| Multi-path | `someeduagency.com/agent` | Agent portal on client domain |

Implementation:

- Table `CustomDomain` stores `hostname`, `orgId`, `pathPrefix`, `portal`, `verifiedAt`, `sslStatus`.
- Middleware resolves hostname (+ path prefix) to organization before auth.
- DNS verification: TXT record `_admissiondeck.<hostname>`.
- TLS certificates provisioned automatically (ACM or Let's Encrypt).
- Path-prefix mappings use a reverse proxy rule or Next.js rewrite.
- Branding per agency: logo, name, accent color, support email, favicon.
- Redis cache of hostname to tenant is an optimization only;
  the database remains the source of truth.

---

## 5. Data model

### 5.1 Core entities

```
Platform
└── Firm (Organization, kind=firm)
    └── Agency (Organization, kind=agency)
        ├── User (counsellor, agency_manager, agent)
        ├── Student
        │   ├── Application (per university/intake)
        │   ├── Document
        │   ├── Payment
        │   └── StateTransition
        └── Lead

University
└── Program
    └── Intake
        └── Offer

Subscription (Stripe)
CommissionSchedule
Entry / Transaction (double-entry ledger)
AuditLog
Notification
```

### 5.2 Schema outline

```prisma
model Organization {
  id           String   @id @default(uuid())
  name         String
  kind         OrgKind  // FIRM | AGENCY
  orgPath      String   @db.Citext  // ltree, e.g. org.chs.dhaka
  parentId     String?
  parent       Organization?  @relation("OrgTree", fields: [parentId], references: [id])
  children     Organization[] @relation("OrgTree")

  customDomain String?  @unique
  brandColor   String?
  logoUrl      String?
  website      String?
  supportEmail String?
  phone        String?
  addressLine1 String?
  city         String?
  country      String?
  timezone     String   @default("UTC")
  currency     String   @default("BDT")

  seatsUsed    Int      @default(0)
  seatsBilled  Int      @default(10)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  users        User[]
  students     Student[]
  leads        Lead[]
  subscription Subscription?

  @@index([orgPath], type: Gin)
  @@index([parentId])
}

model User {
  id              String   @id @default(uuid())
  email           String   @unique
  passwordHash    String?
  name            String
  avatarUrl       String?
  phone           String?
  role            UserRole // PLATFORM_ADMIN | FIRM_MANAGER | AGENCY_MANAGER | COUNSELLOR | AGENT | STUDENT
  orgId           String?
  org             Organization? @relation(fields: [orgId], references: [id])

  isActive        Boolean  @default(true)
  lastLoginAt     DateTime?
  passwordChangedAt DateTime?
  failedLogins    Int      @default(0)
  lockedUntil     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([orgId, role])
  @@index([email])
}

model Student {
  id              String   @id @default(uuid())
  orgId           String
  org             Organization @relation(fields: [orgId], references: [id])
  userId          String?  @unique  // login account if student portal enabled
  counsellorId    String?
  agentId         String?
  referringAgencyId String?

  name            String
  email           String
  phone           String?
  passportNumber  String?
  dateOfBirth     DateTime?
  nationality     String?
  orgPath         String   // denormalized for RLS: <agency path>.<id>

  targetCountry   String
  targetUniversity String?
  targetProgram   String?
  targetIntake    String?
  status          StudentStatus // LEAD | ACTIVE | OFFER | VISA | ENROLLED | WITHDRAWN | DROPOUT | COMPLETED | REFUSED
  pipelineTemplateId String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  applications    Application[]
  documents       Document[]
  payments        Payment[]
  transitions     StateTransition[]
  notes           Note[]
  tasks           Task[]

  @@index([orgId, status])
  @@index([counsellorId])
  @@index([agentId])
  @@index([orgPath], type: Gin)
}

model Application {
  id          String  @id @default(uuid())
  studentId   String
  student     Student @relation(fields: [studentId], references: [id])
  universityId String
  programId   String
  intakeId    String?
  status      AppStatus // DRAFT | SUBMITTED | UNDER_REVIEW | OFFER | OFFER_ACCEPTED | REJECTED | WITHDRAWN
  submittedAt DateTime?
  decidedAt   DateTime?

  offers      Offer[]
  @@index([studentId, status])
}

model Document {
  id            String   @id @default(uuid())
  studentId     String
  student       Student  @relation(fields: [studentId], references: [id])
  orgPath       String
  type          String   // PASSPORT, IELTS, BANK_STATEMENT, ...
  fileName      String
  storageKey    String
  bucket        DocBucket // QUARANTINE | PRODUCTION | PURGED
  scanStatus    ScanStatus // PENDING | CLEAN | INFECTED | TIMEOUT
  scanResult    Json?
  status        DocStatus // UPLOADED | QUARANTINED | AVAILABLE | REJECTED
  uploadedById  String
  sizeBytes     Int
  mimeType      String
  sha256        String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([studentId, type])
  @@index([orgPath], type: Gin)
  @@index([scanStatus, status])
}

model Payment {
  id            String   @id @default(uuid())
  studentId     String
  student       Student  @relation(fields: [studentId], references: [id])
  orgPath       String
  applicationId String?
  title         String
  amount        Decimal  @db.Decimal(12, 2)
  currency      String   @default("BDT")
  method        PayMethod // CHEQUE | SWIFT | BANK_TRANSFER | CASH | OTHER
  state         PaymentState // PENDING | AWAITING_PROOF | IN_REVIEW | VERIFIED | REJECTED | REFUNDED
  milestone     String?
  dueAt         DateTime?
  proofDocumentId String?
  verifiedById  String?
  verifiedAt    DateTime?
  rejectReason  String?
  reference     String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([studentId, state])
  @@index([orgPath, state])
}

model StateTransition {
  id          String   @id @default(uuid())
  entityType  String   // STUDENT | APPLICATION | PAYMENT
  entityId    String
  fromState   String?
  toState     String
  actorId     String?
  reason      String?
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([entityType, entityId, createdAt])
}

model AuditLog {
  id          String   @id @default(uuid())
  orgPath     String?
  actorId     String?
  action      String
  entityType  String
  entityId    String
  before      Json?
  after       Json?
  ip          String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([orgPath, createdAt])
  @@index([entityType, entityId])
}

model Subscription {
  id                  String  @id @default(uuid())
  orgId               String  @unique
  org                 Organization @relation(fields: [orgId], references: [id])
  stripeCustomerId    String
  stripeSubscriptionId String?
  plan                Plan  // ENTERPRISE_FIRM | STANDARD_AGENCY
  seatQuantity        Int   @default(10)
  status              SubStatus // TRIALING | ACTIVE | PAST_DUE | CANCELED | INCOMPLETE
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
  cancelAt            DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
}

model CommissionSchedule {
  id            String  @id @default(uuid())
  orgId         String
  programId     String?
  universityId  String?
  rate          Decimal @db.Decimal(5, 4) // e.g. 0.1500
  platformCut   Decimal @db.Decimal(5, 4)
  holdingCut    Decimal @db.Decimal(5, 4)
  originCut     Decimal @db.Decimal(5, 4)
  agentCut      Decimal @db.Decimal(5, 4)
  referralCut   Decimal @db.Decimal(5, 4)
  holdbackDays  Int     @default(0)
  clawbackPolicy String?

  @@unique([orgId, programId, universityId])
}

model Lead {
  id            String   @id @default(uuid())
  orgId         String
  org           Organization @relation(fields: [orgId], references: [id])
  orgPath       String
  counsellorId  String?
  agentId       String?
  name          String
  email         String
  phone         String?
  source        String?
  targetCountry String?
  targetProgram String?
  status        LeadStatus // NEW | CONTACTED | QUALIFIED | CONVERTED | LOST
  convertedStudentId String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([orgId, status])
}

model Task {
  id          String   @id @default(uuid())
  orgPath     String
  studentId   String?
  assigneeId  String
  title       String
  description String?
  dueAt       DateTime?
  status      TaskStatus // OPEN | IN_PROGRESS | DONE | CANCELLED
  priority    Priority  // LOW | MEDIUM | HIGH | URGENT
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([assigneeId, status])
  @@index([dueAt])
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      String
  title     String
  body      String?
  link      String?
  readAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId, readAt])
}

model CustomDomain {
  id          String   @id @default(uuid())
  hostname    String   @unique
  orgId       String
  verifiedAt  DateTime?
  dnsToken    String
  sslStatus   SslStatus // PENDING | ISSUED | FAILED
  createdAt   DateTime @default(now())

  @@index([hostname])
}
```

### 5.3 Immutability

`AuditLog` and `StateTransition` are append-only.

- Triggers reject UPDATE and DELETE for the application role.
- Status changes go through SECURITY DEFINER procedures.
- Payment verification always writes a transition row and an audit row.

---

## 6. Authentication and account lifecycle

### 6.1 Auth.js v5

- Credentials provider against Prisma + bcrypt (or Argon2id).
- JWT sessions, no database adapter (scales to 100k+).
- Edge-safe auth config shared by middleware and the Node runtime.
- Session claims: `userId`, `isPlatformAdmin`, `roles[]`, `activeOrgId`.

### 6.2 Required account features

| Feature | Notes |
|---|---|
| Login / logout | Every portal. Logout is always visible in the user menu. |
| Change password | Requires current password. Revokes other sessions. |
| Forgot password | Email token, 30 minute TTL, single use. |
| Reset password | Forces logout everywhere. |
| Invite / accept | Tokened invite with expiry. Reserves a seat. |
| Deactivate | Soft delete. Blocks login. Preserves audit. |
| Profile | Name, email, phone, avatar upload. |
| MFA (phase 2) | TOTP for firm and platform admin roles. |
| Session management | List active sessions, revoke individual or all. |

### 6.3 Password policy

- Minimum 12 characters, checked against a breach list (zxcvbn or similar).
- Hash with Argon2id or bcrypt cost 12+.
- Rate limit login attempts per IP and per account.
- Lock account temporarily after repeated failures.

---

## 7. Settings and branding

### 7.1 Scope

| Level | Settings |
|---|---|
| Platform | Name, support email, feature flags, default currency |
| Firm | Name, logo, contact, tax ID, billing contact, currency |
| Agency | Name, logo, accent, custom domain, support email, timezone |
| User | Name, avatar, phone, password, notification preferences |

### 7.2 Logo and file uploads

- Direct-to-storage presigned URLs, never through the app server.
- Image processing for logos: max 2MB, PNG/SVG/WebP, generate 64 and 256 variants.
- Stored in a dedicated `branding` prefix with public read for logos only.
- All other documents use the quarantine pipeline.

### 7.3 White-label

Agencies on a verified custom domain render with their logo, name, and
accent. The platform brand disappears from the visible UI for that tenant.
Emails use the agency identity and reply-to address.

---

## 8. Document pipeline (fully customizable)

Document requirements are configurable at every level:

```
Global defaults
  └── Per country (Cyprus, UK, Malaysia, Canada, custom)
      └── Per university (UCLan Cyprus, Coventry, custom)
          └── Per programme (BSc Nursing, MBA, custom)
              └── Per intake (Fall 2026, Spring 2027)
                  └── Per student (overrides)
```

### 8.1 Document requirement model

```
DocumentRequirement
├── id
├── scope          (GLOBAL | COUNTRY | UNIVERSITY | PROGRAMME | INTAKE | STUDENT)
├── scopeId        (null for global, country name, university id, etc.)
├── docType        (PASSPORT | IELTS | BANK_STATEMENT | ... or custom string)
├── label          (display name)
├── description    (help text for students)
├── isRequired     (boolean)
├── maxFiles       (default 1)
├── allowedMimes   (array of MIME types)
├── maxBytes       (per-file size limit)
├── sortOrder      (display order)
├── validDays      (expiry window, optional)
└── conditions     (JSON: e.g. only if age < 18, only if self-funded)
```

A student's checklist is computed by merging all applicable requirements
from global down to student level. More specific scopes override or extend.

### 8.2 Upload and scan pipeline

```
Client
  │ request upload (docType, name, size, mime)
  ▼
Server Action
  │ validate against DocumentRequirement
  │ check authorization, generate upload
  ▼
Local / S3 quarantine bucket
  │ file written
  ▼
Built-in malware scanner (ClamAV)
  │
  ├─ clean  → move to production, status=AVAILABLE
  ├─ infected → purge, status=REJECTED, alert
  └─ error  → retry with backoff, then alert
  ▼
PostgreSQL Document row updated (scanStatus, bucket, status, scanResult)
```

### 8.3 Built-in malware scanner

The platform runs its own ClamAV instance. No external scanning service.

- **Scanner**: ClamAV in a dedicated container or sidecar.
- **Virus definitions**: freshclam runs on a schedule (every 4 hours).
- **Integration**: the upload handler writes to quarantine, then enqueues
  a scan job. The scanner worker connects to ClamAV via TCP (port 3310)
  or the `clamd` unix socket.
- **API**: `scanBuffer(data: Buffer): Promise<{ clean: boolean; signature?: string }>`
- **Fallback**: if ClamAV is unreachable, the file stays in quarantine
  and the job retries. It is never released unscanned.
- **Metadata**: scan result, signature name, scan duration, and
  ClamAV definition version are stored on the Document row.
- **Alerts**: infected files trigger an immediate notification to
  platform admins and the uploading user's organization managers.

Rules:

- Every upload is untrusted until the scanner clears it.
- Staff cannot download quarantine files.
- Infection purges the object and raises a platform alert.
- File metadata (size, sha256, mime) is recorded for audit.
- Document requirements are fully customizable per country, university,
  programme, intake, and student.

---

## 9. Payment verification state machine

```
PENDING ──upload proof──▶ AWAITING_PROOF ──submit──▶ IN_REVIEW
                                                          │
                                     ┌────────────────────┴───────────────────┐
                                     ▼                                        ▼
                                  VERIFIED                                  REJECTED
                                     │                                        │
                                     │                              mandatory reason
                                     │                                        │
                                     ▼                                        ▼
                            milestone unlocked                         back to PENDING
```

Rules:

- Rejection requires a written reason. The student sees it.
- Verification requires an authenticated staff member with permission.
- Every transition writes `StateTransition` and `AuditLog` rows (database trigger).
- Amount, method, reference, and milestone are immutable after verification.
- Reversal is a separate `REFUNDED` action, never a silent edit.

---

## 10. Billing and seats (manual, no payment gateway)

There is no payment gateway. All billing is managed manually by the SaaS
operator. Every pricing page leads to "Contact us".

### 10.1 Plans

| Plan | Audience | Minimum seats | Includes |
|---|---|---|---|
| Enterprise Firm | Multi-agency firms | 10 | Sub-agencies, roll-up analytics, custom domains |
| Standard Agency | Standalone agencies | 10 | Local operations only |
| Trial | Evaluation | 5 | Limited features, 30-day window |

### 10.2 Subscription lifecycle

1. Prospect fills "Contact us" form or reaches out directly.
2. Operator creates the tenant in `manage.crm.admissiondeck.com`.
3. Operator sets plan, seat count, and status (TRIAL / ACTIVE / SUSPENDED).
4. Operator provisions the admin user and sends the invite.
5. Ongoing: operator adjusts seats and status as the relationship evolves.

No self-service upgrade. No automated invoicing. The operator is the
source of truth for subscription state.

### 10.3 Seat management

- `seatQuantity` is set manually by the operator.
- `seatsUsed` is derived from active non-student users in the tenant.
- When `seatsUsed >= seatQuantity`, the agency cannot invite more users.
- The UI shows a "Seat limit reached, contact us to add more" message.
- The operator can increase `seatQuantity` at any time.

### 10.4 Contact us

Every pricing surface (marketing page, billing page, seat limit warning)
has a "Contact us" CTA that opens a lead form or shows the operator's
contact details. The lead is captured in the `Lead` table for follow-up.

---

## 11. Stats, targets, and analytics

### 11.1 Role dashboards

| Role | Primary metrics |
|---|---|
| Platform admin | Tenants, MRR, seats, active users, churn, system health |
| Firm manager | Multi-agency roll-up, visa rate, revenue, seat usage, targets |
| Agency manager | Local pipeline, counsellor performance, seats, payments |
| Counsellor | My students, tasks due, documents pending, payments in review |
| Agent | Referrals, conversion, commission earned and pending |
| Student | Journey progress, documents, payments, messages |

### 11.2 Targets

- Targets are set per role and period (month, quarter, intake).
- Examples: students onboarded, visas granted, revenue collected.
- Progress computed from ledger and application events, not manual entry.

### 11.3 Analytics infrastructure

- Operational dashboards read from the primary via indexed queries and cursor pagination.
- Heavy analytics use a read replica and materialized views.
- Pre-aggregated tables for daily roll-ups (optional at 100k+ scale).

---

## 12. API and integrations

### 12.1 Surface

- Next.js Server Actions for first-party UI mutations.
- Route Handlers for webhooks, public API, and mobile clients.
- All inputs validated with Zod at the boundary.
- All mutations go through authorization + RLS + transaction.

### 12.2 Public API (phase 3)

- Versioned: `/api/v1`.
- Bearer tokens with scoped permissions per tenant.
- Rate limits per token and per IP.
- OpenAPI spec generated from Zod schemas.

### 12.3 Outbound integrations

- Stripe (billing)
- Email provider (transactional)
- Object storage (S3/R2)
- Optional: WhatsApp, SMS, calendar sync (phase 4)

---

## 13. Background jobs

| Queue | Jobs |
|---|---|
| documents | scan, move, thumbnail, purge |
| billing | webhook processing, seat sync, invoice PDF |
| notifications | email, digest, in-app |
| exports | CSV/XLSX student and finance exports |
| scheduler | daily roll-ups, target calculation, reminder emails |

All jobs are idempotent and retry with backoff. Failures land in a DLQ
and raise an alert.

---

## 14. Observability

- **Logging**: structured JSON (pino), request IDs, tenant IDs.
- **Tracing**: OpenTelemetry across middleware, server actions, DB, Stripe.
- **Errors**: Sentry with source maps and release tracking.
- **Metrics**: request rate, error rate, p95 latency, queue depth, DB pool.
- **Audit**: separate from app logs; immutable and exportable.

---

## 15. Scale strategy (100,000+ users)

| Concern | Approach |
|---|---|
| DB connections | PgBouncer or Prisma Accelerate pooling |
| Hot queries | GiST on `org_path`, composite indexes, cover common filters |
| Reads | Redis cache for org tree, seats, reference data |
| Lists | Cursor pagination, never unbounded queries |
| Files | Direct-to-storage, CDN for downloads |
| Analytics | Read replica and pre-aggregation |
| Auth | JWT without database round-trip per request |
| Custom domains | Indexed lookup, Redis as cache only |
| Rate limits | Redis token buckets per IP, user, and API token |
| Horizontal scale | Stateless Next.js instances behind a load balancer |
| Jobs | Separate worker processes from the web tier |

Expected data volumes at 100k users:

- 1,000 to 5,000 organizations
- 200,000 to 1,000,000 students over time
- 2,000,000+ documents
- 1,000,000+ audit rows

With proper indexes and RLS, these stay comfortable on a single
PostgreSQL primary with one replica.

---

## 16. Security

- RLS on every tenant-scoped table.
- Platform admin is a separate database role with BYPASSRLS.
- Passwords hashed with Argon2id or bcrypt 12+.
- Sessions: httpOnly, sameSite=lax, secure in production.
- CSRF protection on all mutations (Server Actions provide this).
- Input validation (Zod) at every boundary.
- Presigned URLs with strict TTL and MIME allowlist.
- File uploads scanned before availability.
- Secrets in environment variables or a secret manager.
- Dependency scanning and periodic penetration testing.

---

## 17. Deployment

| Environment | Purpose |
|---|---|
| local | Docker Compose for Postgres and Redis, seeded demo data |
| staging | Production-shaped, test tenants, Stripe test mode |
| production | Multi-region ready, managed Postgres, alerts on |

Pipeline:

1. Pull request triggers typecheck, lint, unit tests.
2. Preview deployment per PR.
3. Merge to main promotes to staging with migrations.
4. Manual approval promotes to production.
5. Migrations are expand-and-contract, zero downtime.

---

## 18. Repository structure

```
admissiondeck-crm/
├── apps/
│   └── web/                     Next.js 15 app
│       ├── src/
│       │   ├── app/
│       │   │   ├── (marketing)/
│       │   │   ├── (auth)/login, register, reset
│       │   │   ├── admin/       firm + platform
│       │   │   ├── agency/
│       │   │   ├── agent/
│       │   │   ├── student/
│       │   │   └── api/
│       │   ├── components/
│       │   │   ├── ui/          reusable primitives
│       │   │   ├── layout/
│       │   │   ├── domain/
│       │   │   └── settings/
│       │   ├── lib/
│       │   │   ├── auth/
│       │   │   ├── db/
│       │   │   ├── billing/
│       │   │   ├── documents/
│       │   │   ├── payments/
│       │   │   └── analytics/
│       │   └── styles/
│       │       ├── tokens.css   design language, single source
│       │       └── layout.css
│       └── tests/
├── packages/
│   ├── db/                      Prisma schema, client, RLS SQL
│   ├── ui/                      shared UI if multiple apps
│   ├── config/                  eslint, tsconfig
│   └── types/                   shared Zod schemas
├── workers/                     queue consumers
├── docs/
│   ├── ARCHITECTURE.md          this document
│   └── DECISIONS.md
├── docker-compose.yml
└── turbo.json
```

Design language stays isolated in `tokens.css`. Components never hardcode
colors, radii, or type sizes. Restyling is a tokens change.

---

## 19. Build phases

### Phase 1: Foundation
- PostgreSQL + Prisma schema + ltree + RLS
- Auth.js with login, logout, change/reset password
- Profile and org settings, logo upload
- User management and invites
- Session management

### Phase 2: Core CRM
- Student pipeline with country templates and gated stages
- Leads and conversion
- Counsellor, agency, agent, firm stats
- Targets
- Notifications and tasks

### Phase 3: Money and files
- Stripe subscriptions, seats, invoices, webhooks
- Document quarantine pipeline
- Payment verification with audit triggers
- Commission schedules and ledger

### Phase 4: Scale and white-label
- Custom domains with DNS verification and TLS
- Caching, queues, read replicas
- Public API and webhooks
- Observability and rate limiting

### Phase 5: Platform admin
- Tenant management
- Feature flags
- Global analytics
- Billing operations

---

## 20. Open decisions

| Decision | Default | Alternative |
|---|---|---|
| Hosting | Vercel + Neon | AWS ECS + RDS |
| Queue | BullMQ on Redis | QStash |
| Object storage | Cloudflare R2 | AWS S3 |
| Email | Resend | Amazon SES |
| MFA | Phase 2 | Phase 1 |
| Ledger | Phase 3 | Defer to phase 4 |

Defaults above are ready to accept. Change any before Phase 1 if needed.

---

## 21. Summary

AdmissionDeck CRM is a PostgreSQL-first, multi-tenant SaaS with hierarchical
isolation enforced at the database. It scales to 100,000+ users through
indexed ltree queries, connection pooling, read replicas, caching, and
queued background work. The product covers the full consulting lifecycle:
leads, students, documents, payments, billing, commissions, settings,
white-label domains, and role-targeted analytics.

This document is the implementation contract. Build order is Phase 1 first.
