import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listCustomDomains, verifyCustomDomain } from "@/lib/routing/custom-domains";
import { Shell, PageHead } from "@/components/layout/Shell";
import { Status } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { DomainActions } from "@/components/domain/DomainActions";
import { AddDomainForm } from "@/components/domain/AddDomainForm";
import type { NavItem } from "@/components/layout/SideNav";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/organization", label: "Organization" },
  { href: "/settings/domains", label: "Custom domains" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/documents", label: "Document rules" },
  { href: "/settings/sessions", label: "Sessions" },
];

const SSL_TONE: Record<string, "ok" | "warn" | "bad"> = {
  ISSUED: "ok",
  PENDING: "warn",
  FAILED: "bad",
};

export default async function DomainsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.orgId) {
    return (
      <Shell
        portal="manage"
        orgName={user.orgName ?? "Workspace"}
        orgPath={user.orgPath ?? ""}
        user={{ name: user.name, role: "Admin" }}
        nav={nav}
      >
        <PageHead title="Custom domains" />
        <section className="card">
          <p className="text-sm muted">No organization assigned.</p>
        </section>
      </Shell>
    );
  }

  const domains = await listCustomDomains(user.orgId);

  return (
    <Shell
      portal="manage"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: "Admin" }}
      nav={nav}
    >
      <PageHead
        title="Custom domains"
        subtitle="Map your own domains to AdmissionDeck portals"
        actions={<AddDomainForm orgId={user.orgId} />}
      />

      <section className="card" style={{ marginBottom: "var(--space-5)" }}>
        <div className="card-head">
          <h2>How it works</h2>
        </div>
        <div className="stack-sm">
          <div className="status-row is-brand">
            <div>
              <div className="font-medium text-sm">Subdomain mapping</div>
              <div className="text-sm muted">
                Point <code>students.yourdomain.com</code> to AdmissionDeck for
                the student portal.
              </div>
            </div>
          </div>
          <div className="status-row is-brand">
            <div>
              <div className="font-medium text-sm">Path prefix mapping</div>
              <div className="text-sm muted">
                Serve the student portal at <code>yourdomain.com/students</code>
                using a reverse proxy.
              </div>
            </div>
          </div>
          <div className="status-row is-brand">
            <div>
              <div className="font-medium text-sm">DNS verification</div>
              <div className="text-sm muted">
                Add a TXT record to prove domain ownership. TLS is provisioned
                automatically after verification.
              </div>
            </div>
          </div>
        </div>
      </section>

      <Table
        columns={[
          { key: "hostname", label: "Hostname" },
          { key: "portal", label: "Portal" },
          { key: "path", label: "Path prefix" },
          { key: "ssl", label: "SSL" },
          { key: "verified", label: "Verified" },
          { key: "actions", label: "", width: "140px" },
        ]}
      >
        {domains.map((d) => (
          <Row key={d.id}>
            <Cell>
              <code className="text-sm">{d.hostname}</code>
            </Cell>
            <Cell>
              <span className="text-sm">{d.portal}</span>
            </Cell>
            <Cell>
              <span className="text-sm">{d.pathPrefix ?? "/"}</span>
            </Cell>
            <Cell>
              <Status tone={SSL_TONE[d.sslStatus] ?? "warn"}>
                {d.sslStatus === "ISSUED"
                  ? "Active"
                  : d.sslStatus === "FAILED"
                    ? "Failed"
                    : "Pending"}
              </Status>
            </Cell>
            <Cell>
              {d.verifiedAt ? (
                <span className="text-sm">{formatDate(d.verifiedAt)}</span>
              ) : (
                <span className="text-sm muted">
                  TXT: {d.dnsToken.slice(0, 12)}...
                </span>
              )}
            </Cell>
            <Cell>
              <DomainActions
                domainId={d.id}
                hostname={d.hostname}
                verified={!!d.verifiedAt}
                dnsToken={d.dnsToken}
              />
            </Cell>
          </Row>
        ))}
      </Table>

      {domains.length === 0 ? (
        <div
          style={{
            padding: "var(--space-10)",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          No custom domains yet. Add one to white-label the portal.
        </div>
      ) : null}
    </Shell>
  );
}
