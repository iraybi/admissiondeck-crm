"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  revokeAllSessionsAction,
} from "@/lib/auth/actions";

export function RevokeSessionButtons() {
  const router = useRouter();

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        if (res.ok) router.push("/login");
      }}
    >
      Sign out
    </Button>
  );
}
