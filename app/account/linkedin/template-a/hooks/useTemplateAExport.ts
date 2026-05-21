"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveFrameSlots } from "@/app/lib/imageLayouts";
import type { FieldErrors, ImageItem, ImagePayloadItem, MediaBox, PdfPayload, SessionUser, TextMark, BoxTextStyle } from "../lib/templateA.types";
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
  badgeMarks: TextMark[];
  badgeStyle: BoxTextStyle;
  title: string;
  titleMarks: TextMark[];
  company: string;
  companyMarks: TextMark[];
  body: string;
  bodyMarks: TextMark[];
  captionMarks: TextMark[];
  link: string[];
  normalizedLink?: string;
  headline: string;
  subline: string;
  titleStyle: BoxTextStyle;
  bodyBoxStyle: BoxTextStyle;
  companyStyle: BoxTextStyle;
  headlineStyle: BoxTextStyle;
  sublineStyle: BoxTextStyle;
  canvasPreset: "linkedin" | "instagram" | "instagramStory";
  videoFile: File | null;
  videoBox: MediaBox;
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
  badgeMarks,
  badgeStyle,
  title,
  titleMarks,
  company,
  companyMarks,
  body,
  bodyMarks,
  captionMarks,
  link,
  normalizedLink,
  headline,
  subline,
  titleStyle,
  bodyBoxStyle,
  companyStyle,
  headlineStyle,
  sublineStyle,
  canvasPreset,
  videoFile,
  videoBox,
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
        badgeMarks: payload.badgeMarks ?? [],
        linkTitle: payload.linkTitle ?? "",
        titleMarks: payload.titleMarks ?? [],
        company: payload.company ?? "",
        companyMarks: payload.companyMarks ?? [],
        bodyText: payload.bodyText ?? "",
        bodyMarks: payload.bodyMarks ?? [],
        linkUrl: raw.trim() ? raw : undefined,
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
      badgeMarks,
      linkTitle: title || "",
      titleMarks,
      company: company || "",
      companyMarks,
      bodyText: body || "",
      bodyMarks,
      linkUrl: normalizedLink,
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
    badgeMarks,
    title,
    titleMarks,
    company,
    companyMarks,
    body,
    bodyMarks,
    normalizedLink,
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
        badgeText: badgeText?.trim() ? badgeText.trim() : undefined,
        badgeMarks,
        badgeStyle,
        linkTitle: title?.trim() ? title.trim() : "",
        titleMarks,
        company: company?.trim() ? company.trim() : "",
        companyMarks,
        bodyText: body ?? "",
        bodyMarks,
        captionMarks,
        titleStyle,
        bodyStyle: bodyBoxStyle,
        companyStyle,
        headlineStyle,
        sublineStyle,
        headline: headline?.trim() ? headline.trim() : undefined,
        subline: subline?.trim() ? subline.trim() : undefined,
        link: link.length ? link.join("\n") : "",
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
    if (!videoFile) {
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
        cropX: img.cropX ?? 50,
        cropY: img.cropY ?? 50,
        cropScale: img.cropScale ?? 1,
      }));

      const form = new FormData();
      form.append(
        "data",
        JSON.stringify({
          profileImage: sessionProfileImage,
          name: sessionName,
          role: sessionRole,
          linkTitle: title,
          titleMarks,
          bodyText: body,
          bodyMarks,
          headline,
          subline,
          badgeText,
          badgeMarks,
          badgeStyle,
          company,
          companyMarks,
          link: link.length ? link.join("\n") : "",
          mediaBox,
          images: imagePayload,
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
      form.append("videoBox", JSON.stringify(videoBox));
      form.append("video", videoFile);

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
