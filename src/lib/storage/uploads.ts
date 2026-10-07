import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { randomBytes, createHash } from "node:crypto";

export type UploadKind = "logo" | "avatar" | "document";

export type StoredFile = {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  sha256: string;
};

const ROOT = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");

const ALLOWED: Record<UploadKind, { mimes: string[]; maxBytes: number }> = {
  logo: {
    mimes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
    maxBytes: 2 * 1024 * 1024,
  },
  avatar: {
    mimes: ["image/png", "image/jpeg", "image/webp"],
    maxBytes: 1024 * 1024,
  },
  document: {
    mimes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxBytes: 15 * 1024 * 1024,
  },
};

function safeExt(mime: string): string {
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
  };
  return map[mime] ?? extname(mime) ?? ".bin";
}

export function validateUpload(
  kind: UploadKind,
  mimeType: string,
  size: number,
): { ok: true } | { ok: false; error: string } {
  const rule = ALLOWED[kind];
  if (!rule.mimes.includes(mimeType)) {
    return {
      ok: false,
      error: `File type ${mimeType} is not allowed for ${kind}`,
    };
  }
  if (size > rule.maxBytes) {
    const mb = Math.round(rule.maxBytes / 1024 / 1024);
    return { ok: false, error: `File must be ${mb}MB or smaller` };
  }
  return { ok: true };
}

export async function storeUpload(
  kind: UploadKind,
  fileName: string,
  mimeType: string,
  data: Buffer,
): Promise<StoredFile> {
  const valid = validateUpload(kind, mimeType, data.length);
  if (!valid.ok) throw new Error(valid.error);

  const id = randomBytes(12).toString("hex");
  const ext = safeExt(mimeType);
  const base = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const key = `${kind}/${id}/${base || "file"}${ext && !base.includes(".") ? ext : ""}`;

  const dir = join(ROOT, kind, id);
  await mkdir(dir, { recursive: true });
  const path = join(ROOT, key);
  await writeFile(path, data);

  const sha256 = createHash("sha256").update(data).digest("hex");

  return {
    key,
    url: `/api/files/${key}`,
    size: data.length,
    mimeType,
    sha256,
  };
}

export async function deleteUpload(key: string): Promise<void> {
  const path = join(ROOT, key);
  try {
    await unlink(path);
  } catch {
    // already gone
  }
}

export async function readUpload(
  key: string,
): Promise<{ data: Buffer; mimeType: string } | null> {
  // Prevent path traversal
  if (key.includes("..") || key.startsWith("/")) return null;
  const path = join(ROOT, key);
  try {
    const info = await stat(path);
    if (!info.isFile()) return null;
    const { readFile } = await import("node:fs/promises");
    const data = await readFile(path);
    return { data, mimeType: guessMime(key) };
  } catch {
    return null;
  }
}

function guessMime(key: string): string {
  const ext = extname(key).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] ?? "application/octet-stream";
}
