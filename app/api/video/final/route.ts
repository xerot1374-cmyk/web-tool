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

type Payload = {
  profileImage: string;
  name: string;
  role: string;

  title?: string;
  badgeText?: string;
  badgeMarks?: TextMark[];
  linkTitle?: string;
  titleMarks?: TextMark[];
  company?: string;
  companyMarks?: TextMark[];

  headline?: string;
  subline?: string;
  body?: string;
  bodyText?: string;
  bodyMarks?: TextMark[];

  link?: string;

  mediaBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };

  images?: unknown[];
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

type TextMark = {
  start: number;
  end: number;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    highlight?: boolean;
  };
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
function normalizeHttpUrl(raw?: string): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

function linkLabel(linkUrl: string) {
  try {
    const url = new URL(linkUrl);
    return url.host.replace(/^www\./, "");
  } catch {
    return linkUrl;
  }
}

function renderMarkedHtml(text: string, marks?: TextMark[]) {
  const value = String(text ?? "");
  if (!marks?.length) return escapeHtml(value).replace(/\n/g, "<br/>");

  const safeMarks = marks
    .map((mark) => ({
      start: Math.max(0, Math.min(mark.start, value.length)),
      end: Math.max(0, Math.min(mark.end, value.length)),
      style: mark.style ?? {},
    }))
    .filter((mark) => mark.end > mark.start)
    .sort((a, b) => a.start - b.start);

  let out = "";
  let pos = 0;

  for (const mark of safeMarks) {
    if (mark.start > pos) {
      out += escapeHtml(value.slice(pos, mark.start)).replace(/\n/g, "<br/>");
    }

    const style = [
      mark.style.fontFamily ? `font-family:${mark.style.fontFamily};` : "",
      mark.style.fontSize ? `font-size:${mark.style.fontSize}px;` : "",
      mark.style.color ? `color:${mark.style.color};` : "",
      mark.style.highlight ? "background:rgba(250,204,21,0.18);" : "",
    ].join("");

    out += `<span style="${style}">${escapeHtml(value.slice(mark.start, mark.end)).replace(/\n/g, "<br/>")}</span>`;
    pos = mark.end;
  }

  if (pos < value.length) {
    out += escapeHtml(value.slice(pos)).replace(/\n/g, "<br/>");
  }

  return out;
}

function styleToInline(style?: BoxTextStyle) {
  if (!style) return "";
  return [
    style.fontFamily ? `font-family:${style.fontFamily};` : "",
    style.fontSize ? `font-size:${style.fontSize}px;` : "",
    style.color ? `color:${style.color};` : "",
    style.textAlign ? `text-align:${style.textAlign};` : "",
  ].join("");
}

function getPresetClass(preset?: CanvasPreset) {
  if (preset === "instagramStory") return "story";
  if (preset === "instagram") return "instagram";
  return "linkedin";
}

