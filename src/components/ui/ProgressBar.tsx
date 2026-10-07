import styles from "./ProgressBar.module.css";

export function ProgressBar({
  value,
  label,
  showValue = true,
}: {
  value: number;
  label?: string;
  showValue?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={styles.wrap}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      {showValue ? (
        <span className={`${styles.value} tabular`}>{pct}%</span>
      ) : null}
    </div>
  );
}
