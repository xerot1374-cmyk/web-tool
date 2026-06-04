import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import os from "os";
import path from "path";
import fs from "fs/promises";

import { configureFfmpegPaths } from "@/app/lib/ffmpeg";
import {
  absUrl,
  escapeHtml,
  getCanvasFrame,
  type CanvasPreset,
} from "@/app/lib/renderUtils";
import {
  renderLinkedInRichTextHtml,
  type LinkedInRichTextMark as TextMark,
} from "@/app/components/templates/linkedin-shared/richTextRender";
import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/richTextTypes";
import {
  getPresetClass,
  linkLabel,
  normalizeTemplateExportFontFamily,
  parseTemplateHashtags,
  parseTemplateLinks,
  sanitizeTemplateTextAlign,
} from "@/app/components/templates/linkedin-shared/template2Shared";

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

type PayloadImage = {
  id: string;
  src?: string;
  base64?: string;
  orientation: "landscape" | "portrait";
  frameSlotId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  radius?: number;
  cropX?: number;
  cropY?: number;
  cropScale?: number;
};

type PayloadFrameSlot = NonNullable<Payload["frameSlots"]>[number];
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
const LINKEDIN_VIDEO_TARGET_ASPECT = 4 / 5;
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
  preset: CanvasPreset | undefined,
  templateContentWidth: number,
  measuredHeight: number,
): FinalVideoFrame {
  const finalHeight = makeEven(clampVideoDimension(Math.ceil(measuredHeight)));
  const desiredWidth =
    preset === undefined || preset === "linkedin"
      ? Math.round(finalHeight * LINKEDIN_VIDEO_TARGET_ASPECT)
      : templateContentWidth;
  const finalWidth = makeEven(
    clampVideoDimension(Math.max(templateContentWidth, desiredWidth)),
  );

  return {
    w: finalWidth,
    h: finalHeight,
    templateOffsetX: Math.round((finalWidth - templateContentWidth) / 2),
  };
}

function renderRichTextHtml(
  text: string | undefined,
  marks?: TextMark[],
  blocks?: RichTextBlock[],
) {
  return renderLinkedInRichTextHtml(text, marks, blocks, {
    normalizeFontFamily: normalizeTemplateExportFontFamily,
  });
}

function getCropValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function styleToInline(style?: BoxTextStyle) {
  if (!style) return "";
  return [
    `font-family:${normalizeTemplateExportFontFamily(style.fontFamily)};`,
    style.fontSize ? `font-size:${style.fontSize}px;` : "",
    style.color ? `color:${style.color};` : "",
    style.textAlign
      ? `text-align:${sanitizeTemplateTextAlign(style.textAlign)};`
      : "",
  ].join("");
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

function resolveSrc(req: Request, raw?: string) {
  const value = raw?.trim();
  if (!value) return "";
  return value.startsWith("data:") ? value : absUrl(req, value);
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

function normalizePayloadImages(data: Payload, req: Request): PayloadImage[] {
  if (!Array.isArray(data.images)) return [];

  return data.images.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const image = item as Partial<PayloadImage>;
    if (
      typeof image.id !== "string" ||
      typeof image.orientation !== "string" ||
      typeof image.x !== "number" ||
      typeof image.y !== "number" ||
      typeof image.w !== "number" ||
      typeof image.h !== "number"
    ) {
      return [];
    }

    const resolvedSrc = image.base64?.trim()
      ? image.base64
      : resolveSrc(req, image.src);
    if (!resolvedSrc) return [];

    return [
      {
        id: image.id,
        src: resolvedSrc,
        base64: image.base64,
        orientation:
          image.orientation === "portrait" ? "portrait" : "landscape",
        frameSlotId: image.frameSlotId,
        x: image.x,
        y: image.y,
        w: image.w,
        h: image.h,
        rotation:
          typeof image.rotation === "number" && Number.isFinite(image.rotation)
            ? image.rotation
            : 0,
        radius:
          typeof image.radius === "number" && Number.isFinite(image.radius)
            ? Math.max(0, Math.round(image.radius))
            : 20,
        cropX: getCropValue(image.cropX, 50),
        cropY: getCropValue(image.cropY, 50),
        cropScale: getCropValue(image.cropScale, 1),
      },
    ];
  });
}

