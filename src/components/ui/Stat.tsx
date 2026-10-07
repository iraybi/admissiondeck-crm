import type { ReactNode } from "react";
import styles from "./Stat.module.css";

export type StatTone = "brand" | "ok" | "warn" | "bad" | "info" | "neutral";

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  action,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: StatTone;
  action?: ReactNode;
}) {
  const body = (
    <>
      <div className="kicker">{label}</div>
      <div className={`${styles.value} tabular`}>{value}</div>
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </>
  );

  if (action) {
    return (
      <button type="button" className={`${styles.stat} ${styles[tone]} ${styles.interactive}`}>
        {body}
      </button>
    );
  }

  return <div className={`${styles.stat} ${styles[tone]}`}>{body}</div>;
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}
