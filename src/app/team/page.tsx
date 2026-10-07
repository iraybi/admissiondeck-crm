"use client";

import { useState } from "react";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, FormGrid } from "@/components/ui/Field";
import { agencies, users } from "@/lib/demo-data";
import { adminNav, currentUser, firmOrg } from "@/lib/portal";

const ROLE_LABEL: Record<string, string> = {
  firm_manager: "Firm manager",
  agency_manager: "Agency manager",
  counsellor: "Counsellor",
  agent: "Recruiting agent",
  student: "Student",
  platform_admin: "Platform admin",
};

export default function TeamPage() {
  const [inviting, setInviting] = useState(false);
  const invited = users.filter((u) => u.status === "invited").length;

  return (
    <Shell
      portal="admin"
      orgName={firmOrg.name}
      orgPath={firmOrg.path}
      user={{ name: currentUser.name, role: "Firm manager" }}
      nav={adminNav}
    >
      <PageHead
        title="Team"
        subtitle="Counsellors, managers, and agents on this tenant"
        actions={<Button onClick={() => setInviting(true)}>Invite member</Button>}
      />

      <Table
        columns={[
          { key: "member", label: "Member" },
          { key: "role", label: "Role" },
          { key: "agency", label: "Agency" },
          { key: "status", label: "Status" },
          { key: "email", label: "Email" },
        ]}
      >
        {users.map((u) => {
          const agency = agencies.find((a) => a.id === u.orgId);
          return (
            <Row key={u.id}>
              <Cell>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Avatar name={u.name} size={32} />
                  <div>
                    <div className="font-medium">{u.name}</div>
                  </div>
                </div>
              </Cell>
              <Cell>{ROLE_LABEL[u.role] ?? u.role}</Cell>
              <Cell>{agency?.name ?? u.orgId}</Cell>
              <Cell>
                <Status tone={u.status === "active" ? "ok" : "warn"}>
                  {u.status === "active" ? "Active" : "Invited"}
                </Status>
              </Cell>
              <Cell>
                <span className="text-sm muted">{u.email}</span>
              </Cell>
            </Row>
          );
        })}
      </Table>

      <p className="text-sm muted" style={{ marginTop: "var(--space-4)" }}>
        {invited} pending invite{invited === 1 ? "" : "s"}. Each accepted invite
        reserves a seat and may trigger a prorated Stripe charge.
      </p>

      <Modal
        open={inviting}
        title="Invite team member"
        onClose={() => setInviting(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviting(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setInviting(false);
              }}
            >
              Send invite
            </Button>
          </>
        }
      >
        <FormGrid>
          <Field label="Full name">
            <Input placeholder="e.g. Sabbir Khan" />
          </Field>
          <Field label="Work email">
            <Input type="email" placeholder="name@chs.edu.bd" />
          </Field>
          <Field label="Role">
            <Select defaultValue="counsellor">
              <option value="counsellor">Counsellor</option>
              <option value="agency_manager">Agency manager</option>
              <option value="agent">Recruiting agent</option>
            </Select>
          </Field>
          <Field label="Agency">
            <Select defaultValue={agencies[0]?.id}>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <div className="status-row is-warn">
          <div>
            <div className="font-medium text-sm">Seat check</div>
            <div className="text-sm">
              The Stripe subscription will increase by 1 seat with proration for
              the remainder of the billing cycle.
            </div>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
