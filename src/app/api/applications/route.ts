import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createApplication,
  listStudentApplications,
  getUniversitiesForApplication,
} from "@/lib/applications/management";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json(
      { error: "studentId is required" },
      { status: 400 },
    );
  }

  const applications = await listStudentApplications(studentId);
  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { studentId, universityId, programId, intakeId } = body;

    if (!studentId || !universityId || !programId) {
      return NextResponse.json(
        { error: "studentId, universityId and programId are required" },
        { status: 400 },
      );
    }

    const app = await createApplication({
      studentId,
      universityId,
      programId,
      intakeId,
      actorId: user.id,
    });

    return NextResponse.json({ ok: true, id: app.id });
  } catch (e) {
    console.error("Create application error:", e);
    return NextResponse.json(
      { error: (e as Error).message || "Failed to create application" },
      { status: 400 },
    );
  }
}
