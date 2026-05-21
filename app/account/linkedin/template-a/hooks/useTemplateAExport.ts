"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveFrameSlots } from "@/app/lib/imageLayouts";
import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import type { BoxTextStyle, FieldErrors, ImageItem, ImagePayloadItem, MediaBox, PdfPayload, SessionUser, TextMark, VideoItem, VideoPayloadItem } from "../lib/templateA.types";
import { DEFAULT_FRAME_PRESET_ID, fileToBase64 } from "../lib/templateA.utils";

type UseTemplateAExportParams = {
  isPdf: boolean;
  payload: PdfPayload | null;
  sessionUser: SessionUser | null;
  productImage: string;
  productImageFile: File | null;
  productOrientation: "landscape" | "portrait";
  productAlign: "left" | "center" | "right";
  imageLayout: "manual" | "collage" | "frame";
  framePresetId: string;
  frameSlotsState: ReturnType<typeof resolveFrameSlots>;
  mediaBox: MediaBox;
  images: ImageItem[];
  badgeText: string;
  badgeHtml: string;
  badgeMarks: TextMark[];
  badgeBlocks: RichTextBlock[];
  badgeStyle: BoxTextStyle;
  title: string;
  titleHtml: string;
  titleMarks: TextMark[];
  titleBlocks: RichTextBlock[];
  company: string;
  companyHtml: string;
  companyMarks: TextMark[];
  companyBlocks: RichTextBlock[];
  body: string;
  bodyHtml: string;
  bodyMarks: TextMark[];
  bodyBlocks: RichTextBlock[];
  caption: string;
  captionHtml: string;
  captionMarks: TextMark[];
  captionBlocks: RichTextBlock[];
  captionStyle: BoxTextStyle;
  link: string[];
  hashtags: string[];
  normalizedLink?: string;
  headline: string;
  subline: string;
  titleStyle: BoxTextStyle;
  bodyBoxStyle: BoxTextStyle;
  companyStyle: BoxTextStyle;
  headlineStyle: BoxTextStyle;
  sublineStyle: BoxTextStyle;
  canvasPreset: "linkedin" | "instagram" | "instagramStory";
  videos: VideoItem[];
  setErrors: React.Dispatch<React.SetStateAction<FieldErrors>>;
};

