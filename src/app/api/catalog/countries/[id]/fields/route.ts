import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { updateCountryFields } from "@/lib/catalog/management";

export async function PUT(
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
    await updateCountryFields(id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update country fields error:", e);
    return NextResponse.json(
      { error: "Failed to update fields" },
      { status: 500 },
    );
  }
}