function renderProductImagesHtml(
  data: Payload,
  req: Request,
  fallbackBox: { x: number; y: number; w: number; h: number },
) {
  const images = normalizePayloadImages(data, req);

  if (!images.length) {
    return `
      <div
        class="li2-productSlot"
        style="position:absolute;left:${fallbackBox.x}px;top:${fallbackBox.y}px;width:${fallbackBox.w}px;height:${fallbackBox.h}px;z-index:2;pointer-events:none;transform:none;right:auto;bottom:auto;margin:0;"
      >
        <div
          class="li2-productFrame li2-productFrame--landscape"
          style="width:100%;height:100%;box-sizing:border-box;display:block;overflow:hidden;position:relative;left:auto;top:auto;transform:rotate(0deg);transform-origin:center center;border-radius:${data.videoRadius ?? 20}px;background:transparent;border:1px solid rgba(15,23,42,0.10);"
        >
          <img
            class="li2-productImg li2-productImg--cropped"
            src="${TRANSPARENT_PIXEL}"
            alt="video-slot"
            style="position:absolute;left:50%;top:50%;width:100%;height:100%;max-width:none;max-height:none;transform:translate(-50%, -50%);object-fit:cover;display:block;user-select:none;pointer-events:none;opacity:0;"
          />
        </div>
      </div>
    `;
  }

  const frameSlotsById = new Map<string, PayloadFrameSlot>(
    (data.frameSlots ?? []).map((slot) => [slot.id, slot]),
  );

  if (data.imageLayout === "frame") {
    return (data.frameSlots ?? [])
      .map((slot, index) => {
        const img = images.find((item) => item.frameSlotId === slot.id);
        const imageOrientationClass =
          img?.orientation === "portrait"
            ? "li2-productFrame--portrait"
            : "li2-productFrame--landscape";

        return `
          <div
            class="li2-productSlot li2-productSlot--frame"
            style="position:absolute;left:${slot.x}px;top:${slot.y}px;width:${slot.w}px;height:${slot.h}px;z-index:${12 + index};pointer-events:none;right:auto;bottom:auto;margin:0;transform:rotate(${slot.rotation ?? 0}deg);"
          >
            <div
              class="li2-productFrame li2-productFrame--frame ${imageOrientationClass}"
              style="width:100%;height:100%;box-sizing:border-box;display:block;overflow:hidden;position:relative;border-radius:${slot.radius}px;background:#ffffff;border:1px solid rgba(255,255,255,0.96);${slot.clipPath ? `clip-path:${slot.clipPath};` : ""}"
            >
              ${
                img
                  ? `
                <div class="li2-productFrameInner--frame">
                  <img
                    class="li2-productImg li2-productImg--cropped"
                    src="${escapeHtml(img.src ?? "")}"
                    alt="product"
                    style="position:absolute;left:${img.cropX}% ;top:${img.cropY}% ;width:${img.cropScale! * 100}% ;height:${img.cropScale! * 100}% ;max-width:none;max-height:none;transform:translate(-50%, -50%);object-fit:cover;display:block;user-select:none;pointer-events:none;"
                  />
                </div>
              `
                  : `<div class="li2-framePlaceholder">Add image</div>`
              }
            </div>
          </div>
        `;
      })
      .join("");
  }

  return images
    .map((img, index) => {
      const slot = img.frameSlotId ? frameSlotsById.get(img.frameSlotId) : null;
      const isCollage = data.imageLayout === "collage";
      const imageOrientationClass =
        img.orientation === "portrait"
          ? "li2-productFrame--portrait"
          : "li2-productFrame--landscape";
      const alignClass =
        data.productAlign === "left"
          ? "li2-productSlot--left"
          : data.productAlign === "right"
            ? "li2-productSlot--right"
            : "li2-productSlot--center";

      return `
        <div
          class="li2-productSlot ${alignClass}${isCollage ? " li2-productSlot--collage" : ""}"
          style="position:absolute;left:${img.x}px;top:${img.y}px;width:${img.w}px;height:${img.h}px;z-index:${isCollage ? 10 + index : 2};pointer-events:none;transform:none;right:auto;bottom:auto;margin:0;"
        >
          <div
            class="li2-productFrame ${imageOrientationClass}${isCollage ? " li2-productFrame--collage" : ""}"
            style="width:100%;height:100%;box-sizing:border-box;display:block;overflow:hidden;position:relative;left:auto;top:auto;transform:rotate(${img.rotation ?? 0}deg);transform-origin:center center;border-radius:${img.radius ?? 20}px;background:${isCollage ? "#ffffff" : "transparent"};border:${isCollage ? "1px solid rgba(255,255,255,0.92)" : "1px solid rgba(15,23,42,0.10)"};${slot?.clipPath ? `clip-path:${slot.clipPath};` : ""}"
          >
            <div class="${isCollage ? "li2-productFrameInner--collage" : ""}">
              <img
                class="li2-productImg li2-productImg--cropped"
                src="${escapeHtml(img.src ?? "")}"
                alt="product"
                style="position:absolute;left:${img.cropX}% ;top:${img.cropY}% ;width:${img.cropScale! * 100}% ;height:${img.cropScale! * 100}% ;max-width:none;max-height:none;transform:translate(-50%, -50%);object-fit:cover;display:block;user-select:none;pointer-events:none;"
              />
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderVideoTemplateHtml(
  req: Request,
  data: Payload,
  box: { x: number; y: number; w: number; h: number },
  mode: "base" | "foreground" = "base",
) {
  const canvas = getCanvasFrame(data.canvasPreset);
  const presetClass = getPresetClass(data.canvasPreset);
  const cssUrl = absUrl(req, "/li2.css");
  const profileImage = resolveSrc(req, data.profileImage);
  const companyLogo = resolveSrc(req, "/logo.png");
  const foregroundOnly = mode === "foreground";
  const imagesHtml = renderProductImagesHtml(data, req, box);

  const links = parseTemplateLinks(data);
  const hashtags = parseTemplateHashtags(data.hashtags);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="${cssUrl}" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: ${foregroundOnly ? "transparent" : "#ffffff"};
      width: 100%;
      height: 100%;
    }
    * { box-sizing: border-box; }
    .video-stage {
      width: ${canvas.w}px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      background: ${foregroundOnly ? "transparent" : "#ffffff"};
      overflow: visible;
    }
    .li2-viewport {
      --li2-scale: 1;
      width: ${canvas.w}px !important;
      height: auto !important;
      overflow: visible !important;
      background: ${foregroundOnly ? "transparent" : "#ffffff"} !important;
    }
    .li2-root {
      width: ${canvas.w}px !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      position: relative;
      background: ${foregroundOnly ? "transparent" : "#ffffff"} !important;
      border-color: ${foregroundOnly ? "transparent" : "rgba(155, 157, 161, 0.32)"} !important;
    }
    .li2-content {
      overflow: visible !important;
      flex: 0 0 auto !important;
    }
    .li2-body,
    .li2-bottom {
      overflow: visible !important;
    }
    ${
      foregroundOnly
        ? `
    .li2-header {
      background: transparent !important;
      background-image: none !important;
    }
    .li2-productSlot {
      display: none !important;
    }
    `
        : ""
    }
  </style>
</head>
<body>
  <div class="video-stage">
    <div class="li2-viewport li2-viewport--${presetClass} li2-viewport--autoHeight">
      <div class="li2-root li2-root--${presetClass} li2-theme-cream li2-root--autoHeight">
        <div class="li2-header li2-header--hasimg">
          ${imagesHtml}
          ${
            companyLogo
              ? `<img src="${escapeHtml(companyLogo)}" alt="Company logo" class="li2-companyLogo" />`
              : ""
          }
          <div class="li2-badge" style="min-width:120px;${styleToInline(data.badgeStyle)}">
            ${data.badgeText?.trim() ? renderRichTextHtml(data.badgeText, data.badgeMarks, data.badgeBlocks) : "&nbsp;"}
          </div>
          <div class="li2-userTop">
            <div class="li2-userTopMeta">
              <div class="li2-userTopName" title="${escapeHtml(data.name ?? "")}">
                ${escapeHtml(data.name ?? "")}
              </div>
              <div class="li2-userTopRole" title="${escapeHtml(data.role ?? "")}">
                ${escapeHtml(data.role ?? "")}
              </div>
            </div>
            <div class="li2-avatarWrap">
              <img class="li2-avatar" src="${escapeHtml(profileImage)}" alt="profile" />
            </div>
          </div>
        </div>
        <div class="li2-content li2-content--autoHeight">
          ${
            data.linkTitle?.trim()
              ? `<div class="li2-linkTitle" style="${styleToInline(data.titleStyle)}">${renderRichTextHtml(data.linkTitle, data.titleMarks, data.titleBlocks)}</div>`
              : ""
          }
          ${
            data.company?.trim()
              ? `<div class="li2-company" style="${styleToInline(data.companyStyle)}">${renderRichTextHtml(data.company, data.companyMarks, data.companyBlocks)}</div>`
              : ""
          }
          ${
            data.headline?.trim()
              ? `<div class="li2-headline" style="${styleToInline(data.headlineStyle)}">${escapeHtml(data.headline.trim())}</div>`
              : ""
          }
          ${
            data.subline?.trim()
              ? `<div class="li2-subline" style="${styleToInline(data.sublineStyle)}">${escapeHtml(data.subline.trim())}</div>`
              : ""
          }
          ${
            data.bodyText?.trim()
              ? `<div class="li2-body" style="${styleToInline(data.bodyStyle)}">${renderRichTextHtml(data.bodyText, data.bodyMarks, data.bodyBlocks)}</div>`
              : ""
          }
          ${
            hashtags.length
              ? `<div class="li2-linkRow">
                  <div class="li2-linksList">
                    ${hashtags
                      .map(
                        (hashtag) =>
                          `<span class="li2-link" style="color:#64748b;display:inline-block;margin-right:12px;">${escapeHtml(hashtag)}</span>`,
                      )
                      .join("")}
                  </div>
                </div>`
              : ""
          }
          ${
            links.length
              ? `<div class="li2-linkRow">
                  ${
                    links.length === 1
                      ? `<a class="li2-link" href="${escapeHtml(links[0])}" target="_blank" rel="noreferrer">
                          ${escapeHtml(linkLabel(links[0]))}<span class="li2-linkArrow" aria-hidden="true"> &#8594;</span>
                        </a>`
                      : `<div class="li2-linksList">
                          ${links
                            .map(
                              (href) =>
                                `<a class="li2-link" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">
                                  ${escapeHtml(linkLabel(href))}<span class="li2-linkArrow" aria-hidden="true"> &#8594;</span>
                                </a>`,
                            )
                            .join("")}
                        </div>`
                  }
                </div>`
              : ""
          }
        </div>
        <div class="li2-bottom">
          <div class="li2-bottomLeft">
            <img class="li2-profileMini" src="${escapeHtml(profileImage)}" alt="profile-small" />
            <div class="li2-bottomMeta">
              <div class="li2-bottomName" title="${escapeHtml(data.name ?? "")}">
                ${escapeHtml(data.name ?? "")}
              </div>
              <div class="li2-bottomRole" title="${escapeHtml(data.role ?? "")}">
                ${escapeHtml(data.role ?? "")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
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
  const html = renderVideoTemplateHtml(req, data, box, mode);

  const browser = await puppeteer.launch(getPuppeteerLaunchOptions());

  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: frame.w,
      height: Math.min(frame.h, 2000),
      deviceScaleFactor: 1,
    });

    await page.emulateMediaType("screen");
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });

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
      getFinalVideoFrame(data.canvasPreset, frame.w, measuredHeight);

    await page.$eval(
      ".video-stage",
      (node, finalWidth) => {
        const stage = node as HTMLElement;
        stage.style.width = `${finalWidth}px`;
      },
      finalFrame.w,
    );

    await page.setViewport({
      width: finalFrame.w,
      height: Math.min(finalFrame.h, 2000),
      deviceScaleFactor: 1,
    });

    const clip = await page.$eval(
      ".video-stage",
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
      ...(mode === "foreground" ? { omitBackground: true } : {}),
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
