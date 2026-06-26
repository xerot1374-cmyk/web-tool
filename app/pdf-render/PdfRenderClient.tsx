"use client";

import LinkedInRichPostTemplate from "@/app/components/templates/linkedin/LinkedInRichPostTemplate";
import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/richTextTypes";
import { sanitizeTemplateTextAlign } from "@/app/components/templates/linkedin-shared/linkedInRichPostTemplateShared";
import { getCanvasFrame, type CanvasPreset } from "@/app/lib/renderUtils";
import { useMemo, useSyncExternalStore } from "react";

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
  hasTransparency?: boolean;
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
  cropTop?: number;
  cropRight?: number;
  cropBottom?: number;
  cropLeft?: number;
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
  videoRadius?: number;
  badgeText?: string;
  badgeHtml?: string;
  badgeMarks?: TextMark[];
  badgeBlocks?: RichTextBlock[];
  badgeStyle?: BoxTextStyle;
  linkTitle?: string;
  titleHtml?: string;
  titleMarks?: TextMark[];
  titleBlocks?: RichTextBlock[];
  company?: string;
  companyHtml?: string;
  companyMarks?: TextMark[];
  companyBlocks?: RichTextBlock[];
  headline?: string;
  subline?: string;
  body?: string;
  bodyText?: string;
  bodyHtml?: string;
  bodyMarks?: TextMark[];
  bodyBlocks?: RichTextBlock[];
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
  hashtags?: string | string[];
  canvasPreset?: CanvasPreset;
};

const PDF_EMOJI_FONT_FALLBACK =
  '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", Arial, Helvetica, sans-serif';
const PDF_DETERMINISTIC_FONT =
  '"Inter", "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", Arial, Helvetica, sans-serif';
const PDF_ARIAL_EXPORT_FONT = '"Arial", "Liberation Sans", Helvetica, sans-serif';
const PDF_GEORGIA_EXPORT_FONT = '"Liberation Serif", "Times New Roman", Times, serif';
const PDF_TIMES_EXPORT_FONT = '"Times New Roman", Times, serif';

