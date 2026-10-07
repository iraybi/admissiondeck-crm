import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  registerCustomDomain,
  listCustomDomains,
} from "@/lib/routing/custom-domains";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { orgId, hostname, pathPrefix, portal } = body;

    if (!orgId || !hostname) {
      return NextResponse.json(
        { error: "orgId and hostname are required" },
        { status: 400 },
      );
    }

    // Basic hostname validation
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(hostname)) {
      return NextResponse.json(
        { error: "Invalid hostname format" },
        { status: 400 },
      );
    }

    const domain = await registerCustomDomain({
      orgId,
      hostname,
      pathPrefix: pathPrefix || null,
      portal: portal ?? "student",
    });

    return NextResponse.json({
      ok: true,
      id: domain.id,
      dnsToken: domain.dnsToken,
    });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "This hostname is already registered" },
        { status: 409 },
      );
    }
    console.error("Domain registration error:", e);
    return NextResponse.json(
      { error: "Failed to register domain" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.orgId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const domains = await listCustomDomains(user.orgId);
  return NextResponse.json({ domains });
}
