import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getEmailOutbox } from "@/lib/email/mailer";
import { Shell, PageHead } from "@/components/layout/Shell";
import type { NavItem } from "@/components/layout/SideNav";

const nav: NavItem[] = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/organization", label: "Organization" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/sessions", label: "Sessions" },
  { href: "/settings/outbox", label: "Email outbox" },
];

export default async function EmailOutboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (process.env.NODE_ENV === "production") redirect("/settings");

  const messages = getEmailOutbox().slice().reverse();

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead
        title="Email outbox"
        subtitle="Development only. Shows messages sent by the console transport."
      />

      {messages.length === 0 ? (
        <section className="card">
          <p className="text-sm muted">
            No email sent yet in this process. Invite a teammate or request a
            password reset to see messages here.
          </p>
        </section>
      ) : (
        <div className="stack">
          {messages.map((m, i) => (
            <section key={i} className="card">
              <div className="card-head">
                <h2>{m.subject}</h2>
                <div className="card-head-aside text-sm muted">{m.to}</div>
              </div>
              <div
                className="text-sm"
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--font-mono)",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius)",
                  maxHeight: 220,
                  overflow: "auto",
                }}
              >
                {m.text ?? m.html.replace(/<[^>]+>/g, " ").slice(0, 500)}
              </div>
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}
