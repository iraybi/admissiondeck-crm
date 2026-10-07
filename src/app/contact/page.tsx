"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import styles from "../login/login.module.css";

export default function ContactPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

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
          source: "Contact form",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess(true);
        form.reset();
      } else {
        setError(json.error ?? "Something went wrong");
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card} style={{ maxWidth: 560, gridTemplateColumns: "1fr" }}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)" }}>Contact us</h2>
            <p className="text-sm muted" style={{ marginTop: 4 }}>
              Tell us about your agency and we&apos;ll get back to you within one business day.
            </p>
          </div>

          {error ? (
            <div className="status-row is-bad" role="alert">
              <div className="text-sm">{error}</div>
            </div>
          ) : null}
          {success ? (
            <div className="status-row is-ok" role="status">
              <div className="text-sm">Thank you. We&apos;ll be in touch shortly.</div>
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
              rows={4}
              placeholder="Tell us about your needs: number of counsellors, countries you work with..."
            />
          </Field>

          <Button type="submit" block disabled={busy}>
            {busy ? "Sending..." : "Send message"}
          </Button>

          <p className="text-sm muted" style={{ textAlign: "center" }}>
            <Link href="/">Back to home</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
