"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { markCommissionPaidAction } from "@/lib/actions/payments";

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
        try {
          await markCommissionPaidAction(paymentId);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Paying..." : "Mark paid"}
    </Button>
  );
}
