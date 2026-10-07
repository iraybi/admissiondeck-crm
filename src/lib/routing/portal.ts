/**
 * Portal resolution from Host header.
 *
 * Domain architecture (root: crm.admissiondeck.com):
 *   crm.admissiondeck.com          -> landing pages only
 *   dash.crm.admissiondeck.com     -> unified dashboard hub (all roles after login)
 *   manage.crm.admissiondeck.com   -> SaaS management (platform admin)
 *   firm.crm.admissiondeck.com     -> firm console
 *   agency.crm.admissiondeck.com   -> agency workspace
 *   counsellor.crm.admissiondeck.com -> counsellor workspace
 *   agent.crm.admissiondeck.com    -> agent portal
 *   student.crm.admissiondeck.com  -> student portal
 *
 * Custom domains (white-label):
 *   dash.someagency.com            -> dashboard hub for that agency
 *   students.someagency.com        -> student portal for that agency
 *   apply.someeduagency.com        -> student portal (custom subdomain)
 *   someeduagency.com/students     -> student portal (path prefix)
 */

export type Portal =
  | "landing"
  | "dash"
  | "manage"
  | "firm"
  | "agency"
  | "counsellor"
  | "agent"
  | "student";

const PORTAL_BY_LABEL: Record<string, Portal> = {
  dash: "dash",
  manage: "manage",
  firm: "firm",
  agency: "agency",
  counsellor: "counsellor",
  agent: "agent",
  student: "student",
};

/** The base domain for all AdmissionDeck portals. */
export const DEFAULT_ROOT_DOMAIN = "crm.admissiondeck.com";

/** Extract just the base domain (crm.admissiondeck.com) from any hostname. */
export function getBaseDomain(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export type HostResolution = {
  portal: Portal;
  rootDomain: string;
  label: string | null;
  hostname: string;
  pathPrefix: string | null;
  isCustomDomain: boolean;
  isLanding: boolean;
  isDash: boolean;
};

/**
 * Parse a Host header (may include port) and pathname into a portal resolution.
 */
export function resolveHost(
  hostHeader: string | null,
  pathname: string = "/",
  rootDomain: string = DEFAULT_ROOT_DOMAIN,
): HostResolution {
  const hostname = (hostHeader ?? "")
    .split(":")[0]
    .toLowerCase()
    .replace(/^www\./, "");

  const root = rootDomain.toLowerCase().replace(/^www\./, "");

  // Exact match: crm.admissiondeck.com = landing
  if (hostname === root) {
    return {
      portal: "landing",
      rootDomain: root,
      label: null,
      hostname,
      pathPrefix: null,
      isCustomDomain: false,
      isLanding: true,
      isDash: false,
    };
  }

  // Check if under our root domain: *.crm.admissiondeck.com
  const suffix = "." + root;
  if (hostname.endsWith(suffix)) {
    const label = hostname.slice(0, -suffix.length);
    const portal = PORTAL_BY_LABEL[label];

    if (portal) {
      return {
        portal,
        rootDomain: root,
        label,
        hostname,
        pathPrefix: null,
        isCustomDomain: false,
        isLanding: false,
        isDash: portal === "dash",
      };
    }

    // Unknown subdomain under root: treat as landing
    return {
      portal: "landing",
      rootDomain: root,
      label,
      hostname,
      pathPrefix: null,
      isCustomDomain: false,
      isLanding: true,
      isDash: false,
    };
  }

  // Custom domain: determine portal from subdomain or path
  const subdomainPortal = portalFromSubdomain(hostname);
  const pathPortal = portalFromPath(pathname);

  return {
    portal: subdomainPortal ?? pathPortal ?? "dash",
    rootDomain: root,
    label: null,
    hostname,
    pathPrefix: extractPathPrefix(pathname),
    isCustomDomain: true,
    isLanding: false,
    isDash:
      (subdomainPortal ?? pathPortal) === "dash" ||
      (!subdomainPortal && !pathPortal),
  };
}

/**
 * Extract portal from custom domain subdomain.
 * e.g. students.someagency.com -> "student"
 *      dash.someagency.com -> "dash"
 */
function portalFromSubdomain(hostname: string): Portal | null {
  const parts = hostname.split(".");
  if (parts.length < 3) return null;

  const sub = parts[0].toLowerCase();
  const map: Record<string, Portal> = {
    dash: "dash",
    manage: "manage",
    firm: "firm",
    agency: "agency",
    counsellor: "counsellor",
    agent: "agent",
    student: "student",
    students: "student",
    apply: "student",
  };

  return map[sub] ?? null;
}

const PATH_SEGMENTS: Array<{ segment: string; portal: Portal }> = [
  { segment: "manage", portal: "manage" },
  { segment: "firm", portal: "firm" },
  { segment: "agency", portal: "agency" },
  { segment: "counsellor", portal: "counsellor" },
  { segment: "agent", portal: "agent" },
  { segment: "students", portal: "student" },
  { segment: "student", portal: "student" },
  { segment: "dash", portal: "dash" },
];

function portalFromPath(pathname: string): Portal | null {
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  const first = clean.split("/")[0].toLowerCase();
  const hit = PATH_SEGMENTS.find((p) => p.segment === first);
  return hit?.portal ?? null;
}

function extractPathPrefix(pathname: string): string | null {
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  const first = clean.split("/")[0].toLowerCase();
  const hit = PATH_SEGMENTS.find((p) => p.segment === first);
  return hit ? "/" + hit.segment : null;
}

/**
 * Map a portal to its allowed roles for login scoping.
 */
export const PORTAL_ROLES: Record<Portal, string[]> = {
  landing: [],
  dash: [
    "PLATFORM_ADMIN",
    "FIRM_MANAGER",
    "AGENCY_MANAGER",
    "COUNSELLOR",
    "AGENT",
    "STUDENT",
  ],
  manage: ["PLATFORM_ADMIN"],
  firm: ["FIRM_MANAGER"],
  agency: ["AGENCY_MANAGER", "FIRM_MANAGER"],
  counsellor: ["COUNSELLOR", "AGENCY_MANAGER", "FIRM_MANAGER"],
  agent: ["AGENT"],
  student: ["STUDENT"],
};

export function isPortalAllowed(portal: Portal, role: string): boolean {
  return PORTAL_ROLES[portal]?.includes(role) ?? false;
}

export function homePathForPortal(portal: Portal): string {
  return "/";
}

export function loginPathForPortal(portal: Portal): string {
  return "/login";
}

/**
 * Get the primary dashboard URL for a role after login.
 */
export function dashboardUrlForRole(
  role: string,
  rootDomain = DEFAULT_ROOT_DOMAIN,
): string {
  return `https://dash.${rootDomain}`;
}

/**
 * Get the login URL for a specific portal.
 */
export function loginUrlForPortal(
  portal: Portal,
  rootDomain = DEFAULT_ROOT_DOMAIN,
): string {
  if (portal === "landing") return `https://${rootDomain}/login`;
  return `https://${portal}.${rootDomain}/login`;
}