export default function useTemplateAExport({
  isPdf,
  payload,
  sessionUser,
  productImage,
  productImageFile,
  productOrientation,
  productAlign,
  imageLayout,
  framePresetId,
  frameSlotsState,
  mediaBox,
  images,
  badgeText,
  badgeHtml,
  badgeMarks,
  badgeBlocks,
  badgeStyle,
  title,
  titleHtml,
  titleMarks,
  titleBlocks,
  company,
  companyHtml,
  companyMarks,
  companyBlocks,
  body,
  bodyHtml,
  bodyMarks,
  bodyBlocks,
  caption,
  captionHtml,
  captionMarks,
  captionBlocks,
  captionStyle,
  link,
  hashtags,
  normalizedLink,
  headline,
  subline,
  titleStyle,
  bodyBoxStyle,
  companyStyle,
  headlineStyle,
  sublineStyle,
  canvasPreset,
  videos,
  setErrors,
}: UseTemplateAExportParams) {
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [finalLoading, setFinalLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const sessionName = sessionUser?.name ?? "";
  const sessionRole = sessionUser?.role ?? "";
  const sessionProfileImage = sessionUser?.profileImage ?? "/profile.jpg";

  const effective = useMemo(() => {
    if (isPdf && payload) {
      const raw = payload.link ?? "";
      const payloadImages =
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
          radius: img.radius ?? 20,
          cropX: img.cropX ?? 50,
          cropY: img.cropY ?? 50,
          cropScale: img.cropScale ?? 1,
        })) ?? [];

      return {
        profileImage: payload.profileImage,
        name: payload.name || "—",
        role: payload.role || "—",
        productImage:
          payload.productImageBase64 ?? payload.productImage ?? undefined,
        productImages: payloadImages,
        productOrientation: payload.productOrientation ?? "landscape",
        productAlign: payload.productAlign ?? "center",
        imageLayout: payload.imageLayout ?? "manual",
        framePresetId: payload.framePresetId ?? DEFAULT_FRAME_PRESET_ID,
        frameSlots: payload.frameSlots?.length
          ? payload.frameSlots
          : resolveFrameSlots(
              payload.framePresetId ?? DEFAULT_FRAME_PRESET_ID,
              payload.canvasPreset ?? "linkedin",
            ),
        mediaBox,
        badgeText: payload.badgeText?.trim()
          ? payload.badgeText.trim()
          : undefined,
        badgeHtml: payload.badgeHtml ?? "",
        badgeMarks: payload.badgeMarks ?? [],
        badgeBlocks: payload.badgeBlocks ?? [],
        linkTitle: payload.linkTitle ?? "",
        titleHtml: payload.titleHtml ?? "",
        titleMarks: payload.titleMarks ?? [],
        titleBlocks: payload.titleBlocks ?? [],
        company: payload.company ?? "",
        companyHtml: payload.companyHtml ?? "",
        companyMarks: payload.companyMarks ?? [],
        companyBlocks: payload.companyBlocks ?? [],
        bodyText: payload.bodyText ?? "",
        bodyHtml: payload.bodyHtml ?? "",
        bodyMarks: payload.bodyMarks ?? [],
        bodyBlocks: payload.bodyBlocks ?? [],
        captionText: payload.captionText ?? "",
        captionHtml: payload.captionHtml ?? "",
        captionMarks: payload.captionMarks ?? [],
        captionBlocks: payload.captionBlocks ?? [],
        captionStyle: payload.captionStyle ?? captionStyle,
        linkUrl: raw.trim() ? raw : undefined,
        hashtags: payload.hashtags ?? "",
        headline: payload.headline?.trim()
          ? payload.headline.trim()
          : undefined,
        subline: payload.subline?.trim() ? payload.subline.trim() : undefined,
        titleStyle: payload.titleStyle ?? titleStyle,
        bodyStyle: payload.bodyStyle ?? bodyBoxStyle,
        badgeStyle: payload.badgeStyle ?? badgeStyle,
        companyStyle: payload.companyStyle ?? companyStyle,
        headlineStyle: payload.headlineStyle ?? headlineStyle,
        sublineStyle: payload.sublineStyle ?? sublineStyle,
        canvasPreset: payload.canvasPreset ?? canvasPreset,
      };
    }

    return {
      profileImage: sessionProfileImage,
      name: sessionName || "—",
      role: sessionRole || "—",
      productImage: productImage || undefined,
      productImages: images,
      productOrientation,
      productAlign,
      imageLayout,
      framePresetId,
      frameSlots: frameSlotsState,
      mediaBox,
      badgeText: badgeText?.trim() ? badgeText.trim() : undefined,
      badgeHtml,
      badgeMarks,
      badgeBlocks,
      linkTitle: title || "",
      titleHtml,
      titleMarks,
      titleBlocks,
      company: company || "",
      companyHtml,
      companyMarks,
      companyBlocks,
      bodyText: body || "",
      bodyHtml,
      bodyMarks,
      bodyBlocks,
      captionText: caption || "",
      captionHtml,
      captionMarks,
      captionBlocks,
      captionStyle,
      linkUrl: normalizedLink,
      hashtags: hashtags.length ? hashtags.join("\n") : "",
      headline: headline?.trim() ? headline.trim() : undefined,
      subline: subline?.trim() ? subline.trim() : undefined,
      titleStyle,
      bodyStyle: bodyBoxStyle,
      badgeStyle,
      companyStyle,
      headlineStyle,
      sublineStyle,
      canvasPreset,
    };
  }, [
    isPdf,
    payload,
    sessionProfileImage,
    sessionName,
    sessionRole,
    productImage,
    images,
    productOrientation,
    productAlign,
    imageLayout,
    framePresetId,
    frameSlotsState,
    mediaBox,
    badgeText,
    badgeHtml,
    badgeMarks,
    badgeBlocks,
    title,
    titleHtml,
    titleMarks,
    titleBlocks,
    company,
    companyHtml,
    companyMarks,
    companyBlocks,
    body,
    bodyHtml,
    bodyMarks,
    bodyBlocks,
    caption,
    captionHtml,
    captionMarks,
    captionBlocks,
    captionStyle,
    normalizedLink,
    hashtags,
    headline,
    subline,
    titleStyle,
    bodyBoxStyle,
    badgeStyle,
    companyStyle,
    headlineStyle,
    sublineStyle,
    canvasPreset,
  ]);

  useEffect(() => {
    return () => {
      if (finalUrl) URL.revokeObjectURL(finalUrl);
    };
  }, [finalUrl]);

  function resetMessages() {
    setSuccessMsg("");
    setErrorMsg("");
  }

  function validate() {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = "*";
    if (!body.trim()) next.body = "*";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function downloadPDF() {
    resetMessages();

    if (!validate()) {
      setErrorMsg("please fill all of the Fields");
      return;
    }

    setLoadingPdf(true);
    try {
      const legacyProductImageBase64 =
        productImageFile != null ? await fileToBase64(productImageFile) : undefined;

      const imagePayload: ImagePayloadItem[] = images.map((img) => ({
        id: img.id,
        src: img.src,
        base64: img.base64,
        orientation: img.orientation,
        frameSlotId: img.frameSlotId,
        x: img.x,
        y: img.y,
        w: img.w,
        h: img.h,
        rotation: img.rotation,
        radius: img.radius ?? 20,
        cropX: img.cropX ?? 50,
        cropY: img.cropY ?? 50,
        cropScale: img.cropScale ?? 1,
      }));

      const data: PdfPayload = {
        profileImage: sessionProfileImage,
        name: sessionName,
        role: sessionRole,
        productImage: productImage?.trim() ? productImage : undefined,
        productOrientation,
        productAlign,
        imageLayout,
        framePresetId,
        frameSlots: frameSlotsState,
        productImageBase64: legacyProductImageBase64,
        mediaBox,
        images: imagePayload,
        videoRadius: videos[0]?.radius ?? 20,
        badgeText: badgeText?.trim() ? badgeText.trim() : undefined,
        badgeHtml,
        badgeMarks,
        badgeBlocks,
        badgeStyle,
        linkTitle: title?.trim() ? title.trim() : "",
        titleHtml,
        titleMarks,
        titleBlocks,
        company: company?.trim() ? company.trim() : "",
        companyHtml,
        companyMarks,
        companyBlocks,
        bodyText: body ?? "",
        bodyHtml,
        bodyMarks,
        bodyBlocks,
        captionText: caption ?? "",
        captionHtml,
        captionMarks,
        captionBlocks,
        captionStyle,
        titleStyle,
        bodyStyle: bodyBoxStyle,
        companyStyle,
        headlineStyle,
        sublineStyle,
        headline: headline?.trim() ? headline.trim() : undefined,
        subline: subline?.trim() ? subline.trim() : undefined,
        link: link.length ? link.join("\n") : "",
        hashtags: hashtags.length ? hashtags.join("\n") : "",
        canvasPreset,
      };

      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "PDF API failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "linkedin-template-a.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setSuccessMsg("PDF is created successfully.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "PDF is not created");
    } finally {
      setLoadingPdf(false);
    }
  }

  async function generateFinal() {
    resetMessages();

    if (!validate()) {
      setErrorMsg("Please fill in the form completely!");
      return;
    }
    if (!videos.length) {
      setErrorMsg("first choose a Video!");
      return;
    }

    setFinalLoading(true);
    try {
      const imagePayload: ImagePayloadItem[] = images.map((img) => ({
        id: img.id,
        src: img.src,
        base64: img.base64,
        orientation: img.orientation,
        frameSlotId: img.frameSlotId,
        x: img.x,
        y: img.y,
        w: img.w,
        h: img.h,
        rotation: img.rotation,
        radius: img.radius ?? 20,
        cropX: img.cropX ?? 50,
        cropY: img.cropY ?? 50,
        cropScale: img.cropScale ?? 1,
      }));

      const form = new FormData();
      const videoPayload: VideoPayloadItem[] = videos.map((video) => {
        const fileKey = `video:${video.id}`;
        form.append(fileKey, video.file);
        return {
          id: video.id,
          fileKey,
          x: video.x,
          y: video.y,
          w: video.w,
          h: video.h,
          radius: video.radius,
          zIndex: video.zIndex,
        };
      });

      form.append(
        "data",
        JSON.stringify({
          profileImage: sessionProfileImage,
          name: sessionName,
          role: sessionRole,
          linkTitle: title,
          titleHtml,
          titleMarks,
          titleBlocks,
          bodyText: body,
          bodyHtml,
          bodyMarks,
          bodyBlocks,
          headline,
          subline,
          badgeText,
          badgeHtml,
          badgeMarks,
          badgeBlocks,
          badgeStyle,
          company,
          companyHtml,
          companyMarks,
          companyBlocks,
          link: link.length ? link.join("\n") : "",
          mediaBox,
          images: imagePayload,
          videos: videoPayload,
          titleStyle,
          bodyStyle: bodyBoxStyle,
          companyStyle,
          headlineStyle,
          sublineStyle,
          canvasPreset,
          productOrientation,
          productAlign,
          imageLayout,
          framePresetId,
          frameSlots: frameSlotsState,
        }),
      );

      const res = await fetch("/api/video/final", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setFinalUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setSuccessMsg("final.mp4 is created!");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "the creation failed.");
    } finally {
      setFinalLoading(false);
    }
  }

  return {
    effective,
    finalUrl,
    finalLoading,
    loadingPdf,
    successMsg,
    errorMsg,
    downloadPDF,
    generateFinal,
  };
}
