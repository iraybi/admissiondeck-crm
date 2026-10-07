"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ImageUpload } from "@/components/settings/ImageUpload";
import {
  updateProfileAction,
  type ActionResult,
} from "@/lib/auth/actions";

type Props = {
  initial: {
    name: string;
    email: string;
    phone: string;
    avatarUrl: string;
  };
};

export function ProfileForm({ initial }: Props) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateProfileAction,
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

      <ImageUpload
        kind="avatar"
        name="avatarUrl"
        label="Profile photo"
        currentUrl={initial.avatarUrl}
        currentName={initial.name}
        round
      />

      <Field label="Full name">
        <Input name="name" defaultValue={initial.name} required />
      </Field>
      <Field label="Work email">
        <Input name="email" type="email" defaultValue={initial.email} required />
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={initial.phone} placeholder="+880 ..." />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
