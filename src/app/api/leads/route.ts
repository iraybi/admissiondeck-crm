import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createLead, listLeads } from "@/lib/leads/management";
import { resolveScope } from "@/lib/db/scope";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const scope = await resolveScope(user);
  const leads = await listLeads({ orgPaths: scope.orgPaths });
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user.orgId || !user.orgPath) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const required = ["name", "email"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    const lead = await createLead({
      name: body.name,
      email: body.email,
      phone: body.phone,
      source: body.source,
      targetCountry: body.targetCountry,
      targetProgram: body.targetProgram,
      orgId: user.orgId,
      orgPath: user.orgPath,
      counsellorId: body.counsellorId ?? user.id,
    });

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (e) {
    console.error("Create lead error:", e);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 },
    );
  }
}
