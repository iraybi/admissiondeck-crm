import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { convertLeadToStudent } from "@/lib/leads/management";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  try {
    const student = await convertLeadToStudent(id, user.id, {
      counsellorId: body.counsellorId,
      targetCountry: body.targetCountry,
      targetProgram: body.targetProgram,
    });

    return NextResponse.json({
      ok: true,
      studentId: student.id,
      message: `Lead converted to student: ${student.name}`,
    });
  } catch (e) {
    console.error("Convert lead error:", e);
    return NextResponse.json(
      { error: (e as Error).message || "Failed to convert lead" },
      { status: 400 },
    );
  }
}
