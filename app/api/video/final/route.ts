import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import os from "os";
import path from "path";
import fs from "fs/promises";

import { configureFfmpegPaths } from "@/app/lib/ffmpeg";
import { absUrl, getCanvasFrame, type CanvasPreset } from "@/app/lib/renderUtils";
import {
  createFinalVideoJob,
  getFinalVideoJob,
  updateFinalVideoJob,
} from "./jobStore";
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
    cropTop?: number;
    cropRight?: number;
    cropBottom?: number;
    cropLeft?: number;
    contentX?: number;
    contentY?: number;
    contentW?: number;
    contentH?: number;
    trimStartSeconds?: number;
    trimEndSeconds?: number;
    timelineStartSeconds?: number;
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
const DEFAULT_MAX_FINAL_VIDEO_SECONDS = 8 * 60;
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

type PreparedVideo = {
  path: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  zIndex?: number;
  maskPath?: string;
  frameRate?: string;
  duration?: number;
  hasAudio?: boolean;
  trimStart: number;
  trimEnd: number;
  timelineStart: number;
  timelineEnd: number;
  cropTop: number;
  cropRight: number;
  cropBottom: number;
  cropLeft: number;
  contentX: number;
  contentY: number;
  contentW: number;
  contentH: number;
};

function makeEven(value: number) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

function clampVideoDimension(value: number) {
  return Math.min(MAX_FINAL_VIDEO_DIMENSION, Math.max(2, value));
}

function normalizeSideCrop(meta: {
  cropTop?: number;
  cropRight?: number;
  cropBottom?: number;
  cropLeft?: number;
}) {
  const crop = {
    cropTop:
      typeof meta.cropTop === "number" && Number.isFinite(meta.cropTop)
        ? Math.max(0, Math.min(90, meta.cropTop))
        : 0,
    cropRight:
      typeof meta.cropRight === "number" && Number.isFinite(meta.cropRight)
        ? Math.max(0, Math.min(90, meta.cropRight))
        : 0,
    cropBottom:
      typeof meta.cropBottom === "number" && Number.isFinite(meta.cropBottom)
        ? Math.max(0, Math.min(90, meta.cropBottom))
        : 0,
    cropLeft:
      typeof meta.cropLeft === "number" && Number.isFinite(meta.cropLeft)
        ? Math.max(0, Math.min(90, meta.cropLeft))
        : 0,
  };
  const horizontalTotal = crop.cropLeft + crop.cropRight;
  const verticalTotal = crop.cropTop + crop.cropBottom;

  if (horizontalTotal > 90) {
    const scale = 90 / horizontalTotal;
    crop.cropLeft *= scale;
    crop.cropRight *= scale;
  }

  if (verticalTotal > 90) {
    const scale = 90 / verticalTotal;
    crop.cropTop *= scale;
    crop.cropBottom *= scale;
  }

  return crop;
}

function normalizeContentBounds(meta: {
  contentX?: number;
  contentY?: number;
  contentW?: number;
  contentH?: number;
}) {
  return {
    contentX:
      typeof meta.contentX === "number" && Number.isFinite(meta.contentX)
        ? meta.contentX
        : 0,
    contentY:
      typeof meta.contentY === "number" && Number.isFinite(meta.contentY)
        ? meta.contentY
        : 0,
    contentW:
      typeof meta.contentW === "number" && Number.isFinite(meta.contentW)
        ? Math.max(1, meta.contentW)
        : 100,
    contentH:
      typeof meta.contentH === "number" && Number.isFinite(meta.contentH)
        ? Math.max(1, meta.contentH)
        : 100,
  };
}

function getMaxFinalVideoSeconds() {
  const raw = process.env.FINAL_VIDEO_MAX_DURATION_SECONDS?.trim();
  if (!raw) return DEFAULT_MAX_FINAL_VIDEO_SECONDS;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_FINAL_VIDEO_SECONDS;
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return minutes
    ? `${minutes}m ${remainingSeconds}s`
    : `${remainingSeconds}s`;
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

function parseTimemarkSeconds(timemark?: string) {
  if (!timemark) return 0;

  const [rawHours, rawMinutes, rawSeconds] = timemark.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  const seconds = Number(rawSeconds);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds)
  ) {
    return 0;
  }

  return Math.max(0, hours * 3600 + minutes * 60 + seconds);
}

async function getVideoProbeInfo(videoPath: string) {
  return new Promise<{ duration: number; frameRate?: string; hasAudio: boolean }>(
    (resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = Number(metadata.format.duration);
        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === "video",
        );
        resolve({
          duration: Number.isFinite(duration) ? duration : 0,
          hasAudio: metadata.streams.some(
            (stream) => stream.codec_type === "audio",
          ),
          frameRate:
            parseFrameRate(videoStream?.avg_frame_rate) ??
            parseFrameRate(videoStream?.r_frame_rate),
        });
      });
    },
  );
}

