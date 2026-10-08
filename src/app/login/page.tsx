"use client";

import { useActionState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { loginAction, type ActionResult } from "@/lib/auth/actions";
import styles from "./login.module.css";

/**
 * Role-specific login form.
 * The role is determined by the subdomain or custom domain.
 * Each subdomain shows only its own login form.
 */
export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    loginAction,
    null,
  );

  // Detect portal from hostname
  const { portal, isCustomDomain, orgName, orgLogo } = useMemo(() => {
    if (typeof window === "undefined") {
      return { portal: "firm", isCustomDomain: false, orgName: null, orgLogo: null };
    }
    const host = window.location.hostname.toLowerCase();

    // Check if custom domain (not crm.admissiondeck.com or localhost)
    const isCustom =
      !host.includes("admissiondeck.com") &&
      !host.includes("localhost") &&
      !host.includes("127.0.0.1");

    // Determine portal from subdomain
    // For crm.admissiondeck.com: dash.crm.admissiondeck.com -> parts[0] = "dash"
    const parts = host.split(".");
    let sub = parts[0];

    // Handle crm.admissiondeck.com structure: *.crm.admissiondeck.com
    if (host.endsWith("crm.admissiondeck.com") && parts.length > 3) {
      // e.g., dash.crm.admissiondeck.com -> parts = ["dash", "crm", "admissiondeck", "com"]
      sub = parts[0];
    } else if (host === "crm.admissiondeck.com" || host === "localhost" || host === "127.0.0.1") {
      sub = "firm"; // landing or default
    }

    const portalMap: Record<string, string> = {
      dash: "firm",
      manage: "super",
      firm: "firm",
      agency: "agency",
      counsellor: "counsellor",
      agent: "agent",
      student: "student",
      students: "student",
      apply: "student",
    };

    return {
      portal: isCustom ? "student" : (portalMap[sub] ?? "firm"),
      isCustomDomain: isCustom,
      orgName: isCustom ? parts.slice(1, -1).join(".") || null : null,
      orgLogo: null,
    };
  }, []);

  // Role-specific content
  const content = getLoginContent(portal);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <aside className={styles.art}>
          {isCustomDomain && orgLogo ? (
            <img src={orgLogo} alt={orgName ?? ""} className={styles.orgLogo} />
          ) : (
            <div className={styles.brandRow}>
              <span className={styles.mark}>AD</span>
              <span className={styles.brandName}>
                {isCustomDomain && orgName ? orgName : "AdmissionDeck"}
              </span>
            </div>
          )}

          <h1 className={styles.headline}>{content.headline}</h1>
          <p className={styles.copy}>{content.description}</p>

          <div className={styles.workspace}>
            <div className="kicker">{content.workspaceLabel}</div>
            <div className="text-sm muted">{content.workspaceHelp}</div>
          </div>

          {/* Small "powered by" for custom domains */}
          {isCustomDomain ? (
            <div className={styles.powered}>
              Powered by <strong>AdmissionDeck</strong>
            </div>
          ) : null}
        </aside>

        <form className={styles.form} action={formAction}>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)" }}>{content.formTitle}</h2>
            <p className="text-sm muted" style={{ marginTop: 4 }}>
              {content.formSubtitle}
            </p>
          </div>

          {state && !state.ok ? (
            <div className="status-row is-bad" role="alert">
              <div className="text-sm">{state.error}</div>
            </div>
          ) : null}
          {state && state.ok && state.message ? (
            <div className="status-row is-ok" role="status">
              <div className="text-sm">{state.message}</div>
            </div>
          ) : null}

          {/* Identifier field only on tenant subdomains (not custom domains or platform admin) */}
          {!isCustomDomain && portal !== "super" ? (
            <Field
              label={content.identifierLabel}
              hint={content.identifierHint}
            >
              <Input
                name="identifier"
                placeholder={content.identifierPlaceholder}
                autoComplete="organization"
                required
              />
            </Field>
          ) : (
            <input type="hidden" name="identifier" value="" />
          )}

          {/* Hidden role field based on portal */}
          <input type="hidden" name="role" value={portal} />

          <Field label="Email">
            <Input
              type="email"
              name="email"
              autoComplete="username"
              required
              placeholder={content.emailPlaceholder}
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </Field>

          <Button type="submit" block disabled={pending}>
            {pending ? "Signing in..." : content.submitLabel}
          </Button>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link href="/forgot-password" className="text-sm">
              Forgot password?
            </Link>
            {portal === "student" ? (
              <Link href="/register" className="text-sm">
                Create an account
              </Link>
            ) : (
              <Link href="/" className="text-sm">
                Back to home
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

type LoginContent = {
  headline: string;
  description: string;
  formTitle: string;
  formSubtitle: string;
  workspaceLabel: string;
  workspaceHelp: string;
  identifierLabel: string;
  identifierHint: string;
  identifierPlaceholder: string;
  emailPlaceholder: string;
  submitLabel: string;
};

function getLoginContent(portal: string): LoginContent {
  switch (portal) {
    case "student":
      return {
        headline: "Your journey starts here.",
        description:
          "Track your application, upload documents, and stay updated on your admission progress.",
        formTitle: "Student sign in",
        formSubtitle: "Sign in to view your application status.",
        workspaceLabel: "Student portal",
        workspaceHelp:
          "Access your document checklist, payment status, and application timeline.",
        identifierLabel: "Organization identifier",
        identifierHint: "Provided by your agency (e.g. org.chs or org.chs.dhaka)",
        identifierPlaceholder: "e.g. org.chs.dhaka",
        emailPlaceholder: "your@email.com",
        submitLabel: "Sign in",
      };
    case "counsellor":
      return {
        headline: "Manage your students.",
        description:
          "Track applications, review documents, and guide students through their admission journey.",
        formTitle: "Counsellor sign in",
        formSubtitle: "Sign in to access your student cohort.",
        workspaceLabel: "Counsellor workspace",
        workspaceHelp:
          "Manage your assigned students, review documents, and track progress.",
        identifierLabel: "Organization identifier",
        identifierHint: "Your branch or firm path (e.g. org.chs.dhaka)",
        identifierPlaceholder: "e.g. org.chs.dhaka",
        emailPlaceholder: "you@agency.com",
        submitLabel: "Sign in",
      };
    case "agent":
      return {
        headline: "Track your referrals.",
        description:
          "Monitor referred students, view commission status, and manage your pipeline.",
        formTitle: "Agent sign in",
        formSubtitle: "Sign in to view your referrals and commissions.",
        workspaceLabel: "Agent portal",
        workspaceHelp:
          "See students you've referred, track their progress, and view commissions.",
        identifierLabel: "Organization identifier",
        identifierHint: "Your branch or firm path (e.g. org.chs.dhaka)",
        identifierPlaceholder: "e.g. org.chs.dhaka",
        emailPlaceholder: "you@agency.com",
        submitLabel: "Sign in",
      };
    case "agency":
      return {
        headline: "Run your agency.",
        description:
          "Manage your team, track students, and oversee local operations.",
        formTitle: "Agency sign in",
        formSubtitle: "Sign in to your agency workspace.",
        workspaceLabel: "Agency workspace",
        workspaceHelp:
          "Manage staff, students, and operations for your agency.",
        identifierLabel: "Organization identifier",
        identifierHint: "Your agency or firm path (e.g. org.chs.dhaka)",
        identifierPlaceholder: "e.g. org.chs.dhaka",
        emailPlaceholder: "you@agency.com",
        submitLabel: "Sign in",
      };
    case "super":
      return {
        headline: "Platform management.",
        description:
          "Manage tenants, subscriptions, and platform health.",
        formTitle: "Admin sign in",
        formSubtitle: "Sign in to the SaaS management console.",
        workspaceLabel: "SaaS management",
        workspaceHelp: "Oversee all tenants, billing, and platform health.",
        identifierLabel: "",
        identifierHint: "",
        identifierPlaceholder: "",
        emailPlaceholder: "admin@admissiondeck.com",
        submitLabel: "Sign in",
      };
    default: // firm
      return {
        headline: "Every student journey, under one roof.",
        description:
          "Manage your agencies, staff, and students across the entire organization.",
        formTitle: "Firm sign in",
        formSubtitle: "Sign in to your firm console.",
        workspaceLabel: "Firm console",
        workspaceHelp:
          "Manage agencies, review analytics, and oversee operations.",
        identifierLabel: "Organization identifier",
        identifierHint: "Your firm path (e.g. org.chs)",
        identifierPlaceholder: "e.g. org.chs",
        emailPlaceholder: "you@firm.com",
        submitLabel: "Sign in",
      };
  }
}
