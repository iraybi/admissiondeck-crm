import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { recordReferralConversion } from "@/lib/referrals/management";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const required = ["referralId", "tenantName", "monthlyValue"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    // Generate a placeholder tenantId since we're recording manually
    const tenantId = `tenant-${Date.now().toString(36)}`;

    await recordReferralConversion({
      referralId: body.referralId,
      tenantId,
      tenantName: body.tenantName,
      plan: body.plan ?? "ENTERPRISE_FIRM",
      seatCount: body.seatCount ?? 10,
      monthlyValue: body.monthlyValue,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Record conversion error:", e);
    return NextResponse.json(
      { error: (e as Error).message || "Failed to record conversion" },
      { status: 400 },
    );
  }
}
