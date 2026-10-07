import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  resolveChecklist,
  validateAgainstRequirement,
  type DocumentRequirementRule,
} from "./requirements";
import { scanBuffer, type ScanResult } from "@/lib/security/malware-scanner";
import { storeUpload, type StoredFile } from "@/lib/storage/uploads";

export type UploadOutcome = {
  ok: boolean;
  error?: string;
  documentId?: string;
  scanResult?: ScanResult;
  storedFile?: StoredFile;
};

/**
 * Full upload pipeline:
 * 1. Resolve the student's document checklist
 * 2. Validate the file against the matching DocumentRequirement
 * 3. Store the file in quarantine
 * 4. Run the built-in malware scanner
 * 5. Clean -> production bucket, Infected -> purge + alert
 * 6. Record the Document row with scan metadata
 */
export async function processUpload(input: {
  studentId: string;
  docType: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
  uploadedById: string;
}): Promise<UploadOutcome> {
  // 1. Get the student and their checklist
  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: {
      id: true,
      orgId: true,
      orgPath: true,
      targetCountry: true,
      targetUniversity: true,
      targetProgram: true,
      targetIntake: true,
    },
  });

  if (!student) {
    return { ok: false, error: "Student not found" };
  }

  const checklist = await resolveChecklist({
    country: student.targetCountry,
    university: student.targetUniversity,
    programme: student.targetProgram,
    intake: student.targetIntake,
    studentId: student.id,
  });

  const requirement = checklist.find((r) => r.docType === input.docType);
  if (!requirement) {
    return {
      ok: false,
      error: `Document type "${input.docType}" is not required for this student`,
    };
  }

  // 2. Validate against the requirement
  const valid = validateAgainstRequirement(
    { name: input.fileName, type: input.mimeType, size: input.data.length },
    requirement,
  );
  if (!valid.ok) {
    return { ok: false, error: valid.error };
  }

  // 3. Store in quarantine
  let stored: StoredFile;
  try {
    stored = await storeUpload(
      "document",
      input.fileName,
      input.mimeType,
      input.data,
    );
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // 4. Scan for malware
  const scanResult = await scanBuffer(input.data);

  // 5. Create the Document row
  const doc = await prisma.document.create({
    data: {
      studentId: student.id,
      orgPath: student.orgPath,
      type: input.docType,
      fileName: input.fileName,
      storageKey: stored.key,
      bucket: scanResult.clean ? ("PRODUCTION" as never) : ("PURGED" as never),
      scanStatus: scanResult.clean ? ("CLEAN" as never) : ("INFECTED" as never),
      scanResult: {
        signature: scanResult.signature,
        durationMs: scanResult.durationMs,
        engineVersion: scanResult.engineVersion,
        definitionVersion: scanResult.definitionVersion,
        scannedAt: new Date().toISOString(),
      },
      status: scanResult.clean ? ("AVAILABLE" as never) : ("REJECTED" as never),
      uploadedById: input.uploadedById,
      sizeBytes: stored.size,
      mimeType: stored.mimeType,
      sha256: stored.sha256,
    },
  });

  // 6. If infected, alert and purge
  if (!scanResult.clean) {
    await prisma.auditLog.create({
      data: {
        orgPath: student.orgPath,
        actorId: input.uploadedById,
        action: "document.infected",
        entityType: "Document",
        entityId: doc.id,
        after: {
          studentId: student.id,
          docType: input.docType,
          signature: scanResult.signature,
          fileName: input.fileName,
        },
      },
    });

    return {
      ok: false,
      error: `File rejected: malware detected (${scanResult.signature ?? "unknown"})`,
      documentId: doc.id,
      scanResult,
      storedFile: stored,
    };
  }

  // Clean: record success
  await prisma.auditLog.create({
    data: {
      orgPath: student.orgPath,
      actorId: input.uploadedById,
      action: "document.uploaded",
      entityType: "Document",
      entityId: doc.id,
      after: {
        studentId: student.id,
        docType: input.docType,
        fileName: input.fileName,
        scanDurationMs: scanResult.durationMs,
      },
    },
  });

  return {
    ok: true,
    documentId: doc.id,
    scanResult,
    storedFile: stored,
  };
}

/**
 * Get a student's document checklist with upload status.
 */
export async function getStudentChecklist(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      targetCountry: true,
      targetUniversity: true,
      targetProgram: true,
      targetIntake: true,
      documents: {
        where: { status: { notIn: ["REJECTED"] as never } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          fileName: true,
          status: true,
          scanStatus: true,
          bucket: true,
          createdAt: true,
          sizeBytes: true,
          uploadedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!student) return null;

  const checklist = await resolveChecklist({
    country: student.targetCountry,
    university: student.targetUniversity,
    programme: student.targetProgram,
    intake: student.targetIntake,
    studentId: student.id,
  });

  // Merge checklist with uploaded documents
  return checklist.map((req) => {
    const uploads = student.documents.filter((d) => d.type === req.docType);
    return {
      ...req,
      uploads: uploads.map((u) => ({
        id: u.id,
        fileName: u.fileName,
        status: u.status,
        scanStatus: u.scanStatus,
        uploadedAt: u.createdAt,
        uploadedBy: u.uploadedBy.name,
        sizeBytes: u.sizeBytes,
      })),
      isComplete: uploads.some((u) => u.status === "AVAILABLE"),
    };
  });
}

/**
 * List documents in quarantine or scanning for the admin review queue.
 */
export async function listDocumentsForReview(opts: {
  orgPaths: string[];
  state?: string;
  take?: number;
}) {
  return prisma.document.findMany({
    where: {
      AND: [
        {
          OR: opts.orgPaths.flatMap((p) => [
            { orgPath: { startsWith: p + "." } },
            { orgPath: p },
          ]),
        },
        ...(opts.state && opts.state !== "all"
          ? [{ status: opts.state as never }]
          : [{ status: { in: ["UPLOADED", "QUARANTINED"] as never } }]),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 50,
    include: {
      student: {
        select: { id: true, name: true, targetCountry: true },
      },
      uploadedBy: { select: { name: true } },
    },
  });
}
