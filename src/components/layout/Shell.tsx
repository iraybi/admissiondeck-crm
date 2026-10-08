import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { SideNav, type NavItem } from "./SideNav";
import styles from "./Shell.module.css";

export type Portal = "admin" | "agency" | "agent" | "student" | "manage" | "counsellor" | "dash" | "landing";

export function Shell({
  hostname,
  isCustomDomain,
  portal,
  orgName,
  orgPath,
  orgId,
  user,
  nav,
  logoUrl,
  children,
}: {
  portal: Portal;
  hostname?: string;
  isCustomDomain?: boolean;
  orgName: string;
  orgPath: string;
  orgId?: string | null;
  user: {
    name: string;
    role: string;
    orgId?: string | null;
    memberships?: { orgId: string; orgName: string; orgPath: string; role: string }[];
  };
  nav: NavItem[];
  logoUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <TopBar
        portal={portal}
        orgName={orgName}
        orgPath={orgPath}
        orgId={orgId ?? user.orgId}
        user={user}
        hostname={hostname}
        isCustomDomain={isCustomDomain}
        logoUrl={logoUrl}
        memberships={user.memberships}
      />
      <div className="shell-body">
        <SideNav items={nav} />
        <main className="shell-main">
          <div className="shell-content">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="page-head-text">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-head-actions">{actions}</div> : null}
    </div>
  );
}
