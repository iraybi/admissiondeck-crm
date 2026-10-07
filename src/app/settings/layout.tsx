import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, PageHead } from "@/components/layout/Shell";
import { getCurrentUser } from "@/lib/auth/session";
import type { NavItem } from "@/components/layout/SideNav";
import styles from "./settings.module.css";

const nav: NavItem[] = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/organization", label: "Organization" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/sessions", label: "Sessions" },
];

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <Shell
      portal="admin"
      orgName={user.orgName ?? "Workspace"}
      orgPath={user.orgPath ?? ""}
      user={{ name: user.name, role: user.role.replace("_", " ") }}
      nav={nav}
    >
      <PageHead title="Settings" subtitle="Manage your account and workspace" />
      <div className={styles.layout}>
        <nav className={styles.subnav} aria-label="Settings sections">
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.sublink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.content}>{children}</div>
      </div>
    </Shell>
  );
}
