import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import os from "os";
import path from "path";
import fs from "fs/promises";

import { configureFfmpegPaths } from "@/app/lib/ffmpeg";
import { absUrl, getCanvasFrame, type CanvasPreset } from "@/app/lib/renderUtils";
import type { LinkedInRichTextMark as TextMark } from "@/app/components/templates/linkedin-shared/richTextRender";
import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/richTextTypes";

type Payload = {
  profileImage: string;
  name: string;
  role: string;

  title?: string;
  badgeText?: string;
  badgeMarks?: TextMark[];
  badgeBlocks?: RichTextBlock[];
  linkTitle?: string;
  titleMarks?: TextMark[];
  titleBlocks?: RichTextBlock[];
  company?: string;
  companyMarks?: TextMark[];
  companyBlocks?: RichTextBlock[];

  headline?: string;
  subline?: string;
  body?: string;
  bodyText?: string;
  bodyMarks?: TextMark[];
  bodyBlocks?: RichTextBlock[];

  link?: string;
  linkUrl?: string | string[];
  linkUrls?: string[];
  hashtags?: string | string[];

  mediaBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  videoBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  videoRadius?: number;
  videos?: Array<{
    id: string;
    fileKey?: string;
    src?: string;
    fileName?: string;
    mimeType?: string;
    x: number;
    y: number;
    w: number;
    h: number;
    radius: number;
    zIndex?: number;
  }>;

  images?: unknown[];
  productAlign?: "left" | "center" | "right";
  imageLayout?: "manual" | "collage" | "frame";
  framePresetId?: string;
  frameSlots?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    radius: number;
    rotation?: number;
    clipPath?: string;
    shape?: "rect" | "organic" | "pill" | "arch" | "blob";
  }>;
  titleStyle?: BoxTextStyle;
  bodyStyle?: BoxTextStyle;
  badgeStyle?: BoxTextStyle;
  companyStyle?: BoxTextStyle;
  headlineStyle?: BoxTextStyle;
  sublineStyle?: BoxTextStyle;
  canvasPreset?: CanvasPreset;
};

