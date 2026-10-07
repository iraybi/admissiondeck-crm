"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  startReviewAction,
  verifyPaymentAction,
  rejectPaymentAction,
  type ActionResult,
} from "@/lib/actions/payments";

export function PaymentReviewActions({
  paymentId,
  state,
}: {
  paymentId: string;
  state: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"verify" | "reject" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const canReview = state === "IN_REVIEW";
  const canStart = state === "AWAITING_PROOF";
  const canVerify = state === "IN_REVIEW";
  const canReject = state === "IN_REVIEW";

  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {canStart ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await startReviewAction(paymentId);
              router.refresh();
            }}
          >
            Start review
          </Button>
        ) : null}
        {canVerify ? (
          <Button
            size="sm"
            onClick={() => {
              setModal("verify");
              setMessage(null);
            }}
          >
            Verify
          </Button>
        ) : null}
        {canReject ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setModal("reject");
              setMessage(null);
            }}
          >
            Reject
          </Button>
        ) : null}
        {!canReview && !canStart && !canVerify && !canReject ? (
          <span className="text-sm muted">No actions</span>
        ) : null}
      </div>

      <Modal
        open={modal === "verify"}
        title="Verify payment"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const form = document.getElementById("verify-form") as HTMLFormElement;
                const formData = new FormData(form);
                formData.set("paymentId", paymentId);
                const result = await verifyPaymentAction(null, formData);
                if (result.ok) {
                  setModal(null);
                  router.refresh();
                } else {
                  setMessage({ ok: false, text: result.error });
                }
              }}
            >
              Confirm verification
            </Button>
          </>
        }
      >
        <form id="verify-form">
          {message ? (
            <div
              className={`status-row ${message.ok ? "is-ok" : "is-bad"}`}
              style={{ marginBottom: "var(--space-3)" }}
            >
              <div className="text-sm">{message.text}</div>
            </div>
          ) : null}
          <p className="text-sm" style={{ marginBottom: "var(--space-3)" }}>
            Confirm that the receipt matches the expected amount and the funds
            have cleared the agency&apos;s bank account.
          </p>
          <Field label="Verification note" hint="Optional. Recorded in the audit log.">
            <Textarea name="note" rows={3} placeholder="Amount matches. Funds cleared." />
          </Field>
        </form>
      </Modal>

      <Modal
        open={modal === "reject"}
        title="Reject payment proof"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                const form = document.getElementById("reject-form") as HTMLFormElement;
                const formData = new FormData(form);
                formData.set("paymentId", paymentId);
                const result = await rejectPaymentAction(null, formData);
                if (result.ok) {
                  setModal(null);
                  router.refresh();
                } else {
                  setMessage({ ok: false, text: result.error });
                }
              }}
            >
              Confirm rejection
            </Button>
          </>
        }
      >
        <form id="reject-form">
          {message ? (
            <div
              className={`status-row is-bad`}
              style={{ marginBottom: "var(--space-3)" }}
            >
              <div className="text-sm">{message.text}</div>
            </div>
          ) : null}
          <p className="text-sm" style={{ marginBottom: "var(--space-3)" }}>
            The student will see this reason and be asked to resubmit.
          </p>
          <Field label="Rejection reason" hint="Required. Explain the discrepancy.">
            <Textarea
              name="reason"
              rows={3}
              required
              placeholder="Receipt amount is short by BDT 20,000. Please re-upload."
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
