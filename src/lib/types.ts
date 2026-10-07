/* Domain types for AdmissionDeck CRM.
   Mirrors the production schema; demo data lives in demo-data.ts. */

export type Role =
  | "platform_admin"
  | "firm_manager"
  | "agency_manager"
  | "counsellor"
  | "agent"
  | "student";

export type OrgKind = "firm" | "agency";

export type Organization = {
  id: string;
  name: string;
  kind: OrgKind;
  path: string; // ltree, e.g. org.chs.dhaka
  parentId: string | null;
  city?: string;
  managerName?: string;
  seatsUsed: number;
  seatsBilled: number;
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgId: string;
  status: "active" | "invited";
};

export type StudentStatus =
  | "active"
  | "visa"
  | "completed"
  | "refused"
  | "cancelled";

export type Stage = {
  id: string;
  name: string;
  done: boolean;
  due: Date;
};

export type DocStatus = "missing" | "uploaded" | "approved" | "rejected";

export type StudentDoc = {
  id: string;
  name: string;
  status: DocStatus;
};

export type Student = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orgId: string;
  counsellorId: string | null;
  agentId: string | null;
  country: string;
  university: string;
  programme: string;
  intake: string;
  status: StudentStatus;
  stages: Stage[];
  docs: StudentDoc[];
};

export type PaymentState = "pending" | "in_review" | "verified" | "rejected";

export type Payment = {
  id: string;
  studentId: string;
  title: string;
  amount: number; // minor units avoided for demo; integer major units
  currency: string;
  method: string;
  state: PaymentState;
  fileName: string | null;
  submittedAt: Date | null;
  reviewerName: string | null;
  note: string;
  milestone: string;
};

export type DocPipelineState =
  | "quarantine"
  | "scanning"
  | "available"
  | "rejected";

export type DocumentRecord = {
  id: string;
  studentId: string;
  name: string;
  fileName: string;
  state: DocPipelineState;
  at: Date;
};

export type LeadStatus = "new" | "contacted" | "qualified" | "converted";

export type Lead = {
  id: string;
  name: string;
  orgId: string;
  counsellorId: string;
  country: string;
  university: string;
  programme: string;
  intake: string;
  status: LeadStatus;
  createdAt: Date;
};

export type AuditEntry = {
  id: string;
  at: Date;
  actor: string;
  action: string;
  tone: "ok" | "warn" | "bad" | "info" | "brand";
};
