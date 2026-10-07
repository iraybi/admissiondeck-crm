import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Status, type StatusTone } from "@/components/ui/Status";
import type { Student, StudentStatus } from "@/lib/types";
import { pct } from "@/lib/utils";
import styles from "./StudentList.module.css";

const STATUS_TONE: Record<StudentStatus, StatusTone> = {
  active: "brand",
  visa: "ok",
  completed: "info",
  refused: "bad",
  cancelled: "neutral",
};

const STATUS_LABEL: Record<StudentStatus, string> = {
  active: "In progress",
  visa: "Visa granted",
  completed: "Completed",
  refused: "Visa refused",
  cancelled: "Cancelled",
};

export function studentProgress(s: Student): number {
  const done = s.stages.filter((x) => x.done).length;
  return pct(done, s.stages.length);
}

export function currentStage(s: Student): string {
  const next = s.stages.find((x) => !x.done);
  return next ? next.name : "All stages complete";
}

export function StudentList({
  students,
  showOrg = false,
  orgName,
}: {
  students: Student[];
  showOrg?: boolean;
  orgName?: (orgId: string) => string;
}) {
  if (students.length === 0) {
    return (
      <div className={styles.empty}>No students match the current filters.</div>
    );
  }

  return (
    <div className={styles.list}>
      <div
        className={`${styles.head} ${showOrg ? styles.withOrg : ""}`}
        role="presentation"
      >
        <span>Student</span>
        {showOrg ? <span>Agency</span> : null}
        <span>Destination</span>
        <span>Progress</span>
        <span>Status</span>
      </div>

      {students.map((s) => {
        const progress = studentProgress(s);
        return (
          <Link
            key={s.id}
            href={`/students/${s.id}`}
            className={`${styles.row} ${showOrg ? styles.withOrg : ""}`}
          >
            <span className={styles.who}>
              <Avatar name={s.name} size={34} />
              <span className={styles.whoText}>
                <span className={styles.name}>{s.name}</span>
                <span className={styles.sub}>{s.university}</span>
              </span>
            </span>

            {showOrg ? (
              <span className={styles.org}>{orgName?.(s.orgId) ?? s.orgId}</span>
            ) : null}

            <span className={styles.dest}>
              <span>{s.country}</span>
              <span className={styles.sub}>{s.programme}</span>
            </span>

            <span className={styles.progress}>
              <ProgressBar value={progress} label={currentStage(s)} />
            </span>

            <span className={styles.status}>
              <Status tone={STATUS_TONE[s.status]}>
                {s.status === "active" ? currentStage(s) : STATUS_LABEL[s.status]}
              </Status>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
