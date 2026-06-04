import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadDirectory = path.join(
  process.cwd(),
  "public",
  "uploads",
  "template-videos",
);

const VIDEO_CONTENT_TYPES: Record<string, string> = {
  ".m4v": "video/x-m4v",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

type RouteContext = {
  params: Promise<{
    userId: string;
    fileName: string;
  }>;
};

function getSafeVideoPath(userId: string, fileName: string) {
  const safeUserId = path.basename(userId);
  const safeFileName = path.basename(fileName);
  if (safeUserId !== userId || safeFileName !== fileName) {
    return null;
  }

  const extension = path.extname(safeFileName).toLowerCase();
  const contentType = VIDEO_CONTENT_TYPES[extension];
  if (!contentType) {
    return null;
  }

  const filePath = path.join(uploadDirectory, safeUserId, safeFileName);
  const safeRoot = path.join(uploadDirectory, safeUserId);
  const resolvedPath = path.resolve(filePath);
  const resolvedRoot = path.resolve(safeRoot);
  if (
    resolvedPath !== resolvedRoot &&
    !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    return null;
  }

  return {
    contentType,
    filePath: resolvedPath,
  };
}

function parseRange(rangeHeader: string | null, fileSize: number) {
  if (!rangeHeader) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const startRaw = match[1];
  const endRaw = match[2];
  const start = startRaw ? Number.parseInt(startRaw, 10) : 0;
  const end = endRaw ? Number.parseInt(endRaw, 10) : fileSize - 1;

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(end, fileSize - 1),
  };
}

export async function GET(req: Request, context: RouteContext) {
  const { userId, fileName } = await context.params;
  const video = getSafeVideoPath(userId, fileName);

  if (!video) {
    return NextResponse.json({ message: "Video not found" }, { status: 404 });
  }

  try {
    const fileStat = await stat(video.filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ message: "Video not found" }, { status: 404 });
    }

    const fileSize = fileStat.size;
    const range = parseRange(req.headers.get("range"), fileSize);

    if (req.headers.get("range") && !range) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
        },
      });
    }

    if (range) {
      const stream = createReadStream(video.filePath, {
        start: range.start,
        end: range.end,
      });
      const contentLength = range.end - range.start + 1;

      return new NextResponse(stream as unknown as BodyInit, {
        status: 206,
        headers: {
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=0, must-revalidate",
          "Content-Length": String(contentLength),
          "Content-Range": `bytes ${range.start}-${range.end}/${fileSize}`,
          "Content-Type": video.contentType,
        },
      });
    }

    const stream = createReadStream(video.filePath);
    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Length": String(fileSize),
        "Content-Type": video.contentType,
      },
    });
  } catch {
    return NextResponse.json({ message: "Video not found" }, { status: 404 });
  }
}
