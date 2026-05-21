"use client";

import LinkedInEditorBaseClient from "@/app/components/templates/linkedin-shared/LinkedInEditorBaseClient";
import LinkedInEditorLayout from "@/app/components/templates/linkedin-shared/LinkedInEditorLayout";
import { LinkedInToolbox } from "@/app/components/templates/linkedin-shared/ToolBox";
import LinkedInTemplate2 from "@/app/components/templates/linkedin/LinkedInTemplate2";
import {
  useMemo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { type LexicalInlineEditorHandle } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import {
  getFirstAvailableFrameSlotId,
  getHeaderHeightForPreset,
  resolveFrameSlots,
  type FrameSlot,
  type ImageLayoutMode,
} from "@/app/lib/imageLayouts";
import { CANVAS_PRESETS, getCanvasFrame } from "@/app/lib/renderUtils";
import TemplateAExportPanel from "./components/TemplateAExportPanel";
import TemplateAPreview from "./components/TemplateAPreview";
import useTemplateAExport from "./hooks/useTemplateAExport";
import useTemplateATextState from "./hooks/useTemplateATextState";
import type {
  ActiveRichTextEditor,
  BoxTextStyle,
  CanvasPresetKey,
  DragMode,
  EditField,
  EditorTextField,
  FieldErrors,
  ImageClipboardPayload,
  ImageItem,
  MediaBox,
  PdfPayload,
  RichEditField,
  RichStyle,
  SelectableId,
  TemplateAClientProps,
  TextMark,
  VideoClipboardPayload,
  VideoSnapshot,
} from "./lib/templateA.types";
import {
  DEFAULT_FRAME_PRESET_ID,
  angleFromCenter,
  arrangeImagesForLayout,
  clamp,
  fileToBase64,
  getLineBounds,
  getPdfModeAndPayload,
  imageToViewportRect,
  isEditableTarget,
  isPreviewSelectableId,
  normalizeAngle,
  safePx,
  uid,
} from "./lib/templateA.utils";

type LinePrefixChange = {
  oldLineStart: number;
  oldLineEnd: number;
  oldPrefixLength: number;
  newPrefixLength: number;
};

export default function TemplateAClient({ sessionUser }: TemplateAClientProps) {
  const [{ isPdf, payload }, setPdfCtx] = useState<{
    isPdf: boolean;
    payload: PdfPayload | null;
  }>(() => ({ isPdf: false, payload: null }));

  useEffect(() => {
    setPdfCtx(getPdfModeAndPayload());
  }, []);

  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageClipboardRef = useRef<ImageClipboardPayload | null>(null);
  const videoClipboardRef = useRef<VideoClipboardPayload>(null);
  const videoUndoStackRef = useRef<VideoSnapshot[]>([]);
  const pendingVideoBoxRef = useRef<MediaBox | null>(null);

  const [canvasPreset, setCanvasPreset] = useState<CanvasPresetKey>("linkedin");

  const [selectedId, setSelectedId] = useState<SelectableId | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [selectedFrameSlotId, setSelectedFrameSlotId] = useState<string | null>(
    null,
  );
  const [, setHoverFrameSlotId] = useState<string | null>(null);
  const [objectLayers, setObjectLayers] = useState({
    images: {} as Record<string, number>,
    video: 1,
    next: 2,
  });

  const [editField, setEditField] = useState<EditField>(null);
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const titleEditRef = useRef<LexicalInlineEditorHandle | null>(null);
  const bodyEditRef = useRef<LexicalInlineEditorHandle | null>(null);
  const companyEditRef = useRef<LexicalInlineEditorHandle | null>(null);
  const badgeEditRef = useRef<LexicalInlineEditorHandle | null>(null);
  const richEditSelectionRef = useRef<
    Record<RichEditField, { start: number; end: number }>
  >({
    title: { start: 0, end: 0 },
    body: { start: 0, end: 0 },
    company: { start: 0, end: 0 },
    badge: { start: 0, end: 0 },
  });
  const [editStyle, setEditStyle] = useState<CSSProperties>({});

  const [mediaBox, setMediaBox] = useState<MediaBox>({
    x: 420,
    y: 240,
    w: 240,
    h: 240,
  });

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const dragStateRef = useRef<{
    mode: DragMode | null;
    startClientX: number;
    startClientY: number;
    startImage: ImageItem | null;
    startVideoBox?: MediaBox | null;
    mediaKind?: "image" | "video";
    startFrameSlot?: FrameSlot | null;
    startAngle: number;
    centerX: number;
    centerY: number;
    hoverFrameSlotId?: string | null;
  } | null>(null);
  const suppressNextCanvasClickRef = useRef(false);

  const [previewContentHeight, setPreviewContentHeight] = useState<number>(
    getCanvasFrame("linkedin").h,
  );

  const [, setErrors] = useState<FieldErrors>({});
  const {
    headline,
    setHeadline,
    subline,
    setSubline,
    badgeText,
    setBadgeText,
    setBadgeTextValue,
    title,
    setTitle,
    setTitleValue,
    body,
    _setBody,
    setBody,
    caption,
    _setCaption,
    setCaption,
    titleMarks,
    setTitleMarks,
    badgeMarks,
    setBadgeMarks,
    companyMarks,
    setCompanyMarks,
    bodyMarks,
    setBodyMarks,
    captionMarks,
    setCaptionMarks,
    link,
    setLink,
    linkInput,
    setLinkInput,
    company,
    setCompany,
    setCompanyValue,
    activeField,
    setActiveField,
    copied,
    badgeRef,
    titleRef,
    companyRef,
    captionRef,
    bodyRef,
    titleStyle,
    setTitleStyle,
    bodyBoxStyle,
    setBodyBoxStyle,
    badgeStyle,
    setBadgeStyle,
    companyStyle,
    setCompanyStyle,
    headlineStyle,
    setHeadlineStyle,
    sublineStyle,
    setSublineStyle,
    normalizedLink,
    getRichEditText,
    getRichEditMarks,
    handleAddLink,
    copyCaption: copyCaptionText,
  } = useTemplateATextState();

  const [productImage, setProductImage] = useState<string>("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productOrientation, setProductOrientation] = useState<
    "landscape" | "portrait"
  >("landscape");
  const [productAlign, setProductAlign] = useState<"left" | "center" | "right">(
    "center",
  );
  const [imageLayout, setImageLayout] = useState<ImageLayoutMode>("manual");
  const [framePresetId, setFramePresetId] = useState<string>(
    DEFAULT_FRAME_PRESET_ID,
  );
  const [frameSlotsState, setFrameSlotsState] = useState<FrameSlot[]>(() =>
    resolveFrameSlots(DEFAULT_FRAME_PRESET_ID, "linkedin"),
  );

  const [images, setImages] = useState<ImageItem[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoBox, setVideoBox] = useState<MediaBox>({
    x: 420,
    y: 240,
    w: 240,
    h: 240,
  });
  const hasVideo = !!videoFile;

  const {
    effective,
    finalUrl,
    finalLoading,
    loadingPdf,
    successMsg,
    errorMsg,
    downloadPDF,
    generateFinal,
  } = useTemplateAExport({
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
  });

  const currentCanvas = CANVAS_PRESETS[canvasPreset];
  const previewViewportW = 560;
  const previewScale = previewViewportW / currentCanvas.w;
  const previewViewportH = Math.round(previewContentHeight * previewScale);
  const videoPreviewZIndex = objectLayers.video;
  const editorMediaImages = useMemo(
    () =>
      images.map((img, index) => {
        const slot =
          imageLayout === "frame" && img.frameSlotId
            ? frameSlotsState.find((item) => item.id === img.frameSlotId)
            : null;

        return {
          ...img,
          radius: slot?.radius ?? 20,
          clipPath: slot?.clipPath,
          rotation: slot?.rotation ?? img.rotation ?? 0,
          zIndex: objectLayers.images[img.id] ?? 2 + index,
        };
      }),
    [frameSlotsState, imageLayout, images, objectLayers.images],
  );

  function bringImageObjectToFront(imageId: string) {
    setObjectLayers((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [imageId]: prev.next,
      },
      next: prev.next + 1,
    }));
  }

  function bringVideoObjectToFront() {
    setObjectLayers((prev) => ({
      ...prev,
      video: prev.next,
      next: prev.next + 1,
    }));
  }

  function getInitialVideoBox(): MediaBox {
    const source = images[0] ?? null;
    const offset = 40;

    if (imageLayout === "frame") {
      const slot =
        (source?.frameSlotId
          ? frameSlotsState.find((item) => item.id === source.frameSlotId)
          : null) ?? frameSlotsState[0];

      if (slot) {
        return {
          x: clamp(slot.x + offset, 0, Math.max(0, currentCanvas.w - slot.w)),
          y: clamp(slot.y + offset, 0, Math.max(0, currentCanvas.h - slot.h)),
          w: slot.w,
          h: slot.h,
        };
      }
    }

    const box = source ?? mediaBox;

    return {
      x: clamp(box.x + offset, 0, Math.max(0, currentCanvas.w - box.w)),
      y: clamp(box.y + offset, 0, Math.max(0, currentCanvas.h - box.h)),
      w: box.w,
      h: box.h,
    };
  }

  function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  function calcFitSize(w: number, h: number, maxW: number, maxH: number) {
    const r = Math.min(maxW / w, maxH / h, 1);
    return { w: Math.round(w * r), h: Math.round(h * r) };
  }

  function clampImageBox(
    item: Pick<ImageItem, "x" | "y" | "w" | "h">,
    canvasW: number,
    canvasH: number,
  ) {
    const minW = 60;
    const minH = 60;

    const w = clamp(item.w, minW, canvasW);
    const h = clamp(item.h, minH, canvasH);
    const x = clamp(item.x, 0, Math.max(0, canvasW - w));
    const y = clamp(item.y, 0, Math.max(0, canvasH - h));

    return { x, y, w, h };
  }

  async function resizeImageFile(file: File): Promise<File> {
    const img = await loadImageFromFile(file);
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;

    const landscape = {
      maxW: 1600,
      maxH: 1400,
      mime: "image/jpeg" as const,
      quality: 0.92,
    };

    const portrait = {
      maxW: 1400,
      maxH: 1800,
      mime: "image/jpeg" as const,
      quality: 0.92,
    };

    const preset = w0 >= h0 ? landscape : portrait;

    const { w, h } = calcFitSize(w0, h0, preset.maxW, preset.maxH);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        preset.mime,
        preset.quality,
      );
    });

    return new File([blob], `product-resized.jpg`, { type: preset.mime });
  }

  function getSelectedImage() {
    if (!selectedImageId) return null;
    return images.find((img) => img.id === selectedImageId) ?? null;
  }

  function getImageById(imageId: string) {
    return images.find((img) => img.id === imageId) ?? null;
  }

  function updateSelectedImage(updater: (prev: ImageItem) => ImageItem) {
    if (!selectedImageId) return;
    setImages((prev) =>
      prev.map((img) => (img.id === selectedImageId ? updater(img) : img)),
    );
  }

  function syncLegacyFromFirstImage(nextImages: ImageItem[]) {
    const first = nextImages[0];
    if (!first) {
      setProductImage("");
      setProductImageFile(null);
      return;
    }

    setProductImage(first.src);
    setProductOrientation(first.orientation);
    setMediaBox({ x: first.x, y: first.y, w: first.w, h: first.h });
  }

  function applyImageLayout(
    nextLayout: ImageLayoutMode,
    sourceImages: ImageItem[],
    align: "left" | "center" | "right" = productAlign,
  ) {
    return arrangeImagesForLayout(
      sourceImages,
      nextLayout,
      canvasPreset,
      align,
      framePresetId,
      frameSlotsState,
    );
  }

  function setImageLayoutMode(nextLayout: ImageLayoutMode) {
    setImageLayout(nextLayout);

    if (nextLayout === "manual") {
      return;
    }

    setImages((prev) => {
      const next = applyImageLayout(nextLayout, prev);
      syncLegacyFromFirstImage(next);
      return next;
    });
  }

  function setFramePresetValue(nextFramePresetId: string) {
    setFramePresetId(nextFramePresetId);
    setSelectedFrameSlotId(null);
    const nextFrameSlots = resolveFrameSlots(nextFramePresetId, canvasPreset);
    setFrameSlotsState(nextFrameSlots);

    setImages((prev) => {
      const next = arrangeImagesForLayout(
        prev,
        imageLayout,
        canvasPreset,
        productAlign,
        nextFramePresetId,
        nextFrameSlots,
      );
      syncLegacyFromFirstImage(next);
      return next;
    });
  }

  async function onPickProductImage(file: File | null) {
    if (!file) return;

    const resized = await resizeImageFile(file);
    const img = await loadImageFromFile(resized);
    const base64 = await fileToBase64(resized);

    const orientation: "landscape" | "portrait" =
      img.naturalWidth >= img.naturalHeight ? "landscape" : "portrait";

    const fit = calcFitSize(
      img.naturalWidth,
      img.naturalHeight,
      currentCanvas.w * 0.6,
      currentCanvas.h * 0.5,
    );

    const nextImage: ImageItem = {
      id: uid(),
      src: URL.createObjectURL(resized),
      base64,
      orientation,
      frameSlotId: undefined,
      x: 200,
      y: 300,
      w: fit.w,
      h: fit.h,
      rotation: 0,
      cropX: 50,
      cropY: 50,
      cropScale: 1,
    };

    const targetFrameSlotId =
      imageLayout === "frame"
        ? (selectedFrameSlotId ??
          getSelectedImage()?.frameSlotId ??
          getFirstAvailableFrameSlotId(
            framePresetId,
            canvasPreset,
            images.map((img) => img.frameSlotId).filter(Boolean) as string[],
          ))
        : undefined;

    setImages((prev) => {
      if (imageLayout === "frame") {
        const existingIndex = prev.findIndex(
          (img) => img.frameSlotId === targetFrameSlotId,
        );
        const nextWithSlot = { ...nextImage, frameSlotId: targetFrameSlotId };
        const raw =
          existingIndex >= 0
            ? prev.map((img, index) =>
                index === existingIndex ? nextWithSlot : img,
              )
            : [...prev, nextWithSlot];
        const next = applyImageLayout(imageLayout, raw);
        syncLegacyFromFirstImage(next);
        return next;
      }

      const next = applyImageLayout(imageLayout, [...prev, nextImage]);
      syncLegacyFromFirstImage(next);
      return next;
    });

    setProductImageFile(resized);
    setSelectedId("productImage");
    setSelectedImageId(nextImage.id);
    setSelectedFrameSlotId(targetFrameSlotId ?? null);
    setSelectedRect(
      targetFrameSlotId ? getFrameSlotRect(targetFrameSlotId) : null,
    );
    bringImageObjectToFront(nextImage.id);
  }

  function removeSelectedImage() {
    if (!selectedImageId) return;
    const imageId = selectedImageId;
    setImages((prev) => {
      const next = applyImageLayout(
        imageLayout,
        prev.filter((img) => img.id !== imageId),
      );
      syncLegacyFromFirstImage(next);
      return next;
    });
    setObjectLayers((prev) => {
      const imagesById = { ...prev.images };
      delete imagesById[imageId];
      return { ...prev, images: imagesById };
    });
    setSelectedImageId(null);
    setSelectedId(null);
    setSelectedRect(null);
  }

  function copySelectedImageToClipboard() {
    const current = getSelectedImage();
    if (!current) return;
    imageClipboardRef.current = {
      type: "image",
      image: { ...current },
    };
  }

  function cutSelectedImageToClipboard() {
    copySelectedImageToClipboard();
    removeSelectedImage();
  }

  function pasteImageFromClipboard() {
    const clip = imageClipboardRef.current;
    if (!clip || clip.type !== "image") return;

    const src = clip.image;
    const pasted: ImageItem = {
      ...src,
      id: uid(),
      x: clamp(src.x + 24, 0, Math.max(0, currentCanvas.w - src.w)),
      y: clamp(src.y + 24, 0, Math.max(0, currentCanvas.h - src.h)),
    };

    setImages((prev) => {
      const next = applyImageLayout(imageLayout, [...prev, pasted]);
      syncLegacyFromFirstImage(next);
      return next;
    });
    setSelectedId("productImage");
    setSelectedImageId(pasted.id);
    bringImageObjectToFront(pasted.id);
  }

  function getFrameSlotRect(slotId: string) {
    const slot = frameSlotsState.find((item) => item.id === slotId);
    if (!slot) return null;
    return new DOMRect(slot.x, slot.y, slot.w, slot.h);
  }

  function getFrameSlotAtPoint(x: number, y: number) {
    return frameSlotsState.find(
      (slot) =>
        x >= slot.x &&
        x <= slot.x + slot.w &&
        y >= slot.y &&
        y <= slot.y + slot.h,
    );
  }

  function getSelectedFrameSlot() {
    if (!selectedFrameSlotId) return null;
    return (
      frameSlotsState.find((slot) => slot.id === selectedFrameSlotId) ?? null
    );
  }

  function clampFrameSlotBox(slot: Pick<FrameSlot, "x" | "y" | "w" | "h">) {
    const headerHeight = getHeaderHeightForPreset(canvasPreset);
    const minW = 120;
    const minH = 90;
    const w = clamp(slot.w, minW, currentCanvas.w);
    const h = clamp(slot.h, minH, headerHeight);
    const x = clamp(slot.x, 0, Math.max(0, currentCanvas.w - w));
    const y = clamp(slot.y, 90, Math.max(90, headerHeight - h));
    return { x, y, w, h };
  }

  function swapImageIntoFrameSlot(imageId: string, targetSlotId: string) {
    setImages((prev) => {
      const current = prev.find((img) => img.id === imageId);
      if (!current) return prev;

      const sourceSlotId = current.frameSlotId;
      const occupant = prev.find(
        (img) => img.id !== imageId && img.frameSlotId === targetSlotId,
      );

      const nextRaw = prev.map((img) => {
        if (img.id === imageId) {
          return { ...img, frameSlotId: targetSlotId };
        }
        if (occupant && img.id === occupant.id) {
          return { ...img, frameSlotId: sourceSlotId };
        }
        return img;
      });

      const next = applyImageLayout("frame", nextRaw);
      syncLegacyFromFirstImage(next);
      return next;
    });

    setSelectedImageId(imageId);
    setSelectedFrameSlotId(targetSlotId);
    const rect = getFrameSlotRect(targetSlotId);
    if (rect) setSelectedRect(rect);
  }

  function updateSelectedFrameSlot(updater: (prev: FrameSlot) => FrameSlot) {
    if (!selectedFrameSlotId) return;

    setFrameSlotsState((prev) => {
      const nextSlots = prev.map((slot) =>
        slot.id === selectedFrameSlotId ? updater(slot) : slot,
      );
      setImages((currentImages) => {
        const nextImages = arrangeImagesForLayout(
          currentImages,
          "frame",
          canvasPreset,
          productAlign,
          framePresetId,
          nextSlots,
        );
        syncLegacyFromFirstImage(nextImages);
        return nextImages;
      });
      return nextSlots;
    });
  }

  function assignSelectedImageToFrameSlot(slotId: string) {
    if (!selectedImageId) {
      setSelectedFrameSlotId(slotId);
      const rect = getFrameSlotRect(slotId);
      setSelectedId("frameSlot");
      setSelectedRect(rect);
      return;
    }

    setImages((prev) => {
      const next = applyImageLayout(
        imageLayout,
        prev.map((img) =>
          img.id === selectedImageId ? { ...img, frameSlotId: slotId } : img,
        ),
      );
      syncLegacyFromFirstImage(next);
      return next;
    });

    setSelectedFrameSlotId(slotId);
    setSelectedId("productImage");
    const rect = getFrameSlotRect(slotId);
    setSelectedRect(rect);
  }

  function clearSelection() {
    setSelectedId(null);
    setSelectedRect(null);
    setEditField(null);
    setSelectedImageId(null);
    setSelectedFrameSlotId(null);
  }

  function computeRectRelativeToStage(targetEl: HTMLElement) {
    const stage = stageRef.current;
    if (!stage) return null;

    const r1 = targetEl.getBoundingClientRect();
    const r0 = stage.getBoundingClientRect();

    const x = (r1.left - r0.left) / previewScale;
    const y = (r1.top - r0.top) / previewScale;
    const w = r1.width / previewScale;
    const h = r1.height / previewScale;

    return new DOMRect(x, y, w, h);
  }

  function remeasureBadgeSelection() {
    const stage = stageRef.current;
    const badgeTextEl = stage?.querySelector(
      '[data-select="badge"]',
    ) as HTMLElement | null;
    if (!badgeTextEl) return;

    const rect = computeRectRelativeToStage(badgeTextEl);
    if (rect) setSelectedRect(rect);
  }

  function clientPointToStage(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) return null;

    const rect = stage.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / previewScale,
      y: (clientY - rect.top) / previewScale,
    };
  }

  function getSelectableTarget(target: EventTarget | null) {
    if (!target) return null;
    if (target instanceof HTMLElement) {
      return target.closest("[data-select]") as HTMLElement | null;
    }
    if (target instanceof Node) {
      return target.parentElement?.closest(
        "[data-select]",
      ) as HTMLElement | null;
    }
    return null;
  }

  function isMediaSelectionUiTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;

    return Boolean(
      target.closest('[data-media-selection-ui="true"]') ||
      target.closest('[data-resize-handle="true"]'),
    );
  }

  function getBadgeTextTargetAtPoint(clientX: number, clientY: number) {
    if (!badgeText.trim()) return null;

    const stage = stageRef.current;
    const badgeTextEl = stage?.querySelector(
      '[data-select="badge"]',
    ) as HTMLElement | null;
    if (!badgeTextEl) return null;

    const rect = badgeTextEl.getBoundingClientRect();
    const isInside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    return isInside ? badgeTextEl : null;
  }

  function onCanvasClick(e: React.MouseEvent) {
    if (suppressNextCanvasClickRef.current) {
      suppressNextCanvasClickRef.current = false;
      return;
    }

    if (isMediaSelectionUiTarget(e.target)) {
      return;
    }

    const t =
      getBadgeTextTargetAtPoint(e.clientX, e.clientY) ??
      getSelectableTarget(e.target);

    if (!t) {
      clearSelection();
      return;
    }

    const rawId = t.getAttribute("data-select") || "";
    if (!isPreviewSelectableId(rawId)) {
      clearSelection();
      return;
    }

    const id = rawId;
    setSelectedId(id);

    if (id === "productImage") {
      const imageId = t.getAttribute("data-image-id");
      if (imageId) {
        bringImageObjectToFront(imageId);
        setSelectedImageId(imageId);
        const img = images.find((x) => x.id === imageId);
        if (img) {
          setSelectedFrameSlotId(img.frameSlotId ?? null);
          setSelectedRect(new DOMRect(img.x, img.y, img.w, img.h));
        }
      }
    } else if (id === "frameSlot") {
      const frameSlotId = t.getAttribute("data-frame-slot-id");
      setSelectedImageId(null);
      if (frameSlotId) {
        setSelectedFrameSlotId(frameSlotId);
        setSelectedRect(getFrameSlotRect(frameSlotId));
      }
    } else if (id === "video") {
      bringVideoObjectToFront();
      const rect = computeRectRelativeToStage(t);
      setSelectedRect(rect);
      setSelectedImageId(null);
      setSelectedFrameSlotId(null);
    } else {
      const rect = computeRectRelativeToStage(t);
      setSelectedRect(rect);
      setSelectedImageId(null);
      setSelectedFrameSlotId(null);
    }

    if (editField && id !== editField) setEditField(null);
  }

  function selectImageObject(image: ImageItem) {
    bringImageObjectToFront(image.id);
    setSelectedId("productImage");
    setSelectedImageId(image.id);
    setSelectedFrameSlotId(image.frameSlotId ?? null);
    setSelectedRect(new DOMRect(image.x, image.y, image.w, image.h));
    if (editField) setEditField(null);
  }

  function selectVideoObject() {
    bringVideoObjectToFront();
    setSelectedId("video");
    setSelectedImageId(null);
    setSelectedFrameSlotId(null);
    setSelectedRect(
      new DOMRect(videoBox.x, videoBox.y, videoBox.w, videoBox.h),
    );
    if (editField) setEditField(null);
  }

  function createVideoSnapshot(): VideoSnapshot {
    return {
      videoFile,
      videoPreviewUrl,
      videoBox: { ...videoBox },
      videoZIndex: objectLayers.video,
    };
  }

  function pushVideoUndoSnapshot() {
    videoUndoStackRef.current.push(createVideoSnapshot());
    if (videoUndoStackRef.current.length > 30) {
      videoUndoStackRef.current.shift();
    }
  }

  function restoreVideoSnapshot(snapshot: VideoSnapshot) {
    setVideoBox({ ...snapshot.videoBox });
    setObjectLayers((prev) => ({
      ...prev,
      video: snapshot.videoZIndex,
      next: Math.max(prev.next, snapshot.videoZIndex + 1),
    }));

    setVideoFile(snapshot.videoFile);

    if (snapshot.videoFile) {
      pendingVideoBoxRef.current = { ...snapshot.videoBox };
      setSelectedId("video");
      setSelectedImageId(null);
      setSelectedFrameSlotId(null);
      setSelectedRect(
        new DOMRect(
          snapshot.videoBox.x,
          snapshot.videoBox.y,
          snapshot.videoBox.w,
          snapshot.videoBox.h,
        ),
      );
      return;
    }

    pendingVideoBoxRef.current = null;
    setVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (selectedId === "video") {
      setSelectedId(null);
      setSelectedRect(null);
    }
  }

  function removeVideoObject() {
    setVideoFile(null);
    setVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSelectedId(null);
    setSelectedRect(null);
    setSelectedImageId(null);
    setSelectedFrameSlotId(null);
  }

  function copySelectedVideo() {
    if (selectedId !== "video" || !videoFile) return;

    imageClipboardRef.current = null;
    videoClipboardRef.current = {
      type: "video",
      snapshot: createVideoSnapshot(),
    };
  }

  function cutSelectedVideo() {
    if (selectedId !== "video" || !videoFile) return;

    pushVideoUndoSnapshot();
    copySelectedVideo();
    removeVideoObject();
  }

  function deleteSelectedVideo() {
    if (selectedId !== "video" || !videoFile) return;

    pushVideoUndoSnapshot();
    removeVideoObject();
  }

  function pasteVideoFromClipboard() {
    const item = videoClipboardRef.current;
    if (!item || item.type !== "video" || !item.snapshot.videoFile) return;

    pushVideoUndoSnapshot();

    const snapshot = item.snapshot;
    const nextBox = clampImageBox(
      {
        ...snapshot.videoBox,
        x: snapshot.videoBox.x + 24,
        y: snapshot.videoBox.y + 24,
      },
      currentCanvas.w,
      currentCanvas.h,
    );

    pendingVideoBoxRef.current = nextBox;
    setVideoBox(nextBox);
    setVideoFile(snapshot.videoFile);
    bringVideoObjectToFront();
    setSelectedId("video");
    setSelectedImageId(null);
    setSelectedFrameSlotId(null);
    setSelectedRect(new DOMRect(nextBox.x, nextBox.y, nextBox.w, nextBox.h));
  }

  function undoVideoAction() {
    const previous = videoUndoStackRef.current.pop();
    if (!previous) return;

    restoreVideoSnapshot(previous);
  }

  function isRichEditField(
    field: EditorTextField | EditField | null,
  ): field is RichEditField {
    return (
      field === "body" ||
      field === "title" ||
      field === "company" ||
      field === "badge"
    );
  }

  function startRichTextEdit(field: RichEditField, targetEl: HTMLElement) {
    setEditField(field);
    setActiveField(field);
    setSelectedId(field);

    const rect = computeRectRelativeToStage(targetEl);
    setSelectedRect(rect);

    const cs = window.getComputedStyle(targetEl);
    const fontSize = safePx(
      cs.fontSize,
      field === "title"
        ? 34
        : field === "badge"
          ? 20
          : field === "company"
            ? 18
            : 16,
    );
    const lineHeight =
      cs.lineHeight === "normal"
        ? Math.round(fontSize * 1.35)
        : safePx(cs.lineHeight, Math.round(fontSize * 1.35));

    setEditStyle({
      fontFamily: cs.fontFamily || "system-ui",
      fontSize,
      fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing,
      lineHeight: `${lineHeight}px`,
      textAlign: (cs.textAlign as CSSProperties["textAlign"]) || "left",
      padding: "0",
      margin: 0,
      color: cs.color || "#111827",
      background: "transparent",
      borderRadius: 0,
    });
  }

  function onCanvasDoubleClick(e: React.MouseEvent) {
    const t =
      getBadgeTextTargetAtPoint(e.clientX, e.clientY) ??
      getSelectableTarget(e.target);
    if (!t) return;

    const id = (t.getAttribute("data-select") || "") as SelectableId;
    if (id !== "title" && id !== "body" && id !== "badge" && id !== "company")
      return;

    if (!isRichEditField(id)) {
      selectCanvasField(id, t);
      return;
    }

    startRichTextEdit(id, t);
  }

  function selectCanvasField(
    field: "title" | "body" | "badge" | "company",
    targetEl: HTMLElement,
  ) {
    setSelectedId(field);
    setSelectedRect(computeRectRelativeToStage(targetEl));
    setSelectedImageId(null);
    setSelectedFrameSlotId(null);
    if (editField && field !== editField) setEditField(null);
  }

  function activateCanvasField(
    field: "title" | "body" | "badge" | "company",
    targetEl: HTMLElement,
  ) {
    if (!isRichEditField(field)) {
      setEditField(null);
      selectCanvasField(field, targetEl);
      return;
    }
    startRichTextEdit(field, targetEl);
  }

  useEffect(() => {
    if (!editField) return;
    requestAnimationFrame(() => {
      if (isRichEditField(editField)) {
        const text = getRichEditText(editField);
        const next = { start: text.length, end: text.length };
        richEditSelectionRef.current[editField] = next;
        const editor = getRichEditEditor(editField);
        editor?.syncContent(text, getRichEditMarks(editField));
        editor?.focus();
        const root = getRichEditRoot(editField);
        restoreContentEditableSelection(root, next);
        return;
      }
      editRef.current?.focus();
      const v = editRef.current?.value ?? "";
      editRef.current?.setSelectionRange(v.length, v.length);
    });
  }, [editField]);

  function onEditBlur(e: React.FocusEvent<HTMLElement>) {
    const currentField = editField;
    const currentTarget = e.currentTarget;
    const nextTarget = e.relatedTarget;
    const toolbar = document.querySelector('[data-lexical-toolbar="true"]');

    if (nextTarget instanceof Node) {
      if (currentTarget.contains(nextTarget)) {
        return;
      }

      if (toolbar?.contains(nextTarget)) {
        return;
      }
    }

    requestAnimationFrame(() => {
      if (!currentField) return;

      const activeElement = document.activeElement;
      const root = isRichEditField(currentField)
        ? getRichEditRoot(currentField)
        : currentTarget;

      if (activeElement instanceof Node) {
        if (root?.contains(activeElement)) {
          return;
        }

        if (toolbar?.contains(activeElement)) {
          return;
        }
      }

      const selection = window.getSelection();
      const anchorNode = selection?.anchorNode ?? null;
      if (anchorNode && root?.contains(anchorNode)) {
        return;
      }

      setEditField((prev) => (prev === currentField ? null : prev));
    });
  }

  function handleBodyBulletEnter(e: React.KeyboardEvent<HTMLElement>) {
    if (
      e.key !== "Enter" ||
      e.shiftKey ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      editField !== "body"
    ) {
      return false;
    }

    const root = getRichEditRoot("body");
    if (!root) return false;

    const selection = readContentEditableSelection("body", root);
    if (selection.start !== selection.end) return false;

    const text = getContentEditablePlainText(root);
    const { start: lineStart, end: lineEnd } = getLineBounds(
      text,
      selection.start,
    );
    const line = text.slice(lineStart, lineEnd);
    const prefixMatch = line.match(/^(\s*\u2022\s?)/);
    if (!prefixMatch) return false;

    e.preventDefault();

    const prefix = prefixMatch[1] || "  \u2022 ";
    const content = line.slice(prefix.length);
    const { marks, setMarks } = getActiveMarksState("body");

    if (!content.trim()) {
      const markerEnd = lineStart + prefix.length;
      const next = text.slice(0, lineStart) + text.slice(markerEnd);
      const nextMarks = remapMarksForLinePrefixChanges(marks, [
        {
          oldLineStart: lineStart,
          oldLineEnd: lineEnd,
          oldPrefixLength: prefix.length,
          newPrefixLength: 0,
        },
      ]);
      setFieldTextRaw("body", next);
      setMarks(nextMarks);
      syncRichEditOverlayDom(
        "body",
        nextMarks,
        { start: lineStart, end: lineStart },
        next,
      );
      return true;
    }

    const insert = `\n${prefix}`;
    const next =
      text.slice(0, selection.start) + insert + text.slice(selection.end);
    const nextCaret = selection.start + insert.length;
    const nextMarks = shiftMarksAfterTextChange(
      marks,
      selection.start,
      selection.end,
      insert.length,
    );
    setFieldTextRaw("body", next);
    setMarks(nextMarks);
    syncRichEditOverlayDom(
      "body",
      nextMarks,
      { start: nextCaret, end: nextCaret },
      next,
    );
    return true;
  }

  function onEditKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setEditField(null);
      return;
    }

    if (editField === "badge" && e.key === "Enter") {
      e.preventDefault();
      return;
    }

    if (handleBodyBulletEnter(e)) {
      return;
    }

    if (
      editField === "body" &&
      e.currentTarget instanceof HTMLTextAreaElement
    ) {
      handleNumberedListEnter("body", e);
    }
  }

  function startMediaInteraction(
    e: React.MouseEvent<HTMLDivElement>,
    mode: DragMode,
    imageOverride?: ImageItem | null,
  ) {
    const current = imageOverride ?? getSelectedImage();
    if (!current) return;

    e.preventDefault();
    e.stopPropagation();
    selectImageObject(current);

    if (imageLayout === "frame") {
      const selectedSlot = current.frameSlotId
        ? (frameSlotsState.find((slot) => slot.id === current.frameSlotId) ??
          null)
        : getSelectedFrameSlot();
      setSelectedId("productImage");
      setSelectedImageId(current.id);
      setSelectedFrameSlotId(current.frameSlotId ?? null);
      if (current.frameSlotId) {
        const rect = getFrameSlotRect(current.frameSlotId);
        if (rect) setSelectedRect(rect);
      }
      if (mode !== "move") {
        dragStateRef.current = {
          mode,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startImage: current,
          startFrameSlot: selectedSlot,
          startAngle: 0,
          centerX: 0,
          centerY: 0,
          hoverFrameSlotId: current.frameSlotId ?? null,
        };
        return;
      }
      dragStateRef.current = {
        mode: "frame-swap",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startImage: current,
        startFrameSlot: selectedSlot,
        startAngle: 0,
        centerX: 0,
        centerY: 0,
        hoverFrameSlotId: current.frameSlotId ?? null,
      };
      setHoverFrameSlotId(current.frameSlotId ?? null);
      return;
    }

    setSelectedId("productImage");
    setSelectedImageId(current.id);
    setSelectedRect(imageToViewportRect(current));
    setEditField(null);

    const centerX = current.x + current.w / 2;
    const centerY = current.y + current.h / 2;
    const stagePoint = clientPointToStage(e.clientX, e.clientY);
    const startPointerAngle = angleFromCenter(
      centerX,
      centerY,
      stagePoint?.x ?? centerX,
      stagePoint?.y ?? centerY,
    );

    dragStateRef.current = {
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startImage: current,
      startAngle: startPointerAngle,
      centerX,
      centerY,
    };
  }

  function startVideoInteraction(
    e: React.MouseEvent<HTMLDivElement>,
    mode: DragMode,
  ) {
    e.preventDefault();
    e.stopPropagation();
    selectVideoObject();
    pushVideoUndoSnapshot();

    dragStateRef.current = {
      mode,
      mediaKind: "video",
      startClientX: e.clientX,
      startClientY: e.clientY,
      startImage: null,
      startVideoBox: videoBox,
      startAngle: 0,
      centerX: 0,
      centerY: 0,
    };
  }

  function startFrameImageDrag(
    imageId: string,
    e: React.MouseEvent<HTMLDivElement>,
  ) {
    const current = getImageById(imageId);
    if (!current) return;

    setSelectedId("productImage");
    setSelectedImageId(imageId);
    setSelectedFrameSlotId(current.frameSlotId ?? null);

    if (current.frameSlotId) {
      const rect = getFrameSlotRect(current.frameSlotId);
      if (rect) setSelectedRect(rect);
    }

    startMediaInteraction(e, "move", current);
  }

  useEffect(() => {
    function onWindowMove(e: MouseEvent) {
      const drag = dragStateRef.current;
      if (!drag || !drag.mode || (!drag.startImage && !drag.startVideoBox))
        return;

      const dx = (e.clientX - drag.startClientX) / previewScale;
      const dy = (e.clientY - drag.startClientY) / previewScale;

      if (drag.mediaKind === "video" && drag.startVideoBox) {
        const start = drag.startVideoBox;
        let x = start.x;
        let y = start.y;
        let w = start.w;
        let h = start.h;

        if (drag.mode === "move") {
          const fixed = clampImageBox(
            {
              x: Math.round(start.x + dx),
              y: Math.round(start.y + dy),
              w: start.w,
              h: start.h,
            },
            currentCanvas.w,
            currentCanvas.h,
          );

          setVideoBox(fixed);
          setSelectedRect(new DOMRect(fixed.x, fixed.y, fixed.w, fixed.h));
          return;
        }

        if (
          drag.mode === "resize-e" ||
          drag.mode === "resize-ne" ||
          drag.mode === "resize-se"
        ) {
          w = start.w + dx;
        }
        if (
          drag.mode === "resize-s" ||
          drag.mode === "resize-se" ||
          drag.mode === "resize-sw"
        ) {
          h = start.h + dy;
        }
        if (
          drag.mode === "resize-w" ||
          drag.mode === "resize-nw" ||
          drag.mode === "resize-sw"
        ) {
          x = start.x + dx;
          w = start.w - dx;
        }
        if (
          drag.mode === "resize-n" ||
          drag.mode === "resize-ne" ||
          drag.mode === "resize-nw"
        ) {
          y = start.y + dy;
          h = start.h - dy;
        }

        const fixed = clampImageBox(
          {
            x: Math.round(x),
            y: Math.round(y),
            w: Math.round(w),
            h: Math.round(h),
          },
          currentCanvas.w,
          currentCanvas.h,
        );

        setVideoBox(fixed);
        setSelectedRect(new DOMRect(fixed.x, fixed.y, fixed.w, fixed.h));
        return;
      }

      const start = drag.startImage;
      if (!start) return;

      if (drag.mode === "frame-swap") {
        const stagePoint = clientPointToStage(e.clientX, e.clientY);
        const slot = stagePoint
          ? getFrameSlotAtPoint(stagePoint.x, stagePoint.y)
          : undefined;
        const nextSlotId = slot?.id ?? null;
        drag.hoverFrameSlotId = nextSlotId;
        setHoverFrameSlotId(nextSlotId);
        if (slot) {
          setSelectedRect(new DOMRect(slot.x, slot.y, slot.w, slot.h));
        }
        return;
      }

      if (imageLayout === "frame" && drag.mode === "frame-image-scale") {
        const delta = (dx + dy) * 0.01;
        updateSelectedImage((prev) => ({
          ...prev,
          cropScale: clamp((drag.startImage?.cropScale ?? 1) + delta, 1, 3),
        }));
        return;
      }

      if (imageLayout === "frame" && drag.mode === "frame-image-pan") {
        const frameSlot = drag.startFrameSlot;
        if (!frameSlot) return;

        const nextCropX = clamp(
          (start.cropX ?? 50) - (dx / Math.max(frameSlot.w, 1)) * 100,
          0,
          100,
        );
        const nextCropY = clamp(
          (start.cropY ?? 50) - (dy / Math.max(frameSlot.h, 1)) * 100,
          0,
          100,
        );

        updateSelectedImage((prev) => ({
          ...prev,
          cropX: nextCropX,
          cropY: nextCropY,
        }));
        return;
      }

      if (
        imageLayout === "frame" &&
        drag.startFrameSlot &&
        selectedFrameSlotId &&
        drag.mode !== "move"
      ) {
        let x = drag.startFrameSlot.x;
        let y = drag.startFrameSlot.y;
        let w = drag.startFrameSlot.w;
        let h = drag.startFrameSlot.h;

        if (
          drag.mode === "resize-e" ||
          drag.mode === "resize-ne" ||
          drag.mode === "resize-se"
        ) {
          w = drag.startFrameSlot.w + dx;
        }
        if (
          drag.mode === "resize-s" ||
          drag.mode === "resize-se" ||
          drag.mode === "resize-sw"
        ) {
          h = drag.startFrameSlot.h + dy;
        }
        if (
          drag.mode === "resize-w" ||
          drag.mode === "resize-nw" ||
          drag.mode === "resize-sw"
        ) {
          x = drag.startFrameSlot.x + dx;
          w = drag.startFrameSlot.w - dx;
        }
        if (
          drag.mode === "resize-n" ||
          drag.mode === "resize-ne" ||
          drag.mode === "resize-nw"
        ) {
          y = drag.startFrameSlot.y + dy;
          h = drag.startFrameSlot.h - dy;
        }

        const fixed = clampFrameSlotBox({
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(w),
          h: Math.round(h),
        });

        updateSelectedFrameSlot((prev) => ({
          ...prev,
          ...fixed,
        }));
        const rect = getFrameSlotRect(selectedFrameSlotId);
        if (rect) {
          setSelectedRect(new DOMRect(fixed.x, fixed.y, fixed.w, fixed.h));
        }
        return;
      }

      if (drag.mode === "rotate") {
        const stagePoint = clientPointToStage(e.clientX, e.clientY);
        const pointerAngle = angleFromCenter(
          drag.centerX,
          drag.centerY,
          stagePoint?.x ?? drag.centerX,
          stagePoint?.y ?? drag.centerY,
        );
        const delta = pointerAngle - drag.startAngle;
        updateSelectedImage((prev) => ({
          ...prev,
          rotation: normalizeAngle(start.rotation + delta),
        }));
        return;
      }

      if (drag.mode === "move") {
        const next = clampImageBox(
          {
            x: Math.round(start.x + dx),
            y: Math.round(start.y + dy),
            w: start.w,
            h: start.h,
          },
          currentCanvas.w,
          currentCanvas.h,
        );
        updateSelectedImage((prev) => ({ ...prev, ...next }));
        return;
      }

      let x = start.x;
      let y = start.y;
      let w = start.w;
      let h = start.h;

      if (
        drag.mode === "resize-e" ||
        drag.mode === "resize-ne" ||
        drag.mode === "resize-se"
      ) {
        w = start.w + dx;
      }
      if (
        drag.mode === "resize-s" ||
        drag.mode === "resize-se" ||
        drag.mode === "resize-sw"
      ) {
        h = start.h + dy;
      }
      if (
        drag.mode === "resize-w" ||
        drag.mode === "resize-nw" ||
        drag.mode === "resize-sw"
      ) {
        x = start.x + dx;
        w = start.w - dx;
      }
      if (
        drag.mode === "resize-n" ||
        drag.mode === "resize-ne" ||
        drag.mode === "resize-nw"
      ) {
        y = start.y + dy;
        h = start.h - dy;
      }

      const fixed = clampImageBox(
        {
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(w),
          h: Math.round(h),
        },
        currentCanvas.w,
        currentCanvas.h,
      );

      updateSelectedImage((prev) => ({ ...prev, ...fixed }));
    }

    function onWindowUp() {
      const drag = dragStateRef.current;
      if (drag?.mode === "frame-swap" && drag.startImage) {
        const targetSlotId =
          drag.hoverFrameSlotId ?? drag.startImage.frameSlotId ?? null;
        if (targetSlotId) {
          swapImageIntoFrameSlot(drag.startImage.id, targetSlotId);
        }
        setHoverFrameSlotId(null);
      }
      dragStateRef.current = null;
    }

    window.addEventListener("mousemove", onWindowMove);
    window.addEventListener("mouseup", onWindowUp);

    return () => {
      window.removeEventListener("mousemove", onWindowMove);
      window.removeEventListener("mouseup", onWindowUp);
    };
  }, [
    previewScale,
    currentCanvas.w,
    currentCanvas.h,
    selectedImageId,
    images,
    imageLayout,
    framePresetId,
    canvasPreset,
  ]);

  useEffect(() => {
    if (selectedId !== "productImage" || !selectedImageId) return;
    const current = getSelectedImage();
    if (!current) return;
    setSelectedRect(imageToViewportRect(current));
  }, [images, previewScale, selectedId, selectedImageId]);

  useEffect(() => {
    if (selectedId !== "frameSlot" || !selectedFrameSlotId) return;
    const rect = getFrameSlotRect(selectedFrameSlotId);
    if (rect) setSelectedRect(rect);
  }, [selectedId, selectedFrameSlotId, canvasPreset, framePresetId]);

  useEffect(() => {
    if (selectedId !== "video") return;
    const videoEl = stageRef.current?.querySelector(
      '[data-select="video"]',
    ) as HTMLElement | null;
    if (!videoEl) return;
    const rect = computeRectRelativeToStage(videoEl);
    if (rect) setSelectedRect(rect);
  }, [selectedId, videoPreviewUrl, videoBox, previewScale]);

  useEffect(() => {
    if (imageLayout === "manual") return;
    const nextFrameSlots =
      imageLayout === "frame"
        ? resolveFrameSlots(framePresetId, canvasPreset)
        : frameSlotsState;
    if (imageLayout === "frame") {
      setFrameSlotsState(nextFrameSlots);
    }
    setImages((prev) => {
      const next = arrangeImagesForLayout(
        prev,
        imageLayout,
        canvasPreset,
        productAlign,
        framePresetId,
        nextFrameSlots,
      );
      syncLegacyFromFirstImage(next);
      return next;
    });
  }, [imageLayout, framePresetId, canvasPreset]);

  useEffect(() => {
    function onWindowKeyDown(e: KeyboardEvent) {
      const metaOrCtrl = e.ctrlKey || e.metaKey;

      if (
        metaOrCtrl &&
        e.key.toLowerCase() === "c" &&
        selectedId === "video" &&
        !editField
      ) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        copySelectedVideo();
        return;
      }

      if (
        metaOrCtrl &&
        e.key.toLowerCase() === "x" &&
        selectedId === "video" &&
        !editField
      ) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        cutSelectedVideo();
        return;
      }

      if (metaOrCtrl && e.key.toLowerCase() === "v" && !editField) {
        if (isEditableTarget(e.target)) return;
        if (videoClipboardRef.current?.type === "video") {
          e.preventDefault();
          pasteVideoFromClipboard();
          return;
        }
      }

      if (metaOrCtrl && e.key.toLowerCase() === "z" && !editField) {
        if (isEditableTarget(e.target)) return;
        if (videoUndoStackRef.current.length > 0) {
          e.preventDefault();
          undoVideoAction();
          return;
        }
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId === "video" &&
        !editField
      ) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        deleteSelectedVideo();
        return;
      }

      if (
        metaOrCtrl &&
        e.key.toLowerCase() === "c" &&
        selectedImageId &&
        !editField
      ) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        videoClipboardRef.current = null;
        copySelectedImageToClipboard();
        return;
      }

      if (
        metaOrCtrl &&
        e.key.toLowerCase() === "x" &&
        selectedImageId &&
        !editField
      ) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        videoClipboardRef.current = null;
        cutSelectedImageToClipboard();
        return;
      }

      if (metaOrCtrl && e.key.toLowerCase() === "v" && !editField) {
        if (isEditableTarget(e.target)) return;
        if (!imageClipboardRef.current) return;
        e.preventDefault();
        pasteImageFromClipboard();
        return;
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedImageId &&
        !editField
      ) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        removeSelectedImage();
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [
    selectedId,
    selectedImageId,
    editField,
    images,
    canvasPreset,
    videoFile,
    videoPreviewUrl,
    videoBox,
    objectLayers.video,
    currentCanvas.w,
    currentCanvas.h,
  ]);

  useEffect(() => {
    if (isPdf) return;
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const root = stage.querySelector(".li2-root") as HTMLElement | null;
      if (!root) return;
      const nextHeight = Math.max(root.scrollHeight, 1);
      setPreviewContentHeight(nextHeight);
    };

    measure();

    const root = stage.querySelector(".li2-root") as HTMLElement | null;
    if (!root || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(root);

    return () => ro.disconnect();
  }, [
    isPdf,
    canvasPreset,
    title,
    body,
    badgeText,
    company,
    headline,
    subline,
    images,
    link,
  ]);

  function getRichEditEditor(field: RichEditField) {
    if (field === "title") return titleEditRef.current;
    if (field === "company") return companyEditRef.current;
    if (field === "badge") return badgeEditRef.current;
    return bodyEditRef.current;
  }

  function getNodeTextLength(node: Node | null) {
    return node?.textContent?.length ?? 0;
  }

  function getRichEditRoot(field: RichEditField) {
    return getRichEditEditor(field)?.getRootElement() ?? null;
  }

  function getContentEditableOffset(
    root: HTMLElement,
    node: Node,
    offset: number,
  ) {
    let total = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      const current = walker.currentNode;
      if (current === node) {
        return total + Math.min(offset, getNodeTextLength(current));
      }
      total += getNodeTextLength(current);
    }

    if (node === root) {
      return Array.from(root.childNodes)
        .slice(0, offset)
        .reduce((sum, child) => sum + getNodeTextLength(child), 0);
    }

    return total;
  }

  function readContentEditableSelection(
    field: RichEditField,
    root: HTMLElement | null,
  ) {
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0) {
      return richEditSelectionRef.current[field];
    }

    const range = selection.getRangeAt(0);
    if (
      !root.contains(range.startContainer) ||
      !root.contains(range.endContainer)
    ) {
      return richEditSelectionRef.current[field];
    }

    const start = getContentEditableOffset(
      root,
      range.startContainer,
      range.startOffset,
    );
    const end = getContentEditableOffset(
      root,
      range.endContainer,
      range.endOffset,
    );
    const next = { start: Math.min(start, end), end: Math.max(start, end) };
    richEditSelectionRef.current[field] = next;
    return next;
  }

  function findContentEditablePosition(root: HTMLElement, target: number) {
    let remaining = Math.max(0, target);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      const current = walker.currentNode;
      const length = getNodeTextLength(current);
      if (remaining <= length) {
        return { node: current, offset: remaining };
      }
      remaining -= length;
    }

    return { node: root, offset: root.childNodes.length };
  }

  function restoreContentEditableSelection(
    root: HTMLElement | null,
    range: { start: number; end: number },
  ) {
    if (!root) return;
    const selection = window.getSelection();
    if (!selection) return;

    const start = findContentEditablePosition(root, range.start);
    const end = findContentEditablePosition(root, range.end);
    const domRange = document.createRange();
    domRange.setStart(start.node, start.offset);
    domRange.setEnd(end.node, end.offset);
    selection.removeAllRanges();
    selection.addRange(domRange);
  }

  function getContentEditablePlainText(root: HTMLElement) {
    return root.innerText.replace(/\r\n/g, "\n").replace(/\n$/, "");
  }

  function handleRichEditableInput(
    field: RichEditField,
    payload: { text: string; marks: TextMark[] },
  ) {
    const currentText = getRichEditText(field);
    const { marks: currentMarks, setMarks } = getActiveMarksState(field);
    const nextMarksSerialized = JSON.stringify(payload.marks);
    const currentMarksSerialized = JSON.stringify(currentMarks);

    if (payload.text !== currentText) {
      setFieldTextRaw(field, payload.text);
    }

    if (nextMarksSerialized !== currentMarksSerialized) {
      setMarks(payload.marks);
    }

    const root = getRichEditRoot(field);
    const selection = readContentEditableSelection(field, root);
    richEditSelectionRef.current[field] = selection;

    if (field === "badge") {
      requestAnimationFrame(() => remeasureBadgeSelection());
    }
  }

  function syncRichEditOverlayDom(
    field: RichEditField,
    marks: TextMark[],
    range: { start: number; end: number },
    textOverride?: string,
  ) {
    const text = textOverride ?? getRichEditText(field);
    const editor = getRichEditEditor(field);
    editor?.syncContent(text, marks, range);
    richEditSelectionRef.current[field] = range;
    const root = getRichEditRoot(field);
    editor?.focus();
    restoreContentEditableSelection(root, range);
  }

  function getEditorFieldControl(
    field: EditorTextField = editField ?? activeField,
  ): {
    text: string;
    setText: (value: string) => void;
    ref:
      | RefObject<HTMLInputElement | null>
      | RefObject<HTMLTextAreaElement | null>;
  } {
    const refForField = <T extends HTMLInputElement | HTMLTextAreaElement>(
      fieldRef: RefObject<T | null>,
    ) => (field === editField && !isRichEditField(field) ? editRef : fieldRef);

    switch (field) {
      case "badge":
        return {
          text: badgeText,
          setText: setBadgeTextValue,
          ref: refForField(badgeRef),
        };
      case "title":
        return {
          text: title,
          setText: setTitleValue,
          ref: refForField(titleRef),
        };
      case "company":
        return {
          text: company,
          setText: setCompanyValue,
          ref: refForField(companyRef),
        };
      case "body":
        return { text: body, setText: setBody, ref: refForField(bodyRef) };
      case "caption":
      default:
        return { text: caption, setText: setCaption, ref: captionRef };
    }
  }

  function setFieldTextRaw(field: EditorTextField, value: string) {
    switch (field) {
      case "badge":
        setBadgeText(value);
        return;
      case "title":
        setTitle(value);
        return;
      case "company":
        setCompany(value);
        return;
      case "body":
        _setBody(value);
        return;
      case "caption":
      default:
        _setCaption(value);
    }
  }

  function getTextChangeRange(prev: string, next: string) {
    let start = 0;
    while (
      start < prev.length &&
      start < next.length &&
      prev[start] === next[start]
    ) {
      start += 1;
    }

    let prevEnd = prev.length;
    let nextEnd = next.length;
    while (
      prevEnd > start &&
      nextEnd > start &&
      prev[prevEnd - 1] === next[nextEnd - 1]
    ) {
      prevEnd -= 1;
      nextEnd -= 1;
    }

    return { start, prevEnd, nextEnd };
  }

  function handleTextChange(
    field: EditorTextField,
    next: string,
    selectionStart: number | null,
  ) {
    const { text } = getEditorFieldControl(field);
    if (next === text) return;

    const { start, prevEnd, nextEnd } = getTextChangeRange(text, next);
    const insertedLength = Math.max(0, nextEnd - start);
    const delta = next.length - text.length;
    const pendingStyle = {};

    setFieldTextRaw(field, next);

    const { setMarks } = getActiveMarksState(field);
    setMarks((prevMarks) => {
      const shifted = shiftMarksAfterTextChange(
        prevMarks,
        start,
        prevEnd,
        delta,
      );
      return insertedLength > 0 && hasStyle(pendingStyle)
        ? mergeMarks([
            ...shifted,
            {
              start,
              end: start + insertedLength,
              style: pendingStyle,
            },
          ])
        : shifted;
    });

    requestAnimationFrame(() => {
      const node = getEditorFieldControl(field).ref.current;
      if (!node || selectionStart == null) return;
      node.setSelectionRange(selectionStart, selectionStart);
    });
  }

  function shiftMarksAfterTextChange(
    marks: TextMark[],
    replaceStart: number,
    replaceEnd: number,
    delta: number,
    replacementMarkLength = 0,
  ) {
    const replacementStyle =
      replacementMarkLength > 0
        ? cleanStyle(styleForSegment(marks, replaceStart, replaceEnd))
        : {};
    const shifted = marks
      .flatMap((mark) => {
        if (mark.end <= replaceStart) return [mark];
        if (mark.start >= replaceEnd) {
          return [
            { ...mark, start: mark.start + delta, end: mark.end + delta },
          ];
        }

        const pieces: TextMark[] = [];
        if (mark.start < replaceStart) {
          pieces.push({ ...mark, end: replaceStart });
        }
        if (mark.end > replaceEnd) {
          pieces.push({
            ...mark,
            start: replaceStart + Math.max(0, delta),
            end: mark.end + delta,
          });
        }
        return pieces;
      })
      .filter((mark) => mark.end > mark.start);

    if (replacementMarkLength > 0 && hasStyle(replacementStyle)) {
      shifted.push({
        start: replaceStart,
        end: replaceStart + replacementMarkLength,
        style: replacementStyle,
      });
    }

    return mergeMarks(shifted);
  }

  function remapMarksForLinePrefixChanges(
    marks: TextMark[],
    changes: LinePrefixChange[],
  ) {
    if (!changes.length) return marks;

    const shiftPoint = (pos: number) => {
      let cumulativeDelta = 0;

      for (const change of changes) {
        const oldContentStart = change.oldLineStart + change.oldPrefixLength;
        const delta = change.newPrefixLength - change.oldPrefixLength;

        if (pos < change.oldLineStart) continue;
        if (pos <= change.oldLineEnd) {
          const newPrefixStart = change.oldLineStart + cumulativeDelta;
          if (pos <= oldContentStart) {
            return newPrefixStart + change.newPrefixLength;
          } else {
            return pos + cumulativeDelta + delta;
          }
        }

        cumulativeDelta += delta;
      }

      return pos + cumulativeDelta;
    };

    return mergeMarks(
      marks
        .map((mark) => ({
          ...mark,
          start: shiftPoint(mark.start),
          end: shiftPoint(mark.end),
        }))
        .filter((mark) => mark.end > mark.start),
    );
  }

  function getActiveMarksState(
    field: EditorTextField = editField ?? activeField,
  ) {
    switch (field) {
      case "badge":
        return { marks: badgeMarks, setMarks: setBadgeMarks };
      case "title":
        return { marks: titleMarks, setMarks: setTitleMarks };
      case "company":
        return { marks: companyMarks, setMarks: setCompanyMarks };
      case "body":
        return { marks: bodyMarks, setMarks: setBodyMarks };
      case "caption":
      default:
        return { marks: captionMarks, setMarks: setCaptionMarks };
    }
  }

  function setFieldTextAlign(
    field: RichEditField,
    textAlign: BoxTextStyle["textAlign"],
  ) {
    if (field === "title") {
      setTitleStyle((prev) => ({ ...prev, textAlign }));
    } else if (field === "company") {
      setCompanyStyle((prev) => ({ ...prev, textAlign }));
    } else if (field === "badge") {
      setBadgeStyle((prev) => ({ ...prev, textAlign }));
    } else {
      setBodyBoxStyle((prev) => ({ ...prev, textAlign }));
    }

    setActiveField(field);
    if (editField === field) {
      setEditStyle((prev) => ({ ...prev, textAlign }));
    }
  }

  function overlaps(
    a: { start: number; end: number },
    b: { start: number; end: number },
  ) {
    return a.start < b.end && b.start < a.end;
  }

  function cleanStyle(style: RichStyle): RichStyle {
    const next: RichStyle = {};
    if (style.fontFamily) next.fontFamily = style.fontFamily;
    if (style.fontSize) next.fontSize = style.fontSize;
    if (style.color) next.color = style.color;
    if (style.highlight) next.highlight = true;
    if (style.highlight && style.highlightColor)
      next.highlightColor = style.highlightColor;
    if (style.fontWeight && style.fontWeight !== "normal") {
      next.fontWeight = style.fontWeight;
    }
    if (style.fontStyle && style.fontStyle !== "normal") {
      next.fontStyle = style.fontStyle;
    }
    return next;
  }

  function hasStyle(style: RichStyle) {
    return Object.keys(cleanStyle(style)).length > 0;
  }

  function stylesEqual(a: RichStyle, b: RichStyle) {
    return JSON.stringify(cleanStyle(a)) === JSON.stringify(cleanStyle(b));
  }

  function mergeMarks(next: TextMark[]) {
    next.sort((a, b) => a.start - b.start);

    const merged: TextMark[] = [];
    for (const m of next) {
      const style = cleanStyle(m.style ?? {});
      if (m.end <= m.start || !hasStyle(style)) continue;

      const last = merged[merged.length - 1];
      if (last && last.end === m.start && stylesEqual(last.style, style)) {
        last.end = m.end;
      } else {
        merged.push({ ...m, style });
      }
    }

    return merged;
  }

  function styleForSegment(prev: TextMark[], start: number, end: number) {
    return prev.reduce<RichStyle>((style, mark) => {
      if (!overlaps(mark, { start, end })) return style;
      return { ...style, ...(mark.style ?? {}) };
    }, {});
  }

  function handleNumberedListEnter(
    field: "body" | "caption",
    e: React.KeyboardEvent<HTMLElement>,
  ) {
    if (e.key !== "Enter" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }

    const { text, setText, ref } = getEditorFieldControl(field);
    const el = ref.current as HTMLTextAreaElement | null;
    if (!el) return;

    const s = el.selectionStart ?? 0;
    const selectionEnd = el.selectionEnd ?? s;
    const lineStart = text.lastIndexOf("\n", Math.max(0, s - 1)) + 1;
    const nextLineBreak = text.indexOf("\n", s);
    const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
    const line = text.slice(lineStart, lineEnd);
    const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
    if (!match) return;

    e.preventDefault();
    setActiveField(field);

    const indent = match[1];
    const currentNumber = Number(match[2]);
    const marker = `${match[2]}. `;
    const content = match[3];
    const markerStart = lineStart + indent.length;
    const markerEnd = markerStart + marker.length;

    if (!content.trim()) {
      const next = text.slice(0, markerStart) + text.slice(markerEnd);
      if (next !== text) {
        setText(next);
        const { marks, setMarks } = getActiveMarksState(field);
        setMarks(
          remapMarksForLinePrefixChanges(marks, [
            {
              oldLineStart: markerStart,
              oldLineEnd: lineEnd,
              oldPrefixLength: marker.length,
              newPrefixLength: 0,
            },
          ]),
        );
      }

      requestAnimationFrame(() => {
        const node = ref.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(markerStart, markerStart);
      });
      return;
    }

    const insert = `\n${indent}${currentNumber + 1}. `;
    const next = text.slice(0, s) + insert + text.slice(selectionEnd);
    setText(next);

    const { marks, setMarks } = getActiveMarksState(field);
    setMarks(
      shiftMarksAfterTextChange(
        marks,
        s,
        selectionEnd,
        insert.length - (selectionEnd - s),
      ),
    );

    requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      const nextPos = s + insert.length;
      node.focus();
      node.setSelectionRange(nextPos, nextPos);
    });
  }

  async function copyCaption() {
    const { text, ref } = getEditorFieldControl();
    const el = ref.current as HTMLTextAreaElement | HTMLInputElement | null;
    await copyCaptionText(text, el);
  }
  const activeRichTextEditor: ActiveRichTextEditor | null = isRichEditField(
    editField,
  )
    ? {
        field: editField,
        editorRef:
          editField === "title"
            ? titleEditRef
            : editField === "badge"
              ? badgeEditRef
              : editField === "company"
                ? companyEditRef
                : bodyEditRef,
        text: getRichEditText(editField),
        marks: getRichEditMarks(editField),
        multiline: editField !== "badge",
        className: "template-inline-editor",
        style: {
          display: "block",
          width: "100%",
          minHeight:
            editField === "body" ? Math.max(selectedRect?.height ?? 0, 140) : undefined,
          padding: 0,
          margin: 0,
          border: "none",
          background: "transparent",
          boxShadow: "none",
          outline: "none",
          overflow: editField === "badge" ? "visible" : "hidden",
          whiteSpace: editField === "badge" ? "nowrap" : "pre-wrap",
          wordBreak: editField === "badge" ? "normal" : "break-word",
          caretColor: String(editStyle.color ?? "#111827"),
          ...editStyle,
        } satisfies CSSProperties,
        onAlignChange: (align: "left" | "center" | "right") =>
          setFieldTextAlign(editField, align),
        onChange: (payload: { text: string; marks: TextMark[] }) =>
          handleRichEditableInput(editField, payload),
        onBlur: onEditBlur,
        onKeyDown: onEditKeyDown,
        onKeyUp: () => {},
        onPointerDown: (e) => e.stopPropagation(),
        onMouseDown: (e) => e.stopPropagation(),
        onMouseUp: () => {},
        onClick: (e) => e.stopPropagation(),
        onDoubleClick: (e) => e.stopPropagation(),
      }
    : null;

  useEffect(() => {
    if (!isPdf || !payload) return;

    setCanvasPreset(payload.canvasPreset ?? "linkedin");

    setHeadline(payload.headline ?? "");
    setSubline(payload.subline ?? "");
    setBadgeText(payload.badgeText ?? "");
    setTitle(payload.linkTitle ?? "");
    _setBody(payload.bodyText ?? "");
    setBadgeMarks(payload.badgeMarks ?? []);
    setTitleMarks(payload.titleMarks ?? []);
    setBodyMarks(payload.bodyMarks ?? []);
    setCompanyMarks(payload.companyMarks ?? []);
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
      const nextImages: ImageItem[] = payload.images.map((img) => ({
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
      }));
      setImages(nextImages);
    }

    if (payload.titleStyle) setTitleStyle(payload.titleStyle);
    if (payload.bodyStyle) setBodyBoxStyle(payload.bodyStyle);
    if (payload.badgeStyle) setBadgeStyle(payload.badgeStyle);
    if (payload.companyStyle) setCompanyStyle(payload.companyStyle);
    if (payload.headlineStyle) setHeadlineStyle(payload.headlineStyle);
    if (payload.sublineStyle) setSublineStyle(payload.sublineStyle);
  }, [isPdf, payload]);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    const url = URL.createObjectURL(videoFile);
    const pendingBox = pendingVideoBoxRef.current;
    pendingVideoBoxRef.current = null;
    setVideoBox(pendingBox ?? getInitialVideoBox());
    if (!pendingBox) {
      bringVideoObjectToFront();
    }
    setVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  const selectedImage = getSelectedImage();

  function startSelectedFrameSlotResize(
    e: React.MouseEvent<HTMLDivElement>,
    mode: DragMode,
  ) {
    const current = getSelectedFrameSlot();
    if (!current) return;

    dragStateRef.current = {
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startImage: selectedImage,
      startFrameSlot: current,
      startAngle: 0,
      centerX: 0,
      centerY: 0,
    };
  }

  const frameSlots = useMemo(
    () =>
      resolveFrameSlots(framePresetId, canvasPreset).map((slot) => ({
        ...slot,
        imageId: images.find((img) => img.frameSlotId === slot.id)?.id,
      })),
    [framePresetId, canvasPreset, images],
  );

  if (isPdf) {
    return (
      <div
        style={{
          width: currentCanvas.w,
          background: "#ffffff",
          overflow: "visible",
        }}
      >
        <LinkedInTemplate2
          scale={1}
          canvasPreset={effective.canvasPreset}
          productImage={effective.productImage}
          productImages={effective.productImages}
          productOrientation={effective.productOrientation}
          productAlign={effective.productAlign}
          imageLayout={effective.imageLayout}
          framePresetId={effective.framePresetId}
          frameSlots={effective.frameSlots}
          mediaBox={effective.mediaBox}
          profileImage={effective.profileImage}
          name={effective.name}
          role={effective.role}
          badgeText={effective.badgeText}
          badgeMarks={effective.badgeMarks}
          linkTitle={effective.linkTitle}
          titleMarks={effective.titleMarks}
          company={effective.company}
          companyMarks={effective.companyMarks}
          bodyText={effective.bodyText}
          bodyMarks={effective.bodyMarks}
          linkUrl={effective.linkUrl}
          headline={effective.headline}
          subline={effective.subline}
          companyLogo="/logo.png"
          titleStyle={effective.titleStyle}
          bodyStyle={effective.bodyStyle}
          badgeStyle={effective.badgeStyle}
          companyStyle={effective.companyStyle}
          headlineStyle={effective.headlineStyle}
          sublineStyle={effective.sublineStyle}
        />
      </div>
    );
  }

  return (
    <LinkedInEditorBaseClient
      title="LinkedIn - Template A"
      successMsg={successMsg}
      errorMsg={errorMsg}
    >
      <LinkedInEditorLayout
        preview={
          <TemplateAPreview
            canvasPreset={canvasPreset}
            onCanvasPresetChange={setCanvasPreset}
            clearSelection={clearSelection}
            previewViewportW={previewViewportW}
            previewViewportH={previewViewportH}
            previewScale={previewScale}
            previewContentHeight={previewContentHeight}
            currentCanvas={currentCanvas}
            canvasWrapRef={canvasWrapRef}
            stageRef={stageRef}
            editField={editField}
            selectedId={selectedId}
            selectedImageId={selectedImageId}
            imageLayout={imageLayout}
            selectedRect={selectedRect}
            activeRichTextEditor={activeRichTextEditor}
            effective={effective}
            editorMediaImages={editorMediaImages}
            videoPreviewUrl={videoPreviewUrl}
            videoBox={videoBox}
            videoPreviewZIndex={videoPreviewZIndex}
            finalUrl={finalUrl}
            suppressNextCanvasClickRef={suppressNextCanvasClickRef}
            onCanvasClick={onCanvasClick}
            onCanvasDoubleClick={onCanvasDoubleClick}
            onSelectableClick={(field, event) => {
              event.stopPropagation();
              selectCanvasField(field, event.currentTarget);
            }}
            onSelectableDoubleClick={(field, event) => {
              event.stopPropagation();
              activateCanvasField(field, event.currentTarget);
            }}
            onStartFrameImageDrag={startFrameImageDrag}
            onImageSelect={selectImageObject}
            onImageInteractionStart={startMediaInteraction}
            onVideoSelect={selectVideoObject}
            onVideoInteractionStart={startVideoInteraction}
            onFrameSlotResizeStart={startSelectedFrameSlotResize}
            onRemoveSelectedImage={removeSelectedImage}
          />
        }
        toolbox={
          <LinkedInToolbox
            badgeText={badgeText}
            setBadgeText={setBadgeTextValue}
            badgeRef={badgeRef}
            title={title}
            setTitle={setTitleValue}
            titleRef={titleRef}
            body={body}
            setBody={setBody}
            bodyRef={bodyRef}
            caption={caption}
            setCaption={setCaption}
            captionRef={captionRef}
            captionMarks={captionMarks}
            activeField={activeField}
            setActiveField={setActiveField}
            copied={copied}
            copyCaption={copyCaption}
            link={link}
            setLink={setLink}
            linkInput={linkInput}
            setLinkInput={setLinkInput}
            handleAddLink={handleAddLink}
            onTextChange={handleTextChange}
            onTextKeyDown={handleNumberedListEnter}
            company={company}
            setCompany={setCompanyValue}
            companyRef={companyRef}
            onPickProductImage={onPickProductImage}
            imageLayout={imageLayout}
            setImageLayout={setImageLayoutMode}
            framePresetId={framePresetId}
            setFramePresetId={setFramePresetValue}
            frameSlots={frameSlots}
            selectedFrameSlotId={selectedFrameSlotId}
            onAssignImageToFrameSlot={assignSelectedImageToFrameSlot}
            setVideoFile={setVideoFile}
          />
        }
        properties={
          <TemplateAExportPanel
            loadingPdf={loadingPdf}
            hasVideo={hasVideo}
            finalLoading={finalLoading}
            finalUrl={finalUrl}
            onDownloadPdf={(e) => {
              e.preventDefault();
              void downloadPDF();
            }}
            onGenerateFinal={(e) => {
              e.preventDefault();
              void generateFinal();
            }}
          />
        }
      />
    </LinkedInEditorBaseClient>
  );
}
