"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Textarea, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

export function ApplicationActions({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"status" | "offer" | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleStatusChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);

    await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: data.get("status"),
        reason: data.get("reason"),
      }),
      headers: { "Content-Type": "application/json" },
    });

    setModal(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => setModal("status")}>
          Update status
        </Button>
      </div>

      <Modal
        open={modal === "status"}
        title="Update application status"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" form="status-form" disabled={busy}>
              {busy ? "Updating..." : "Update"}
            </Button>
          </>
        }
      >
        <form id="status-form" onSubmit={handleStatusChange}>
          <Field label="Status">
            <Select name="status" defaultValue={currentStatus}>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="OFFER">Offer received</option>
              <option value="OFFER_ACCEPTED">Offer accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </Select>
          </Field>
          <Field label="Reason (optional)">
            <Textarea name="reason" rows={2} placeholder="Why is the status changing?" />
          </Field>
        </form>
      </Modal>
    </>
  );
}