type PayloadVideo = NonNullable<Payload["videos"]>[number];
type VideoEntry = {
  meta: PayloadVideo;
  file?: File;
  src?: string;
};
type BoxTextStyle = {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  textAlign?: "left" | "center" | "right";
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn7n6QAAAAASUVORK5CYII=";
const MAX_FINAL_VIDEO_DIMENSION = 4096;
const TEMPLATE_VIDEO_UPLOAD_PREFIX = "/uploads/template-videos/";
const TEMPLATE_VIDEO_UPLOAD_ROOT = path.resolve(
  process.cwd(),
  "public",
  "uploads",
  "template-videos",
);

type FinalVideoFrame = {
  w: number;
  h: number;
  templateOffsetX: number;
};

function makeEven(value: number) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

function clampVideoDimension(value: number) {
  return Math.min(MAX_FINAL_VIDEO_DIMENSION, Math.max(2, value));
}

function getFinalVideoFrame(
  templateContentWidth: number,
  measuredHeight: number,
): FinalVideoFrame {
  const finalHeight = makeEven(clampVideoDimension(Math.ceil(measuredHeight)));
  const finalWidth = makeEven(
    clampVideoDimension(templateContentWidth),
  );

  return {
    w: finalWidth,
    h: finalHeight,
    templateOffsetX: Math.round((finalWidth - templateContentWidth) / 2),
  };
}

function normalizePayload(data: Payload): Payload {
  return {
    ...data,
    linkTitle: data.linkTitle ?? data.title,
    bodyText: data.bodyText ?? data.body,
    videoRadius:
      typeof data.videoRadius === "number" && Number.isFinite(data.videoRadius)
        ? Math.max(0, Math.round(data.videoRadius))
        : 20,
    videos:
      data.videos?.flatMap((video) => {
        const fileKey =
          typeof video?.fileKey === "string" && video.fileKey.trim()
            ? video.fileKey
            : undefined;
        const src =
          typeof video?.src === "string" && video.src.trim()
            ? video.src
            : undefined;

        if (
          !video ||
          typeof video.id !== "string" ||
          (!fileKey && !src) ||
          typeof video.x !== "number" ||
          typeof video.y !== "number" ||
          typeof video.w !== "number" ||
          typeof video.h !== "number"
        ) {
          return [];
        }

        return [
          {
            ...video,
            fileKey,
            src,
            radius:
              typeof video.radius === "number" && Number.isFinite(video.radius)
                ? Math.max(0, Math.round(video.radius))
                : 20,
            zIndex:
              typeof video.zIndex === "number" && Number.isFinite(video.zIndex)
                ? video.zIndex
                : undefined,
          },
        ];
      }) ?? [],
  };
}

function getHeaderHeight(preset?: CanvasPreset) {
  if (preset === "instagram") return 760;
  if (preset === "instagramStory") return 1320;
  return 850;
}

function getFinalVideoBox(
  preset: CanvasPreset | undefined,
  mediaBox?: { x: number; y: number; w: number; h: number },
) {
  const canvas = getCanvasFrame(preset);
  const headerHeight = getHeaderHeight(preset);
  const verticalOffset =
    preset === "instagramStory" ? 360 : preset === "instagram" ? 260 : 320;
  const targetWidth = Math.max(
    1,
    Math.round(Math.max(canvas.w * 0.99, mediaBox?.w ? mediaBox.w * 1.8 : 0)),
  );
  const targetHeight = Math.max(
    1,
    Math.round(
      Math.max(headerHeight * 0.99, mediaBox?.h ? mediaBox.h * 1.8 : 0),
    ),
  );

  const width = Math.min(targetWidth, canvas.w);
  const height = Math.min(targetHeight, headerHeight);
  const centeredY = Math.round((headerHeight - height) / 2);
  const y = Math.max(0, centeredY + verticalOffset);
  return {
    x: Math.round((canvas.w - width) / 2),
    y,
    w: width,
    h: height,
  };
}

function getRoundedVideoAlphaExpression(
  width: number,
  height: number,
  radius: number,
) {
  const rounded = Math.max(
    0,
    Math.min(Math.round(radius), Math.floor(width / 2), Math.floor(height / 2)),
  );

  if (rounded === 0) return null;

  const right = width - rounded - 1;
  const bottom = height - rounded - 1;
  const radiusSq = rounded * rounded;

  return [
    `if(lt(X,${rounded})*lt(Y,${rounded})*gt((X-${rounded})*(X-${rounded})+(Y-${rounded})*(Y-${rounded}),${radiusSq}),0,`,
    `if(gt(X,${right})*lt(Y,${rounded})*gt((X-${right})*(X-${right})+(Y-${rounded})*(Y-${rounded}),${radiusSq}),0,`,
    `if(lt(X,${rounded})*gt(Y,${bottom})*gt((X-${rounded})*(X-${rounded})+(Y-${bottom})*(Y-${bottom}),${radiusSq}),0,`,
    `if(gt(X,${right})*gt(Y,${bottom})*gt((X-${right})*(X-${right})+(Y-${bottom})*(Y-${bottom}),${radiusSq}),0,255))))`,
  ].join("");
}

function buildVideoScreenshotPayload(
  data: Payload,
  fallbackBox: { x: number; y: number; w: number; h: number },
) {
  const existingImages = Array.isArray(data.images) ? data.images : [];
  const videoSlots = data.videos?.length
    ? data.videos
    : [
        {
          id: "legacy-video-placeholder",
          x: fallbackBox.x,
          y: fallbackBox.y,
          w: fallbackBox.w,
          h: fallbackBox.h,
          radius: data.videoRadius ?? 20,
          zIndex: 1,
        },
      ];

  const videoPlaceholders = videoSlots.map((video) => ({
    id: `video-placeholder-${video.id}`,
    src: TRANSPARENT_PIXEL,
    base64: TRANSPARENT_PIXEL,
    orientation: video.h > video.w ? "portrait" : "landscape",
    x: video.x,
    y: video.y,
    w: video.w,
    h: video.h,
    rotation: 0,
    radius: video.radius ?? data.videoRadius ?? 20,
    cropX: 50,
    cropY: 50,
    cropScale: 1,
  }));

  return {
    ...data,
    images: [...existingImages, ...videoPlaceholders],
  };
}

function getVideoScreenshotCss(foregroundOnly: boolean) {
  const background = foregroundOnly ? "transparent" : "#ffffff";

  return `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: ${background} !important;
      width: 100% !important;
      min-height: 100% !important;
      overflow: visible !important;
    }
    .pdf-emoji-font-scope {
      display: flex !important;
      justify-content: center !important;
      align-items: flex-start !important;
      background: ${background} !important;
      overflow: visible !important;
    }
    .pdf-emoji-font-scope .li2-viewport {
      --li2-scale: 1;
      height: auto !important;
      overflow: visible !important;
      background: ${background} !important;
    }
    .pdf-emoji-font-scope .li2-root {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      position: relative !important;
      background: ${background} !important;
      border-color: ${
        foregroundOnly ? "transparent" : "rgba(155, 157, 161, 0.32)"
      } !important;
    }
    .pdf-emoji-font-scope .li2-content {
      overflow: visible !important;
      flex: 0 0 auto !important;
    }
    .pdf-emoji-font-scope .li2-body,
    .pdf-emoji-font-scope .li2-bottom {
      overflow: visible !important;
    }
    ${
      foregroundOnly
        ? `
    .pdf-emoji-font-scope .li2-header {
      background: transparent !important;
      background-image: none !important;
    }
    .pdf-emoji-font-scope .li2-productSlot {
      display: none !important;
    }
    `
        : ""
    }
  `;
}

function getPuppeteerLaunchOptions() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();

  return {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    ...(executablePath ? { executablePath } : {}),
  };
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function parseVideoBox(raw: FormDataEntryValue | null): Payload["videoBox"] {
  if (typeof raw !== "string" || !raw.trim()) return undefined;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "x" in parsed &&
      "y" in parsed &&
      "w" in parsed &&
      "h" in parsed
    ) {
      const box = parsed as { x: unknown; y: unknown; w: unknown; h: unknown };
      if (
        typeof box.x === "number" &&
        typeof box.y === "number" &&
        typeof box.w === "number" &&
        typeof box.h === "number"
      ) {
        return {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
        };
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function persistUploadedFile(file: File, outputPath: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
}

function resolvePersistedVideoPath(src?: string) {
  const cleanSrc = src?.split(/[?#]/)[0]?.trim();
  if (!cleanSrc?.startsWith(TEMPLATE_VIDEO_UPLOAD_PREFIX)) return null;

  const target = path.resolve(
    process.cwd(),
    "public",
    cleanSrc.replace(/^\/+/, ""),
  );

  if (
    target !== TEMPLATE_VIDEO_UPLOAD_ROOT &&
    !target.startsWith(`${TEMPLATE_VIDEO_UPLOAD_ROOT}${path.sep}`)
  ) {
    return null;
  }

  return target;
}

async function screenshotCoverPng(
  req: Request,
  data: Payload,
  outPngPath: string,
  mode: "base" | "foreground" = "base",
  outputFrame?: FinalVideoFrame,
): Promise<FinalVideoFrame> {
  const puppeteer = (await import("puppeteer")).default;

  const frame = getCanvasFrame(data.canvasPreset);
  const box = data.videoBox
    ? {
        x: Math.round(data.videoBox.x),
        y: Math.round(data.videoBox.y),
        w: Math.round(data.videoBox.w),
        h: Math.round(data.videoBox.h),
      }
    : getFinalVideoBox(data.canvasPreset, data.mediaBox);
  const renderUrl = absUrl(req, "/pdf-render");
  const screenshotPayload = buildVideoScreenshotPayload(data, box);
  const foregroundOnly = mode === "foreground";

  const browser = await puppeteer.launch(getPuppeteerLaunchOptions());

  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: frame.w,
      height: Math.min(frame.h, 2000),
      deviceScaleFactor: 1,
    });

    await page.emulateMediaType("screen");
    await page.evaluateOnNewDocument((payload) => {
      (window as unknown as { __PDF_PAYLOAD__?: unknown }).__PDF_PAYLOAD__ =
        payload;
    }, screenshotPayload);
    await page.goto(renderUrl, { waitUntil: "networkidle0", timeout: 60000 });
    await page.addStyleTag({ content: getVideoScreenshotCss(foregroundOnly) });

    await page.waitForSelector(".li2-root", { timeout: 60000 });

    await page.waitForFunction(
      async () => {
        const fontsReady =
          "fonts" in document
            ? (document as Document & { fonts: FontFaceSet }).fonts.ready
            : Promise.resolve();
        await fontsReady;

        const imgs = Array.from(document.images);
        return imgs.every((img) => img.complete);
      },
      { timeout: 60000 },
    );

    const measuredHeight = await page.$eval(".li2-root", (node) => {
      const el = node as HTMLElement;
      const rect = el.getBoundingClientRect();
      return Math.max(1, Math.ceil(rect.height));
    });
    const finalFrame =
      outputFrame ??
      getFinalVideoFrame(frame.w, measuredHeight);

    await page.$eval(
      ".pdf-emoji-font-scope",
      (node, finalWidth) => {
        const stage = node as HTMLElement;
        stage.style.width = `${finalWidth}px`;
        stage.style.display = "flex";
        stage.style.justifyContent = "center";
        stage.style.alignItems = "flex-start";
      },
      finalFrame.w,
    );

    await page.setViewport({
      width: finalFrame.w,
      height: Math.min(finalFrame.h, 2000),
      deviceScaleFactor: 1,
    });

    const clip = await page.$eval(
      ".pdf-emoji-font-scope",
      (node, finalWidth, finalHeight) => {
        const stage = node as HTMLElement;
        const rect = stage.getBoundingClientRect();
        return {
          x: Math.max(0, Math.floor(rect.left)),
          y: Math.max(0, Math.floor(rect.top)),
          width: Math.ceil(finalWidth as number),
          height: Math.ceil(finalHeight as number),
        };
      },
      finalFrame.w,
      finalFrame.h,
    );

    const buffer = await page.screenshot({
      type: "png",
      clip,
      ...(foregroundOnly ? { omitBackground: true } : {}),
    });
    await fs.writeFile(outPngPath, buffer);

    return finalFrame;
  } finally {
    await browser.close();
  }
}

async function buildVideoInsideTemplateWithAudio(
  coverPngPath: string,
  videos: Array<{
    path: string;
    x: number;
    y: number;
    w: number;
    h: number;
    radius: number;
    zIndex?: number;
  }>,
  foregroundPngPath: string,
  outputMp4Path: string,
  frame: FinalVideoFrame,
) {
  let ffErr = "";
  const sortedVideos = [...videos].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
  );
  const complexFilters: string[] = [];
  let lastLabel = "[0:v]";

  sortedVideos.forEach((video, index) => {
    const inputIndex = index + 1;
    const alphaExpr = getRoundedVideoAlphaExpression(
      video.w,
      video.h,
      video.radius,
    );
    const streamLabel = `[vid${index}]`;
    complexFilters.push(
      alphaExpr
        ? `[${inputIndex}:v]scale=${video.w}:${video.h}:force_original_aspect_ratio=increase,crop=${video.w}:${video.h},format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaExpr}'${streamLabel}`
        : `[${inputIndex}:v]scale=${video.w}:${video.h}:force_original_aspect_ratio=increase,crop=${video.w}:${video.h}${streamLabel}`,
    );
    const nextLabel =
      index === sortedVideos.length - 1 ? "[with_video]" : `[stage${index}]`;
    complexFilters.push(
      `${lastLabel}${streamLabel}overlay=${video.x + frame.templateOffsetX}:${video.y}:shortest=1${nextLabel}`,
    );
    lastLabel = nextLabel;
  });

  const foregroundInputIndex = sortedVideos.length + 1;
  complexFilters.push(
    `${lastLabel}[${foregroundInputIndex}:v]overlay=0:0:format=auto[v]`,
  );

  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg().input(coverPngPath).inputOptions(["-loop 1"]);

    sortedVideos.forEach((video) => {
      command.input(video.path);
    });

    command
      .input(foregroundPngPath)
      .complexFilter(complexFilters)
      .outputOptions([
        "-map [v]",
        "-map 1:a?",
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-r 30",
        "-c:a aac",
        "-b:a 192k",
        "-shortest",
        "-movflags +faststart",
      ])
      .on("stderr", (line) => (ffErr += line + "\n"))
      .on("error", (err) =>
        reject(new Error((err?.message || "ffmpeg failed") + "\n" + ffErr)),
      )
      .on("end", () => resolve())
      .save(outputMp4Path);
  });
}

