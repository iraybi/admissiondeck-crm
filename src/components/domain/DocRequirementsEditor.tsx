"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select, FormGrid } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

export function DocRequirementsEditor() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/doc-requirements", {
        method: "POST",
        body: JSON.stringify({
          scope: data.get("scope"),
          scopeId: data.get("scopeId") || null,
          docType: data.get("docType"),
          label: data.get("label"),
          description: data.get("description") || null,
          isRequired: data.get("isRequired") === "on",
          maxFiles: Number(data.get("maxFiles") || 1),
          maxBytes: Number(data.get("maxBytes") || 15 * 1024 * 1024),
          sortOrder: Number(data.get("sortOrder") || 0),
        }),
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (res.ok) {
        setMessage({ ok: true, text: "Rule saved." });
        form.reset();
      } else {
        setMessage({ ok: false, text: json.error ?? "Failed to save." });
      }
    } catch {
      setMessage({ ok: false, text: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add document rule</Button>

      <Modal
        open={open}
        title="New document requirement"
        onClose={() => {
          setOpen(false);
          setMessage(null);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="doc-rule-form" disabled={busy}>
              {busy ? "Saving..." : "Save rule"}
            </Button>
          </>
        }
      >
        <form id="doc-rule-form" onSubmit={handleSubmit}>
          {message ? (
            <div
              className={`status-row ${message.ok ? "is-ok" : "is-bad"}`}
              style={{ marginBottom: "var(--space-4)" }}
            >
              <div className="text-sm">{message.text}</div>
            </div>
          ) : null}

          <FormGrid>
            <Field label="Scope">
              <Select name="scope" defaultValue="COUNTRY">
                <option value="GLOBAL">Global (all countries)</option>
                <option value="COUNTRY">Country</option>
                <option value="UNIVERSITY">University</option>
                <option value="PROGRAMME">Programme</option>
                <option value="INTAKE">Intake</option>
                <option value="STUDENT">Student override</option>
              </Select>
            </Field>
            <Field label="Scope ID" hint="Country name, university ID, etc. Leave blank for global.">
              <Input name="scopeId" placeholder="e.g. Cyprus" />
            </Field>
            <Field label="Document type" hint="Machine-readable key">
              <Input name="docType" required placeholder="e.g. POLICE_CLEARANCE" />
            </Field>
            <Field label="Label" hint="Display name for students">
              <Input name="label" required placeholder="e.g. Police clearance" />
            </Field>
            <Field label="Description" className="full">
              <Textarea
                name="description"
                rows={2}
                placeholder="Help text shown to students"
              />
            </Field>
            <Field label="Max files">
              <Input name="maxFiles" type="number" defaultValue={1} min={1} />
            </Field>
            <Field label="Max size (bytes)">
              <Input name="maxBytes" type="number" defaultValue={15728640} min={1024} />
            </Field>
            <Field label="Sort order">
              <Input name="sortOrder" type="number" defaultValue={0} min={0} />
            </Field>
            <Field label="Required">
              <input type="checkbox" name="isRequired" defaultChecked />
            </Field>
          </FormGrid>
        </form>
      </Modal>
    </>
  );
}
