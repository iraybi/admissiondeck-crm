"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, FormGrid } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

export function CountryActions({
  countryId,
  countryName,
  isActive,
}: {
  countryId: string;
  countryName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [showFields, setShowFields] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      await fetch(`/api/catalog/countries/${countryId}/toggle`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveFields(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      await fetch(`/api/catalog/countries/${countryId}/fields`, {
        method: "PUT",
        body: JSON.stringify({
          visaType: data.get("visaType"),
          processingTime: data.get("processingTime"),
          bankStatementMonths: data.get("bankStatementMonths"),
          notes: data.get("notes"),
        }),
        headers: { "Content-Type": "application/json" },
      });
      setShowFields(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Button size="sm" variant="secondary" onClick={() => setShowFields(true)}>
          Fields
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={toggleActive}>
          {isActive ? "Disable" : "Enable"}
        </Button>
      </div>

      <Modal
        open={showFields}
        title={`Custom fields: ${countryName}`}
        onClose={() => setShowFields(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowFields(false)}>
              Cancel
            </Button>
            <Button type="submit" form="country-fields-form" disabled={busy}>
              Save
            </Button>
          </>
        }
      >
        <form id="country-fields-form" onSubmit={saveFields}>
          <FormGrid>
            <Field label="Visa type">
              <Input name="visaType" placeholder="e.g. Student visa" />
            </Field>
            <Field label="Processing time">
              <Input name="processingTime" placeholder="e.g. 4-6 weeks" />
            </Field>
            <Field label="Bank statement months">
              <Input name="bankStatementMonths" type="number" placeholder="e.g. 6" />
            </Field>
            <Field label="Notes">
              <Textarea name="notes" rows={3} placeholder="Any special requirements" />
            </Field>
          </FormGrid>
        </form>
      </Modal>
    </>
  );
}
