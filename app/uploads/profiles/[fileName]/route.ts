import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadDirectory = path.join(process.cwd(), "public/uploads/profiles");

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type RouteContext = {
  params: Promise<{
    fileName: string;
  }>;
};

function getSafeProfileImagePath(fileName: string) {
  const safeFileName = path.basename(fileName);
  if (safeFileName !== fileName) {
    return null;
  }

  const extension = path.extname(safeFileName).toLowerCase();
  if (!IMAGE_CONTENT_TYPES[extension]) {
    return null;
  }

  return {
    contentType: IMAGE_CONTENT_TYPES[extension],
    filePath: path.join(uploadDirectory, safeFileName),
  };
}

export async function GET(_req: Request, context: RouteContext) {
  const { fileName } = await context.params;
  const image = getSafeProfileImagePath(fileName);

  if (!image) {
    return NextResponse.json({ message: "Image not found" }, { status: 404 });
  }

  try {
    const bytes = await readFile(image.filePath);
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Type": image.contentType,
      },
    });
  } catch {
    return NextResponse.json({ message: "Image not found" }, { status: 404 });
  }
}
