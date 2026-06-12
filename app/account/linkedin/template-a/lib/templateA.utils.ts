"use client";

import { FRAME_PRESETS, getHeaderHeightForPreset, resolveFrameSlots, type FrameSlot, type ImageLayoutMode } from "@/app/lib/imageLayouts";
import { CANVAS_PRESETS, type CanvasPreset } from "@/app/lib/renderUtils";
import type {
  CanvasPresetKey,
  ImageItem,
  PdfPayload,
  SelectableId,
} from "./templateA.types";

export type MediaCrop = {
  cropTop?: number;
  cropRight?: number;
  cropBottom?: number;
  cropLeft?: number;
};

declare global {
  interface Window {
    __PDF_PAYLOAD__?: PdfPayload;
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function normalizeUrl(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function getLineBounds(text: string, index: number) {
  const safeIndex = clamp(index, 0, text.length);
  const start = text.lastIndexOf("\n", Math.max(0, safeIndex - 1)) + 1;
  const next = text.indexOf("\n", safeIndex);
  const end = next === -1 ? text.length : next;
  return { start, end };
}

export async function copyTextToClipboard(
  text: string,
  fallbackEl?: HTMLTextAreaElement | HTMLInputElement | null,
) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      if (!fallbackEl) return false;
      fallbackEl.focus();
      fallbackEl.select();
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    }
  }
}

export function getPdfModeAndPayload() {
  if (typeof window === "undefined") return { isPdf: false, payload: null };
  const isPdf =
    new URLSearchParams(window.location.search).get("__pdf") === "1";
  const payload = isPdf ? (window.__PDF_PAYLOAD__ ?? null) : null;
  return { isPdf, payload };
}

export const CANVAS_LABELS: Record<CanvasPresetKey, string> = {
  linkedin: "LinkedIn (800×3000)",
  instagram: "Instagram Feed (1080×1080)",
  instagramStory: "Instagram Story (1080×1920)",
};

const PREVIEW_TEXT_SELECTABLE_IDS = new Set<SelectableId>([
  "title",
  "body",
  "badge",
  "company",
]);

const PREVIEW_SELECTABLE_IDS = new Set<SelectableId>([
  ...PREVIEW_TEXT_SELECTABLE_IDS,
  "productImage",
  "frameSlot",
  "video",
  "hashtags",
]);

export function isPreviewTextSelectableId(
  id: SelectableId | null,
): id is "title" | "body" | "badge" | "company" {
  return id !== null && PREVIEW_TEXT_SELECTABLE_IDS.has(id);
}

export function isPreviewSelectableId(id: string): id is SelectableId {
  return PREVIEW_SELECTABLE_IDS.has(id as SelectableId);
}

