import type { ReactNode } from "react";
import styles from "./Table.module.css";

export function Table({
  columns,
  children,
}: {
  columns: { key: string; label: string; width?: string; align?: "left" | "right" }[];
  children: ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width, textAlign: c.align ?? "left" }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({
  children,
  onClick,
  interactive = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const cls = [
    styles.row,
    interactive || onClick ? styles.interactive : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <tr
      className={cls}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </tr>
  );
}

export function Cell({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td style={{ textAlign: align }} className={className}>
      {children}
    </td>
  );
}
