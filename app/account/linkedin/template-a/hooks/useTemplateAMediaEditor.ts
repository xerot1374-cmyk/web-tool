"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  getFirstAvailableFrameSlotId,
  getHeaderHeightForPreset,
  resolveFrameSlots,
  type FrameSlot,
  type ImageLayoutMode,
} from "@/app/lib/imageLayouts";
import { CANVAS_PRESETS, type CanvasPreset } from "@/app/lib/renderUtils";
import type {
  DragMode,
  EditorMediaImage,
  EditField,
  ImageClipboardPayload,
  ImageItem,
  MediaBox,
  SelectableId,
  VideoClipboardPayload,
  VideoSnapshot,
} from "../lib/templateA.types";
import {
  DEFAULT_FRAME_PRESET_ID,
  angleFromCenter,
  arrangeImagesForLayout,
  clamp,
  fileToBase64,
  imageToViewportRect,
  isEditableTarget,
  normalizeAngle,
  uid,
} from "../lib/templateA.utils";

type UseTemplateAMediaEditorParams = {
  stageRef: RefObject<HTMLDivElement | null>;
  previewScale: number;
  canvasPreset: CanvasPreset;
  editField: EditField;
  setEditField: React.Dispatch<React.SetStateAction<EditField>>;
  badgeText: string;
};