export async function POST(req: Request) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "final-"));
  const coverPng = path.join(tmpDir, "cover.png");
  const foregroundPng = path.join(tmpDir, "foreground.png");
  const finalMp4 = path.join(tmpDir, "final.mp4");

  try {
    await configureFfmpegPaths();

    const formData = await req.formData();
    const rawData = getFormString(formData, "data");

    if (!rawData) {
      return NextResponse.json(
        { error: "Missing form field 'data'" },
        { status: 400 },
      );
    }

    const data = {
      ...normalizePayload(JSON.parse(rawData) as Payload),
      videoBox: parseVideoBox(formData.get("videoBox")),
    };

    const videoEntries: VideoEntry[] =
      data.videos?.flatMap<VideoEntry>((video) => {
        const fileField = video.fileKey ? formData.get(video.fileKey) : null;
        if (fileField instanceof File && fileField.size > 0) {
          return [
            {
              meta: video,
              file: fileField,
              src: undefined,
            },
          ];
        }

        if (!video.src) return [];

        return [
          {
            meta: video,
            file: undefined,
            src: video.src,
          },
        ];
      }) ?? [];

    if (!videoEntries.length) {
      const videoField = formData.get("video");
      if (!(videoField instanceof File) || videoField.size === 0) {
        return NextResponse.json(
          { error: "No video uploaded" },
          { status: 400 },
        );
      }
      const legacyBox = data.videoBox
        ? {
            x: Math.round(data.videoBox.x),
            y: Math.round(data.videoBox.y),
            w: Math.round(data.videoBox.w),
            h: Math.round(data.videoBox.h),
            radius: data.videoRadius ?? 20,
            zIndex: 1,
            fileKey: "video",
            id: "legacy-video",
          }
        : {
            ...getFinalVideoBox(data.canvasPreset, data.mediaBox),
            radius: data.videoRadius ?? 20,
            zIndex: 1,
            fileKey: "video",
            id: "legacy-video",
          };

      videoEntries.push({
        meta: legacyBox,
        file: videoField,
      });
    }

    if (!videoEntries.length) {
      return NextResponse.json({ error: "No video uploaded" }, { status: 400 });
    }

    const persistedVideos = await Promise.all(
      videoEntries.map(async ({ meta, file, src }, index) => {
        const videoPath = file
          ? path.join(tmpDir, `upload-${index}.mp4`)
          : resolvePersistedVideoPath(src);

        if (!videoPath) {
          throw new Error("Stored video reference is invalid");
        }

        if (file) {
          await persistUploadedFile(file, videoPath);
        } else {
          await fs.access(videoPath);
        }

        return {
          path: videoPath,
          x: Math.round(meta.x),
          y: Math.round(meta.y),
          w: Math.round(meta.w),
          h: Math.round(meta.h),
          radius: meta.radius,
          zIndex: meta.zIndex,
        };
      }),
    );

    const finalFrame = await screenshotCoverPng(req, data, coverPng, "base");
    await screenshotCoverPng(
      req,
      data,
      foregroundPng,
      "foreground",
      finalFrame,
    );
    await buildVideoInsideTemplateWithAudio(
      coverPng,
      persistedVideos,
      foregroundPng,
      finalMp4,
      finalFrame,
    );

    const out = await fs.readFile(finalMp4);
    return new NextResponse(out as unknown as BodyInit, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="final.mp4"',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "final video failed" },
      { status: 500 },
    );
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
