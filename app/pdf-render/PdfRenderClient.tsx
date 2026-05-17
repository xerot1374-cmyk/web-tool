"use client";

import LinkedInTemplate2 from "@/app/components/templates/linkedin/LinkedInTemplate2";
import { getCanvasFrame, type CanvasPreset } from "@/app/lib/renderUtils";
import { useMemo } from "react";

type TextMark = {
  start: number;
  end: number;
  style: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    highlight?: boolean;
    highlightColor?: string;
    fontWeight?: number | string;
    fontStyle?: "normal" | "italic";
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
  title?: string;
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
  badgeMarks?: TextMark[];
  badgeStyle?: BoxTextStyle;
  linkTitle?: string;
  titleMarks?: TextMark[];
  company?: string;
  companyMarks?: TextMark[];
  headline?: string;
  subline?: string;
  body?: string;
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
  linkUrl?: string | string[];
  linkUrls?: string[];
  canvasPreset?: CanvasPreset;
};

const PDF_EMOJI_FONT_FALLBACK =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif';

function withPdfEmojiFallback(fontFamily?: string) {
  const value = fontFamily?.trim();
  if (!value) return PDF_EMOJI_FONT_FALLBACK;
  if (/Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji|Segoe UI Symbol/i.test(value)) {
    return value;
  }
  return `${value}, ${PDF_EMOJI_FONT_FALLBACK}`;
}

function withPdfEmojiStyle<T extends { fontFamily?: string }>(style?: T) {
  if (!style) return undefined;
  if (!style.fontFamily?.trim()) return style;
  return {
    ...style,
    fontFamily: withPdfEmojiFallback(style.fontFamily),
  };
}

function withPdfEmojiMarks(marks?: TextMark[]) {
  return (
    marks?.map((mark) => ({
      ...mark,
      style: {
        ...mark.style,
        ...(mark.style.fontFamily?.trim()
          ? { fontFamily: withPdfEmojiFallback(mark.style.fontFamily) }
          : {}),
      },
    })) ?? []
  );
}

function resolvePdfImageSrc(src?: string) {
  const fallback = "/profile.jpg";
  const value = src?.trim();
  const normalized = value && value !== "/avatar.png" ? value : fallback;

  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized;
  if (typeof window === "undefined") return normalized;

  return new URL(normalized, window.location.origin).toString();
}

function getPayload(): Payload | null {
  if (typeof window === "undefined") return null;
  return ((window as Window & { __PDF_PAYLOAD__?: Payload }).__PDF_PAYLOAD__ ?? null);
}

export default function PdfRenderClient() {
  const payload = getPayload();

  const effective = useMemo(() => {
    if (!payload) return null;

    return {
      profileImage: resolvePdfImageSrc(payload.profileImage),
      name: payload.name || "—",
      role: payload.role || "—",
      productImage: payload.productImageBase64 ?? payload.productImage ?? undefined,
      productImages:
        payload.images?.map((img) => ({
          id: img.id,
          src: img.base64 ?? img.src ?? "",
          base64: img.base64,
          orientation: img.orientation,
          frameSlotId: img.frameSlotId,
          x: img.x,
          y: img.y,
          w: img.w,
          h: img.h,
          rotation: img.rotation ?? 0,
          cropX: img.cropX ?? 50,
          cropY: img.cropY ?? 50,
          cropScale: img.cropScale ?? 1,
        })) ?? [],
      productOrientation: payload.productOrientation ?? "landscape",
      productAlign: payload.productAlign ?? "center",
      imageLayout: payload.imageLayout ?? "manual",
      framePresetId: payload.framePresetId,
      frameSlots: payload.frameSlots,
      mediaBox: payload.mediaBox,
      badgeText: payload.badgeText?.trim() ? payload.badgeText.trim() : undefined,
      badgeMarks: withPdfEmojiMarks(payload.badgeMarks),
      linkTitle: payload.linkTitle ?? payload.title ?? "",
      titleMarks: withPdfEmojiMarks(payload.titleMarks),
      company: payload.company ?? "",
      companyMarks: withPdfEmojiMarks(payload.companyMarks),
      bodyText: payload.bodyText ?? payload.body ?? "",
      bodyMarks: withPdfEmojiMarks(payload.bodyMarks),
      linkUrl: payload.linkUrl ?? (payload.link?.trim() ? payload.link : undefined),
      linkUrls: payload.linkUrls,
      headline: payload.headline?.trim() ? payload.headline.trim() : undefined,
      subline: payload.subline?.trim() ? payload.subline.trim() : undefined,
      companyLogo: payload.companyLogoBase64 ?? payload.companyLogo ?? "/logo.png",
      titleStyle: withPdfEmojiStyle(payload.titleStyle),
      bodyStyle: withPdfEmojiStyle(payload.bodyStyle),
      badgeStyle: withPdfEmojiStyle(payload.badgeStyle),
      companyStyle: withPdfEmojiStyle(payload.companyStyle),
      headlineStyle: withPdfEmojiStyle(payload.headlineStyle),
      sublineStyle: withPdfEmojiStyle(payload.sublineStyle),
      canvasPreset: payload.canvasPreset ?? "linkedin",
    };
  }, [payload]);

  if (!effective) {
    return null;
  }

  const frame = getCanvasFrame(effective.canvasPreset);

  return (
    <div
      className="pdf-emoji-font-scope"
      style={{
        width: frame.w,
        background: "#ffffff",
        overflow: "visible",
      }}
    >
      <style>
        {`
          .pdf-emoji-font-scope .li2-root {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ${PDF_EMOJI_FONT_FALLBACK};
          }

          nextjs-portal,
          [data-nextjs-dialog-overlay],
          [data-nextjs-toast],
          [data-nextjs-dev-overlay],
          .li2-overlay,
          .li2-edit-control,
          .li2-edit-input,
          .li2-edit-badge,
          .li2-edit-badgeInput,
          .li2-edit-titleInput {
            display: none !important;
          }
        `}
      </style>
      <LinkedInTemplate2 {...effective} scale={1} mode="preview" />
    </div>
  );
}
