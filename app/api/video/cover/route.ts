// app/api/video/cover/route.ts
import { NextResponse } from "next/server";
import os from "os";
import path from "path";
import fs from "fs/promises";
import ffmpeg from "fluent-ffmpeg";

import { configureFfmpegPaths } from "@/app/lib/ffmpeg";
import { absUrl, escapeHtml, LINKEDIN_CANVAS } from "@/app/lib/renderUtils";

type Payload = {
  profileImage: string;
  name: string;
  role: string;

  badgeText?: string;
  linkTitle?: string;
  company?: string;

  headline?: string;
  subline?: string;
  bodyText?: string;

  link?: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeHttpUrl(raw?: string): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

/**
 * Changes specific to this cover-video flow:
 * - Use separate video CSS (`video.css`)
 * - Scale down the template with `--li2-scale`
 * - Give `productFrame` a fixed height so the video placeholder does not collapse
 */
const VIDEO_SCALE = 0.85;
const VIDEO_BOX_H = 255;

function renderCoverHtml(req: Request, data: Payload) {
  const profileImage = absUrl(req, data.profileImage);

  // Use `video.css` here instead of `pdf.css`.
  const cssHref = absUrl(req, "/video.css");

  const rawLink = data.link?.trim();
  const linkHref = normalizeHttpUrl(rawLink);
  const linkLabel = rawLink ?? "";

  const hasMedia = true;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="${cssHref}" />
  <style>
    html, body { margin:0; padding:0; background:#fff; }

    .stage {
      width:${LINKEDIN_CANVAS.w}px;
      height:${LINKEDIN_CANVAS.h}px;
      overflow:hidden;
      background:#fff;
      position:relative;
    }

    /* Cover-only: `productFrame` needs an explicit height. */
    .li2-productFrame { height: ${VIDEO_BOX_H}px !important; }

    #videoBox {
      width: 100%;
      height: 100%;
      background: rgba(255,255 ,255,255);
    }
  </style>
</head>
<body>
  <div class="stage">
    <div class="li2-viewport" style="--li2-scale: ${VIDEO_SCALE};">
      <div class="li2-root">

        <div class="li2-header ${hasMedia ? "li2-header--hasimg" : "li2-header--noimg"}">
          <div class="li2-productFrame">
            <div id="videoBox"></div>
          </div>

          ${
            data.badgeText?.trim()
              ? `<div class="li2-badge">${escapeHtml(data.badgeText.trim())}</div>`
              : ``
          }

          <div class="li2-userTop">
            <div class="li2-userTopMeta">
              <div class="li2-userTopName">${escapeHtml(data.name ?? "")}</div>
              <div class="li2-userTopRole">${escapeHtml(data.role ?? "")}</div>
            </div>

            <div class="li2-avatarWrap">
              <img class="li2-avatar" src="${escapeHtml(profileImage)}" alt="profile" />
            </div>
          </div>
        </div>

        <div class="li2-content">
          ${data.linkTitle?.trim() ? `<div class="li2-linkTitle">${escapeHtml(data.linkTitle.trim())}</div>` : ``}
          ${data.company?.trim() ? `<div class="li2-company">${escapeHtml(data.company.trim())}</div>` : ``}
          ${data.headline?.trim() ? `<div class="li2-headline">${escapeHtml(data.headline.trim())}</div>` : ``}
          ${data.subline?.trim() ? `<div class="li2-subline">${escapeHtml(data.subline.trim())}</div>` : ``}
          ${data.bodyText?.trim() ? `<div class="li2-body">${escapeHtml(data.bodyText.trim())}</div>` : ``}
          ${
            linkHref
              ? `<div class="li2-linkRow">
                   <a class="li2-link" href="${escapeHtml(linkHref)}" target="_blank" rel="noreferrer">${escapeHtml(
                  linkLabel
                )}</a>
                 </div>`
              : ``
          }
        </div>

        <div class="li2-bottom">
          <div class="li2-bottomLeft">
            <img class="li2-profileMini" src="${escapeHtml(profileImage)}" alt="profile-mini" />
            <div class="li2-bottomMeta">
              <div class="li2-bottomName">${escapeHtml(data.name ?? "")}</div>
              <div class="li2-bottomRole">${escapeHtml(data.role ?? "")}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</body>
</html>`;
}

async function screenshotCoverPng(req: Request, data: Payload, outPngPath: string) {
  const puppeteer = (await import("puppeteer")).default;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    await page.setViewport({
      width: LINKEDIN_CANVAS.w,
      height: LINKEDIN_CANVAS.h,
      deviceScaleFactor: 1,
    });

    await page.setContent(renderCoverHtml(req, data), {
      waitUntil: "load",
      timeout: 60000,
    });

    await page.waitForSelector(".li2-root", { timeout: 60000 });
    await page.waitForSelector("img.li2-avatar", { timeout: 60000 });
    await page.waitForSelector("#videoBox", { timeout: 60000 });

    // Ensure all images are fully loaded.
    await page.waitForFunction(() => {
      const imgs = Array.from(document.images);
      return imgs.every((img) => img.complete);
    }, { timeout: 60000 });

    const buffer = await page.screenshot({ type: "png" });
    await fs.writeFile(outPngPath, buffer);
  } finally {
    await browser.close();
  }
}

async function pngToMp4(inputPng: string, outputMp4: string, seconds: number) {
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(inputPng)
      .inputOptions(["-loop 1"])
      .outputOptions([
        `-t ${seconds}`,
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-r 30",
        "-movflags +faststart",
      ])
      .save(outputMp4)
      .on("end", () => resolve())
      .on("error", (err) => reject(err));
  });
}

export async function POST(req: Request) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cover-"));
  const pngPath = path.join(tmpDir, "cover.png");
  const mp4Path = path.join(tmpDir, "cover.mp4");

  try {
    await configureFfmpegPaths();
    const data = (await req.json()) as Payload;

    await screenshotCoverPng(req, data, pngPath);
    await pngToMp4(pngPath, mp4Path, 3);

    const mp4 = await fs.readFile(mp4Path);
    return new NextResponse(mp4 as unknown as BodyInit, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="cover.mp4"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "cover video failed" }, { status: 500 });
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
