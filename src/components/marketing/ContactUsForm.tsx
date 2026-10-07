"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";

type SubmitResult = { ok: boolean; message: string } | null;

export function ContactUsForm({ context }: { context?: string }) {
  const [result, setResult] = useState<SubmitResult>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setResult(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          company: data.get("company"),
          message: data.get("message"),
          context: context ?? "pricing",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        setResult({
          ok: true,
          message: "Thank you. Our team will reach out shortly.",
        });
        form.reset();
      } else {
        setResult({ ok: false, message: json.error ?? "Something went wrong." });
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "var(--space-4)" }}>
      {result ? (
        <div
          className={`status-row ${result.ok ? "is-ok" : "is-bad"}`}
          role={result.ok ? "status" : "alert"}
        >
          <div className="text-sm">{result.message}</div>
        </div>
      ) : null}

      <Field label="Full name">
        <Input name="name" required placeholder="Your name" />
      </Field>
      <Field label="Work email">
        <Input name="email" type="email" required placeholder="you@agency.com" />
      </Field>
      <Field label="Phone">
        <Input name="phone" placeholder="+880 ..." />
      </Field>
      <Field label="Company / Agency">
        <Input name="company" placeholder="Your organization" />
      </Field>
      <Field label="How can we help?">
        <Textarea
          name="message"
          rows={3}
          placeholder="Tell us about your needs: number of counselors, countries you work with, current tools..."
        />
      </Field>

      <Button type="submit" block disabled={pending}>
        {pending ? "Sending..." : "Contact us"}
      </Button>

      <p className="text-sm muted" style={{ textAlign: "center" }}>
        We will get back to you within one business day.
      </p>
    </form>
  );
}