function clampTimelineSeconds(value: unknown, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function getPreparedVideoTiming(
  meta: {
    trimStartSeconds?: number;
    trimEndSeconds?: number;
    timelineStartSeconds?: number;
  },
  duration: number,
) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const trimStart = Math.min(
    safeDuration,
    clampTimelineSeconds(meta.trimStartSeconds),
  );
  const rawTrimEnd = clampTimelineSeconds(meta.trimEndSeconds, safeDuration);
  const trimEnd = safeDuration
    ? Math.min(safeDuration, Math.max(trimStart + 0.1, rawTrimEnd))
    : Math.max(trimStart + 0.1, rawTrimEnd);
  const timelineStart = clampTimelineSeconds(meta.timelineStartSeconds);

  return {
    trimStart,
    trimEnd,
    timelineStart,
    timelineEnd: timelineStart + Math.max(0.1, trimEnd - trimStart),
  };
}

function formatFilterSeconds(value: number) {
  return Number(value.toFixed(3)).toString();
}

function getVideoContentCropFilter(video: PreparedVideo) {
  const contentW = Math.max(
    video.w,
    Math.round((video.contentW / 100) * video.w),
  );
  const contentH = Math.max(
    video.h,
    Math.round((video.contentH / 100) * video.h),
  );
  const maxCropX = Math.max(0, contentW - video.w);
  const maxCropY = Math.max(0, contentH - video.h);
  const cropX = Math.max(
    0,
    Math.min(maxCropX, Math.round((-video.contentX / 100) * video.w)),
  );
  const cropY = Math.max(
    0,
    Math.min(maxCropY, Math.round((-video.contentY / 100) * video.h)),
  );

  return `scale=${contentW}:${contentH}:force_original_aspect_ratio=increase,crop=${contentW}:${contentH},crop=${video.w}:${video.h}:${cropX}:${cropY}`;
}

