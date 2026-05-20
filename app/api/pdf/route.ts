import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

import {
  absUrl,
  getCanvasFrame,
  type CanvasPreset,
} from "@/app/lib/renderUtils";

type Payload = {
  canvasPreset?: CanvasPreset;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Payload;
    const frame = getCanvasFrame(data.canvasPreset);
    const renderUrl = absUrl(req, "/pdf-render");

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
      }, data);

      await page.goto(renderUrl, { waitUntil: "networkidle0", timeout: 60000 });
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
