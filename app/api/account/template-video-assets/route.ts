import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import { requireCurrentUser } from "@/app/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;
const UPLOAD_PUBLIC_PREFIX = "/uploads/template-videos";
const UPLOAD_ROOT = path.join(
  process.cwd(),
  "public",
  "uploads",
  "template-videos",
);

const MIME_EXTENSION: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-m4v": ".m4v",
};

function cleanFileName(name: string) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base || "video";
}

function extensionFor(file: File) {
  const fromMime = MIME_EXTENSION[file.type];
  if (fromMime) return fromMime;

  const fromName = path.extname(file.name || "").toLowerCase();
  return fromName && fromName.length <= 8 ? fromName : ".mp4";
}

export async function POST(req: Request) {
  const user = await requireCurrentUser();
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { message: "A video file is required" },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("video/")) {
    return NextResponse.json(
      { message: "Only video uploads are supported" },
      { status: 400 },
    );
  }

  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    return NextResponse.json(
      { message: "Video file is too large" },
      { status: 413 },
    );
  }

  const userDir = path.join(UPLOAD_ROOT, user.id);
  await fs.mkdir(userDir, { recursive: true });

  const id = crypto.randomUUID();
  const safeName = cleanFileName(file.name || "video");
  const ext = extensionFor(file);
  const fileName = `${id}-${safeName.replace(/\.[^.]+$/, "")}${ext}`;
  const outputPath = path.join(userDir, fileName);

  await fs.writeFile(outputPath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    ok: true,
    video: {
      id,
      src: `${UPLOAD_PUBLIC_PREFIX}/${user.id}/${fileName}`,
      fileName: file.name || fileName,
      mimeType: file.type || "video/mp4",
      size: file.size,
    },
  });
}