function isArialFontFamily(fontFamily: string) {
  return /^["']?Arial["']?(?=\s*,|$)/i.test(fontFamily);
}

function isGeorgiaFontFamily(fontFamily: string) {
  return /^["']?Georgia["']?(?=\s*,|$)/i.test(fontFamily);
}

function isTimesFontFamily(fontFamily: string) {
  return /^["']?Times New Roman["']?(?=\s*,|$)/i.test(fontFamily);
}

function normalizePdfFontFamily(fontFamily?: string) {
  const value = fontFamily?.trim();
  if (
    !value ||
    /system-ui|-apple-system|BlinkMacSystemFont/i.test(value) ||
    /["']?Segoe UI["']?(?=\s*,|$)/i.test(value)
  ) {
    return PDF_DETERMINISTIC_FONT;
  }

  if (isArialFontFamily(value)) {
    return PDF_ARIAL_EXPORT_FONT;
  }

  if (isGeorgiaFontFamily(value)) {
    return PDF_GEORGIA_EXPORT_FONT;
  }

  if (isTimesFontFamily(value)) {
    return PDF_TIMES_EXPORT_FONT;
  }

  return value;
}

function withPdfEmojiFallback(fontFamily?: string) {
  const value = normalizePdfFontFamily(fontFamily);
  if (/Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji/i.test(value)) {
    return value;
  }
  return `${value}, ${PDF_EMOJI_FONT_FALLBACK}`;
}

function withPdfEmojiStyle<
  T extends { fontFamily?: string; textAlign?: unknown },
>(style?: T) {
  if (!style) return undefined;
  if (!style.fontFamily?.trim()) {
    return {
      ...style,
      textAlign: sanitizeTemplateTextAlign(style.textAlign),
    };
  }
  return {
    ...style,
    fontFamily: withPdfEmojiFallback(style.fontFamily),
    textAlign: sanitizeTemplateTextAlign(style.textAlign),
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
  return (
    (window as Window & { __PDF_PAYLOAD__?: Payload }).__PDF_PAYLOAD__ ?? null
  );
}

function subscribeToPayload() {
  return () => {};
}

export default function PdfRenderClient() {
  const payload = useSyncExternalStore(
    subscribeToPayload,
    getPayload,
    () => null,
  );

  const effective = useMemo(() => {
    if (!payload) return null;

    return {
      profileImage: resolvePdfImageSrc(payload.profileImage),
      name: payload.name || "—",
      role: payload.role || "—",
      productImage:
        payload.productImageBase64 ?? payload.productImage ?? undefined,
      productImages:
        payload.images?.map((img) => ({
          id: img.id,
          src: img.base64 ?? img.src ?? "",
          base64: img.base64,
          hasTransparency: img.hasTransparency,
          orientation: img.orientation,
          frameSlotId: img.frameSlotId,
          x: img.x,
          y: img.y,
          w: img.w,
          h: img.h,
          rotation: img.rotation ?? 0,
          radius: img.radius ?? 20,
          cropX: img.cropX ?? 50,
          cropY: img.cropY ?? 50,
          cropScale: img.cropScale ?? 1,
          cropTop: img.cropTop ?? 0,
          cropRight: img.cropRight ?? 0,
          cropBottom: img.cropBottom ?? 0,
          cropLeft: img.cropLeft ?? 0,
        })) ?? [],
      productOrientation: payload.productOrientation ?? "landscape",
      productAlign: payload.productAlign ?? "center",
      imageLayout: payload.imageLayout ?? "manual",
      framePresetId: payload.framePresetId,
      frameSlots: payload.frameSlots,
      mediaBox: payload.mediaBox,
      videoRadius: payload.videoRadius ?? 20,
      badgeText: payload.badgeText?.trim() ? payload.badgeText : undefined,
      badgeHtml: payload.badgeHtml ?? "",
      badgeMarks: withPdfEmojiMarks(payload.badgeMarks),
      badgeBlocks: payload.badgeBlocks ?? [],
      linkTitle: payload.linkTitle ?? payload.title ?? "",
      titleHtml: payload.titleHtml ?? "",
      titleMarks: withPdfEmojiMarks(payload.titleMarks),
      titleBlocks: payload.titleBlocks ?? [],
      company: payload.company ?? "",
      companyHtml: payload.companyHtml ?? "",
      companyMarks: withPdfEmojiMarks(payload.companyMarks),
      companyBlocks: payload.companyBlocks ?? [],
      bodyText: payload.bodyText ?? payload.body ?? "",
      bodyHtml: payload.bodyHtml ?? "",
      bodyMarks: withPdfEmojiMarks(payload.bodyMarks),
      bodyBlocks: payload.bodyBlocks ?? [],
      linkUrl:
        payload.linkUrl ?? (payload.link?.trim() ? payload.link : undefined),
      linkUrls: payload.linkUrls,
      hashtags: payload.hashtags,
      headline: payload.headline?.trim() ? payload.headline.trim() : undefined,
      subline: payload.subline?.trim() ? payload.subline.trim() : undefined,
      companyLogo:
        payload.companyLogoBase64 ?? payload.companyLogo ?? "/logo.png",
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
      role="presentation"
      style={{
        width: frame.w,
        background: "#ffffff",
        overflow: "visible",
      }}
    >
      <style>
        {`
          .pdf-emoji-font-scope .li2-root {
            font-family: ${PDF_DETERMINISTIC_FONT};
          }

          .pdf-emoji-font-scope h1.li2-linkTitle,
          .pdf-emoji-font-scope p.li2-company,
          .pdf-emoji-font-scope p.li2-headline,
          .pdf-emoji-font-scope p.li2-subline,
          .pdf-emoji-font-scope p.li2-body,
          .pdf-emoji-font-scope p.li2-linkRow {
            margin-block-end: 0;
          }

          .pdf-emoji-font-scope .template-inline-editor {
            color: inherit;
            box-sizing: border-box;
            max-width: 100%;
          }

          .pdf-emoji-font-scope .template-inline-editor > * {
            box-sizing: border-box;
            max-width: 100%;
          }

          .pdf-emoji-font-scope .template-inline-editor p,
          .pdf-emoji-font-scope .template-inline-editor ul,
          .pdf-emoji-font-scope .template-inline-editor ol,
          .pdf-emoji-font-scope .template-inline-editor li {
            margin: 0;
            max-width: 100%;
            line-height: inherit;
            white-space: pre-wrap;
          }

          .pdf-emoji-font-scope .template-inline-editor ul,
          .pdf-emoji-font-scope .template-inline-editor ol {
            padding-inline-start: 0;
            list-style-position: inside;
          }

          .pdf-emoji-font-scope .template-inline-editor li {
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-emoji-font-scope .template-inline-editor li::marker {
            font-family: var(--listitem-marker-font-family, inherit);
            font-size: var(--listitem-marker-font-size, inherit);
            font-style: var(--listitem-marker-font-style, inherit);
            font-weight: var(--listitem-marker-font-weight, inherit);
            color: var(--listitem-marker-color, inherit);
          }

          .pdf-emoji-font-scope .li2-body + .li2-linkRow {
            margin-top: 38px;
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
      <LinkedInRichPostTemplate
        {...effective}
        scale={1}
        mode="preview"
        pdfSemantic
      />
    </div>
  );
}