function assertVideoDurationIsAllowed(video: { path: string }, duration: number) {
  const maxDuration = getMaxFinalVideoSeconds();
  if (duration <= maxDuration) return;

  throw new Error(
    `Video "${path.basename(video.path)}" is ${formatDuration(
      duration,
    )}. Final video generation is limited to ${formatDuration(
      maxDuration,
    )}; trim the clip or upload a shorter video.`,
  );
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
            ...normalizeSideCrop(video),
            ...normalizeContentBounds(video),
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

async function writeRoundedMaskPgm(
  width: number,
  height: number,
  radius: number,
  outputPath: string,
  crop = {
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0,
    cropLeft: 0,
  },
) {
  const rounded = Math.max(
    0,
    Math.min(Math.round(radius), Math.floor(width / 2), Math.floor(height / 2)),
  );
  const normalizedCrop = normalizeSideCrop(crop);
  const cropLeftPx = Math.round((normalizedCrop.cropLeft / 100) * width);
  const cropRightPx = Math.round((normalizedCrop.cropRight / 100) * width);
  const cropTopPx = Math.round((normalizedCrop.cropTop / 100) * height);
  const cropBottomPx = Math.round((normalizedCrop.cropBottom / 100) * height);
  const cropRightEdge = width - cropRightPx;
  const cropBottomEdge = height - cropBottomPx;

  const header = Buffer.from(`P5\n${width} ${height}\n255\n`, "ascii");
  const pixels = Buffer.alloc(width * height, 255);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (
        x < cropLeftPx ||
        x >= cropRightEdge ||
        y < cropTopPx ||
        y >= cropBottomEdge
      ) {
        pixels[y * width + x] = 0;
      }
    }
  }

  if (rounded > 0) {
    const radiusSq = rounded * rounded;
    const right = width - rounded - 1;
    const bottom = height - rounded - 1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let cx: number | null = null;
        let cy: number | null = null;

        if (x < rounded && y < rounded) {
          cx = rounded;
          cy = rounded;
        } else if (x > right && y < rounded) {
          cx = right;
          cy = rounded;
        } else if (x < rounded && y > bottom) {
          cx = rounded;
          cy = bottom;
        } else if (x > right && y > bottom) {
          cx = right;
          cy = bottom;
        }

        if (cx == null || cy == null) continue;

        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > radiusSq) {
          pixels[y * width + x] = 0;
        }
      }
    }
  }

  await fs.writeFile(outputPath, Buffer.concat([header, pixels]));
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
    cropTop: video.cropTop ?? 0,
    cropRight: video.cropRight ?? 0,
    cropBottom: video.cropBottom ?? 0,
    cropLeft: video.cropLeft ?? 0,
    contentX: video.contentX ?? 0,
    contentY: video.contentY ?? 0,
    contentW: video.contentW ?? 100,
    contentH: video.contentH ?? 100,
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
  videos: PreparedVideo[],
  foregroundPngPath: string,
  outputMp4Path: string,
  frame: FinalVideoFrame,
  durationSeconds: number,
  onProgress?: (elapsedSeconds: number) => void,
  onCommand?: (command: ReturnType<typeof ffmpeg>) => void,
) {
  let ffErr = "";
  const sortedVideos = [...videos].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
  );
  const outputFrameRate = sortedVideos[0]?.frameRate ?? "30";
  const loopInputOptions = ["-loop 1", "-framerate", outputFrameRate];
  const complexFilters: string[] = [];
  const audioLabels: string[] = [];
  let lastLabel = "[0:v]";
  let nextInputIndex = 1;

  const videoInputs = sortedVideos.map((video) => {
    const videoIndex = nextInputIndex;
    nextInputIndex += 1;
    const maskIndex = video.maskPath ? nextInputIndex : undefined;
    if (video.maskPath) nextInputIndex += 1;
    return { video, videoIndex, maskIndex };
  });
  const foregroundInputIndex = nextInputIndex;

  videoInputs.forEach(({ video, videoIndex, maskIndex }, index) => {
    const scaledLabel = `[scaled${index}]`;
    const timedVideoLabel = `[timed${index}]`;
    const streamLabel = `[vid${index}]`;
    const trimStart = formatFilterSeconds(video.trimStart);
    const trimEnd = formatFilterSeconds(video.trimEnd);
    const timelineStart = formatFilterSeconds(video.timelineStart);
    const timelineEnd = formatFilterSeconds(video.timelineEnd);

    complexFilters.push(
      `[${videoIndex}:v]trim=start=${trimStart}:end=${trimEnd},setpts=PTS-STARTPTS,fps=fps=${outputFrameRate}:round=near,${getVideoContentCropFilter(video)},format=rgba${scaledLabel}`,
    );
    if (maskIndex != null) {
      const maskLabel = `[mask${index}]`;
      complexFilters.push(`[${maskIndex}:v]format=gray${maskLabel}`);
      complexFilters.push(
        `${scaledLabel}${maskLabel}alphamerge${timedVideoLabel}`,
      );
    } else {
      complexFilters.push(`${scaledLabel}copy${timedVideoLabel}`);
    }

    complexFilters.push(
      `${timedVideoLabel}setpts=PTS+${timelineStart}/TB${streamLabel}`,
    );

    const nextLabel =
      index === sortedVideos.length - 1 ? "[with_video]" : `[stage${index}]`;
    complexFilters.push(
      `${lastLabel}${streamLabel}overlay=${video.x + frame.templateOffsetX}:${video.y}:eof_action=pass:format=auto:enable='between(t,${timelineStart},${timelineEnd})'${nextLabel}`,
    );
    lastLabel = nextLabel;

    if (video.hasAudio) {
      const audioLabel = `[aud${index}]`;
      const delayMs = Math.max(0, Math.round(video.timelineStart * 1000));
      complexFilters.push(
        `[${videoIndex}:a]atrim=start=${trimStart}:end=${trimEnd},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs}${audioLabel}`,
      );
      audioLabels.push(audioLabel);
    }
  });

  complexFilters.push(
    `${lastLabel}[${foregroundInputIndex}:v]overlay=0:0:format=auto:shortest=1[v]`,
  );
  if (audioLabels.length === 1) {
    complexFilters.push(
      `${audioLabels[0]}atrim=0:${formatFilterSeconds(durationSeconds)}[a]`,
    );
  } else if (audioLabels.length > 1) {
    complexFilters.push(
      `${audioLabels.join("")}amix=inputs=${audioLabels.length}:duration=longest:dropout_transition=0,atrim=0:${formatFilterSeconds(durationSeconds)}[a]`,
    );
  }

  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg().input(coverPngPath).inputOptions(loopInputOptions);
    onCommand?.(command);

    sortedVideos.forEach((video) => {
      command.input(video.path);
      if (video.maskPath) {
        command.input(video.maskPath).inputOptions(loopInputOptions);
      }
    });

    command
      .input(foregroundPngPath)
      .inputOptions(loopInputOptions)
      .complexFilter(complexFilters)
      .outputOptions([
        "-map [v]",
        ...(audioLabels.length ? ["-map [a]"] : []),
        "-c:v libx264",
        "-preset veryfast",
        "-crf 23",
        "-pix_fmt yuv420p",
        "-r",
        outputFrameRate,
        "-t",
        String(durationSeconds),
        "-c:a aac",
        "-b:a 192k",
        "-shortest",
        "-movflags +faststart",
      ])
      .on("progress", (progress) => {
        onProgress?.(parseTimemarkSeconds(progress.timemark));
      })
      .on("stderr", (line) => (ffErr += line + "\n"))
      .on("error", (err) =>
        reject(new Error((err?.message || "ffmpeg failed") + "\n" + ffErr)),
      )
      .on("end", () => resolve())
      .save(outputMp4Path);
  });
}

