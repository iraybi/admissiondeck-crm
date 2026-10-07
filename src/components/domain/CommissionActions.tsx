"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, FormGrid } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  createCommissionAction,
  markCommissionPaidAction,
  type ActionResult,
} from "@/lib/actions/payments";

export function CommissionCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const result = await createCommissionAction(null, data);

    if (result.ok) {
      setOpen(false);
      form.reset();
      router.refresh();
    } else {
      setMessage({ ok: false, text: result.error });
    }
    setBusy(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Create commission</Button>
      <Modal
        open={open}
        title="New commission entry"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="commission-form" disabled={busy}>
              {busy ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <form id="commission-form" onSubmit={handleSubmit}>
          {message ? (
            <div className={`status-row ${message.ok ? "is-ok" : "is-bad"}`} style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm">{message.text}</div>
            </div>
          ) : null}
          <FormGrid>
            <Field label="Student ID">
              <Input name="studentId" required />
            </Field>
            <Field label="Base amount">
              <Input name="baseAmount" type="number" required min={0} step="0.01" />
            </Field>
          </FormGrid>
        </form>
      </Modal>
    </>
  );
}

export function CommissionPayButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await markCommissionPaidAction(paymentId);
        setBusy(false);
        router.refresh();
      }}
    >
      {busy ? "Paying..." : "Mark paid"}
    </Button>
  );
}
