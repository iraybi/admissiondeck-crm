"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import {
  changePasswordAction,
  type ActionResult,
} from "@/lib/auth/actions";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    changePasswordAction,
    null,
  );

  return (
    <form action={formAction} style={{ display: "grid", gap: "var(--space-4)" }}>
      {state && !state.ok ? (
        <div className="status-row is-bad" role="alert">
          <div className="text-sm">{state.error}</div>
        </div>
      ) : null}
      {state && state.ok && state.message ? (
        <div className="status-row is-ok" role="status">
          <div className="text-sm">{state.message}</div>
        </div>
      ) : null}

      <Field label="Current password">
        <Input type="password" name="currentPassword" required autoComplete="current-password" />
      </Field>
      <Field label="New password" hint="At least 12 characters">
        <Input type="password" name="newPassword" required autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password">
        <Input type="password" name="confirmPassword" required autoComplete="new-password" />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Updating..." : "Change password"}
        </Button>
      </div>
    </form>
  );
}
