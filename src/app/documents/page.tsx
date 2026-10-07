"use client";

import { useState } from "react";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Status, StatusRow } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { documents, students } from "@/lib/demo-data";
import type { DocPipelineState } from "@/lib/types";
import { adminNav, currentUser, firmOrg } from "@/lib/portal";
import { formatDate } from "@/lib/utils";

const STATE_META: Record<
  DocPipelineState,
  { label: string; tone: "warn" | "brand" | "ok" | "bad" }
> = {
  quarantine: { label: "Security review", tone: "warn" },
  scanning: { label: "Scanning", tone: "brand" },
  available: { label: "Available", tone: "ok" },
  rejected: { label: "Rejected", tone: "bad" },
};

const studentName = (id: string) =>
  students.find((s) => s.id === id)?.name ?? id;

export default function DocumentsPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const current = documents.find((d) => d.id === openId) ?? null;

  return (
    <Shell
      portal="admin"
      orgName={firmOrg.name}
      orgPath={firmOrg.path}
      user={{ name: currentUser.name, role: "Firm manager" }}
      nav={adminNav}
    >
      <PageHead
        title="Documents"
        subtitle="Quarantine, malware scan, and release workflow"
        actions={<Button variant="secondary">Request upload URL</Button>}
      />

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Document queue</h2>
          </div>
          <Table
            columns={[
              { key: "name", label: "Document" },
              { key: "student", label: "Student" },
              { key: "state", label: "State" },
              { key: "at", label: "Uploaded" },
            ]}
          >
            {documents.map((d) => {
              const meta = STATE_META[d.state];
              return (
                <Row key={d.id} onClick={() => setOpenId(d.id)} interactive>
                  <Cell>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm muted">{d.fileName}</div>
                  </Cell>
                  <Cell>{studentName(d.studentId)}</Cell>
                  <Cell>
                    <Status tone={meta.tone}>{meta.label}</Status>
                  </Cell>
                  <Cell>{formatDate(d.at)}</Cell>
                </Row>
              );
            })}
          </Table>
        </section>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Upload pipeline</h2>
            </div>
            <div className="stack-sm">
              <StatusRow
                tone="ok"
                title="Presigned URL issued"
                detail="Direct to object storage, 60s expiry"
              />
              <StatusRow
                tone="ok"
                title="Quarantine bucket"
                detail="Restricted, not downloadable by staff"
              />
              <StatusRow
                tone="brand"
                title="Malware scan"
                detail="Signature check before release"
              />
              <StatusRow
                tone="info"
                title="Release or purge"
                detail="Clean files move to the production bucket"
              />
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Policy</h2>
            </div>
            <div className="stack-sm">
              <StatusRow
                tone="warn"
                title="Zero-trust uploads"
                detail="Every file is treated as untrusted until scanning clears it"
              />
              <StatusRow
                tone="warn"
                title="Rejected files are purged"
                detail="Quarantine is emptied and admins are alerted"
              />
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={!!current}
        title={current?.name ?? ""}
        onClose={() => setOpenId(null)}
        footer={<Button variant="secondary" onClick={() => setOpenId(null)}>Close</Button>}
      >
        {current ? (
          <>
            <div className="card" style={{ minHeight: 120 }}>
              <div className="font-medium">{current.fileName}</div>
              <div className="text-sm muted" style={{ marginTop: 6 }}>
                {current.state === "available"
                  ? "Cleared for download"
                  : current.state === "rejected"
                    ? "Purged after security rejection"
                    : "Held in quarantine until scan completes"}
              </div>
            </div>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "8px 12px",
                fontSize: "var(--text-base)",
              }}
            >
              <dt className="muted">Student</dt>
              <dd style={{ margin: 0 }}>{studentName(current.studentId)}</dd>
              <dt className="muted">Uploaded</dt>
              <dd style={{ margin: 0 }}>{formatDate(current.at)}</dd>
              <dt className="muted">Bucket</dt>
              <dd style={{ margin: 0 }}>
                {current.state === "available"
                  ? "production-docs"
                  : "quarantine-uploads"}
              </dd>
            </dl>
            {current.state === "quarantine" || current.state === "scanning" ? (
              <StatusRow
                tone="warn"
                title="Download disabled"
                detail="Files in quarantine or scanning cannot be downloaded"
              />
            ) : null}
          </>
        ) : null}
      </Modal>
    </Shell>
  );
}
