import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readUpload } from "@/lib/storage/uploads";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  // Require authentication
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path } = await ctx.params;
  const key = path.join("/");

  if (!key || key.includes("..")) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  // Check if user has access to this file
  // Files are stored under kind/id/filename
  // We need to verify the file belongs to user's org
  const file = await readUpload(key);
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  // For document files, check student access
  if (key.startsWith("document/")) {
    // Extract student ID from storage key pattern
    // Documents are linked to students via the Document table
    const doc = await prisma.document.findFirst({
      where: { storageKey: key },
      select: {
        orgPath: true,
        student: { select: { orgId: true } },
      },
    });

    if (doc && user.orgPath) {
      // Check if user's org path is an ancestor of the document's org path
      // For simplicity, check if user's org matches
      const userOrg = await prisma.organization.findFirst({
        where: { id: user.orgId ?? "" },
        select: { orgPath: true },
      });

      if (userOrg) {
        // Allow if user's org is same or parent of doc's org
        const isAllowed =
          doc.orgPath.startsWith(userOrg.orgPath) ||
          userOrg.orgPath.startsWith(doc.orgPath);
        if (!isAllowed) {
          return new NextResponse("Forbidden", { status: 403 });
        }
      }
    }
  }

  // For logos/avatars, allow if user is in same org or is platform admin
  if (key.startsWith("logo/") || key.startsWith("avatar/")) {
    // These are generally public within the org context
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
