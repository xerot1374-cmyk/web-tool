#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

async function main() {
  const [url, outputPath, itemType = "pattern"] = process.argv.slice(2);
  if (!url || !outputPath) {
    throw new Error("usage: capture_preview.mjs <url> <outputPath> [itemType]");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 1,
  });

  let title = "";
  let finalUrl = url;
  let bodyHeight = 0;
  let scrollY = 0;
  let anchored = false;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.addStyleTag({
      content: `
        [aria-label*="cookie" i],
        [id*="cookie" i],
        [class*="cookie" i],
        [data-testid*="cookie" i],
        [data-test*="cookie" i] {
          display: none !important;
        }
      `,
    }).catch(() => {});

    const hash = new URL(page.url()).hash;
    if (hash) {
      anchored = await page.evaluate((rawHash) => {
        const id = decodeURIComponent(rawHash.slice(1));
        const target =
          document.getElementById(id) ||
          document.querySelector(`[data-id="${id}"]`) ||
          document.querySelector(`a[name="${id}"]`);
        if (!target) return false;
        target.scrollIntoView({ block: "start", inline: "nearest" });
        return true;
      }, hash);
      if (!anchored) {
        const hashLabel = decodeURIComponent(hash.slice(1)).replace(/[-_]+/g, " ").trim();
        const heading = page
          .getByRole("heading", { name: new RegExp(hashLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })
          .first();
        if (await heading.count()) {
          await heading.scrollIntoViewIfNeeded();
          anchored = true;
        }
      }
      await page.waitForTimeout(400);
    }

    const fullPage = itemType !== "block";
    await page.screenshot({ path: outputPath, fullPage, type: "png" });

    title = await page.title();
    finalUrl = page.url();
    bodyHeight = await page.evaluate(() => {
      const body = document.body;
      const doc = document.documentElement;
      return Math.max(
        body?.scrollHeight || 0,
        body?.offsetHeight || 0,
        doc?.clientHeight || 0,
        doc?.scrollHeight || 0,
        doc?.offsetHeight || 0,
      );
    });
    scrollY = await page.evaluate(() => window.scrollY || window.pageYOffset || 0);
  } finally {
    await browser.close();
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  process.stdout.write(
    JSON.stringify(
      {
        title,
        final_url: finalUrl,
        viewport: { width: 1440, height: 1200 },
        body_height: bodyHeight,
        scroll_y: scrollY,
        anchored,
        screenshot_mode: itemType === "block" ? "viewport" : "full-page",
        preview_path: outputPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
