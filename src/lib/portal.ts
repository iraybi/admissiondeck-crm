import type { NavItem } from "@/components/layout/SideNav";
import type { Organization, UserRecord } from "@/lib/types";

/* Shared portal context so every page composes the same shell.
   Swap these fixtures for session + RLS-backed queries later. */

export const currentUser: UserRecord = {
  id: "m1",
  name: "Rezaul Karim",
  email: "rezaul@chs.edu.bd",
  role: "firm_manager",
  orgId: "f1",
  status: "active",
};

export const firmOrg: Organization = {
  id: "f1",
  name: "Center for Higher Studies",
  kind: "firm",
  path: "org.chs",
  parentId: null,
  seatsUsed: 13,
  seatsBilled: 30,
};

export const adminNav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/agencies", label: "Agencies" },
  { href: "/staff", label: "Staff" },
  { href: "/leads", label: "Leads" },
  { href: "/students", label: "Students" },
  { href: "/countries", label: "Countries" },
  { href: "/universities", label: "Universities" },
  { href: "/payments", label: "Payments" },
  { href: "/commissions", label: "Commissions" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];
const _oldAdminNav = [
  { href: "/", label: "Overview" },
  { href: "/agencies", label: "Agencies" },
  { href: "/students", label: "Students", badge: 8 },
  { href: "/payments", label: "Payment review", badge: 2 },
  { href: "/documents", label: "Documents", badge: 2 },
  { href: "/team", label: "Team" },
  { href: "/billing", label: "Seats and billing" },
];