export async function POST(req: Request) {
  const jobMode = new URL(req.url).searchParams.get("job") === "1";
  let keepTmpDir = false;
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
          ...normalizeSideCrop(meta),
          ...normalizeContentBounds(meta),
          trimStartSeconds: meta.trimStartSeconds,
          trimEndSeconds: meta.trimEndSeconds,
          timelineStartSeconds: meta.timelineStartSeconds,
        };
      }),
    );

    const preparedVideos = await Promise.all(
      persistedVideos.map(async (video, index) => {
        const probeInfo = await getVideoProbeInfo(video.path);
        assertVideoDurationIsAllowed(video, probeInfo.duration);
        const timing = getPreparedVideoTiming(video, probeInfo.duration);

        const radius = Math.max(
          0,
          Math.min(video.radius, Math.floor(video.w / 2), Math.floor(video.h / 2)),
        );
        const hasCrop =
          video.cropTop > 0 ||
          video.cropRight > 0 ||
          video.cropBottom > 0 ||
          video.cropLeft > 0;
        if (radius <= 0 && !hasCrop) {
          return {
            ...video,
            frameRate: probeInfo.frameRate,
            duration: probeInfo.duration,
            hasAudio: probeInfo.hasAudio,
            ...timing,
          };
        }

        const maskPath = path.join(tmpDir, `mask-${index}.pgm`);
        await writeRoundedMaskPgm(video.w, video.h, radius, maskPath, video);
        return {
          ...video,
          maskPath,
          frameRate: probeInfo.frameRate,
          duration: probeInfo.duration,
          hasAudio: probeInfo.hasAudio,
          ...timing,
        };
      }),
    );

    const totalSeconds = Math.max(
      1,
      Math.ceil(
        preparedVideos
          .map((video) => video.timelineEnd)
          .reduce((longest, duration) => Math.max(longest, duration), 0),
      ),
    );

    const generateFinalVideo = async (jobId?: string) => {
      if (jobId) {
        updateFinalVideoJob(jobId, {
          status: "rendering",
          percent: 3,
          elapsedSeconds: 0,
        });
      }

      const finalFrame = await screenshotCoverPng(req, data, coverPng, "base");
      if (jobId) {
        updateFinalVideoJob(jobId, { percent: 8 });
      }

      await screenshotCoverPng(
        req,
        data,
        foregroundPng,
        "foreground",
        finalFrame,
      );
      if (jobId) {
        updateFinalVideoJob(jobId, { percent: 12 });
      }

      await buildVideoInsideTemplateWithAudio(
        coverPng,
        preparedVideos,
        foregroundPng,
        finalMp4,
        finalFrame,
        totalSeconds,
        (elapsedSeconds) => {
          if (!jobId) return;
          if (getFinalVideoJob(jobId)?.status === "canceled") return;
          const safeElapsedSeconds = Math.min(
            totalSeconds,
            Math.max(0, Math.floor(elapsedSeconds)),
          );
          updateFinalVideoJob(jobId, {
            elapsedSeconds: safeElapsedSeconds,
            percent: Math.min(
              99,
              Math.max(
                12,
                12 + Math.round((safeElapsedSeconds / totalSeconds) * 87),
              ),
            ),
          });
        },
        (command) => {
          if (!jobId) return;
          updateFinalVideoJob(jobId, {
            cancel: () => command.kill("SIGTERM"),
          });
        },
      );
    };

    if (jobMode) {
      const job = createFinalVideoJob(tmpDir, totalSeconds);
      keepTmpDir = true;

      void generateFinalVideo(job.id)
        .then(() => {
          updateFinalVideoJob(job.id, {
            status: "completed",
            percent: 100,
            elapsedSeconds: totalSeconds,
            resultPath: finalMp4,
          });
        })
        .catch((error: unknown) => {
          const currentJob = getFinalVideoJob(job.id);
          if (currentJob?.status === "canceled") return;

          updateFinalVideoJob(job.id, {
            status: "failed",
            error:
              error instanceof Error ? error.message : "final video failed",
          });
        });

      return NextResponse.json({
        jobId: job.id,
        statusUrl: `/api/video/final/jobs/${job.id}`,
      });
    }

    await generateFinalVideo();

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
    if (!keepTmpDir) {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }
}
