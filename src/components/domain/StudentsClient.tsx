"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { Field, Select, Input } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Status, type StatusTone } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { ProgressBar } from "@/components/ui/ProgressBar";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  orgId: string;
  orgName: string;
  counsellorName: string | null;
  country: string;
  university: string;
  programme: string;
  intake: string;
  status: string;
  createdAt: string;
};

const STATUS_TONE: Record<string, StatusTone> = {
  LEAD: "info",
  ACTIVE: "brand",
  OFFER: "info",
  VISA: "ok",
  ENROLLED: "ok",
  COMPLETED: "info",
  WITHDRAWN: "neutral",
  DROPOUT: "neutral",
  REFUSED: "bad",
};

const STATUS_LABEL: Record<string, string> = {
  LEAD: "Lead",
  ACTIVE: "In progress",
  OFFER: "Offer",
  VISA: "Visa granted",
  ENROLLED: "Enrolled",
  COMPLETED: "Completed",
  WITHDRAWN: "Withdrawn",
  DROPOUT: "Dropped out",
  REFUSED: "Visa refused",
};

export function StudentsClient({
  students,
  orgs,
  countries,
  stats,
}: {
  students: StudentRow[];
  orgs: { id: string; name: string }[];
  countries: string[];
  stats: {
    totalStudents: number;
    activeStudents: number;
    visaGranted: number;
    completed: number;
    refused: number;
    visaRate: number;
  };
}) {
  const [query, setQuery] = useState("");
  const [orgId, setOrgId] = useState("all");
  const [country, setCountry] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    let list = students;
    if (orgId !== "all") list = list.filter((s) => s.orgId === orgId);
    if (country !== "all") list = list.filter((s) => s.country === country);
    if (status !== "all") list = list.filter((s) => s.status === status);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) =>
        `${s.name} ${s.email} ${s.university} ${s.programme}`
          .toLowerCase()
          .includes(q),
      );
    }
    return list;
  }, [students, query, orgId, country, status]);

  return (
    <>
      <StatGrid>
        <Stat
          label="Total students"
          value={stats.totalStudents}
          hint="All agencies"
          tone="brand"
        />
        <Stat
          label="Active"
          value={stats.activeStudents}
          hint="In pipeline"
          tone="info"
        />
        <Stat
          label="Visa granted"
          value={stats.visaGranted}
          hint={`${stats.visaRate}% success rate`}
          tone="ok"
        />
        <Stat
          label="Refused"
          value={stats.refused}
          hint="Needs review"
          tone="bad"
        />
      </StatGrid>

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          alignItems: "flex-end",
          margin: "var(--space-6) 0 var(--space-4)",
        }}
      >
        <Field label="Search">
          <Input
            type="search"
            placeholder="Name, email, university"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 220 }}
          />
        </Field>
        <Field label="Agency">
          <Select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            <option value="all">All agencies</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country">
          <Select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="all">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Table
        columns={[
          { key: "name", label: "Student" },
          { key: "org", label: "Agency" },
          { key: "dest", label: "Destination" },
          { key: "counsellor", label: "Counsellor" },
          { key: "status", label: "Status" },
        ]}
      >
        {filtered.map((s) => (
          <Row key={s.id}>
            <Cell>
              <Link
                href={`/students/${s.id}`}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Avatar name={s.name} size={32} />
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm muted">{s.email}</div>
                </div>
              </Link>
            </Cell>
            <Cell>
              <span className="text-sm">{s.orgName}</span>
            </Cell>
            <Cell>
              <div className="text-sm">{s.country}</div>
              <div className="text-sm muted">{s.university}</div>
            </Cell>
            <Cell>
              <span className="text-sm">{s.counsellorName ?? "Unassigned"}</span>
            </Cell>
            <Cell>
              <Status tone={STATUS_TONE[s.status] ?? "neutral"}>
                {STATUS_LABEL[s.status] ?? s.status}
              </Status>
            </Cell>
          </Row>
        ))}
      </Table>

      {filtered.length === 0 ? (
        <div
          className="empty"
          style={{
            padding: "var(--space-10)",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          No students match the current filters.
        </div>
      ) : null}
    </>
  );
}
