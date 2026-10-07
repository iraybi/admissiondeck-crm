import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { inviteLead } from "@/lib/leads/management";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const result = await inviteLead(id, user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Invite lead error:", e);
    return NextResponse.json(
      { error: (e as Error).message || "Failed to invite lead" },
      { status: 400 },
    );
  }
}
