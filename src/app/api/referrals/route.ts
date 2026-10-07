import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createReferral, listReferrals } from "@/lib/referrals/management";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const referrals = await listReferrals();
  return NextResponse.json({ referrals });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const required = ["referrerName"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    await createReferral({
      referrerName: body.referrerName,
      referrerEmail: body.referrerEmail,
      referrerPhone: body.referrerPhone,
      referrerType: body.referrerType,
      company: body.company,
      commissionRate: body.commissionRate,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Create referral error:", e);
    return NextResponse.json(
      { error: "Failed to create referral" },
      { status: 500 },
    );
  }
}