function normalizePayload(data: Payload): Payload {
  return {
    ...data,
    linkTitle: data.linkTitle ?? data.title,
    bodyText: data.bodyText ?? data.body,
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
  mediaBox?: { x: number; y: number; w: number; h: number }
) {
  const canvas = getCanvasFrame(preset);
  const headerHeight = getHeaderHeight(preset);
  const verticalOffset =
    preset === "instagramStory" ? 360 : preset === "instagram" ? 260 : 320;
  const targetWidth = Math.max(
    1,
    Math.round(
      Math.max(canvas.w * 0.99, mediaBox?.w ? mediaBox.w * 1.8 : 0)
    )
  );
  const targetHeight = Math.max(
    1,
    Math.round(
      Math.max(headerHeight * 0.99, mediaBox?.h ? mediaBox.h * 1.8 : 0)
    )
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

function renderVideoTemplateHtml(
  req: Request,
  data: Payload,
  box: { x: number; y: number; w: number; h: number },
  mode: "base" | "foreground" = "base"
) {
  const canvas = getCanvasFrame(data.canvasPreset);
  const presetClass = getPresetClass(data.canvasPreset);
  const cssUrl = absUrl(req, "/li2.css");
  const profileImage = resolveSrc(req, data.profileImage);
  const companyLogo = resolveSrc(req, "/logo.png");
  const foregroundOnly = mode === "foreground";

  const images = [
    {
      id: "video-slot",
      src: TRANSPARENT_PIXEL,
      orientation: "landscape" as const,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      rotation: 0,
      cropX: 50,
      cropY: 50,
      cropScale: 1,
    },
  ];

  const links = (data.link ?? "")
    .split("\n")
    .map((item) => normalizeHttpUrl(item))
    .filter((item): item is string => Boolean(item));

  const imagesHtml = images
    .map(
      (img) => `
        <div
          class="li2-productSlot"
          style="position:absolute;left:${img.x}px;top:${img.y}px;width:${img.w}px;height:${img.h}px;z-index:2;pointer-events:none;transform:none;right:auto;bottom:auto;margin:0;"
        >
          <div
            class="li2-productFrame li2-productFrame--landscape"
            style="width:100%;height:100%;box-sizing:border-box;display:block;overflow:hidden;position:relative;left:auto;top:auto;transform:rotate(0deg);transform-origin:center center;border-radius:20px;background:transparent;border:1px solid rgba(15,23,42,0.10);"
          >
            <img
              class="li2-productImg li2-productImg--cropped"
              src="${escapeHtml(img.src)}"
              alt="video-slot"
              style="position:absolute;left:50%;top:50%;width:100%;height:100%;max-width:none;max-height:none;transform:translate(-50%, -50%);object-fit:cover;display:block;user-select:none;pointer-events:none;opacity:0;"
            />
          </div>
        </div>
      `
    )
    .join("");

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
            ${data.badgeText?.trim() ? renderMarkedHtml(data.badgeText.trim(), data.badgeMarks) : "&nbsp;"}
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
              ? `<div class="li2-linkTitle" style="${styleToInline(data.titleStyle)}">${renderMarkedHtml(data.linkTitle.trim(), data.titleMarks)}</div>`
              : ""
          }
          ${
            data.company?.trim()
              ? `<div class="li2-company" style="${styleToInline(data.companyStyle)}">${renderMarkedHtml(data.company.trim(), data.companyMarks)}</div>`
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
              ? `<div class="li2-body" style="${styleToInline(data.bodyStyle)}">${renderMarkedHtml(data.bodyText, data.bodyMarks)}</div>`
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
                                </a>`
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
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    ...(executablePath ? { executablePath } : {}),
  };
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

async function persistUploadedFile(file: File, outputPath: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
}

async function screenshotCoverPng(
  req: Request,
  data: Payload,
  outPngPath: string,
  mode: "base" | "foreground" = "base"
): Promise<{ x: number; y: number; w: number; h: number }> {
  const puppeteer = (await import("puppeteer")).default;

  const frame = getCanvasFrame(data.canvasPreset);
  const box = getFinalVideoBox(data.canvasPreset, data.mediaBox);
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

    await page.waitForFunction(async () => {
      const fontsReady =
        "fonts" in document
          ? (document as Document & { fonts: FontFaceSet }).fonts.ready
          : Promise.resolve();
      await fontsReady;

      const imgs = Array.from(document.images);
      return imgs.every((img) => img.complete);
    }, { timeout: 60000 });

    const clip = await page.$eval(".li2-root", (node, frameWidth) => {
      const el = node as HTMLElement;
      const rect = el.getBoundingClientRect();
      const rawHeight = Math.max(1, Math.ceil(rect.height));
      const evenHeight = rawHeight % 2 === 0 ? rawHeight : rawHeight + 1;
      return {
        x: Math.max(0, Math.floor(rect.left)),
        y: Math.max(0, Math.floor(rect.top)),
        width: Math.ceil(frameWidth as number),
        height: evenHeight,
      };
    }, frame.w);

    const buffer = await page.screenshot({
      type: "png",
      clip,
      ...(mode === "foreground" ? { omitBackground: true } : {}),
    });
    await fs.writeFile(outPngPath, buffer);

    return box;
  } finally {
    await browser.close();
  }
}

async function buildVideoInsideTemplateWithAudio(
  coverPngPath: string,
  userMp4Path: string,
  foregroundPngPath: string,
  outputMp4Path: string,
  box: { x: number; y: number; w: number; h: number }
) {
  let ffErr = "";

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(coverPngPath)
      .inputOptions(["-loop 1"])
      .input(userMp4Path)
      .input(foregroundPngPath)
      .complexFilter([
        `[1:v]scale=${box.w}:${box.h}:force_original_aspect_ratio=decrease[vid]`,
        `[0:v][vid]overlay=${box.x}:${box.y}:shortest=1[with_video]`,
        `[with_video][2:v]overlay=0:0:format=auto[v]`,
      ])
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
        reject(new Error((err?.message || "ffmpeg failed") + "\n" + ffErr))
      )
      .on("end", () => resolve())
      .save(outputMp4Path);
  });
}

export async function POST(req: Request) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "final-"));
  const coverPng = path.join(tmpDir, "cover.png");
  const foregroundPng = path.join(tmpDir, "foreground.png");
  const uploadedVideoPath = path.join(tmpDir, "upload.mp4");
  const finalMp4 = path.join(tmpDir, "final.mp4");

  try {
    await configureFfmpegPaths();

    const formData = await req.formData();
    const rawData = getFormString(formData, "data");

    if (!rawData) {
      return NextResponse.json(
        { error: "Missing form field 'data'" },
        { status: 400 }
      );
    }

    const data = normalizePayload(JSON.parse(rawData) as Payload);
    const videoField = formData.get("video");

    if (!(videoField instanceof File) || videoField.size === 0) {
      return NextResponse.json(
        { error: "No video uploaded (field name must be 'video')" },
        { status: 400 }
      );
    }

    await persistUploadedFile(videoField, uploadedVideoPath);

    const box = await screenshotCoverPng(req, data, coverPng, "base");
    await screenshotCoverPng(req, data, foregroundPng, "foreground");
    await buildVideoInsideTemplateWithAudio(
      coverPng,
      uploadedVideoPath,
      foregroundPng,
      finalMp4,
      box
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
      { status: 500 }
    );
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
