import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { upsertRequirement, deleteRequirement } from "@/lib/documents/requirements";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const required = ["scope", "docType", "label"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    const requirement = await upsertRequirement({
      id: body.id,
      scope: body.scope,
      scopeId: body.scopeId || null,
      docType: body.docType,
      label: body.label,
      description: body.description,
      isRequired: body.isRequired ?? true,
      maxFiles: body.maxFiles ?? 1,
      allowedMimes: body.allowedMimes ?? [
        "application/pdf",
        "image/png",
        "image/jpeg",
      ],
      maxBytes: body.maxBytes ?? 15 * 1024 * 1024,
      sortOrder: body.sortOrder ?? 0,
      validDays: body.validDays ?? null,
      conditions: body.conditions,
    });

    return NextResponse.json({ ok: true, id: requirement.id });
  } catch (e) {
    console.error("Doc requirement error:", e);
    return NextResponse.json(
      { error: "Failed to save requirement" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await deleteRequirement(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete requirement" },
      { status: 500 },
    );
  }
}
