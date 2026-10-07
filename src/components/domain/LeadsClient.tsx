"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea, FormGrid } from "@/components/ui/Field";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";

export type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  targetCountry: string | null;
  
  targetProgram: string | null;
  status: string;
  createdAt: string;
  
  
  orgName: string | null;
  convertedStudentId: string | null;
};

const STATUS_TONE: Record<string, "warn" | "brand" | "ok" | "bad" | "info"> = {
  NEW: "warn",
  CONTACTED: "brand",
  QUALIFIED: "info",
  CONVERTED: "ok",
  LOST: "bad",
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export function LeadsClient({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [inviteModal, setInviteModal] = useState<string | null>(null);
  const [convertModal, setConvertModal] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const filtered = leads.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.targetCountry?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleInvite(leadId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/invite`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setMessage({ ok: true, text: json.message });
        setInviteModal(null);
      } else {
        setMessage({ ok: false, text: json.error });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleConvert(leadId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, {
        method: "POST",
        body: JSON.stringify({
          counsellorId: data.get("counsellorId"),
          targetCountry: data.get("targetCountry"),
          targetUniversity: data.get("targetUniversity"),
          targetProgram: data.get("targetProgram"),
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        setConvertModal(null);
        router.push(`/students/${json.studentId}`);
      } else {
        setMessage({ ok: false, text: json.error });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          source: data.get("source"),
          targetCountry: data.get("targetCountry"),
          targetUniversity: data.get("targetUniversity"),
          targetProgram: data.get("targetProgram"),
          targetIntake: data.get("targetIntake"),
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        setCreateModal(false);
        form.reset();
        router.refresh();
      } else {
        setMessage({ ok: false, text: json.error });
      }
    } finally {
      setBusy(false);
    }
  }

  const inviteLead = leads.find((l) => l.id === inviteModal);
  const convertLead = leads.find((l) => l.id === convertModal);

  return (
    <>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "var(--space-5)" }}>
        <Field label="Search">
          <Input
            type="search"
            placeholder="Name, email, country"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 200 }}
          />
        </Field>
        <Field label="Status">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
        <Button onClick={() => setCreateModal(true)}>New lead</Button>
      </div>

      {message ? (
        <div className={`status-row ${message.ok ? "is-ok" : "is-bad"}`} style={{ marginBottom: "var(--space-4)" }}>
          <div className="text-sm">{message.text}</div>
        </div>
      ) : null}

      <Table
        columns={[
          { key: "name", label: "Lead" },
          { key: "interest", label: "Interest" },
          { key: "source", label: "Source" },
          { key: "status", label: "Status" },
          { key: "actions", label: "", width: "200px" },
        ]}
      >
        {filtered.map((l) => (
          <Row key={l.id}>
            <Cell>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Avatar name={l.name} size={34} />
                <div>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-sm muted">{l.email}</div>
                  {l.phone ? <div className="text-xs muted">{l.phone}</div> : null}
                </div>
              </div>
            </Cell>
            <Cell>
              <div className="text-sm">{l.targetCountry ?? "Not specified"}</div>
              <div className="text-xs muted">{l.targetProgram ?? ""}</div>
              <div className="text-xs muted">{l.targetProgram ?? ""}</div>
            </Cell>
            <Cell>
              <div className="text-sm">{l.source ?? "Direct"}</div>
              {l.source ? <div className="text-xs muted">via {l.source}</div> : null}
            </Cell>
            <Cell>
              <Status tone={STATUS_TONE[l.status] ?? "neutral"}>
                {STATUS_LABEL[l.status] ?? l.status}
              </Status>
            </Cell>
            <Cell>
              {l.status === "CONVERTED" ? (
                <Link href={`/students/${l.convertedStudentId}`}>
                  <Button variant="secondary" size="sm">View student</Button>
                </Link>
              ) : (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setInviteModal(l.id)}
                  >
                    Invite
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setConvertModal(l.id)}
                  >
                    Convert
                  </Button>
                </div>
              )}
            </Cell>
          </Row>
        ))}
      </Table>

      {filtered.length === 0 ? (
        <div className="empty">No leads match these filters.</div>
      ) : null}

      {/* Invite modal */}
      <Modal
        open={!!inviteModal}
        title={`Invite ${inviteLead?.name ?? ""} to join`}
        onClose={() => { setInviteModal(null); setMessage(null); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteModal(null)}>Cancel</Button>
            <Button disabled={busy} onClick={() => handleInvite(inviteModal!)}>
              {busy ? "Sending..." : "Send invitation"}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          This will send an email invitation to <strong>{inviteLead?.email}</strong>.
          When they register and accept, you can convert them to a student.
        </p>
      </Modal>

      {/* Convert modal */}
      <Modal
        open={!!convertModal}
        title={`Convert ${convertLead?.name ?? ""} to student`}
        onClose={() => { setConvertModal(null); setMessage(null); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConvertModal(null)}>Cancel</Button>
            <Button type="submit" form="convert-form" disabled={busy}>
              {busy ? "Converting..." : "Convert to student"}
            </Button>
          </>
        }
      >
        <form id="convert-form" onSubmit={(e) => handleConvert(convertModal!, e)}>
          {message && !message.ok ? (
            <div className="status-row is-bad" style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm">{message.text}</div>
            </div>
          ) : null}
          <p className="text-sm" style={{ marginBottom: "var(--space-3)" }}>
            This creates a student record and links it to their account.
            The lead must have registered first (use Invite).
          </p>
          <FormGrid>
            <Field label="Target country">
              <Select name="targetCountry" defaultValue={convertLead?.targetCountry ?? "Cyprus"}>
                <option value="Cyprus">Cyprus</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
              </Select>
            </Field>
            <Field label="University">
              <Input name="targetUniversity" defaultValue={convertLead?.targetProgram ?? ""} placeholder="e.g. UCLan Cyprus" />
            </Field>
            <Field label="Program">
              <Input name="targetProgram" defaultValue={convertLead?.targetProgram ?? ""} placeholder="e.g. BSc Computer Science" />
            </Field>
            <Field label="Intake">
              <Input name="targetIntake" defaultValue="Fall 2026" />
            </Field>
          </FormGrid>
        </form>
      </Modal>

      {/* Create lead modal */}
      <Modal
        open={createModal}
        title="New lead"
        onClose={() => { setCreateModal(false); setMessage(null); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button type="submit" form="create-lead-form" disabled={busy}>
              {busy ? "Creating..." : "Create lead"}
            </Button>
          </>
        }
      >
        <form id="create-lead-form" onSubmit={handleCreate}>
          <FormGrid>
            <Field label="Full name">
              <Input name="name" required placeholder="Lead's full name" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required placeholder="lead@email.com" />
            </Field>
            <Field label="Phone">
              <Input name="phone" placeholder="+880 ..." />
            </Field>
            <Field label="Source">
              <Select name="source">
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Agent">Agent</option>
                <option value="Social media">Social media</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
            <Field label="Target country">
              <Select name="targetCountry">
                <option value="Cyprus">Cyprus</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
              </Select>
            </Field>
            <Field label="University">
              <Input name="targetUniversity" placeholder="e.g. UCLan Cyprus" />
            </Field>
            <Field label="Program">
              <Input name="targetProgram" placeholder="e.g. BSc Computer Science" />
            </Field>
            <Field label="Intake">
              <Input name="targetIntake" defaultValue="Fall 2026" />
            </Field>
          </FormGrid>
        </form>
      </Modal>
    </>
  );
}
