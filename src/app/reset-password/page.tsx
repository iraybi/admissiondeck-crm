"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import {
  resetPasswordAction,
  type ActionResult,
} from "@/lib/auth/actions";
import styles from "../login/login.module.css";

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    resetPasswordAction,
    null,
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.card} style={{ maxWidth: 480, gridTemplateColumns: "1fr" }}>
        <form className={styles.form} action={formAction}>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)" }}>Choose a new password</h2>
            <p className="text-sm muted" style={{ marginTop: 4 }}>
              Minimum 12 characters.
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

          <Field label="Reset token">
            <Input name="token" required placeholder="Paste the token from your email" />
          </Field>
          <Field label="New password" hint="At least 12 characters">
            <Input type="password" name="password" required autoComplete="new-password" />
          </Field>
          <Field label="Confirm password">
            <Input type="password" name="confirmPassword" required autoComplete="new-password" />
          </Field>

          <Button type="submit" block disabled={pending}>
            {pending ? "Saving..." : "Set new password"}
          </Button>

          <p className="text-sm muted" style={{ textAlign: "center" }}>
            <Link href="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
