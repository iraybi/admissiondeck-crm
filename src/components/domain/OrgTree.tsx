import type { Organization } from "@/lib/types";
import { SeatUsage } from "./SeatUsage";
import styles from "./OrgTree.module.css";

export function OrgTree({
  root,
  children,
}: {
  root: Organization;
  children: Organization[];
}) {
  return (
    <div className={styles.tree}>
      <div className={styles.node}>
        <div className={styles.nodeMain}>
          <div className={styles.nodeName}>{root.name}</div>
          <div className={styles.nodeMeta}>
            <code className={styles.path}>{root.path}</code>
            <span>Enterprise firm license</span>
          </div>
        </div>
        <SeatUsage
          used={root.seatsUsed}
          billed={root.seatsBilled}
          compact
        />
      </div>

      {children.map((child) => (
        <div key={child.id} className={styles.child}>
          <div className={styles.nodeMain}>
            <div className={styles.nodeName}>{child.name}</div>
            <div className={styles.nodeMeta}>
              <code className={styles.path}>{child.path}</code>
              <span>
                {child.city}
                {child.managerName ? ` · ${child.managerName}` : ""}
              </span>
            </div>
          </div>
          <SeatUsage
            used={child.seatsUsed}
            billed={child.seatsBilled}
            compact
          />
        </div>
      ))}
    </div>
  );
}
