import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { updateApplicationStatus } from "@/lib/applications/management";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  try {
    const app = await updateApplicationStatus(
      id,
      body.status,
      user.id,
      body.reason,
    );
    return NextResponse.json({ ok: true, status: app.status });
  } catch (e) {
    console.error("Update application error:", e);
    return NextResponse.json(
      { error: (e as Error).message || "Failed to update application" },
      { status: 400 },
    );
  }
}
