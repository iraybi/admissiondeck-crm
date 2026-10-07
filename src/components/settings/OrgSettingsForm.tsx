"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, FormGrid } from "@/components/ui/Field";
import { ImageUpload } from "@/components/settings/ImageUpload";
import {
  updateOrgAction,
  type ActionResult,
} from "@/lib/auth/actions";

type OrgValues = {
  name: string;
  website: string;
  supportEmail: string;
  phone: string;
  addressLine1: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
  brandColor: string;
  logoUrl: string;
};

export function OrgSettingsForm({ initial }: { initial: OrgValues }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateOrgAction,
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
        kind="logo"
        name="logoUrl"
        label="Organization logo"
        currentUrl={initial.logoUrl}
      />

      <FormGrid>
        <Field label="Organization name" className="full">
          <Input name="name" defaultValue={initial.name} required />
        </Field>
        <Field label="Website">
          <Input name="website" defaultValue={initial.website} placeholder="https://" />
        </Field>
        <Field label="Support email">
          <Input name="supportEmail" type="email" defaultValue={initial.supportEmail} />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={initial.phone} />
        </Field>
        <Field label="Brand color">
          <Input name="brandColor" defaultValue={initial.brandColor} placeholder="#E2555A" />
        </Field>
        <Field label="Address" className="full">
          <Input name="addressLine1" defaultValue={initial.addressLine1} />
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={initial.city} />
        </Field>
        <Field label="Country">
          <Input name="country" defaultValue={initial.country} />
        </Field>
        <Field label="Timezone">
          <Select name="timezone" defaultValue={initial.timezone}>
            <option value="UTC">UTC</option>
            <option value="Asia/Dhaka">Asia/Dhaka</option>
            <option value="Asia/Kolkata">Asia/Kolkata</option>
            <option value="Asia/Kathmandu">Asia/Kathmandu</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/Toronto">America/Toronto</option>
          </Select>
        </Field>
        <Field label="Currency">
          <Select name="currency" defaultValue={initial.currency}>
            <option value="BDT">BDT</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="EUR">EUR</option>
            <option value="CAD">CAD</option>
          </Select>
        </Field>
      </FormGrid>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save organization"}
        </Button>
      </div>
    </form>
  );
}
