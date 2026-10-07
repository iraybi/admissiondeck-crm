"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

export function MfaSetup() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "setup" | "verify">("idle");
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mfa/setup", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setSetupData(json);
        setStep("setup");
      } else {
        setError(json.error ?? "Failed to start setup");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!setupData || !token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mfa/enable", {
        method: "POST",
        body: JSON.stringify({
          secret: setupData.secret,
          token,
          backupCodes: setupData.backupCodes,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok) {
        setStep("verify");
      } else {
        setError(json.error ?? "Verification failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="stack-sm">
        <div className="status-row is-brand">
          <div>
            <div className="font-medium text-sm">Two-factor authentication</div>
            <div className="text-sm muted">
              Add an extra layer of security with a TOTP authenticator app.
            </div>
          </div>
        </div>

        {step === "idle" ? (
          <Button onClick={startSetup} disabled={busy}>
            {busy ? "Loading..." : "Enable MFA"}
          </Button>
        ) : null}

        {step === "verify" ? (
          <div className="status-row is-ok">
            <div>
              <div className="font-medium text-sm">MFA enabled</div>
              <div className="text-sm">
                Your account is now protected with two-factor authentication.
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="status-row is-bad">
            <div className="text-sm">{error}</div>
          </div>
        ) : null}
      </div>

      <Modal
        open={step === "setup" && !!setupData}
        title="Set up two-factor authentication"
        onClose={() => {
          setStep("idle");
          setSetupData(null);
          setToken("");
          setError(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setStep("idle");
                setSetupData(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleVerify} disabled={busy || token.length < 6}>
              {busy ? "Verifying..." : "Verify and enable"}
            </Button>
          </>
        }
      >
        {setupData ? (
          <>
            <p className="text-sm">
              1. Open your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <p className="text-sm">2. Scan this QR code or enter the secret manually</p>

            <div
              style={{
                margin: "var(--space-4) 0",
                padding: "var(--space-4)",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                textAlign: "center",
              }}
            >
              {/* QR code would be rendered here in production */}
              <div className="text-sm muted">QR Code</div>
              <code className="text-xs">{setupData.secret}</code>
            </div>

            <p className="text-sm">3. Enter the 6-digit code from your app</p>
            <Field label="Verification code">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
              />
            </Field>

            <details style={{ marginTop: "var(--space-3)" }}>
              <summary className="text-sm">Backup codes</summary>
              <div className="text-xs muted" style={{ marginTop: "var(--space-2)" }}>
                Save these codes in a secure place. Each can be used once.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-2)",
                  marginTop: "var(--space-2)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {setupData.backupCodes.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
            </details>
          </>
        ) : null}
      </Modal>
    </>
  );
}
