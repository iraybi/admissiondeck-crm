"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, FormGrid } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

export function AddDomainForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        body: JSON.stringify({
          orgId,
          hostname: data.get("hostname"),
          pathPrefix: data.get("pathPrefix") || null,
          portal: data.get("portal"),
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        setError(json.error ?? "Failed to add domain");
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add domain</Button>

      <Modal
        open={open}
        title="Add custom domain"
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-domain-form" disabled={busy}>
              {busy ? "Adding..." : "Add domain"}
            </Button>
          </>
        }
      >
        <form id="add-domain-form" onSubmit={handleSubmit}>
          {error ? (
            <div className="status-row is-bad" style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm">{error}</div>
            </div>
          ) : null}

          <FormGrid>
            <Field label="Hostname" className="full" hint="e.g. students.yourdomain.com">
              <Input name="hostname" required placeholder="students.yourdomain.com" />
            </Field>
            <Field label="Path prefix" hint="Leave blank for subdomain mapping">
              <Input name="pathPrefix" placeholder="/students" />
            </Field>
            <Field label="Portal">
              <Select name="portal" defaultValue="student">
                <option value="student">Student portal</option>
                <option value="agent">Agent portal</option>
                <option value="counsellor">Counsellor portal</option>
                <option value="agency">Agency portal</option>
                <option value="firm">Firm console</option>
              </Select>
            </Field>
          </FormGrid>
        </form>
      </Modal>
    </>
  );
}
