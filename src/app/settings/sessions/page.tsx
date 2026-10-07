import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listSessions } from "@/lib/auth/account";
import { Status } from "@/components/ui/Status";
import { RevokeSessionButtons } from "@/components/settings/RevokeSessionButtons";

export default async function SettingsSessionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sessions = await listSessions(user.id);

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>Active sessions</h2>
          <div className="card-head-aside">
            <RevokeSessionButtons />
          </div>
        </div>

        <div className="divided">
          {sessions.length === 0 ? (
            <p className="text-sm muted">No active sessions.</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="divided-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-medium text-sm">
                    {s.userAgent?.slice(0, 80) ?? "Unknown device"}
                  </div>
                  <div className="text-sm muted">
                    {s.ip ?? "Unknown IP"} · started{" "}
                    {new Date(s.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <Status tone="ok">Active</Status>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Sign out</h2>
        </div>
        <div className="stack-sm">
          <div className="status-row is-brand">
            <div>
              <div className="font-medium text-sm">Sign out of this device</div>
              <div className="text-sm muted">
                Ends your session and returns you to the login page.
              </div>
            </div>
          </div>
          <div className="status-row is-warn">
            <div>
              <div className="font-medium text-sm">Sign out everywhere</div>
              <div className="text-sm muted">
                Revokes all sessions except the one you are using now.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
