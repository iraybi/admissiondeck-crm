import { NextRequest, NextResponse } from "next/server";
import { readUpload } from "@/lib/storage/uploads";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const key = path.join("/");

  const file = await readUpload(key);
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
