"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SideNav.module.css";

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.list}>
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.link} ${active ? styles.active : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.label}>{item.label}</span>
                {item.badge != null && item.badge > 0 ? (
                  <span className={`${styles.badge} tabular`}>{item.badge}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
