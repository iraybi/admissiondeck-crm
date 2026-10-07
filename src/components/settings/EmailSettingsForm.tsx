"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, FormGrid } from "@/components/ui/Field";

export function EmailSettingsForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [config, setConfig] = useState({
    provider: "console",
    fromName: "",
    fromEmail: "",
    replyTo: "",
  });

  useEffect(() => {
    fetch("/api/settings/email")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setConfig({
            provider: data.config.provider || "console",
            fromName: data.config.fromName || "",
            fromEmail: data.config.fromEmail || "",
            replyTo: data.config.replyTo || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/settings/email", {
        method: "PUT",
        body: JSON.stringify({
          provider: data.get("provider"),
          fromName: data.get("fromName"),
          fromEmail: data.get("fromEmail"),
          replyTo: data.get("replyTo"),
          smtpHost: data.get("smtpHost"),
          smtpPort: data.get("smtpPort"),
          smtpUser: data.get("smtpUser"),
          smtpPass: data.get("smtpPass"),
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setMessage({ ok: true, text: "Email settings saved." });
      } else {
        const json = await res.json();
        setMessage({ ok: false, text: json.error ?? "Failed to save" });
      }
    } catch {
      setMessage({ ok: false, text: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-head">
        <h2>Sender configuration</h2>
      </div>

      {message ? (
        <div
          className={`status-row ${message.ok ? "is-ok" : "is-bad"}`}
          style={{ marginBottom: "var(--space-4)" }}
        >
          <div className="text-sm">{message.text}</div>
        </div>
      ) : null}

      <FormGrid>
        <Field label="Provider">
          <Select name="provider" defaultValue={config.provider}>
            <option value="console">Console (development)</option>
            <option value="resend">Resend</option>
            <option value="smtp">SMTP</option>
          </Select>
        </Field>
        <Field label="From name" hint="Shown in the email header">
          <Input name="fromName" defaultValue={config.fromName} placeholder="Your Agency Name" />
        </Field>
        <Field label="From email">
          <Input name="fromEmail" type="email" defaultValue={config.fromEmail} placeholder="noreply@youragency.com" />
        </Field>
        <Field label="Reply-to email">
          <Input name="replyTo" type="email" defaultValue={config.replyTo} placeholder="support@youragency.com" />
        </Field>
        <Field label="SMTP host" hint="Only needed for SMTP provider">
          <Input name="smtpHost" placeholder="smtp.gmail.com" />
        </Field>
        <Field label="SMTP port">
          <Input name="smtpPort" type="number" placeholder="587" />
        </Field>
        <Field label="SMTP username">
          <Input name="smtpUser" placeholder="your@email.com" />
        </Field>
        <Field label="SMTP password">
          <Input name="smtpPass" type="password" placeholder="••••••••" />
        </Field>
      </FormGrid>

      <div style={{ marginTop: "var(--space-4)" }}>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save email settings"}
        </Button>
      </div>
    </form>
  );
}
