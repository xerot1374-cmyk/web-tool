import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

import {
  absUrl,
  escapeHtml,
  getCanvasFrame,
  type CanvasPreset,
} from "@/app/lib/renderUtils";
import { resolveFrameSlots } from "@/app/lib/imageLayouts";

type TextMark = {
  start: number;
  end: number;
  style: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    highlight?: boolean;
  };
};

type BoxTextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  textAlign: "left" | "center" | "right";
};

type ImagePayloadItem = {
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
  cropX?: number;
  cropY?: number;
  cropScale?: number;
};

type ImageLayoutMode = "manual" | "collage" | "frame";
type FrameSlot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  rotation?: number;
  clipPath?: string;
  shape?: "rect" | "organic" | "pill" | "arch" | "blob";
};

type Payload = {
  profileImage: string;
  name: string;
  role: string;
  productImage?: string;
  productImageBase64?: string;
  productOrientation?: "landscape" | "portrait";
  productAlign?: "left" | "center" | "right";
  imageLayout?: ImageLayoutMode;
  framePresetId?: string;
  frameSlots?: FrameSlot[];
  mediaBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  images?: ImagePayloadItem[];
  badgeText?: string;
  badgeStyle?: BoxTextStyle;
  linkTitle?: string;
  company?: string;
  headline?: string;
  subline?: string;
  bodyText?: string;
  bodyMarks?: TextMark[];
  titleStyle?: BoxTextStyle;
  bodyStyle?: BoxTextStyle;
  companyStyle?: BoxTextStyle;
  headlineStyle?: BoxTextStyle;
  sublineStyle?: BoxTextStyle;
  companyLogo?: string;
  companyLogoBase64?: string;
  link?: string;
  canvasPreset?: CanvasPreset;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  if (!marks?.length) {
    return escapeHtml(value).replace(/\n/g, "<br/>");
  }

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

function resolveSrc(req: Request, raw?: string) {
  const value = raw?.trim();
  if (!value) return "";
  return value.startsWith("data:") ? value : absUrl(req, value);
}

function renderHtml(req: Request, data: Payload) {
  const canvas = getCanvasFrame(data.canvasPreset);
  const presetClass = getPresetClass(data.canvasPreset);
  const cssUrl = absUrl(req, "/li2.css");
  const profileImage = resolveSrc(req, data.profileImage);
  const companyLogo = resolveSrc(
    req,
    data.companyLogoBase64?.trim() ? data.companyLogoBase64 : data.companyLogo || "/logo.png"
  );

  const images: ImagePayloadItem[] = data.images?.length
    ? data.images.map((img) => ({
        ...img,
        src: img.base64?.trim() ? img.base64 : resolveSrc(req, img.src),
      }))
    : data.productImageBase64?.trim() || data.productImage?.trim()
    ? [
        {
          id: "legacy-single-image",
          src: data.productImageBase64?.trim()
            ? data.productImageBase64
            : resolveSrc(req, data.productImage),
          orientation: data.productOrientation ?? "landscape",
          x: data.mediaBox?.x ?? 420,
          y: data.mediaBox?.y ?? 240,
          w: data.mediaBox?.w ?? 240,
          h: data.mediaBox?.h ?? 240,
          rotation: 0,
          cropX: 50,
          cropY: 50,
          cropScale: 1,
        },
      ]
    : [];

  const links = (data.link ?? "")
    .split("\n")
    .map((item) => normalizeHttpUrl(item))
    .filter((item): item is string => Boolean(item));

  const imagesHtml =
    data.imageLayout === "frame"
      ? (data.frameSlots?.length
          ? data.frameSlots
          : resolveFrameSlots(data.framePresetId, data.canvasPreset ?? "linkedin"))
          .map((slot, index) => {
            const img = images.find((item) => item.frameSlotId === slot.id);
            const cropX = Number.isFinite(img?.cropX) ? Number(img?.cropX) : 50;
            const cropY = Number.isFinite(img?.cropY) ? Number(img?.cropY) : 50;
            const cropScale = Number.isFinite(img?.cropScale) ? Number(img?.cropScale) : 1;
            const orientationClass =
              img?.orientation === "portrait"
                ? "li2-productFrame--portrait"
                : "li2-productFrame--landscape";

            return `
              <div
                class="li2-productSlot li2-productSlot--frame"
                data-frame-shape="${slot.shape ?? "rect"}"
                style="position:absolute;left:${slot.x}px;top:${slot.y}px;width:${slot.w}px;height:${slot.h}px;z-index:${12 + index};pointer-events:auto;right:auto;bottom:auto;margin:0;transform:rotate(${slot.rotation ?? 0}deg);transform-origin:center center;"
              >
                <div
                  class="li2-productFrame li2-productFrame--frame ${orientationClass}${img ? "" : " li2-productFrame--empty"}"
                  style="width:100%;height:100%;box-sizing:border-box;display:block;overflow:hidden;position:relative;border-radius:${slot.radius}px;background:#ffffff;border:1px solid rgba(255,255,255,0.96);${slot.clipPath ? `clip-path:${slot.clipPath};` : ""}"
                >
                  ${
                    img
                      ? `<div class="li2-productFrameInner--frame">
                          <img
                            class="li2-productImg li2-productImg--cropped"
                            src="${escapeHtml(img.src ?? "")}"
                            alt="product"
                            style="position:absolute;left:${cropX}%;top:${cropY}%;width:${cropScale * 100}%;height:${cropScale * 100}%;max-width:none;max-height:none;transform:translate(-50%, -50%);object-fit:cover;display:block;user-select:none;pointer-events:none;"
                          />
                        </div>`
                      : `<div class="li2-framePlaceholder">Add image</div>`
                  }
                </div>
              </div>
            `;
          })
          .join("")
      : images
          .map((img) => {
            const cropX = Number.isFinite(img.cropX) ? Number(img.cropX) : 50;
            const cropY = Number.isFinite(img.cropY) ? Number(img.cropY) : 50;
            const cropScale = Number.isFinite(img.cropScale) ? Number(img.cropScale) : 1;
            const orientationClass =
              img.orientation === "portrait"
                ? "li2-productFrame--portrait"
                : "li2-productFrame--landscape";
            const collageClass = data.imageLayout === "collage" ? " li2-productSlot--collage" : "";
            const frameClass = data.imageLayout === "collage" ? " li2-productFrame--collage" : "";
            const background = data.imageLayout === "collage" ? "#ffffff" : "transparent";
            const border =
              data.imageLayout === "collage"
                ? "1px solid rgba(255,255,255,0.92)"
                : "1px solid rgba(15,23,42,0.10)";

            return `
              <div
                class="li2-productSlot${collageClass}"
                style="position:absolute;left:${img.x}px;top:${img.y}px;width:${img.w}px;height:${img.h}px;z-index:2;pointer-events:auto;transform:none;right:auto;bottom:auto;margin:0;"
              >
                <div
                  class="li2-productFrame ${orientationClass}${frameClass}"
                  style="width:100%;height:100%;box-sizing:border-box;display:block;overflow:hidden;position:relative;left:auto;top:auto;transform:rotate(${img.rotation ?? 0}deg);transform-origin:center center;border-radius:20px;background:${background};border:${border};"
                >
                  <div class="${data.imageLayout === "collage" ? "li2-productFrameInner--collage" : ""}">
                    <img
                      class="li2-productImg li2-productImg--cropped"
                      src="${escapeHtml(img.src ?? "")}"
                      alt="product"
                      style="position:absolute;left:${cropX}%;top:${cropY}%;width:${cropScale * 100}%;height:${cropScale * 100}%;max-width:none;max-height:none;transform:translate(-50%, -50%);object-fit:cover;display:block;user-select:none;pointer-events:none;"
                    />
                  </div>
                </div>
              </div>
            `;
          })
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
      background: #ffffff;
      width: 100%;
      height: 100%;
    }

    * {
      box-sizing: border-box;
    }

    .pdf-stage {
      width: ${canvas.w}px;
      background: #ffffff;
      overflow: visible;
    }

    .li2-viewport {
      --li2-scale: 1;
      width: ${canvas.w}px !important;
      height: auto !important;
      overflow: visible !important;
      background: #ffffff !important;
    }

    .li2-root {
      width: ${canvas.w}px !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      position: relative;
    }

    .li2-content {
      overflow: visible !important;
      flex: 0 0 auto !important;
    }

    .li2-body,
    .li2-bottom {
      overflow: visible !important;
    }
  </style>
</head>
<body>
  <div class="pdf-stage">
    <div class="li2-viewport li2-viewport--${presetClass} li2-viewport--autoHeight">
      <div class="li2-root li2-root--${presetClass} li2-theme-cream ${data.imageLayout === "collage" ? "li2-root--imageCollage" : ""} li2-root--autoHeight">
        <div class="li2-header ${images.length || data.imageLayout === "frame" ? "li2-header--hasimg" : "li2-header--noimg"}">
          ${imagesHtml}

          ${
            companyLogo
              ? `<img src="${escapeHtml(companyLogo)}" alt="Company logo" class="li2-companyLogo" />`
              : ""
          }

          <div class="li2-badge" style="min-width:120px;${styleToInline(data.badgeStyle)}">
            ${data.badgeText?.trim() ? escapeHtml(data.badgeText.trim()) : "&nbsp;"}
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
              ? `<div class="li2-linkTitle" style="${styleToInline(data.titleStyle)}">${escapeHtml(data.linkTitle.trim())}</div>`
              : ""
          }

          ${
            data.company?.trim()
              ? `<div class="li2-company" style="${styleToInline(data.companyStyle)}">${escapeHtml(data.company.trim())}</div>`
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

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Payload;
    const frame = getCanvasFrame(data.canvasPreset);
    const html = renderHtml(req, data);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

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

      const exportHeight = await page.$eval(".li2-root", (node) => {
        const el = node as HTMLElement;
        return Math.max(1, Math.ceil(el.getBoundingClientRect().height));
      });

      const pdf = await page.pdf({
        printBackground: true,
        width: `${frame.w}px`,
        height: `${exportHeight}px`,
        margin: {
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px",
        },
        pageRanges: "1",
        preferCSSPageSize: false,
      });

      return new NextResponse(pdf as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="linkedin-template.pdf"',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
