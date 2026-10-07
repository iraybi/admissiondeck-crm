import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyCustomDomain } from "@/lib/routing/custom-domains";
import { invalidateDomainCache } from "@/lib/routing/domain-cache";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const result = await verifyCustomDomain(id);

  if (result.ok) {
    invalidateDomainCache("*");
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
}
