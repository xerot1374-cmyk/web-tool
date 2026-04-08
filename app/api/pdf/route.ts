// app/api/pdf/route.ts
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import {
  absUrl,
  escapeHtml,
  getCanvasFrame,
  type CanvasPreset,
} from "@/app/lib/renderUtils";

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
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

type Payload = {
  profileImage: string;
  name: string;
  role: string;

  productImage?: string;
  productImageBase64?: string;
  productOrientation?: "landscape" | "portrait";
  productAlign?: "left" | "center" | "right";

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
  const v = raw?.trim();
  if (!v) return undefined;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

function linkLabel(linkUrl: string) {
  try {
    const u = new URL(linkUrl);
    return u.host.replace(/^www\./, "");
  } catch {
    return linkUrl;
  }
}



function renderMarkedHtml(text: string, marks?: TextMark[]) {
  const t = String(text ?? "");
  if (!marks || marks.length === 0) {
    return escapeHtml(t).replace(/\n/g, "<br/>");
  }

  const safeMarks = marks
    .map((m) => ({
      start: Math.max(0, Math.min(m.start, t.length)),
      end: Math.max(0, Math.min(m.end, t.length)),
      style: m.style ?? {},
    }))
    .filter((m) => m.end > m.start)
    .sort((a, b) => a.start - b.start);

  let out = "";
  let pos = 0;

  for (const m of safeMarks) {
    if (m.start > pos) {
      out += escapeHtml(t.slice(pos, m.start)).replace(/\n/g, "<br/>");
    }

    const chunk = escapeHtml(t.slice(m.start, m.end)).replace(/\n/g, "<br/>");
    const style = [
      m.style.fontFamily ? `font-family:${m.style.fontFamily};` : "",
      m.style.fontSize ? `font-size:${m.style.fontSize}px;` : "",
      m.style.color ? `color:${m.style.color};` : "",
      m.style.highlight ? `background:rgba(250,204,21,0.18);` : "",
    ].join("");

    out += `<span style="${style}">${chunk}</span>`;
    pos = m.end;
  }

  if (pos < t.length) {
    out += escapeHtml(t.slice(pos)).replace(/\n/g, "<br/>");
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

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Payload;

    const canvas = getCanvasFrame(data.canvasPreset);
    const presetClass =
      data.canvasPreset === "instagramStory"
        ? "story"
        : data.canvasPreset === "instagram"
        ? "instagram"
        : "linkedin";
    const exportPresetClass = data.canvasPreset ?? "linkedin";
    const frame = {
      w: canvas.w,
      h: canvas.h,
      radius:
        data.canvasPreset === "instagram"
          ? 32
          : data.canvasPreset === "instagramStory"
          ? 36
          : 26,
    };
    const profileImage = absUrl(req, data.profileImage);
    const cssUrl = absUrl(req, "/pdf.css");

    const companyLogoSrc = data.companyLogoBase64?.trim()
      ? data.companyLogoBase64.trim()
      : data.companyLogo?.trim()
      ? absUrl(req, data.companyLogo.trim())
      : absUrl(req, "/logo.png");

    const legacyProductImgSrc = data.productImageBase64?.trim()
      ? data.productImageBase64.trim()
      : data.productImage?.trim()
      ? absUrl(req, data.productImage.trim())
      : "";

    const images: ImagePayloadItem[] = data.images?.length
      ? data.images.map((img) => ({
          ...img,
          src: img.base64?.trim()
            ? img.base64.trim()
            : img.src?.trim()
            ? absUrl(req, img.src.trim())
            : "",
        }))
      : legacyProductImgSrc
      ? [
          {
            id: "legacy-single-image",
            src: legacyProductImgSrc,
            orientation: data.productOrientation ?? "landscape",
            x: data.mediaBox?.x ?? 420,
            y: data.mediaBox?.y ?? 240,
            w: data.mediaBox?.w ?? 240,
            h: data.mediaBox?.h ?? 240,
            rotation: 0,
          },
        ]
      : [];

    const hasImg = images.length > 0;

    const hrefs = (data.link ?? "")
      .split("\n")
      .map((s) => normalizeHttpUrl(s))
      .filter((v): v is string => Boolean(v));

    const headerHeight = !hasImg
      ? 0
      : data.canvasPreset === "instagram"
      ? 420
      : data.canvasPreset === "instagramStory"
      ? 760
      : 850;

    const contentPadding =
      data.canvasPreset === "instagram"
        ? "32px 32px 28px"
        : data.canvasPreset === "instagramStory"
        ? "40px 40px 34px"
        : "20px 28px 22px";

    const imagesHtml = images
      .map(
        (img) => `
          <div
            class="li2-productSlot"
            style="
              position:absolute;
              left:${img.x}px;
              top:${img.y}px;
              width:${img.w}px;
              height:${img.h}px;
              z-index:2;
            "
          >
            <div
              class="li2-productFrame ${
                img.orientation === "portrait"
                  ? "li2-productFrame--portrait"
                  : "li2-productFrame--landscape"
              }"
              style="
                width:100%;
                height:100%;
                transform:rotate(${img.rotation ?? 0}deg);
                transform-origin:center center;
                border:none;
                box-shadow:none;
                border-radius:20px;
                background:transparent;
                overflow:visible;
              "
            >
              <img
                class="li2-productImg"
                src="${escapeHtml(img.src ?? "")}"
                alt="product"
                style="
                  width:100%;
                  height:100%;
                  object-fit:contain;
                  display:block;
                  border:none;
                  outline:none;
                  box-shadow:none;
                  background:transparent;
                "
              />
            </div>
          </div>
        `
      )
      .join("");

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="${cssUrl}" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    img {
      border: none;
      outline: none;
      box-shadow: none;
    }
  </style>
</head>
<body>
  <div
    class="li2-viewport li2-viewport--${presetClass} li2-viewport--autoHeight preset-${exportPresetClass}"
    style="
      --li2-scale:1;
      width:${frame.w}px;
      overflow:visible;
      background:#fff;
    "
  >
    <div
      class="li2-root li2-root--${presetClass} li2-root--autoHeight li2-theme-cream preset-${exportPresetClass}"
      style="
        width:${frame.w}px;
        border-radius:${frame.radius}px;
        overflow:visible;
        position:relative;
      "
    >
      <div
        class="li2-header ${hasImg ? "li2-header--hasimg" : "li2-header--noimg"}"
        style="height:${headerHeight}px;min-height:${headerHeight}px;"
      >
        ${imagesHtml}

        ${
          data.badgeText?.trim()
            ? `<div class="li2-badge" style="${styleToInline(data.badgeStyle)}">
                 ${escapeHtml(data.badgeText.trim())}
               </div>`
            : `<div class="li2-badge" style="${styleToInline(data.badgeStyle)}">&nbsp;</div>`
        }

        <div class="li2-userTop">
          <div class="li2-userTopMeta">
            <div class="li2-userTopName">${escapeHtml(data.name)}</div>
            <div class="li2-userTopRole">${escapeHtml(data.role)}</div>
          </div>

          <div class="li2-avatarWrap">
            <img class="li2-avatar" src="${escapeHtml(profileImage)}" alt="profile" />
          </div>
        </div>
      </div>

      <div class="li2-content" style="padding:${contentPadding};">
        ${
          data.linkTitle?.trim()
            ? `<div class="li2-linkTitle" style="${styleToInline(data.titleStyle)}">
                 ${escapeHtml(data.linkTitle.trim())}
               </div>`
            : ``
        }

        ${
          data.company?.trim()
            ? `<div class="li2-company" style="${styleToInline(data.companyStyle)}">
                 ${escapeHtml(data.company.trim())}
               </div>`
            : ``
        }

        <img src="${escapeHtml(companyLogoSrc)}" alt="Company logo" class="li2-companyLogo" />

        ${
          data.headline?.trim()
            ? `<div class="li2-headline" style="${styleToInline(data.headlineStyle)}">
                 ${escapeHtml(data.headline.trim())}
               </div>`
            : ``
        }

        ${
          data.subline?.trim()
            ? `<div class="li2-subline" style="${styleToInline(data.sublineStyle)}">
                 ${escapeHtml(data.subline.trim())}
               </div>`
            : ``
        }

        ${
          data.bodyText?.trim()
            ? `<div class="li2-body" style="${styleToInline(data.bodyStyle)}">
                 ${renderMarkedHtml(data.bodyText.trim(), data.bodyMarks)}
               </div>`
            : ``
        }

        ${
          hrefs.length
            ? `<div class="li2-linkRow">
                 ${
                   hrefs.length === 1
                     ? `<a class="li2-link" href="${escapeHtml(
                         hrefs[0]
                       )}" target="_blank" rel="noreferrer">
                          ${escapeHtml(linkLabel(hrefs[0]))}<span class="li2-linkArrow" aria-hidden="true"> →</span>
                        </a>`
                     : `<div class="li2-linksList">
                          ${hrefs
                            .map(
                              (href) => `
                            <a class="li2-link" href="${escapeHtml(
                              href
                            )}" target="_blank" rel="noreferrer">
                              ${escapeHtml(linkLabel(href))}<span class="li2-linkArrow" aria-hidden="true"> →</span>
                            </a>`
                            )
                            .join("")}
                        </div>`
                 }
               </div>`
            : ``
        }
      </div>

      <div class="li2-bottom">
        <div class="li2-bottomLeft">
          <img class="li2-profileMini" src="${escapeHtml(profileImage)}" alt="profile-mini" />
          <div class="li2-bottomMeta">
            <div class="li2-bottomName">${escapeHtml(data.name)}</div>
            <div class="li2-bottomRole">${escapeHtml(data.role)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      await page.setViewport({
        width: frame.w,
        height: Math.min(frame.h, 2000),
        deviceScaleFactor: 1,
      });

      await page.setContent(html, { waitUntil: "networkidle0" });

      await page.waitForSelector(".li2-root");
      await page.waitForSelector("img.li2-avatar");
      await page.waitForSelector("img.li2-companyLogo");

      if (hasImg) {
        await page.waitForSelector("img.li2-productImg");
      }

      const exportHeight = await page.$eval(".li2-root", (node) => {
        const el = node as HTMLElement;
        return Math.max(1, Math.ceil(el.getBoundingClientRect().height));
      });

      const pdf = await page.pdf({
        printBackground: true,
        width: `${frame.w}px`,
        height: `${exportHeight}px`,
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
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "PDF generation failed" },
      { status: 500 }
    );
  }
}
