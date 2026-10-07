"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import {
  forgotPasswordAction,
  type ActionResult,
} from "@/lib/auth/actions";
import styles from "../login/login.module.css";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    forgotPasswordAction,
    null,
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.card} style={{ maxWidth: 480, gridTemplateColumns: "1fr" }}>
        <form className={styles.form} action={formAction}>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)" }}>Reset your password</h2>
            <p className="text-sm muted" style={{ marginTop: 4 }}>
              We will email a reset link to your work address.
            </p>
          </div>

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

          <Field label="Work email">
            <Input type="email" name="email" required autoComplete="username" />
          </Field>

          <Button type="submit" block disabled={pending}>
            {pending ? "Sending..." : "Send reset link"}
          </Button>

          <p className="text-sm muted" style={{ textAlign: "center" }}>
            <Link href="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
