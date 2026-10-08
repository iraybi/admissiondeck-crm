"use client";

import { useTransition } from "react";
import { switchOrgAction } from "@/lib/auth/actions";
import styles from "./TopBar.module.css";

export function OrgSwitcher({
  currentOrgId,
  currentOrgPath,
  memberships,
}: {
  currentOrgId?: string | null;
  currentOrgPath?: string | null;
  memberships?: { orgId: string; orgName: string; orgPath: string; role: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  if (!memberships || memberships.length <= 1) {
    return (
      <div className={styles.path} title={currentOrgPath ?? ""}>
        {currentOrgPath}
      </div>
    );
  }

  return (
    <div title="Switch active organization">
      <select
        className={styles.orgSelect}
        value={currentOrgId ?? ""}
        disabled={isPending}
        onChange={(e) => {
          const nextOrgId = e.target.value;
          if (nextOrgId && nextOrgId !== currentOrgId) {
            startTransition(async () => {
              await switchOrgAction(nextOrgId);
            });
          }
        }}
      >
        {memberships.map((m) => (
          <option key={m.orgId} value={m.orgId}>
            {m.orgPath} ({m.role.replace(/_/g, " ").toLowerCase()})
          </option>
        ))}
      </select>
    </div>
  );
}
