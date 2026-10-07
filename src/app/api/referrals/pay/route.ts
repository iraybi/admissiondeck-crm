import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markReferralPaid } from "@/lib/referrals/management";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { conversionId, notes } = body;

    if (!conversionId) {
      return NextResponse.json(
        { error: "conversionId is required" },
        { status: 400 },
      );
    }

    await markReferralPaid(conversionId, user.id, notes);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Mark paid error:", e);
    return NextResponse.json(
      { error: "Failed to mark as paid" },
      { status: 500 },
    );
  }
}
