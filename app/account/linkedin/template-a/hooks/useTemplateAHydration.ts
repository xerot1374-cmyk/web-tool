"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { resolveFrameSlots } from "@/app/lib/imageLayouts";
import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import { DEFAULT_FRAME_PRESET_ID } from "../lib/templateA.utils";
import type {
  BoxTextStyle,
  ImageItem,
  PdfPayload,
  TextMark,
  MediaBox,
} from "../lib/templateA.types";
import type { FrameSlot, ImageLayoutMode } from "@/app/lib/imageLayouts";
import type { CanvasPreset } from "@/app/lib/renderUtils";

type Setter<T> = Dispatch<SetStateAction<T>>;

type UseTemplateAHydrationParams = {
  isPdf: boolean;
  payload: PdfPayload | null;
  setCanvasPreset: Setter<CanvasPreset>;
  setHeadline: Setter<string>;
  setSubline: Setter<string>;
  setBadgeText: Setter<string>;
  setTitle: Setter<string>;
  setBodyRaw: Setter<string>;
  setBadgeHtml: Setter<string>;
  setBadgeMarks: Setter<TextMark[]>;
  setBadgeBlocks: Setter<RichTextBlock[]>;
  setTitleHtml: Setter<string>;
  setTitleMarks: Setter<TextMark[]>;
  setTitleBlocks: Setter<RichTextBlock[]>;
  setBodyHtml: Setter<string>;
  setBodyMarks: Setter<TextMark[]>;
  setBodyBlocks: Setter<RichTextBlock[]>;
  setCompanyHtml: Setter<string>;
  setCompanyMarks: Setter<TextMark[]>;
  setCompanyBlocks: Setter<RichTextBlock[]>;
  setCaptionMarks: Setter<TextMark[]>;
  setLink: Setter<string[]>;
  setCompany: Setter<string>;
  setProductImage: Setter<string>;
  setProductOrientation: Setter<"landscape" | "portrait">;
  setProductAlign: Setter<"left" | "center" | "right">;
  setImageLayout: Setter<ImageLayoutMode>;
  setFramePresetId: Setter<string>;
  setFrameSlotsState: Setter<FrameSlot[]>;
  setMediaBox: Setter<MediaBox>;
  setImages: Setter<ImageItem[]>;
  setTitleStyle: Setter<BoxTextStyle>;
  setBodyBoxStyle: Setter<BoxTextStyle>;
  setBadgeStyle: Setter<BoxTextStyle>;
  setCompanyStyle: Setter<BoxTextStyle>;
  setHeadlineStyle: Setter<BoxTextStyle>;
  setSublineStyle: Setter<BoxTextStyle>;
};

export default function useTemplateAHydration({
  isPdf,
  payload,
  setCanvasPreset,
  setHeadline,
  setSubline,
  setBadgeText,
  setTitle,
  setBodyRaw,
  setBadgeHtml,
  setBadgeMarks,
  setBadgeBlocks,
  setTitleHtml,
  setTitleMarks,
  setTitleBlocks,
  setBodyHtml,
  setBodyMarks,
  setBodyBlocks,
  setCompanyHtml,
  setCompanyMarks,
  setCompanyBlocks,
  setCaptionMarks,
  setLink,
  setCompany,
  setProductImage,
  setProductOrientation,
  setProductAlign,
  setImageLayout,
  setFramePresetId,
  setFrameSlotsState,
  setMediaBox,
  setImages,
  setTitleStyle,
  setBodyBoxStyle,
  setBadgeStyle,
  setCompanyStyle,
  setHeadlineStyle,
  setSublineStyle,
}: UseTemplateAHydrationParams) {
  useEffect(() => {
    if (!isPdf || !payload) return;

    setCanvasPreset(payload.canvasPreset ?? "linkedin");
    setHeadline(payload.headline ?? "");
    setSubline(payload.subline ?? "");
    setBadgeText(payload.badgeText ?? "");
    setTitle(payload.linkTitle ?? "");
    setBodyRaw(payload.bodyText ?? "");
    setBadgeHtml(payload.badgeHtml ?? "");
    setBadgeMarks(payload.badgeMarks ?? []);
    setBadgeBlocks(payload.badgeBlocks ?? []);
    setTitleHtml(payload.titleHtml ?? "");
    setTitleMarks(payload.titleMarks ?? []);
    setTitleBlocks(payload.titleBlocks ?? []);
    setBodyHtml(payload.bodyHtml ?? "");
    setBodyMarks(payload.bodyMarks ?? []);
    setBodyBlocks(payload.bodyBlocks ?? []);
    setCompanyHtml(payload.companyHtml ?? "");
    setCompanyMarks(payload.companyMarks ?? []);
    setCompanyBlocks(payload.companyBlocks ?? []);
    setCaptionMarks(payload.captionMarks ?? []);
    setLink(
      payload.link
        ? payload.link
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    );
    setCompany(payload.company ?? "PROTOS-3D Metrology GmbH");

    setProductImage(payload.productImageBase64 ?? payload.productImage ?? "");
    setProductOrientation(payload.productOrientation ?? "landscape");
    setProductAlign(payload.productAlign ?? "center");
    setImageLayout(payload.imageLayout ?? "manual");
    setFramePresetId(payload.framePresetId ?? DEFAULT_FRAME_PRESET_ID);
    setFrameSlotsState(
      payload.frameSlots?.length
        ? payload.frameSlots
        : resolveFrameSlots(
            payload.framePresetId ?? DEFAULT_FRAME_PRESET_ID,
            payload.canvasPreset ?? "linkedin",
          ),
    );
    if (payload.mediaBox) setMediaBox(payload.mediaBox);

    if (payload.images?.length) {
      setImages(
        payload.images.map((img) => ({
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
        })),
      );
    }

    if (payload.titleStyle) setTitleStyle(payload.titleStyle);
    if (payload.bodyStyle) setBodyBoxStyle(payload.bodyStyle);
    if (payload.badgeStyle) setBadgeStyle(payload.badgeStyle);
    if (payload.companyStyle) setCompanyStyle(payload.companyStyle);
    if (payload.headlineStyle) setHeadlineStyle(payload.headlineStyle);
    if (payload.sublineStyle) setSublineStyle(payload.sublineStyle);
  }, [
    isPdf,
    payload,
    setCanvasPreset,
    setHeadline,
    setSubline,
    setBadgeText,
    setTitle,
    setBodyRaw,
    setBadgeHtml,
    setBadgeMarks,
    setBadgeBlocks,
    setTitleHtml,
    setTitleMarks,
    setTitleBlocks,
    setBodyHtml,
    setBodyMarks,
    setBodyBlocks,
    setCompanyHtml,
    setCompanyMarks,
    setCompanyBlocks,
    setCaptionMarks,
    setLink,
    setCompany,
    setProductImage,
    setProductOrientation,
    setProductAlign,
    setImageLayout,
    setFramePresetId,
    setFrameSlotsState,
    setMediaBox,
    setImages,
    setTitleStyle,
    setBodyBoxStyle,
    setBadgeStyle,
    setCompanyStyle,
    setHeadlineStyle,
    setSublineStyle,
  ]);
}
