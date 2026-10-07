"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  revokeSessionAction,
  revokeAllSessionsAction,
} from "@/lib/auth/actions";

export function SessionActions({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await revokeSessionAction(sessionId);
        router.refresh();
      }}
    >
      Revoke
    </Button>
  );
}

export function RevokeAllButton() {
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await revokeAllSessionsAction();
        router.refresh();
      }}
    >
      Sign out everywhere else
    </Button>
  );
}
