import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { getCurrentUser } from "@/lib/auth/session";
import { EmailSettingsForm } from "@/components/settings/EmailSettingsForm";
import type { NavItem } from "@/components/layout/SideNav";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/organization", label: "Organization" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/documents", label: "Document rules" },
  { href: "/settings/sessions", label: "Sessions" },
];

export default async function EmailSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <Shell
      portal="manage"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Email settings"
        subtitle="Configure how emails are sent from your organization"
      />

      <EmailSettingsForm />

      <section className="card" style={{ marginTop: "var(--space-5)" }}>
        <div className="card-head">
          <h2>Email providers</h2>
        </div>
        <div className="stack-sm">
          <div className="status-row is-brand">
            <div>
              <div className="font-medium text-sm">Resend (recommended)</div>
              <div className="text-sm muted">
                Set RESEND_API_KEY in your environment. Emails sent from your verified domain.
              </div>
            </div>
          </div>
          <div className="status-row is-brand">
            <div>
              <div className="font-medium text-sm">SMTP</div>
              <div className="text-sm muted">
                Use your own email server. Configure host, port, username, and password.
              </div>
            </div>
          </div>
          <div className="status-row is-warn">
            <div>
              <div className="font-medium text-sm">Console (development)</div>
              <div className="text-sm muted">
                Emails are logged to the console. Not for production use.
              </div>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
