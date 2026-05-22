"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { resolveFrameSlots } from "@/app/lib/imageLayouts";
import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import { DEFAULT_FRAME_PRESET_ID } from "../lib/templateA.utils";
import type {
  BoxTextStyle,
  ImageItem,
  PdfPayload,
  TemplateADraftPayload,
  TextMark,
  MediaBox,
} from "../lib/templateA.types";
import type { FrameSlot, ImageLayoutMode } from "@/app/lib/imageLayouts";
import type { CanvasPreset } from "@/app/lib/renderUtils";

type Setter<T> = Dispatch<SetStateAction<T>>;

type UseTemplateAHydrationParams = {
  isPdf: boolean;
  payload: PdfPayload | null;
  initialDraft: TemplateADraftPayload | null;
  setDraftHydrated: Setter<boolean>;
  setCanvasPreset: Setter<CanvasPreset>;
  setHeadline: Setter<string>;
  setSubline: Setter<string>;
  setBadgeText: Setter<string>;
  setTitle: Setter<string>;
  setBodyRaw: Setter<string>;
  setCaptionRaw: Setter<string>;
  setBadgeHtml: Setter<string>;
  setBadgeMarks: Setter<TextMark[]>;
  setBadgeBlocks: Setter<RichTextBlock[]>;
  setTitleHtml: Setter<string>;
  setTitleMarks: Setter<TextMark[]>;
  setTitleBlocks: Setter<RichTextBlock[]>;
  setBodyHtml: Setter<string>;
  setBodyMarks: Setter<TextMark[]>;
  setBodyBlocks: Setter<RichTextBlock[]>;
  setCaptionHtml: Setter<string>;
  setCaptionBlocks: Setter<RichTextBlock[]>;
  setCompanyHtml: Setter<string>;
  setCompanyMarks: Setter<TextMark[]>;
  setCompanyBlocks: Setter<RichTextBlock[]>;
  setCaptionMarks: Setter<TextMark[]>;
  setLink: Setter<string[]>;
  setHashtags: Setter<string[]>;
  setCompany: Setter<string>;
  setProductImage: Setter<string>;
  setProductOrientation: Setter<"landscape" | "portrait">;
  setProductAlign: Setter<"left" | "center" | "right">;
  setImageLayout: Setter<ImageLayoutMode>;
  setFramePresetId: Setter<string>;
  setFrameSlotsState: Setter<FrameSlot[]>;
  setMediaBox: Setter<MediaBox>;
  setImages: Setter<ImageItem[]>;
  setVideoRadius?: Setter<number>;
  setTitleStyle: Setter<BoxTextStyle>;
  setBodyBoxStyle: Setter<BoxTextStyle>;
  setCaptionStyle: Setter<BoxTextStyle>;
  setBadgeStyle: Setter<BoxTextStyle>;
  setCompanyStyle: Setter<BoxTextStyle>;
  setHeadlineStyle: Setter<BoxTextStyle>;
  setSublineStyle: Setter<BoxTextStyle>;
};

