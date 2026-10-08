import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import styles from "./TopBar.module.css";

import { OrgSwitcher } from "./OrgSwitcher";

const PORTAL_LABEL: Record<string, string> = {
  landing: "Marketing",
  dash: "Dashboard",
  admin: "Firm console",
  manage: "SaaS management",
  agency: "Agency workspace",
  counsellor: "Counsellor workspace",
  agent: "Agent portal",
  student: "Student portal",
};

export function TopBar({
  portal,
  orgName,
  orgPath,
  orgId,
  user,
  logoUrl,
  hostname,
  isCustomDomain,
  memberships,
}: {
  portal: string;
  orgName: string;
  orgPath: string;
  orgId?: string | null;
  user: { name: string; role: string };
  logoUrl?: string | null;
  hostname?: string;
  isCustomDomain?: boolean;
  memberships?: { orgId: string; orgName: string; orgPath: string; role: string }[];
}) {
  const portalLabel = PORTAL_LABEL[portal] ?? portal;
  const displayHost =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "localhost");

  return (
    <header className={styles.bar}>
      {/* Primary brand: org logo/name, or AdmissionDeck if no custom domain */}
      <div className={styles.brand}>
        {isCustomDomain && logoUrl ? (
          <img src={logoUrl} alt={orgName} className={styles.orgLogo} />
        ) : isCustomDomain ? (
          <span className={styles.orgMark}>{orgName.charAt(0)}</span>
        ) : (
          <span className={styles.mark}>AD</span>
        )}
        <div className={styles.brandText}>
          <span className={styles.brandName}>
            {isCustomDomain ? orgName : "AdmissionDeck"}
          </span>
          <span className={styles.brandSub}>{portalLabel}</span>
        </div>
      </div>

      {/* Org context */}
      <div className={styles.org}>
        <OrgSwitcher
          currentOrgId={orgId}
          currentOrgPath={orgPath}
          memberships={memberships}
        />
      </div>

      {/* Right side */}
      <div className={styles.right}>
        {/* Portal badge (small, contextual) */}
        <div className={styles.portalBadge} title={`Served from ${displayHost}`}>
          <span className={styles.portalDot}></span>
          <span className={styles.portalText}>{portalLabel}</span>
        </div>

        <Link href="/settings" className={styles.user}>
          <Avatar name={user.name} size={28} />
          <div className={styles.userText}>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userRole}>{user.role}</div>
          </div>
        </Link>

        <form action="/api/auth/logout" method="POST">
          <Button variant="secondary" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </div>

      {/* Small "powered by AdmissionDeck" for custom domains */}
      {isCustomDomain ? (
        <div className={styles.poweredBy}>
          Powered by <span className={styles.poweredBrand}>AdmissionDeck</span>
        </div>
      ) : null}
    </header>
  );
}
