"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, FormGrid } from "@/components/ui/Field";
import { Status } from "@/components/ui/Status";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";

export type AppNode = {
  country: string;
  applications: {
    id: string;
    status: string;
    submittedAt: string | null;
    decidedAt: string | null;
    universityName: string;
    universityCity: string | null;
    programName: string;
    programLevel: string;
    tuitionAmount: number | null;
    tuitionCurrency: string;
    offerCount: number;
    paymentCount: number;
  }[];
  counts: {
    total: number;
    submitted: number;
    offers: number;
    accepted: number;
    rejected: number;
  };
};

const STATUS_TONE: Record<string, "ok" | "brand" | "warn" | "bad" | "info" | "muted"> = {
  DRAFT: "muted",
  SUBMITTED: "brand",
  UNDER_REVIEW: "info",
  OFFER: "ok",
  OFFER_ACCEPTED: "ok",
  REJECTED: "bad",
  WITHDRAWN: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  OFFER: "Offer received",
  OFFER_ACCEPTED: "Offer accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export function ApplicationTree({
  studentId,
  tree,
  universities,
}: {
  studentId: string;
  tree: AppNode[];
  universities: {
    id: string;
    name: string;
    country: string;
    city: string | null;
    programs: {
      id: string;
      name: string;
      level: string;
      tuitionAmount: number | null;
      currency: string;
    }[];
  }[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedUni, setSelectedUni] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const countries = [...new Set(universities.map((u) => u.country))].sort();
  const filteredUnis = selectedCountry
    ? universities.filter((u) => u.country === selectedCountry)
    : universities;
  const selectedUniObj = universities.find((u) => u.id === selectedUni);

  async function handleAddApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          studentId,
          universityId: data.get("universityId"),
          programId: data.get("programId"),
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        setAddOpen(false);
        form.reset();
        router.refresh();
      } else {
        setMessage({ ok: false, text: json.error });
      }
    } catch {
      setMessage({ ok: false, text: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card-head">
        <h2>Applications ({tree.reduce((t, c) => t + c.counts.total, 0)})</h2>
        <div className="card-head-aside">
          <Button onClick={() => setAddOpen(true)}>Add application</Button>
        </div>
      </div>

      {tree.length === 0 ? (
        <div className="empty">
          No applications yet. Add one to start tracking university applications.
        </div>
      ) : (
        <div className="stack">
          {tree.map((countryNode) => (
            <div key={countryNode.country} className="card">
              <div className="card-head">
                <h3>{countryNode.country}</h3>
                <div className="card-head-aside">
                  <span className="text-sm muted">
                    {countryNode.counts.total} applications · {countryNode.counts.offers} offers · {countryNode.counts.rejected} rejected
                  </span>
                </div>
              </div>

              <div className="divided">
                {countryNode.applications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="divided-row" style={{ cursor: "pointer" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-medium">{app.universityName}</div>
                        <div className="text-sm muted">
                          {app.programName} · {app.programLevel}
                          {app.tuitionAmount
                            ? ` · ${app.tuitionCurrency} ${app.tuitionAmount.toLocaleString()}`
                            : ""}
                        </div>
                        {app.universityCity ? (
                          <div className="text-xs muted">{app.universityCity}</div>
                        ) : null}
                      </div>
                      <div style={{ minWidth: 120 }}>
                        <Status tone={STATUS_TONE[app.status] ?? "neutral"}>
                          {STATUS_LABEL[app.status] ?? app.status}
                        </Status>
                        {app.offerCount > 0 ? (
                          <div className="text-xs muted" style={{ marginTop: 4 }}>
                            {app.offerCount} offer{app.offerCount === 1 ? "" : "s"}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add application modal */}
      <Modal
        open={addOpen}
        title="Add university application"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" form="add-app-form" disabled={busy}>
              {busy ? "Adding..." : "Add application"}
            </Button>
          </>
        }
      >
        <form id="add-app-form" onSubmit={handleAddApplication}>
          {message ? (
            <div className={`status-row ${message.ok ? "is-ok" : "is-bad"}`} style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm">{message.text}</div>
            </div>
          ) : null}

          <FormGrid>
            <Field label="Country">
              <Select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedUni("");
                }}
              >
                <option value="">All countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="University">
              <Select
                value={selectedUni}
                onChange={(e) => setSelectedUni(e.target.value)}
                required
              >
                <option value="">Select university</option>
                {filteredUnis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.country})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Program" className="full">
              <Select name="programId" required disabled={!selectedUniObj}>
                <option value="">Select program</option>
                {selectedUniObj?.programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.level})
                    {p.tuitionAmount ? ` · ${p.currency} ${p.tuitionAmount.toLocaleString()}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
        </form>
      </Modal>
    </>
  );
}
