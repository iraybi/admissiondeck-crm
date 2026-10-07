import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { processUpload } from "@/lib/documents/pipeline";
import { validateUpload, type UploadKind } from "@/lib/storage/uploads";

const MAX_BODY = 16 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = (form.get("kind")?.toString() ?? "document") as UploadKind;
  const studentId = form.get("studentId")?.toString();
  const docType = form.get("docType")?.toString();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_BODY) {
    return NextResponse.json({ error: "File is too large" }, { status: 413 });
  }

  // If studentId + docType provided, use the full document pipeline
  if (studentId && docType) {
    const data = Buffer.from(await file.arrayBuffer());
    const result = await processUpload({
      studentId,
      docType,
      fileName: file.name,
      mimeType: file.type,
      data,
      uploadedById: user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          scanResult: result.scanResult,
          documentId: result.documentId,
        },
        { status: result.scanResult && !result.scanResult.clean ? 422 : 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      documentId: result.documentId,
      scanResult: result.scanResult,
      file: result.storedFile,
    });
  }

  // Otherwise, simple upload (logo, avatar, generic document)
  const valid = validateUpload(kind, file.type, file.size);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  const { storeUpload } = await import("@/lib/storage/uploads");
  const stored = await storeUpload(kind, file.name, file.type, data);

  return NextResponse.json({ ok: true, ...stored });
}
