import type { Stage } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import styles from "./PipelineStepper.module.css";

export function PipelineStepper({ stages }: { stages: Stage[] }) {
  const currentIndex = stages.findIndex((s) => !s.done);

  return (
    <ol className={styles.track}>
      {stages.map((stage, i) => {
        const done = stage.done;
        const current = i === currentIndex;
        return (
          <li
            key={stage.id}
            className={`${styles.step} ${done ? styles.done : ""} ${current ? styles.current : ""}`}
            aria-current={current ? "step" : undefined}
          >
            <span className={styles.dot}>{done ? "OK" : i + 1}</span>
            <span className={styles.label}>{stage.name}</span>
            <span className={styles.due}>{formatDate(stage.due)}</span>
          </li>
        );
      })}
    </ol>
  );
}
