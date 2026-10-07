import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { enableMfa } from "@/lib/auth/mfa-service";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await enableMfa(
      user.id,
      body.secret,
      body.token,
      body.backupCodes ?? [],
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("MFA enable error:", e);
    return NextResponse.json(
      { error: "Failed to enable MFA" },
      { status: 500 },
    );
  }
}
