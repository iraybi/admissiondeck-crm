import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { MfaSetup } from "@/components/settings/MfaSetup";

export default function SettingsSecurityPage() {
  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>Change password</h2>
        </div>
        <p className="text-sm muted" style={{ marginBottom: "var(--space-4)" }}>
          Changing your password signs out all other sessions.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Two-factor authentication</h2>
        </div>
        <MfaSetup />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Password requirements</h2>
        </div>
        <div className="stack-sm">
          <div className="status-row is-ok">
            <div className="text-sm">At least 12 characters</div>
          </div>
          <div className="status-row is-ok">
            <div className="text-sm">
              Stored with scrypt and a per-password salt
            </div>
          </div>
          <div className="status-row is-ok">
            <div className="text-sm">
              Repeated failures temporarily lock the account
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