export function safePx(v: string | null | undefined, fallback: number) {
  const n = v ? parseFloat(v) : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function uid() {
  return Math.random().toString(36).slice(2, 11);
}

export function imageToViewportRect(
  image: Pick<ImageItem, "x" | "y" | "w" | "h">,
) {
  return new DOMRect(image.x, image.y, image.w, image.h);
}

export function normalizeAngle(deg: number) {
  let next = deg % 360;
  if (next < 0) next += 360;
  return next;
}

export function angleFromCenter(cx: number, cy: number, px: number, py: number) {
  return (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
}

export function isEditableTarget(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    node.isContentEditable ||
    Boolean(node.closest("input, textarea, [contenteditable='true']"))
  );
}

export function getCropX(img?: ImageItem | null) {
  return Number.isFinite(img?.cropX) ? Number(img?.cropX) : 50;
}

export function getCropY(img?: ImageItem | null) {
  return Number.isFinite(img?.cropY) ? Number(img?.cropY) : 50;
}

export function getCropScale(img?: ImageItem | null) {
  return Number.isFinite(img?.cropScale) ? Number(img?.cropScale) : 1;
}

export function getMediaCropValues(item?: MediaCrop | null) {
  return {
    cropTop: clamp(Number.isFinite(item?.cropTop) ? Number(item?.cropTop) : 0, 0, 90),
    cropRight: clamp(Number.isFinite(item?.cropRight) ? Number(item?.cropRight) : 0, 0, 90),
    cropBottom: clamp(
      Number.isFinite(item?.cropBottom) ? Number(item?.cropBottom) : 0,
      0,
      90,
    ),
    cropLeft: clamp(Number.isFinite(item?.cropLeft) ? Number(item?.cropLeft) : 0, 0, 90),
  };
}

export function normalizeMediaCrop(item?: MediaCrop | null) {
  const crop = getMediaCropValues(item);
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

export function getCroppedMediaContentStyle(item?: MediaCrop | null) {
  const crop = normalizeMediaCrop(item);
  const inset = `${crop.cropTop}% ${crop.cropRight}% ${crop.cropBottom}% ${crop.cropLeft}%`;

  return {
    clipPath: `inset(${inset})`,
    WebkitClipPath: `inset(${inset})`,
  };
}

function getImageAspectRatio(image: Pick<ImageItem, "w" | "h" | "orientation">) {
  if (image.w > 0 && image.h > 0) {
    return image.w / image.h;
  }

  return image.orientation === "portrait" ? 3 / 4 : 4 / 3;
}

function fitImageToBounds(
  image: Pick<ImageItem, "w" | "h" | "orientation">,
  maxW: number,
  maxH: number,
) {
  const aspectRatio = getImageAspectRatio(image);
  let width = maxW;
  let height = width / aspectRatio;

  if (height > maxH) {
    height = maxH;
    width = height * aspectRatio;
  }

  return {
    w: Math.max(120, Math.round(width)),
    h: Math.max(120, Math.round(height)),
  };
}

function getCollageSlots(
  count: number,
  canvasW: number,
  headerH: number,
  align: "left" | "center" | "right",
) {
  const alignShift =
    align === "left" ? -canvasW * 0.12 : align === "right" ? canvasW * 0.12 : 0;

  if (count <= 1) {
    return [
      { cx: canvasW * 0.5 + alignShift, cy: headerH * 0.57, bw: canvasW * 0.44, bh: headerH * 0.5, rotation: -3 },
    ];
  }

  if (count === 2) {
    return [
      { cx: canvasW * 0.4 + alignShift, cy: headerH * 0.57, bw: canvasW * 0.34, bh: headerH * 0.45, rotation: -9 },
      { cx: canvasW * 0.62 + alignShift, cy: headerH * 0.52, bw: canvasW * 0.34, bh: headerH * 0.45, rotation: 8 },
    ];
  }

  if (count === 3) {
    return [
      { cx: canvasW * 0.3 + alignShift, cy: headerH * 0.59, bw: canvasW * 0.28, bh: headerH * 0.38, rotation: -11 },
      { cx: canvasW * 0.7 + alignShift, cy: headerH * 0.57, bw: canvasW * 0.28, bh: headerH * 0.38, rotation: 10 },
      { cx: canvasW * 0.5 + alignShift, cy: headerH * 0.5, bw: canvasW * 0.35, bh: headerH * 0.47, rotation: -2 },
    ];
  }

  if (count === 4) {
    return [
      { cx: canvasW * 0.31 + alignShift, cy: headerH * 0.43, bw: canvasW * 0.24, bh: headerH * 0.33, rotation: -10 },
      { cx: canvasW * 0.68 + alignShift, cy: headerH * 0.42, bw: canvasW * 0.24, bh: headerH * 0.33, rotation: 9 },
      { cx: canvasW * 0.38 + alignShift, cy: headerH * 0.68, bw: canvasW * 0.24, bh: headerH * 0.33, rotation: -4 },
      { cx: canvasW * 0.62 + alignShift, cy: headerH * 0.64, bw: canvasW * 0.24, bh: headerH * 0.33, rotation: 6 },
    ];
  }

  const baseSlots = [
    { cx: canvasW * 0.25 + alignShift, cy: headerH * 0.44, bw: canvasW * 0.22, bh: headerH * 0.3, rotation: -12 },
    { cx: canvasW * 0.74 + alignShift, cy: headerH * 0.43, bw: canvasW * 0.22, bh: headerH * 0.3, rotation: 12 },
    { cx: canvasW * 0.35 + alignShift, cy: headerH * 0.68, bw: canvasW * 0.22, bh: headerH * 0.3, rotation: -6 },
    { cx: canvasW * 0.65 + alignShift, cy: headerH * 0.66, bw: canvasW * 0.22, bh: headerH * 0.3, rotation: 7 },
    { cx: canvasW * 0.5 + alignShift, cy: headerH * 0.54, bw: canvasW * 0.28, bh: headerH * 0.38, rotation: -1 },
  ];

  return Array.from({ length: count }, (_, index) => {
    if (index < baseSlots.length) return baseSlots[index];

    const extraIndex = index - baseSlots.length;
    return {
      cx: canvasW * 0.5 + alignShift + (extraIndex % 2 === 0 ? -30 : 30),
      cy: headerH * 0.52 + extraIndex * 16,
      bw: canvasW * 0.18,
      bh: headerH * 0.24,
      rotation: extraIndex % 2 === 0 ? -8 : 8,
    };
  });
}

export function arrangeImagesForLayout(
  sourceImages: ImageItem[],
  layout: ImageLayoutMode,
  preset: CanvasPreset,
  align: "left" | "center" | "right",
  framePresetId: string,
  frameSlotsOverride?: FrameSlot[],
) {
  if (sourceImages.length === 0) {
    return sourceImages;
  }

  if (layout === "frame") {
    const frameSlots = frameSlotsOverride?.length
      ? frameSlotsOverride
      : resolveFrameSlots(framePresetId, preset);
    const slotIds = frameSlots.map((slot) => slot.id);
    const assigned = new Set<string>();
    let slotIndex = 0;

    return sourceImages.map((img) => {
      let nextSlotId =
        img.frameSlotId && slotIds.includes(img.frameSlotId)
          ? img.frameSlotId
          : undefined;

      if (!nextSlotId || assigned.has(nextSlotId)) {
        while (slotIndex < slotIds.length && assigned.has(slotIds[slotIndex])) {
          slotIndex += 1;
        }
        nextSlotId = slotIds[slotIndex];
        slotIndex += 1;
      }

      if (!nextSlotId) {
        return { ...img, frameSlotId: undefined };
      }

      assigned.add(nextSlotId);
      const slot = frameSlots.find((item) => item.id === nextSlotId);
      if (!slot) {
        return { ...img, frameSlotId: undefined };
      }

      return {
        ...img,
        frameSlotId: nextSlotId,
        x: slot.x,
        y: slot.y,
        w: slot.w,
        h: slot.h,
        rotation: 0,
      };
    });
  }

  if (layout !== "collage") {
    return sourceImages;
  }

  const canvas = CANVAS_PRESETS[preset];
  const headerH = getHeaderHeightForPreset(preset);
  const safeTop = 118;
  const safeBottom = 34;
  const safeSide = 28;
  const slots = getCollageSlots(sourceImages.length, canvas.w, headerH, align);

  return sourceImages.map((img, index) => {
    const slot = slots[index] ?? slots[slots.length - 1];
    const fit = fitImageToBounds(img, slot.bw, slot.bh);
    const x = clamp(
      Math.round(slot.cx - fit.w / 2),
      safeSide,
      Math.max(safeSide, canvas.w - safeSide - fit.w),
    );
    const y = clamp(
      Math.round(slot.cy - fit.h / 2),
      safeTop,
      Math.max(safeTop, headerH - safeBottom - fit.h),
    );

    return {
      ...img,
      x,
      y,
      w: fit.w,
      h: fit.h,
      rotation: normalizeAngle(slot.rotation),
    };
  });
}

export const DEFAULT_FRAME_PRESET_ID = FRAME_PRESETS[0].id;
