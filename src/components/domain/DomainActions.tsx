"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function DomainActions({
  domainId,
  hostname,
  verified,
  dnsToken,
}: {
  domainId: string;
  hostname: string;
  verified: boolean;
  dnsToken: string;
}) {
  const router = useRouter();
  const [showDns, setShowDns] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleVerify() {
    setBusy(true);
    try {
      const res = await fetch(`/api/domains/${domainId}/verify`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.ok) {
        router.refresh();
      } else {
        alert(json.error ?? "Verification failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${hostname}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/domains/${domainId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {!verified ? (
          <Button size="sm" disabled={busy} onClick={handleVerify}>
            {busy ? "Verifying..." : "Verify"}
          </Button>
        ) : null}
        <Button size="sm" variant="secondary" onClick={() => setShowDns(true)}>
          DNS
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={handleRemove}>
          Remove
        </Button>
      </div>

      <Modal
        open={showDns}
        title={`DNS record for ${hostname}`}
        onClose={() => setShowDns(false)}
        footer={
          <Button variant="secondary" onClick={() => setShowDns(false)}>
            Close
          </Button>
        }
      >
        <p className="text-sm">
          Add this TXT record to your DNS provider, then click Verify.
        </p>
        <div
          className="status-row is-brand"
          style={{ marginTop: "var(--space-3)" }}
        >
          <div>
            <div className="text-sm font-medium">Record type</div>
            <div className="text-sm">TXT</div>
          </div>
        </div>
        <div className="status-row is-brand" style={{ marginTop: "var(--space-2)" }}>
          <div>
            <div className="text-sm font-medium">Name</div>
            <code className="text-sm">_admissiondeck.{hostname}</code>
          </div>
        </div>
        <div className="status-row is-brand" style={{ marginTop: "var(--space-2)" }}>
          <div>
            <div className="text-sm font-medium">Value</div>
            <code className="text-sm">{dnsToken}</code>
          </div>
        </div>
      </Modal>
    </>
  );
}
