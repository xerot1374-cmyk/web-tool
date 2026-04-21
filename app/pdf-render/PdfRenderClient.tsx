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

function getPayload(): Payload | null {
  if (typeof window === "undefined") return null;
  return ((window as Window & { __PDF_PAYLOAD__?: Payload }).__PDF_PAYLOAD__ ?? null);
}

export default function PdfRenderClient() {
  const payload = getPayload();

  const effective = useMemo(() => {
    if (!payload) return null;

    return {
      profileImage: payload.profileImage,
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
      linkTitle: payload.linkTitle ?? "",
      company: payload.company ?? "",
      bodyText: payload.bodyText ?? "",
      bodyMarks: payload.bodyMarks ?? [],
      linkUrl: payload.link?.trim() ? payload.link : undefined,
      headline: payload.headline?.trim() ? payload.headline.trim() : undefined,
      subline: payload.subline?.trim() ? payload.subline.trim() : undefined,
      companyLogo: payload.companyLogoBase64 ?? payload.companyLogo ?? "/logo.png",
      titleStyle: payload.titleStyle,
      bodyStyle: payload.bodyStyle,
      badgeStyle: payload.badgeStyle,
      companyStyle: payload.companyStyle,
      headlineStyle: payload.headlineStyle,
      sublineStyle: payload.sublineStyle,
      canvasPreset: payload.canvasPreset ?? "linkedin",
      showRaster: false,
      rasterMode: "none" as const,
    };
  }, [payload]);

  if (!effective) {
    return null;
  }

  const frame = getCanvasFrame(effective.canvasPreset);

  return (
    <div
      style={{
        width: frame.w,
        background: "#ffffff",
        overflow: "visible",
      }}
    >
      <LinkedInTemplate2 {...effective} scale={1} mode="preview" />
    </div>
  );
}
