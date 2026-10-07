"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea, FormGrid } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

export function ReferralActions() {
  const router = useRouter();
  const [modal, setModal] = useState<"create" | "convert" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleCreateReferral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        body: JSON.stringify({
          referrerName: data.get("referrerName"),
          referrerEmail: data.get("referrerEmail"),
          referrerPhone: data.get("referrerPhone"),
          referrerType: data.get("referrerType"),
          company: data.get("company"),
          commissionRate: Number(data.get("commissionRate")) / 100,
          notes: data.get("notes"),
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        setModal(null);
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

  async function handleRecordConversion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/referrals/convert", {
        method: "POST",
        body: JSON.stringify({
          referralId: data.get("referralId"),
          tenantName: data.get("tenantName"),
          plan: data.get("plan"),
          seatCount: Number(data.get("seatCount")),
          monthlyValue: Number(data.get("monthlyValue")),
          notes: data.get("notes"),
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        setModal(null);
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
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <Button variant="secondary" onClick={() => setModal("convert")}>
          Record conversion
        </Button>
        <Button onClick={() => setModal("create")}>Add referrer</Button>
      </div>

      {/* Create referral modal */}
      <Modal
        open={modal === "create"}
        title="Add referrer"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" form="create-referral-form" disabled={busy}>
              {busy ? "Adding..." : "Add referrer"}
            </Button>
          </>
        }
      >
        <form id="create-referral-form" onSubmit={handleCreateReferral}>
          {message ? (
            <div className={`status-row ${message.ok ? "is-ok" : "is-bad"}`} style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm">{message.text}</div>
            </div>
          ) : null}
          <FormGrid>
            <Field label="Name">
              <Input name="referrerName" required placeholder="Referrer's full name" />
            </Field>
            <Field label="Email">
              <Input name="referrerEmail" type="email" placeholder="referrer@email.com" />
            </Field>
            <Field label="Phone">
              <Input name="referrerPhone" placeholder="+880 ..." />
            </Field>
            <Field label="Type">
              <Select name="referrerType" defaultValue="PARTNER">
                <option value="PARTNER">Partner</option>
                <option value="AGENCY">Agency</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="EMPLOYEE">Employee</option>
              </Select>
            </Field>
            <Field label="Company">
              <Input name="company" placeholder="Company name" />
            </Field>
            <Field label="Commission rate (%)">
              <Input name="commissionRate" type="number" defaultValue="10" min={0} max={100} step={0.5} />
            </Field>
            <Field label="Notes" className="full">
              <Textarea name="notes" rows={2} placeholder="Any notes about this referrer" />
            </Field>
          </FormGrid>
        </form>
      </Modal>

      {/* Record conversion modal */}
      <Modal
        open={modal === "convert"}
        title="Record referral conversion"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" form="convert-form" disabled={busy}>
              {busy ? "Recording..." : "Record conversion"}
            </Button>
          </>
        }
      >
        <form id="convert-form" onSubmit={handleRecordConversion}>
          {message ? (
            <div className={`status-row ${message.ok ? "is-ok" : "is-bad"}`} style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm">{message.text}</div>
            </div>
          ) : null}
          <FormGrid>
            <Field label="Referrer ID" className="full" hint="The referrer who brought this tenant">
              <Input name="referralId" required placeholder="Referral ID from the list above" />
            </Field>
            <Field label="Tenant name">
              <Input name="tenantName" required placeholder="e.g. Global Study Agency" />
            </Field>
            <Field label="Plan">
              <Select name="plan" defaultValue="ENTERPRISE_FIRM">
                <option value="ENTERPRISE_FIRM">Enterprise Firm</option>
                <option value="STANDARD_AGENCY">Standard Agency</option>
                <option value="TRIAL">Trial</option>
              </Select>
            </Field>
            <Field label="Seat count">
              <Input name="seatCount" type="number" defaultValue={10} min={1} />
            </Field>
            <Field label="Monthly value (BDT)">
              <Input name="monthlyValue" type="number" required min={0} />
            </Field>
            <Field label="Notes" className="full">
              <Textarea name="notes" rows={2} placeholder="Any notes about this conversion" />
            </Field>
          </FormGrid>
        </form>
      </Modal>
    </>
  );
}

export function MarkPaidButton({ conversionId }: { conversionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/referrals/pay", {
          method: "POST",
          body: JSON.stringify({ conversionId }),
          headers: { "Content-Type": "application/json" },
        });
        setBusy(false);
        router.refresh();
      }}
    >
      {busy ? "Paying..." : "Mark paid"}
    </Button>
  );
}
