"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select, FormGrid } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  createPaymentAction,
  verifyPaymentAction,
  rejectPaymentAction,
  refundPaymentAction,
  type ActionResult,
} from "@/lib/actions/payments";

export function PaymentCreateForm({ studentId }: { studentId?: string }) {
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
    if (studentId) data.set("studentId", studentId);

    const result = await createPaymentAction(null, data);
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
      <Button onClick={() => setOpen(true)}>Create payment</Button>
      <Modal
        open={open}
        title="New payment obligation"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-payment-form" disabled={busy}>
              {busy ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <form id="create-payment-form" onSubmit={handleSubmit}>
          {message ? (
            <div className={`status-row ${message.ok ? "is-ok" : "is-bad"}`} style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm">{message.text}</div>
            </div>
          ) : null}
          <FormGrid>
            {!studentId ? (
              <Field label="Student ID">
                <Input name="studentId" required />
              </Field>
            ) : null}
            <Field label="Title">
              <Input name="title" required placeholder="e.g. Tuition deposit" />
            </Field>
            <Field label="Amount">
              <Input name="amount" type="number" required min={0} step="0.01" />
            </Field>
            <Field label="Method">
              <Select name="method" defaultValue="SWIFT">
                <option value="CHEQUE">Cheque</option>
                <option value="SWIFT">SWIFT transfer</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Field label="Milestone">
              <Input name="milestone" placeholder="e.g. Tuition deposit paid" />
            </Field>
            <Field label="Due date">
              <Input type="date" name="dueAt" />
            </Field>
          </FormGrid>
        </form>
      </Modal>
    </>
  );
}

export function PaymentActions({ paymentId, state }: { paymentId: string; state: string }) {
  const router = useRouter();
  const [modal, setModal] = useState<"verify" | "reject" | "refund" | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAction(e: React.FormEvent<HTMLFormElement>, action: "verify" | "reject" | "refund") {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("paymentId", paymentId);

    if (action === "verify") await verifyPaymentAction(null, data);
    if (action === "reject") await rejectPaymentAction(null, data);
    if (action === "refund") await refundPaymentAction(null, data);

    setModal(null);
    setBusy(false);
    router.refresh();
  }

  if (state === "IN_REVIEW") {
    return (
      <>
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="sm" onClick={() => setModal("verify")}>Verify</Button>
          <Button size="sm" variant="danger" onClick={() => setModal("reject")}>Reject</Button>
        </div>
        <Modal open={modal === "verify"} title="Verify payment" onClose={() => setModal(null)}
          footer={<>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" form="verify-form" disabled={busy}>Confirm</Button>
          </>}>
          <form id="verify-form" onSubmit={(e) => handleAction(e, "verify")}>
            <Field label="Note (optional)">
              <Textarea name="note" rows={2} placeholder="Amount matches. Funds cleared." />
            </Field>
          </form>
        </Modal>
        <Modal open={modal === "reject"} title="Reject payment" onClose={() => setModal(null)}
          footer={<>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" form="reject-form" variant="danger" disabled={busy}>Confirm rejection</Button>
          </>}>
          <form id="reject-form" onSubmit={(e) => handleAction(e, "reject")}>
            <Field label="Rejection reason (required)">
              <Textarea name="reason" rows={3} required placeholder="Explain the discrepancy" />
            </Field>
          </form>
        </Modal>
      </>
    );
  }

  if (state === "VERIFIED") {
    return (
      <>
        <Button size="sm" variant="secondary" onClick={() => setModal("refund")}>Refund</Button>
        <Modal open={modal === "refund"} title="Refund payment" onClose={() => setModal(null)}
          footer={<>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" form="refund-form" variant="danger" disabled={busy}>Confirm refund</Button>
          </>}>
          <form id="refund-form" onSubmit={(e) => handleAction(e, "refund")}>
            <Field label="Refund reason (required)">
              <Textarea name="reason" rows={3} required placeholder="Why is this being refunded?" />
            </Field>
          </form>
        </Modal>
      </>
    );
  }

  return <span className="text-sm muted">No actions</span>;
}
