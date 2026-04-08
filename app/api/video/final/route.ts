import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { IncomingForm } from "formidable";
import { Readable } from "stream";

import { configureFfmpegPaths } from "@/app/lib/ffmpeg";
import { absUrl, getCanvasFrame, type CanvasPreset } from "@/app/lib/renderUtils";

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
  bodyMarks?: any[];

  link?: string;

  mediaBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };

  images?: any[];
  titleStyle?: any;
  bodyStyle?: any;
  badgeStyle?: any;
  companyStyle?: any;
  headlineStyle?: any;
  sublineStyle?: any;

  canvasPreset?: CanvasPreset;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn7n6QAAAAASUVORK5CYII=";


function requestToNodeStream(req: Request) {
  const reader = req.body?.getReader();
  return new Readable({
    async read() {
      if (!reader) return this.push(null);
      const { value, done } = await reader.read();
      if (done) this.push(null);
      else this.push(Buffer.from(value));
    },
  });
}

async function parseMultipart(req: Request): Promise<{ fields: any; files: any }> {
  const form = new IncomingForm({ multiples: false, keepExtensions: true });

  const stream = requestToNodeStream(req) as any;
  stream.headers = Object.fromEntries(req.headers.entries());

  return await new Promise((resolve, reject) => {
    form.parse(stream, (err: any, fields: any, files: any) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

async function screenshotCoverPng(
  req: Request,
  data: Payload,
  outPngPath: string
): Promise<{ x: number; y: number; w: number; h: number }> {
  const puppeteer = (await import("puppeteer")).default;

  const frame = getCanvasFrame(data.canvasPreset);
  const box = data.mediaBox ?? { x: 160, y: 320, w: 480, h: 320 };

  const coverPayload = {
    ...data,
    productImage: undefined,
    productImageBase64: undefined,
    productOrientation: "landscape",
    productAlign: "center",
    images: [
      {
        id: "video-slot",
        src: TRANSPARENT_PIXEL,
        base64: TRANSPARENT_PIXEL,
        orientation: "landscape",
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        rotation: 0,
        cropX: 50,
        cropY: 50,
        cropScale: 1,
      },
    ],
  };

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

    await page.evaluateOnNewDocument((payload) => {
      (window as any).__PDF_PAYLOAD__ = payload;
    }, coverPayload);

    const pageUrl = absUrl(req, "/account/linkedin/template-a?__pdf=1");
    await page.goto(pageUrl, { waitUntil: "networkidle0", timeout: 60000 });

    await page.addStyleTag({ url: absUrl(req, "/video.css") });

    await page.waitForSelector(".li2-root", { timeout: 60000 });

    await page.waitForFunction(async () => {
      const fontsReady =
        "fonts" in document ? (document as any).fonts.ready : Promise.resolve();
      await fontsReady;

      const imgs = Array.from(document.images);
      return imgs.every((img) => img.complete);
    }, { timeout: 60000 });

    const clip = await page.$eval(".li2-root", (node, frameWidth) => {
      const el = node as HTMLElement;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.max(0, Math.floor(rect.left)),
        y: Math.max(0, Math.floor(rect.top)),
        width: Math.ceil(frameWidth as number),
        height: Math.max(1, Math.ceil(rect.height)),
      };
    }, frame.w);

    const buffer = await page.screenshot({
      type: "png",
      clip,
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
  outputMp4Path: string,
  box: { x: number; y: number; w: number; h: number }
) {
  let ffErr = "";

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(coverPngPath)
      .inputOptions(["-loop 1"])
      .input(userMp4Path)
      .complexFilter([
        `[1:v]scale=${box.w}:${box.h}:force_original_aspect_ratio=decrease,pad=${box.w}:${box.h}:(ow-iw)/2:(oh-ih)/2,format=yuv420p[vid]`,
        `[0:v][vid]overlay=${box.x}:${box.y}:shortest=1[v]`,
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
  const finalMp4 = path.join(tmpDir, "final.mp4");

  try {
    await configureFfmpegPaths();

    const { fields, files } = await parseMultipart(req);
    const data: Payload = JSON.parse(fields.data as string);

    const fileObj = (files as any).video;
    const userVideoPath = (Array.isArray(fileObj) ? fileObj[0] : fileObj)?.filepath;

    if (!userVideoPath) {
      return NextResponse.json(
        { error: "No video uploaded (field name must be 'video')" },
        { status: 400 }
      );
    }

    const box = await screenshotCoverPng(req, data, coverPng);
    await buildVideoInsideTemplateWithAudio(coverPng, userVideoPath, finalMp4, box);

    const out = await fs.readFile(finalMp4);
    return new NextResponse(out as unknown as BodyInit, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="final.mp4"',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "final video failed" },
      { status: 500 }
    );
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
