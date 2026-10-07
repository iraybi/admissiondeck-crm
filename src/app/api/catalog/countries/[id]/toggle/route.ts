import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

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
    const country = await prisma.$queryRaw<any[]>`
      SELECT "isActive" FROM "Country" WHERE id = ${id}
    `;
    if (!country[0]) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    await prisma.$executeRaw`
      UPDATE "Country" SET "isActive" = NOT "isActive", "updatedAt" = now() WHERE id = ${id}
    `;

    return NextResponse.json({ ok: true, isActive: !country[0].isActive });
  } catch (e) {
    console.error("Toggle country error:", e);
    return NextResponse.json(
      { error: "Failed to toggle country" },
      { status: 500 },
    );
  }
}