export default function useTemplateAHydration({
  isPdf,
  payload,
  initialDraft,
  setDraftHydrated,
  setCanvasPreset,
  setHeadline,
  setSubline,
  setBadgeText,
  setTitle,
  setBodyRaw,
  setCaptionRaw,
  setBadgeHtml,
  setBadgeMarks,
  setBadgeBlocks,
  setTitleHtml,
  setTitleMarks,
  setTitleBlocks,
  setBodyHtml,
  setBodyMarks,
  setBodyBlocks,
  setCaptionHtml,
  setCaptionBlocks,
  setCompanyHtml,
  setCompanyMarks,
  setCompanyBlocks,
  setCaptionMarks,
  setLink,
  setHashtags,
  setCompany,
  setProductImage,
  setProductOrientation,
  setProductAlign,
  setImageLayout,
  setFramePresetId,
  setFrameSlotsState,
  setMediaBox,
  setImages,
  setVideoRadius,
  setTitleStyle,
  setBodyBoxStyle,
  setCaptionStyle,
  setBadgeStyle,
  setCompanyStyle,
  setHeadlineStyle,
  setSublineStyle,
}: UseTemplateAHydrationParams) {
  useEffect(() => {
    const source = isPdf ? payload : initialDraft;
    if (!source) {
      setDraftHydrated(true);
      return;
    }

    setCanvasPreset(source.canvasPreset ?? "linkedin");
    setHeadline(source.headline ?? "");
    setSubline(source.subline ?? "");
    setBadgeText(source.badgeText ?? "");
    setTitle(source.linkTitle ?? "");
    setBodyRaw(source.bodyText ?? "");
    setCaptionRaw(source.captionText ?? "");
    setBadgeHtml(source.badgeHtml ?? "");
    setBadgeMarks(source.badgeMarks ?? []);
    setBadgeBlocks(source.badgeBlocks ?? []);
    setTitleHtml(source.titleHtml ?? "");
    setTitleMarks(source.titleMarks ?? []);
    setTitleBlocks(source.titleBlocks ?? []);
    setBodyHtml(source.bodyHtml ?? "");
    setBodyMarks(source.bodyMarks ?? []);
    setBodyBlocks(source.bodyBlocks ?? []);
    setCaptionHtml(source.captionHtml ?? "");
    setCaptionBlocks(source.captionBlocks ?? []);
    setCompanyHtml(source.companyHtml ?? "");
    setCompanyMarks(source.companyMarks ?? []);
    setCompanyBlocks(source.companyBlocks ?? []);
    setCaptionMarks(source.captionMarks ?? []);
    setLink(
      source.link
        ? source.link
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    );
    setHashtags(
      source.hashtags
        ? source.hashtags
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    );
    setCompany(source.company ?? "PROTOS-3D Metrology GmbH");

    setProductImage(source.productImageBase64 ?? source.productImage ?? "");
    setProductOrientation(source.productOrientation ?? "landscape");
    setProductAlign(source.productAlign ?? "center");
    setImageLayout(source.imageLayout ?? "manual");
    setFramePresetId(source.framePresetId ?? DEFAULT_FRAME_PRESET_ID);
    setFrameSlotsState(
      source.frameSlots?.length
        ? source.frameSlots
        : resolveFrameSlots(
            source.framePresetId ?? DEFAULT_FRAME_PRESET_ID,
            source.canvasPreset ?? "linkedin",
          ),
    );
    if (source.mediaBox) setMediaBox(source.mediaBox);

    if (source.images?.length) {
      setImages(
        source.images.map((img) => ({
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
          radius: img.radius ?? 20,
          cropX: img.cropX ?? 50,
          cropY: img.cropY ?? 50,
          cropScale: img.cropScale ?? 1,
        })),
      );
    } else {
      setImages([]);
    }

    setVideoRadius?.(source.videoRadius ?? 20);

    if (source.titleStyle) setTitleStyle(source.titleStyle);
    if (source.bodyStyle) setBodyBoxStyle(source.bodyStyle);
    if (source.captionStyle) setCaptionStyle(source.captionStyle);
    if (source.badgeStyle) setBadgeStyle(source.badgeStyle);
    if (source.companyStyle) setCompanyStyle(source.companyStyle);
    if (source.headlineStyle) setHeadlineStyle(source.headlineStyle);
    if (source.sublineStyle) setSublineStyle(source.sublineStyle);
    setDraftHydrated(true);
  }, [
    isPdf,
    payload,
    initialDraft,
    setDraftHydrated,
    setCanvasPreset,
    setHeadline,
    setSubline,
    setBadgeText,
    setTitle,
    setBodyRaw,
    setCaptionRaw,
    setBadgeHtml,
    setBadgeMarks,
    setBadgeBlocks,
    setTitleHtml,
    setTitleMarks,
    setTitleBlocks,
    setBodyHtml,
    setBodyMarks,
    setBodyBlocks,
    setCaptionHtml,
    setCaptionBlocks,
    setCompanyHtml,
    setCompanyMarks,
    setCompanyBlocks,
    setCaptionMarks,
    setLink,
    setHashtags,
    setCompany,
    setProductImage,
    setProductOrientation,
    setProductAlign,
    setImageLayout,
    setFramePresetId,
    setFrameSlotsState,
    setMediaBox,
    setImages,
    setVideoRadius,
    setTitleStyle,
    setBodyBoxStyle,
    setCaptionStyle,
    setBadgeStyle,
    setCompanyStyle,
    setHeadlineStyle,
    setSublineStyle,
  ]);
}
