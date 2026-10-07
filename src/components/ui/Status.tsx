import type { ReactNode } from "react";
import styles from "./Status.module.css";

export type StatusTone = "ok" | "warn" | "bad" | "info" | "brand" | "peach" | "muted" | "neutral";

export function Status({
  tone = "neutral",
  children,
  title,
}: {
  tone?: StatusTone;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span className={`${styles.status} ${styles[tone]}`} title={title}>
      <span className={styles.marker} aria-hidden="true" />
      <span className={styles.text}>{children}</span>
    </span>
  );
}

/* Left-bar status row for list items and alerts */
export function StatusRow({
  tone = "neutral",
  title,
  detail,
  action,
}: {
  tone?: StatusTone;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`status-row is-${tone}`}>
      <div className={styles.rowText}>
        <div className="font-medium">{title}</div>
        {detail ? <div className="text-sm muted">{detail}</div> : null}
      </div>
      {action ? <div className={styles.rowAction}>{action}</div> : null}
    </div>
  );
}
