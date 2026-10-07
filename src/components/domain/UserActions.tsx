"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, FormGrid } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  createStudentAction,
  deactivateUserAction,
  type ActionResult,
} from "@/lib/actions/workflow";

export function StudentCreateForm() {
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
    const result = await createStudentAction(null, data);

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
      <Button onClick={() => setOpen(true)}>Add student</Button>
      <Modal
        open={open}
        title="New student"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-student-form" disabled={busy}>
              {busy ? "Creating..." : "Create student"}
            </Button>
          </>
        }
      >
        <form id="create-student-form" onSubmit={handleSubmit}>
          {message ? (
            <div className={`status-row ${message.ok ? "is-ok" : "is-bad"}`} style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm">{message.text}</div>
            </div>
          ) : null}
          <FormGrid>
            <Field label="Full name">
              <Input name="name" required placeholder="Student's full name" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required placeholder="student@email.com" />
            </Field>
            <Field label="Phone">
              <Input name="phone" placeholder="+880 ..." />
            </Field>
            <Field label="Target country">
              <Select name="targetCountry" defaultValue="Cyprus">
                <option value="Cyprus">Cyprus</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
              </Select>
            </Field>
            <Field label="Target university">
              <Input name="targetUniversity" placeholder="e.g. UCLan Cyprus" />
            </Field>
            <Field label="Target programme">
              <Input name="targetProgram" placeholder="e.g. BSc Computer Science" />
            </Field>
            <Field label="Target intake">
              <Input name="targetIntake" defaultValue="Fall 2026" />
            </Field>
          </FormGrid>
        </form>
      </Modal>
    </>
  );
}

export function DeactivateUserButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Deactivate this user?")) return;
        setBusy(true);
        await deactivateUserAction(userId);
        setBusy(false);
        router.refresh();
      }}
    >
      {busy ? "Deactivating..." : "Deactivate"}
    </Button>
  );
}
