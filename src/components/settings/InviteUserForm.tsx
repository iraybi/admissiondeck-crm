"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, FormGrid } from "@/components/ui/Field";
import {
  inviteUserAction,
  type ActionResult,
} from "@/lib/auth/actions";

export function InviteUserForm({
  orgId,
  canInvite,
}: {
  orgId: string;
  canInvite: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    inviteUserAction,
    null,
  );

  if (!canInvite) return null;

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

      <input type="hidden" name="orgId" value={orgId} />

      <FormGrid>
        <Field label="Full name">
          <Input name="name" required placeholder="e.g. Sabbir Khan" />
        </Field>
        <Field label="Work email">
          <Input name="email" type="email" required placeholder="name@chs.edu.bd" />
        </Field>
        <Field label="Role">
          <Select name="role" defaultValue="COUNSELLOR">
            <option value="COUNSELLOR">Counsellor</option>
            <option value="AGENCY_MANAGER">Agency manager</option>
            <option value="FIRM_MANAGER">Firm manager</option>
            <option value="AGENT">Recruiting agent</option>
          </Select>
        </Field>
        <Field label="Seat impact">
          <Input value="Reserves 1 seat on accept" disabled />
        </Field>
      </FormGrid>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending..." : "Send invite"}
        </Button>
      </div>
    </form>
  );
}
