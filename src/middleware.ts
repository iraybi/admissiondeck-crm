import { NextRequest, NextResponse } from "next/server";
import {
  resolveHost,
  isPortalAllowed,
  homePathForPortal,
  DEFAULT_ROOT_DOMAIN,
  type Portal,
} from "@/lib/routing/portal";

// Routes that are always public
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/api/auth",
  "/api/files",
  "/api/upload",
  "/api/leads",
  "/api/health",
  "/_next",
  "/favicon.ico",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const pathname = req.nextUrl.pathname;

  const rootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? DEFAULT_ROOT_DOMAIN;
  const resolution = resolveHost(host, pathname, rootDomain);

  // Local development: treat localhost as landing/apex
  const isLocal = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");
  const effectiveResolution = isLocal
    ? {
        ...resolution,
        isLanding: ["/", "/login", "/register", "/contact", "/pricing", "/forgot-password", "/reset-password", "/accept-invite"].includes(pathname),
        isDash: !["/", "/login", "/register", "/contact", "/pricing", "/forgot-password", "/reset-password", "/accept-invite"].includes(pathname),
        portal: ["/", "/login", "/register", "/contact", "/pricing", "/forgot-password", "/reset-password", "/accept-invite"].includes(pathname)
          ? "landing"
          : ("dash" as Portal),
      }
    : resolution;

  // Landing domain: serve marketing pages, redirect to dash for app routes
  if (effectiveResolution.isLanding) {
    // Allow marketing routes
    const marketingRoutes = ["/", "/pricing", "/about", "/contact", "/login", "/register"];
    const isMarketing = marketingRoutes.some(
      (r) => pathname === r || pathname.startsWith(r + "/"),
    );

    if (!isMarketing && !isPublic(pathname)) {
      // Redirect app routes to dash subdomain
      const dashUrl = req.nextUrl.clone();
      dashUrl.hostname = `dash.${rootDomain}`;
      return NextResponse.redirect(dashUrl);
    }
  }

  // Custom domain path rewriting
  if (effectiveResolution.isCustomDomain && effectiveResolution.pathPrefix) {
    const stripped = pathname.slice(effectiveResolution.pathPrefix.length) || "/";
    const url = req.nextUrl.clone();
    url.pathname = stripped;

    const res = NextResponse.rewrite(url);
    res.headers.set("x-portal", effectiveResolution.portal);
    res.headers.set("x-hostname", effectiveResolution.hostname);
    res.headers.set("x-path-prefix", effectiveResolution.pathPrefix);
    res.headers.set("x-is-custom-domain", "true");
    return res;
  }

  // Attach portal context headers
  const res = NextResponse.next();
  res.headers.set("x-portal", effectiveResolution.portal);
  res.headers.set("x-hostname", effectiveResolution.hostname);
  res.headers.set("x-is-custom-domain", String(effectiveResolution.isCustomDomain));
  res.headers.set("x-is-dash", String(effectiveResolution.isDash));

  // Skip auth for public routes
  if (isPublic(pathname)) return res;

  // Landing pages don't require auth
  if (effectiveResolution.isLanding) return res;

  // Read session cookie
  const sessionToken = req.cookies.get("ad_session")?.value;
  if (!sessionToken) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
