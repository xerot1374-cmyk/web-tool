import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

import { configureFfmpegPaths } from "@/app/lib/ffmpeg";
import { requireCurrentUser } from "@/app/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;
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

function parseByteLimit(raw: string | undefined) {
  const clean = raw?.trim();
  if (!clean) return DEFAULT_MAX_VIDEO_UPLOAD_BYTES;

  const numeric = Number(clean);
  if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);

  const match = clean.match(/^(\d+(?:\.\d+)?)([kKmMgGtT])[bB]?$/);
  if (!match) return DEFAULT_MAX_VIDEO_UPLOAD_BYTES;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === "k"
      ? 1024
      : unit === "m"
        ? 1024 * 1024
        : unit === "g"
          ? 1024 * 1024 * 1024
          : 1024 * 1024 * 1024 * 1024;

  return Math.floor(value * multiplier);
}

function getMaxVideoUploadBytes() {
  return parseByteLimit(process.env.VIDEO_UPLOAD_MAX_BYTES);
}

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}

function parseFrameRate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;

  const [rawNumerator, rawDenominator] = value.split("/");
  const numerator = Number(rawNumerator);
  const denominator = Number(rawDenominator ?? "1");

  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator <= 0 ||
    denominator <= 0
  ) {
    return undefined;
  }

  const fps = numerator / denominator;
  if (fps < 0.1 || fps > 240) return undefined;

  return rawDenominator ? `${numerator}/${denominator}` : `${numerator}`;
}

async function getVideoFrameRate(videoPath: string) {
  await configureFfmpegPaths();

  return new Promise<string | undefined>((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        resolve(undefined);
        return;
      }

      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === "video",
      );
      resolve(
        parseFrameRate(videoStream?.avg_frame_rate) ??
          parseFrameRate(videoStream?.r_frame_rate),
      );
    });
  });
}

export async function POST(req: Request) {
  const user = await requireCurrentUser();
  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      {
        message:
          "Video upload is too big or incomplete. Choose a smaller file and try again.",
      },
      { status: 413 },
    );
  }

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

  const maxVideoUploadBytes = getMaxVideoUploadBytes();
  if (file.size > maxVideoUploadBytes) {
    return NextResponse.json(
      {
        message: `Video upload is too big. Maximum upload size is ${formatBytes(
          maxVideoUploadBytes,
        )}.`,
        maxBytes: maxVideoUploadBytes,
        actualBytes: file.size,
      },
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
  const frameRate = await getVideoFrameRate(outputPath);

  return NextResponse.json({
    ok: true,
    video: {
      id,
      src: `${UPLOAD_PUBLIC_PREFIX}/${user.id}/${fileName}`,
      fileName: file.name || fileName,
      mimeType: file.type || "video/mp4",
      size: file.size,
      frameRate,
    },
  });
}
