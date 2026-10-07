"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Select, Input } from "@/components/ui/Field";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { ProgressBar } from "@/components/ui/ProgressBar";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  orgId: string | null;
  orgName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  studentsAssigned: number;
  studentsReferred: number;
  tasksOpen: number;
  leadsOpen: number;
  visaRate: number;
};

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: "Platform admin",
  FIRM_MANAGER: "Firm manager",
  AGENCY_MANAGER: "Agency manager",
  COUNSELLOR: "Counsellor",
  AGENT: "Agent",
};

const ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "COUNSELLOR", label: "Counsellors" },
  { value: "AGENCY_MANAGER", label: "Agency managers" },
  { value: "AGENT", label: "Agents" },
  { value: "FIRM_MANAGER", label: "Firm managers" },
];

export function StaffClient({
  staff,
  orgs,
}: {
  staff: StaffRow[];
  orgs: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [orgId, setOrgId] = useState("all");
  const [role, setRole] = useState("all");

  const filtered = useMemo(() => {
    let list = staff;
    if (orgId !== "all") list = list.filter((s) => s.orgId === orgId);
    if (role !== "all") list = list.filter((s) => s.role === role);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.orgName?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [staff, query, orgId, role]);

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          alignItems: "flex-end",
          marginBottom: "var(--space-5)",
        }}
      >
        <Field label="Search">
          <Input
            type="search"
            placeholder="Name, email, agency"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 220 }}
          />
        </Field>
        <Field label="Agency">
          <Select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            <option value="all">All agencies</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Table
        columns={[
          { key: "name", label: "Staff member" },
          { key: "role", label: "Role" },
          { key: "agency", label: "Agency" },
          { key: "students", label: "Students" },
          { key: "activity", label: "Activity" },
          { key: "visa", label: "Visa rate" },
          { key: "status", label: "Status" },
        ]}
      >
        {filtered.map((s) => (
          <Row key={s.id}>
            <Cell>
              <Link
                href={`/staff/${s.id}`}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Avatar name={s.name} size={34} />
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm muted">{s.email}</div>
                </div>
              </Link>
            </Cell>
            <Cell>
              <Status
                tone={
                  s.role === "AGENCY_MANAGER"
                    ? "info"
                    : s.role === "COUNSELLOR"
                      ? "brand"
                      : s.role === "AGENT"
                        ? "peach"
                        : "neutral"
                }
              >
                {ROLE_LABEL[s.role] ?? s.role}
              </Status>
            </Cell>
            <Cell>
              <div className="text-sm">{s.orgName ?? "Unassigned"}</div>
            </Cell>
            <Cell>
              <div className="text-sm">
                <span className="tabular font-semibold">{s.studentsAssigned + s.studentsReferred}</span>
                <span className="muted"> total</span>
              </div>
              <div className="text-xs muted">
                {s.studentsAssigned} assigned, {s.studentsReferred} referred
              </div>
            </Cell>
            <Cell>
              <div className="text-sm">{s.tasksOpen} tasks, {s.leadsOpen} leads</div>
              <div className="text-xs muted">
                Last login: {s.lastLoginAt
                  ? new Date(s.lastLoginAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                  : "Never"}
              </div>
            </Cell>
            <Cell>
              <ProgressBar value={s.visaRate} showValue />
            </Cell>
            <Cell>
              <Status tone={s.isActive ? "ok" : "bad"}>
                {s.isActive ? "Active" : "Inactive"}
              </Status>
            </Cell>
          </Row>
        ))}
      </Table>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: "var(--space-10)",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          No staff members match these filters.
        </div>
      ) : null}
    </>
  );
}
