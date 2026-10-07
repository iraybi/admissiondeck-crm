"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import styles from "../login/login.module.css";

export default function RegisterPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    if (data.get("password") !== data.get("confirmPassword")) {
      setError("Passwords do not match");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
          phone: data.get("phone"),
          identifier: data.get("identifier"),
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(json.error ?? "Registration failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card} style={{ maxWidth: 480, gridTemplateColumns: "1fr" }}>
          <div className={styles.form}>
            <h2 style={{ fontSize: "var(--text-lg)" }}>Registration successful</h2>
            <p className="text-sm muted">
              Your account has been created. You can now sign in.
            </p>
            <Link href="/login">
              <Button block>Go to sign in</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card} style={{ maxWidth: 480, gridTemplateColumns: "1fr" }}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)" }}>Create your account</h2>
            <p className="text-sm muted" style={{ marginTop: 4 }}>
              Register as a student to track your application.
            </p>
          </div>

          {error ? (
            <div className="status-row is-bad" role="alert">
              <div className="text-sm">{error}</div>
            </div>
          ) : null}

          <Field label="Full name">
            <Input name="name" required placeholder="Your full name" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required placeholder="your@email.com" />
          </Field>
          <Field label="Phone">
            <Input name="phone" placeholder="+880 ..." />
          </Field>
          <Field label="Organization identifier" hint="Provided by your agency">
            <Input name="identifier" required placeholder="e.g. dhaka-central" />
          </Field>
          <Field label="Password" hint="At least 12 characters">
            <Input name="password" type="password" required minLength={12} />
          </Field>
          <Field label="Confirm password">
            <Input name="confirmPassword" type="password" required minLength={12} />
          </Field>

          <Button type="submit" block disabled={busy}>
            {busy ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-sm muted" style={{ textAlign: "center" }}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