export default function useTemplateAMediaEditor({
  stageRef,
  previewScale,
  canvasPreset,
  editField,
  setEditField,
  badgeText,
}: UseTemplateAMediaEditorParams) {
  const currentCanvas = CANVAS_PRESETS[canvasPreset];
  const imageClipboardRef = useRef<ImageClipboardPayload | null>(null);
  const videoClipboardRef = useRef<VideoClipboardPayload>(null);
  const videoUndoStackRef = useRef<VideoSnapshot[]>([]);
  const pendingVideoBoxRef = useRef<MediaBox | null>(null);
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

  const [mediaBox, setMediaBox] = useState<MediaBox>({
    x: 420,
    y: 240,
    w: 240,
    h: 240,
  });
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const [productImage, setProductImage] = useState("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productOrientation, setProductOrientation] = useState<
    "landscape" | "portrait"
  >("landscape");
  const [productAlign, setProductAlign] = useState<"left" | "center" | "right">(
    "center",
  );
  const [imageLayout, setImageLayout] = useState<ImageLayoutMode>("manual");
  const [framePresetId, setFramePresetId] = useState(DEFAULT_FRAME_PRESET_ID);
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

  const videoPreviewZIndex = objectLayers.video;

  const editorMediaImages: EditorMediaImage[] = useMemo(
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

  const frameSlots = useMemo(
    () =>
      resolveFrameSlots(framePresetId, canvasPreset).map((slot) => ({
        ...slot,
        imageId: images.find((img) => img.frameSlotId === slot.id)?.id,
      })),
    [framePresetId, canvasPreset, images],
  );

  function bringImageObjectToFront(imageId: string) {
    setObjectLayers((prev) => ({
      ...prev,
      images: { ...prev.images, [imageId]: prev.next },
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
    const preset =
      w0 >= h0
        ? { maxW: 1600, maxH: 1400, mime: "image/jpeg" as const, quality: 0.92 }
        : { maxW: 1400, maxH: 1800, mime: "image/jpeg" as const, quality: 0.92 };

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
    return new File([blob], "product-resized.jpg", { type: preset.mime });
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
    if (nextLayout === "manual") return;
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
    const orientation =
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
    imageClipboardRef.current = { type: "image", image: { ...current } };
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
    return frameSlotsState.find((slot) => slot.id === selectedFrameSlotId) ?? null;
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
        if (img.id === imageId) return { ...img, frameSlotId: targetSlotId };
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
      return target.parentElement?.closest("[data-select]") as HTMLElement | null;
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
    setSelectedRect(new DOMRect(videoBox.x, videoBox.y, videoBox.w, videoBox.h));
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
    if (videoUndoStackRef.current.length > 30) videoUndoStackRef.current.shift();
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
        ? (frameSlotsState.find((slot) => slot.id === current.frameSlotId) ?? null)
        : getSelectedFrameSlot();
      setSelectedId("productImage");
      setSelectedImageId(current.id);
      setSelectedFrameSlotId(current.frameSlotId ?? null);
      if (current.frameSlotId) {
        const rect = getFrameSlotRect(current.frameSlotId);
        if (rect) setSelectedRect(rect);
      }
      dragStateRef.current = {
        mode: mode !== "move" ? mode : "frame-swap",
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
      startImage: getSelectedImage(),
      startFrameSlot: current,
      startAngle: 0,
      centerX: 0,
      centerY: 0,
    };
  }

  useEffect(() => {
    function onWindowMove(e: MouseEvent) {
      const drag = dragStateRef.current;
      if (!drag || !drag.mode || (!drag.startImage && !drag.startVideoBox)) return;
      const dx = (e.clientX - drag.startClientX) / previewScale;
      const dy = (e.clientY - drag.startClientY) / previewScale;

      if (drag.mediaKind === "video" && drag.startVideoBox) {
        const start = drag.startVideoBox;
        let { x, y, w, h } = start;
        if (drag.mode === "move") {
          const fixed = clampImageBox(
            { x: Math.round(start.x + dx), y: Math.round(start.y + dy), w, h },
            currentCanvas.w,
            currentCanvas.h,
          );
          setVideoBox(fixed);
          setSelectedRect(new DOMRect(fixed.x, fixed.y, fixed.w, fixed.h));
          return;
        }
        if (["resize-e", "resize-ne", "resize-se"].includes(drag.mode)) w = start.w + dx;
        if (["resize-s", "resize-se", "resize-sw"].includes(drag.mode)) h = start.h + dy;
        if (["resize-w", "resize-nw", "resize-sw"].includes(drag.mode)) {
          x = start.x + dx;
          w = start.w - dx;
        }
        if (["resize-n", "resize-ne", "resize-nw"].includes(drag.mode)) {
          y = start.y + dy;
          h = start.h - dy;
        }
        const fixed = clampImageBox(
          { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) },
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
        const slot = stagePoint ? getFrameSlotAtPoint(stagePoint.x, stagePoint.y) : undefined;
        const nextSlotId = slot?.id ?? null;
        drag.hoverFrameSlotId = nextSlotId;
        setHoverFrameSlotId(nextSlotId);
        if (slot) setSelectedRect(new DOMRect(slot.x, slot.y, slot.w, slot.h));
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
        const nextCropX = clamp((start.cropX ?? 50) - (dx / Math.max(frameSlot.w, 1)) * 100, 0, 100);
        const nextCropY = clamp((start.cropY ?? 50) - (dy / Math.max(frameSlot.h, 1)) * 100, 0, 100);
        updateSelectedImage((prev) => ({ ...prev, cropX: nextCropX, cropY: nextCropY }));
        return;
      }
      if (imageLayout === "frame" && drag.startFrameSlot && selectedFrameSlotId && drag.mode !== "move") {
        let x = drag.startFrameSlot.x;
        let y = drag.startFrameSlot.y;
        let w = drag.startFrameSlot.w;
        let h = drag.startFrameSlot.h;
        if (["resize-e", "resize-ne", "resize-se"].includes(drag.mode)) w = drag.startFrameSlot.w + dx;
        if (["resize-s", "resize-se", "resize-sw"].includes(drag.mode)) h = drag.startFrameSlot.h + dy;
        if (["resize-w", "resize-nw", "resize-sw"].includes(drag.mode)) {
          x = drag.startFrameSlot.x + dx;
          w = drag.startFrameSlot.w - dx;
        }
        if (["resize-n", "resize-ne", "resize-nw"].includes(drag.mode)) {
          y = drag.startFrameSlot.y + dy;
          h = drag.startFrameSlot.h - dy;
        }
        const fixed = clampFrameSlotBox({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
        updateSelectedFrameSlot((prev) => ({ ...prev, ...fixed }));
        if (getFrameSlotRect(selectedFrameSlotId)) {
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
        updateSelectedImage((prev) => ({ ...prev, rotation: normalizeAngle(start.rotation + delta) }));
        return;
      }
      if (drag.mode === "move") {
        const next = clampImageBox(
          { x: Math.round(start.x + dx), y: Math.round(start.y + dy), w: start.w, h: start.h },
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
      if (["resize-e", "resize-ne", "resize-se"].includes(drag.mode)) w = start.w + dx;
      if (["resize-s", "resize-se", "resize-sw"].includes(drag.mode)) h = start.h + dy;
      if (["resize-w", "resize-nw", "resize-sw"].includes(drag.mode)) {
        x = start.x + dx;
        w = start.w - dx;
      }
      if (["resize-n", "resize-ne", "resize-nw"].includes(drag.mode)) {
        y = start.y + dy;
        h = start.h - dy;
      }
      const fixed = clampImageBox(
        { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) },
        currentCanvas.w,
        currentCanvas.h,
      );
      updateSelectedImage((prev) => ({ ...prev, ...fixed }));
    }

    function onWindowUp() {
      const drag = dragStateRef.current;
      if (drag?.mode === "frame-swap" && drag.startImage) {
        const targetSlotId = drag.hoverFrameSlotId ?? drag.startImage.frameSlotId ?? null;
        if (targetSlotId) swapImageIntoFrameSlot(drag.startImage.id, targetSlotId);
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
  }, [previewScale, currentCanvas.w, currentCanvas.h, selectedImageId, images, imageLayout, framePresetId, canvasPreset]);

  useEffect(() => {
    if (selectedId !== "productImage" || !selectedImageId) return;
    const current = getSelectedImage();
    if (!current) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedRect(imageToViewportRect(current));
  }, [images, selectedId, selectedImageId]);

  useEffect(() => {
    if (selectedId !== "frameSlot" || !selectedFrameSlotId) return;
    const rect = getFrameSlotRect(selectedFrameSlotId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (rect) setSelectedRect(rect);
  }, [selectedId, selectedFrameSlotId, canvasPreset, framePresetId]);

  useEffect(() => {
    if (selectedId !== "video") return;
    const videoEl = stageRef.current?.querySelector('[data-select="video"]') as HTMLElement | null;
    if (!videoEl) return;
    const rect = computeRectRelativeToStage(videoEl);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (rect) setSelectedRect(rect);
  }, [selectedId, videoPreviewUrl, videoBox, previewScale, stageRef]);

  useEffect(() => {
    if (imageLayout === "manual") return;
    const nextFrameSlots = imageLayout === "frame" ? resolveFrameSlots(framePresetId, canvasPreset) : frameSlotsState;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (imageLayout === "frame") setFrameSlotsState(nextFrameSlots);
    setImages((prev) => {
      const next = arrangeImagesForLayout(prev, imageLayout, canvasPreset, productAlign, framePresetId, nextFrameSlots);
      syncLegacyFromFirstImage(next);
      return next;
    });
  }, [imageLayout, framePresetId, canvasPreset]);

  useEffect(() => {
    function onWindowKeyDown(e: KeyboardEvent) {
      const metaOrCtrl = e.ctrlKey || e.metaKey;
      if (metaOrCtrl && e.key.toLowerCase() === "c" && selectedId === "video" && !editField) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        copySelectedVideo();
        return;
      }
      if (metaOrCtrl && e.key.toLowerCase() === "x" && selectedId === "video" && !editField) {
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
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId === "video" && !editField) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        deleteSelectedVideo();
        return;
      }
      if (metaOrCtrl && e.key.toLowerCase() === "c" && selectedImageId && !editField) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        videoClipboardRef.current = null;
        copySelectedImageToClipboard();
        return;
      }
      if (metaOrCtrl && e.key.toLowerCase() === "x" && selectedImageId && !editField) {
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
      if ((e.key === "Delete" || e.key === "Backspace") && selectedImageId && !editField) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        removeSelectedImage();
      }
    }
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [selectedId, selectedImageId, editField, images, canvasPreset, videoFile, videoPreviewUrl, videoBox, objectLayers.video, currentCanvas.w, currentCanvas.h]);

  useEffect(() => {
    if (!videoFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (!pendingBox) bringVideoObjectToFront();
    setVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  return {
    currentCanvas,
    productImage,
    setProductImage,
    productImageFile,
    setProductImageFile,
    productOrientation,
    setProductOrientation,
    productAlign,
    setProductAlign,
    imageLayout,
    setImageLayout,
    setImageLayoutMode,
    framePresetId,
    setFramePresetId,
    setFramePresetValue,
    frameSlotsState,
    setFrameSlotsState,
    mediaBox,
    setMediaBox,
    images,
    setImages,
    editorMediaImages,
    frameSlots,
    videoFile,
    setVideoFile,
    videoPreviewUrl,
    videoBox,
    setVideoBox,
    videoPreviewZIndex,
    selectedId,
    setSelectedId,
    selectedRect,
    setSelectedRect,
    selectedFrameSlotId,
    setSelectedFrameSlotId,
    selectedImageId,
    setSelectedImageId,
    suppressNextCanvasClickRef,
    onPickProductImage,
    removeSelectedImage,
    assignSelectedImageToFrameSlot,
    clearSelection,
    computeRectRelativeToStage,
    remeasureBadgeSelection,
    getSelectableTarget,
    isMediaSelectionUiTarget,
    getBadgeTextTargetAtPoint,
    getFrameSlotRect,
    selectImageObject,
    selectVideoObject,
    startMediaInteraction,
    startVideoInteraction,
    startFrameImageDrag,
    startSelectedFrameSlotResize,
    copySelectedVideo,
    cutSelectedVideo,
    deleteSelectedVideo,
    pasteVideoFromClipboard,
    undoVideoAction,
    getSelectedFrameSlot,
  };
}
