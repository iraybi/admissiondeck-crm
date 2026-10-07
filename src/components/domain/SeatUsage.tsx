import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatMoney } from "@/lib/utils";
import styles from "./SeatUsage.module.css";

export function SeatUsage({
  used,
  billed,
  unitPrice = 2500,
  currency = "BDT",
  compact = false,
}: {
  used: number;
  billed: number;
  unitPrice?: number;
  currency?: string;
  compact?: boolean;
}) {
  const pctUsed = billed > 0 ? (used / billed) * 100 : 0;

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ""}`}>
      <div className={styles.headline}>
        <span className={`${styles.count} tabular`}>{used}</span>
        <span className={styles.of}>
          of {billed} provisioned seats
        </span>
      </div>
      <ProgressBar value={pctUsed} showValue={false} label="Seat usage" />
      <div className={styles.meta}>
        <span>Minimum 10 seats per agency</span>
        <span className="tabular">
          {formatMoney(billed * unitPrice, currency)}/mo
        </span>
      </div>
    </div>
  );
}
