"use client";

import LinkedInEditorBaseClient from "@/app/components/templates/linkedin-shared/LinkedInEditorBaseClient";
import LinkedInEditorLayout from "@/app/components/templates/linkedin-shared/LinkedInEditorLayout";
import { LinkedInToolbox } from "@/app/components/templates/linkedin-shared/ToolBox";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { type LexicalInlineEditorHandle } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";

import LinkedInTemplate2 from "@/app/components/templates/linkedin/LinkedInTemplate2";
import {
  FRAME_PRESETS,
  getFirstAvailableFrameSlotId,
  getHeaderHeightForPreset,
  resolveFrameSlots,
  type FrameSlot,
  type ImageLayoutMode,
} from "@/app/lib/imageLayouts";
import {
  CANVAS_PRESETS,
  getCanvasFrame,
  type CanvasPreset,
} from "@/app/lib/renderUtils";

type SessionUser = {
  name: string;
  role: string;
  profileImage: string | null;
};

type TemplateAClientProps = {
  sessionUser: SessionUser | null;
};

type FieldErrors = {
  title?: string;
  body?: string;
};

type RichStyle = {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  highlight?: boolean;
  highlightColor?: string;
  fontWeight?: number | string;
  fontStyle?: "normal" | "italic";
};

export type TextMark = {
  start: number;
  end: number;
  style: RichStyle;
};

type MediaBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type ImageItem = {
  id: string;
  src: string;
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeUrl(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getLineBounds(text: string, index: number) {
  const safeIndex = clamp(index, 0, text.length);
  const start = text.lastIndexOf("\n", Math.max(0, safeIndex - 1)) + 1;
  const next = text.indexOf("\n", safeIndex);
  const end = next === -1 ? text.length : next;
  return { start, end };
}

type LinePrefixChange = {
  oldLineStart: number;
  oldLineEnd: number;
  oldPrefixLength: number;
  newPrefixLength: number;
};

async function copyTextToClipboard(
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

type BoxTextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  textAlign: "left" | "center" | "right";
};

type PdfPayload = {
  profileImage: string;
  name: string;
  role: string;

  productImage?: string;
  productOrientation?: "landscape" | "portrait";
  productAlign?: "left" | "center" | "right";
  imageLayout?: ImageLayoutMode;
  framePresetId?: string;
  frameSlots?: FrameSlot[];
  productImageBase64?: string;
  mediaBox?: MediaBox;

  images?: ImagePayloadItem[];

  badgeText?: string;
  badgeStyle?: BoxTextStyle;

  linkTitle?: string;
  company?: string;
  headline?: string;
  subline?: string;
  bodyText?: string;
  bodyMarks?: TextMark[];
  titleMarks?: TextMark[];
  badgeMarks?: TextMark[];
  companyMarks?: TextMark[];
  captionMarks?: TextMark[];

  titleStyle?: BoxTextStyle;
  bodyStyle?: BoxTextStyle;
  companyStyle?: BoxTextStyle;
  headlineStyle?: BoxTextStyle;
  sublineStyle?: BoxTextStyle;

  link?: string;
  linkLabel?: string;

  canvasPreset?: "linkedin" | "instagram" | "instagramStory";
};

declare global {
  interface Window {
    __PDF_PAYLOAD__?: PdfPayload;
  }
}

function getPdfModeAndPayload(): {
  isPdf: boolean;
  payload: PdfPayload | null;
} {
  if (typeof window === "undefined") return { isPdf: false, payload: null };
  const isPdf =
    new URLSearchParams(window.location.search).get("__pdf") === "1";
  const payload = isPdf ? (window.__PDF_PAYLOAD__ ?? null) : null;
  return { isPdf, payload };
}

type CanvasPresetKey = CanvasPreset;

const CANVAS_LABELS: Record<CanvasPresetKey, string> = {
  linkedin: "LinkedIn (800×3000)",
  instagram: "Instagram Feed (1080×1080)",
  instagramStory: "Instagram Story (1080×1920)",
};

type SelectableId =
  | "title"
  | "body"
  | "badge"
  | "productImage"
  | "frameSlot"
  | "video"
  | "links"
  | "company"
  | "headline"
  | "subline";

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
]);

function isPreviewTextSelectableId(
  id: SelectableId | null,
): id is "title" | "body" | "badge" | "company" {
  return id !== null && PREVIEW_TEXT_SELECTABLE_IDS.has(id);
}

function isPreviewSelectableId(id: string): id is SelectableId {
  return PREVIEW_SELECTABLE_IDS.has(id as SelectableId);
}

type EditorTextField = "title" | "body" | "badge" | "company" | "caption";

type EditField = Exclude<EditorTextField, "caption"> | null;

type RichEditField = "title" | "body" | "company" | "badge";

type DragMode =
  | "frame-swap"
  | "frame-image-pan"
  | "frame-image-scale"
  | "move"
  | "resize-n"
  | "resize-s"
  | "resize-e"
  | "resize-w"
  | "resize-ne"
  | "resize-nw"
  | "resize-se"
  | "resize-sw"
  | "rotate";

type SelectionHandle = {
  key: string;
  cursor: string;
  mode: DragMode;
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
  transform?: string;
};

type ImageClipboardPayload = {
  type: "image";
  image: ImageItem;
};

type VideoSnapshot = {
  videoFile: File | null;
  videoPreviewUrl: string | null;
  videoBox: MediaBox;
  videoZIndex: number;
};

type VideoClipboardPayload = {
  type: "video";
  snapshot: VideoSnapshot;
} | null;

function safePx(v: string | null | undefined, fallback: number) {
  const n = v ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function imageToViewportRect(
  image: Pick<ImageItem, "x" | "y" | "w" | "h">,
  _scale: number,
) {
  return new DOMRect(image.x, image.y, image.w, image.h);
}

function normalizeAngle(deg: number) {
  let n = deg % 360;
  if (n < 0) n += 360;
  return n;
}

function angleFromCenter(cx: number, cy: number, px: number, py: number) {
  return (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
}

function isEditableTarget(el: EventTarget | null) {
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

function getCropX(img?: ImageItem | null) {
  return Number.isFinite(img?.cropX) ? Number(img?.cropX) : 50;
}
function getCropY(img?: ImageItem | null) {
  return Number.isFinite(img?.cropY) ? Number(img?.cropY) : 50;
}
function getCropScale(img?: ImageItem | null) {
  return Number.isFinite(img?.cropScale) ? Number(img?.cropScale) : 1;
}

function getImageAspectRatio(
  image: Pick<ImageItem, "w" | "h" | "orientation">,
) {
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
      {
        cx: canvasW * 0.5 + alignShift,
        cy: headerH * 0.57,
        bw: canvasW * 0.44,
        bh: headerH * 0.5,
        rotation: -3,
      },
    ];
  }

  if (count === 2) {
    return [
      {
        cx: canvasW * 0.4 + alignShift,
        cy: headerH * 0.57,
        bw: canvasW * 0.34,
        bh: headerH * 0.45,
        rotation: -9,
      },
      {
        cx: canvasW * 0.62 + alignShift,
        cy: headerH * 0.52,
        bw: canvasW * 0.34,
        bh: headerH * 0.45,
        rotation: 8,
      },
    ];
  }

  if (count === 3) {
    return [
      {
        cx: canvasW * 0.3 + alignShift,
        cy: headerH * 0.59,
        bw: canvasW * 0.28,
        bh: headerH * 0.38,
        rotation: -11,
      },
      {
        cx: canvasW * 0.7 + alignShift,
        cy: headerH * 0.57,
        bw: canvasW * 0.28,
        bh: headerH * 0.38,
        rotation: 10,
      },
      {
        cx: canvasW * 0.5 + alignShift,
        cy: headerH * 0.5,
        bw: canvasW * 0.35,
        bh: headerH * 0.47,
        rotation: -2,
      },
    ];
  }

  if (count === 4) {
    return [
      {
        cx: canvasW * 0.31 + alignShift,
        cy: headerH * 0.43,
        bw: canvasW * 0.24,
        bh: headerH * 0.33,
        rotation: -10,
      },
      {
        cx: canvasW * 0.68 + alignShift,
        cy: headerH * 0.42,
        bw: canvasW * 0.24,
        bh: headerH * 0.33,
        rotation: 9,
      },
      {
        cx: canvasW * 0.38 + alignShift,
        cy: headerH * 0.68,
        bw: canvasW * 0.24,
        bh: headerH * 0.33,
        rotation: -4,
      },
      {
        cx: canvasW * 0.62 + alignShift,
        cy: headerH * 0.64,
        bw: canvasW * 0.24,
        bh: headerH * 0.33,
        rotation: 6,
      },
    ];
  }

  const baseSlots = [
    {
      cx: canvasW * 0.25 + alignShift,
      cy: headerH * 0.44,
      bw: canvasW * 0.22,
      bh: headerH * 0.3,
      rotation: -12,
    },
    {
      cx: canvasW * 0.74 + alignShift,
      cy: headerH * 0.43,
      bw: canvasW * 0.22,
      bh: headerH * 0.3,
      rotation: 12,
    },
    {
      cx: canvasW * 0.35 + alignShift,
      cy: headerH * 0.68,
      bw: canvasW * 0.22,
      bh: headerH * 0.3,
      rotation: -6,
    },
    {
      cx: canvasW * 0.65 + alignShift,
      cy: headerH * 0.66,
      bw: canvasW * 0.22,
      bh: headerH * 0.3,
      rotation: 7,
    },
    {
      cx: canvasW * 0.5 + alignShift,
      cy: headerH * 0.54,
      bw: canvasW * 0.28,
      bh: headerH * 0.38,
      rotation: -1,
    },
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

function arrangeImagesForLayout(
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
        return {
          ...img,
          frameSlotId: undefined,
        };
      }

      assigned.add(nextSlotId);
      const slot = frameSlots.find((item) => item.id === nextSlotId);
      if (!slot) {
        return {
          ...img,
          frameSlotId: undefined,
        };
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

export default function TemplateAClient({ sessionUser }: TemplateAClientProps) {
  const router = useRouter();

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
  const [hoverFrameSlotId, setHoverFrameSlotId] = useState<string | null>(null);
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

  const [previewContentHeight, setPreviewContentHeight] = useState<number>(
    getCanvasFrame("linkedin").h,
  );

  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [finalLoading, setFinalLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const sessionName = sessionUser?.name ?? "";
  const sessionRole = sessionUser?.role ?? "";
  const sessionProfileImage = sessionUser?.profileImage ?? "/profile.jpg";

  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");

  const [badgeText, setBadgeText] = useState("");
  const [title, setTitle] = useState("");

  const [body, _setBody] = useState("");
  const [caption, _setCaption] = useState("");

  const [titleMarks, setTitleMarks] = useState<TextMark[]>([]);
  const [badgeMarks, setBadgeMarks] = useState<TextMark[]>([]);
  const [companyMarks, setCompanyMarks] = useState<TextMark[]>([]);
  const [bodyMarks, setBodyMarks] = useState<TextMark[]>([]);
  const [captionMarks, setCaptionMarks] = useState<TextMark[]>([]);

  const [link, setLink] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [company, setCompany] = useState("PROTOS-3D Metrology GmbH");

  const [activeField, setActiveField] = useState<EditorTextField>("caption");
  const [copied, setCopied] = useState(false);

  const badgeRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const companyRef = useRef<HTMLInputElement | null>(null);
  const captionRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const [titleStyle, setTitleStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 34,
    color: "#111827",
    textAlign: "left",
  });

  const [bodyBoxStyle, setBodyBoxStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 16,
    color: "#111827",
    textAlign: "left",
  });

  const [badgeStyle, setBadgeStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 20,
    color: "#ffffff",
    textAlign: "left",
  });

  const [companyStyle, setCompanyStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 18,
    color: "#111827",
    textAlign: "left",
  });

  const [headlineStyle, setHeadlineStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 28,
    color: "#111827",
    textAlign: "left",
  });

  const [sublineStyle, setSublineStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 18,
    color: "#374151",
    textAlign: "left",
  });

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
    FRAME_PRESETS[0].id,
  );
  const [frameSlotsState, setFrameSlotsState] = useState<FrameSlot[]>(() =>
    resolveFrameSlots(FRAME_PRESETS[0].id, "linkedin"),
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

  function setBadgeTextValue(v: string) {
    setBadgeText(v);
    setBadgeMarks([]);
  }

  function setTitleValue(v: string) {
    setTitle(v);
    setTitleMarks([]);
  }

  function setCompanyValue(v: string) {
    setCompany(v);
    setCompanyMarks([]);
  }

  function setBody(v: string) {
    _setBody(v);
    setBodyMarks([]);
  }

  function setCaption(v: string) {
    _setCaption(v);
    setCaptionMarks([]);
  }

  const normalizedLink: string | undefined = useMemo(() => {
    const urls = link
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => normalizeUrl(l))
      .filter((v): v is string => Boolean(v));

    return urls.length ? urls.join("\n") : undefined;
  }, [link]);

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
      const { [imageId]: _removed, ...imagesById } = prev.images;
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

  function getRichEditText(field: RichEditField) {
    if (field === "title") return title;
    if (field === "company") return company;
    if (field === "badge") return badgeText;
    return body;
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
    const nextTarget = e.relatedTarget;
    if (
      nextTarget instanceof Node &&
      document
        .querySelector('[data-lexical-toolbar="true"]')
        ?.contains(nextTarget)
    ) {
      return;
    }
    setEditField(null);
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
    setSelectedRect(imageToViewportRect(current, previewScale));
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
    setSelectedRect(imageToViewportRect(current, previewScale));
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

  function handleAddLink(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && linkInput.trim()) {
      e.preventDefault();
      setLink((prev) => [...prev, linkInput.trim()]);
      setLinkInput("");
    }
  }

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

  function getRichEditMarks(field: RichEditField) {
    if (field === "title") return titleMarks;
    if (field === "company") return companyMarks;
    if (field === "badge") return badgeMarks;
    return bodyMarks;
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
    const ok = await copyTextToClipboard(text, el);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const activeRichTextEditor = isRichEditField(editField)
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
    setFramePresetId(payload.framePresetId ?? FRAME_PRESETS[0].id);
    setFrameSlotsState(
      payload.frameSlots?.length
        ? payload.frameSlots
        : resolveFrameSlots(
            payload.framePresetId ?? FRAME_PRESETS[0].id,
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
        framePresetId: payload.framePresetId ?? FRAME_PRESETS[0].id,
        frameSlots: payload.frameSlots?.length
          ? payload.frameSlots
          : resolveFrameSlots(
              payload.framePresetId ?? FRAME_PRESETS[0].id,
              payload.canvasPreset ?? "linkedin",
            ),
        mediaBox: payload.mediaBox ?? mediaBox,
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

  function resetMessages() {
    setSuccessMsg("");
    setErrorMsg("");
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = "*";
    if (!body.trim()) next.body = "*";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function downloadPDF(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault();
    e?.stopPropagation();

    resetMessages();

    if (!validate()) {
      setErrorMsg("please fill all of the Fields");
      return;
    }

    setLoadingPdf(true);
    try {
      const legacyProductImageBase64 =
        productImageFile != null
          ? await fileToBase64(productImageFile)
          : undefined;

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
      const message = err instanceof Error ? err.message : "PDF is not created";
      setErrorMsg(message);
    } finally {
      setLoadingPdf(false);
    }
  }

  async function generateFinal(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault();
    e?.stopPropagation();

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
      form.append(
        "videoBox",
        JSON.stringify({
          x: videoBox.x,
          y: videoBox.y,
          w: videoBox.w,
          h: videoBox.h,
        }),
      );
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
      const message =
        err instanceof Error ? err.message : "the creation failed.";
      setErrorMsg(message);
    } finally {
      setFinalLoading(false);
    }
  }

  const selectedImage = getSelectedImage();
  const frameSlots = useMemo(
    () =>
      resolveFrameSlots(framePresetId, canvasPreset).map((slot) => ({
        ...slot,
        imageId: images.find((img) => img.frameSlotId === slot.id)?.id,
      })),
    [framePresetId, canvasPreset, images],
  );

  const selectionHandles: SelectionHandle[] = selectedRect
    ? [
        {
          key: "nw",
          left: -8,
          top: -8,
          cursor: "nwse-resize",
          mode: "resize-nw" as DragMode,
        },
        {
          key: "n",
          left: "50%",
          top: -8,
          transform: "translateX(-50%)",
          cursor: "ns-resize",
          mode: "resize-n" as DragMode,
        },
        {
          key: "ne",
          right: -8,
          top: -8,
          cursor: "nesw-resize",
          mode: "resize-ne" as DragMode,
        },
        {
          key: "e",
          right: -8,
          top: "50%",
          transform: "translateY(-50%)",
          cursor: "ew-resize",
          mode: "resize-e" as DragMode,
        },
        {
          key: "se",
          right: -8,
          bottom: -8,
          cursor: "nwse-resize",
          mode: "resize-se" as DragMode,
        },
        {
          key: "s",
          left: "50%",
          bottom: -8,
          transform: "translateX(-50%)",
          cursor: "ns-resize",
          mode: "resize-s" as DragMode,
        },
        {
          key: "sw",
          left: -8,
          bottom: -8,
          cursor: "nesw-resize",
          mode: "resize-sw" as DragMode,
        },
        {
          key: "w",
          left: -8,
          top: "50%",
          transform: "translateY(-50%)",
          cursor: "ew-resize",
          mode: "resize-w" as DragMode,
        },
      ]
    : [];

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
          <>
            <div className="editor-previewShell">
              <div className="editor-previewHeader">
                <div>
                  <div className="editor-previewEyebrow">Live canvas</div>
                  <h2 className="editor-previewTitle">Preview</h2>
                  <p className="editor-previewText">
                    Edit directly on canvas, then fine-tune details from the
                    side panels.
                  </p>
                </div>

                <label className="editor-previewControl">
                  <span>Canvas</span>
                  <select
                    value={canvasPreset}
                    onChange={(e) => {
                      const v = e.target.value as CanvasPresetKey;
                      setCanvasPreset(v);
                      clearSelection();
                    }}
                    className="editor-previewSelect"
                  >
                    <option value="linkedin">{CANVAS_LABELS.linkedin}</option>
                    <option value="instagram">{CANVAS_LABELS.instagram}</option>
                    <option value="instagramStory">
                      {CANVAS_LABELS.instagramStory}
                    </option>
                  </select>
                </label>
              </div>

              <div className="preview-stage">
                <div
                  ref={canvasWrapRef}
                  className="preview-canvasWrap"
                  style={{
                    width: previewViewportW,
                    height: previewViewportH,
                    position: "relative",
                    overflow: "visible",
                    userSelect: editField ? "text" : "none",
                  }}
                  onClick={onCanvasClick}
                  onDoubleClick={onCanvasDoubleClick}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      overflow: "hidden",
                      borderRadius: "inherit",
                    }}
                  >
                    <div
                      ref={stageRef}
                      className="li2-stage"
                      style={{
                        width: currentCanvas.w,
                        height: previewContentHeight,
                        transform: `scale(${previewScale})`,
                        transformOrigin: "top left",
                        position: "absolute",
                        left: 0,
                        top: 0,
                      }}
                    >
                      <div className="li2-template">
                        <LinkedInTemplate2
                          scale={1}
                          mode="edit"
                          activeRichTextEditor={activeRichTextEditor}
                          canvasPreset={canvasPreset}
                          productImage={effective.productImage}
                          productImages={effective.productImages}
                          editorHideProductMedia
                          editorReserveProductMediaSlot={Boolean(videoPreviewUrl)}
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
                          companyLogo="/logo.png"
                          linkUrl={effective.linkUrl}
                          headline={effective.headline}
                          subline={effective.subline}
                          titleStyle={effective.titleStyle}
                          bodyStyle={effective.bodyStyle}
                          badgeStyle={effective.badgeStyle}
                          companyStyle={effective.companyStyle}
                          headlineStyle={effective.headlineStyle}
                          sublineStyle={effective.sublineStyle}
                          onStartFrameImageDrag={startFrameImageDrag}
                          onSelectableClick={(field, event) => {
                            event.stopPropagation();
                            selectCanvasField(field, event.currentTarget);
                          }}
                          onSelectableDoubleClick={(field, event) => {
                            event.stopPropagation();
                            activateCanvasField(field, event.currentTarget);
                          }}
                        />
                      </div>

                      {editorMediaImages.map((img) => {
                      const cropX = Number.isFinite(img.cropX)
                        ? Number(img.cropX)
                        : 50;
                      const cropY = Number.isFinite(img.cropY)
                        ? Number(img.cropY)
                        : 50;
                      const cropScale = Number.isFinite(img.cropScale)
                        ? Number(img.cropScale)
                        : 1;

                      return (
                        <div
                          key={`editor-media-${img.id}`}
                          data-select="productImage"
                          data-image-id={img.id}
                          data-frame-slot-id={img.frameSlotId}
                          aria-label="Product image"
                          style={{
                            position: "absolute",
                            left: img.x,
                            top: img.y,
                            width: img.w,
                            height: img.h,
                            zIndex: img.zIndex,
                            overflow: "hidden",
                            borderRadius: img.radius,
                            clipPath: img.clipPath,
                            transform: `rotate(${img.rotation}deg)`,
                            transformOrigin: "center center",
                            border:
                              imageLayout === "collage"
                                ? "1px solid rgba(255,255,255,0.92)"
                                : "1px solid rgba(15,23,42,0.10)",
                            background:
                              imageLayout === "collage"
                                ? "#ffffff"
                                : "transparent",
                            pointerEvents: "auto",
                            boxSizing: "border-box",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            selectImageObject(img);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            selectImageObject(img);
                          }}
                        >
                          <img
                            src={img.src}
                            alt="product"
                            draggable={false}
                            style={{
                              position: "absolute",
                              left: `${cropX}%`,
                              top: `${cropY}%`,
                              width: `${cropScale * 100}%`,
                              height: `${cropScale * 100}%`,
                              maxWidth: "none",
                              maxHeight: "none",
                              transform: "translate(-50%, -50%)",
                              objectFit: "cover",
                              display: "block",
                              userSelect: "none",
                              pointerEvents: "none",
                            }}
                          />
                        </div>
                      );
                    })}

                      {videoPreviewUrl ? (
                      <div
                        data-select="video"
                        aria-label="Uploaded video preview"
                        style={{
                          position: "absolute",
                          left: videoBox.x,
                          top: videoBox.y,
                          width: videoBox.w,
                          height: videoBox.h,
                          zIndex: videoPreviewZIndex,
                          overflow: "hidden",
                          borderRadius: 20,
                          transformOrigin: "center center",
                          border: "1px solid rgba(15,23,42,0.10)",
                          background: "#111827",
                          pointerEvents: "auto",
                          boxSizing: "border-box",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectVideoObject();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectVideoObject();
                        }}
                      >
                        <video
                          src={videoPreviewUrl}
                          muted
                          playsInline
                          preload="metadata"
                          style={{
                            display: "block",
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                        />
                      </div>
                    ) : null}

                      {selectedRect &&
                      !(editField && isPreviewTextSelectableId(selectedId)) ? (
                      <div
                        className={`editor-canvasSelection ${
                          isPreviewTextSelectableId(selectedId)
                            ? "editor-canvasSelection--text"
                            : "editor-canvasSelection--media"
                        }`}
                        data-selection-overlay="true"
                        data-media-selection-ui="true"
                        data-select={selectedId ?? undefined}
                        data-image-id={
                          selectedId === "productImage"
                            ? (selectedImageId ?? undefined)
                            : undefined
                        }
                        data-active-element={selectedId ?? undefined}
                        style={{
                          position: "absolute",
                          left: selectedRect.x,
                          top: selectedRect.y,
                          width: selectedRect.width,
                          height: selectedRect.height,
                          pointerEvents:
                            (selectedId === "productImage" ||
                              selectedId === "frameSlot" ||
                              selectedId === "video") &&
                            !editField
                              ? "auto"
                              : "none",
                          boxSizing: "border-box",
                          cursor:
                            selectedId === "productImage"
                              ? imageLayout === "frame"
                                ? "grab"
                                : "move"
                              : selectedId === "video"
                                ? "move"
                                : "default",
                          zIndex: 9999,
                        }}
                        onMouseDown={
                          selectedId === "productImage"
                            ? (e) => {
                                e.stopPropagation();
                                startMediaInteraction(
                                  e,
                                  imageLayout === "frame"
                                    ? "frame-image-pan"
                                    : "move",
                                );
                              }
                            : selectedId === "video"
                              ? (e) => {
                                  e.stopPropagation();
                                  startVideoInteraction(e, "move");
                                }
                              : undefined
                        }
                      >
                        {(selectedId === "productImage" &&
                          !editField &&
                          imageLayout !== "frame") ||
                        (selectedId === "video" && !editField) ||
                        (imageLayout === "frame" &&
                          !editField &&
                          (selectedId === "productImage" ||
                            selectedId === "frameSlot")) ? (
                          <>
                            {selectionHandles.map((h) => (
                              <div
                                key={h.key}
                                data-resize-handle="true"
                                style={{
                                  position: "absolute",
                                  width: 16,
                                  height: 16,
                                  borderRadius: 999,
                                  background: "#2563eb",
                                  border: "2px solid #fff",
                                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                                  cursor: h.cursor,
                                  left: h.left,
                                  right: h.right,
                                  top: h.top,
                                  bottom: h.bottom,
                                  transform: h.transform,
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (selectedId === "video") {
                                    startVideoInteraction(e, h.mode);
                                  } else if (
                                    imageLayout === "frame" &&
                                    selectedId === "frameSlot"
                                  ) {
                                    const current = getSelectedFrameSlot();
                                    if (!current) return;
                                    dragStateRef.current = {
                                      mode: h.mode,
                                      startClientX: e.clientX,
                                      startClientY: e.clientY,
                                      startImage: selectedImage,
                                      startFrameSlot: current,
                                      startAngle: 0,
                                      centerX: 0,
                                      centerY: 0,
                                    };
                                  } else {
                                    startMediaInteraction(e, h.mode);
                                  }
                                }}
                              />
                            ))}

                            {imageLayout !== "frame" &&
                            selectedId === "productImage" ? (
                              <div
                                style={{
                                  position: "absolute",
                                  left: "50%",
                                  top: -34,
                                  width: 16,
                                  height: 16,
                                  borderRadius: 999,
                                  background: "#111827",
                                  border: "2px solid #fff",
                                  transform: "translateX(-50%)",
                                  cursor: "grab",
                                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                                }}
                                onMouseDown={(e) =>
                                  startMediaInteraction(e, "rotate")
                                }
                              />
                            ) : null}

                            {imageLayout === "frame" &&
                            selectedId === "productImage" ? (
                              <div
                                title="Drag to move image inside frame"
                                style={{
                                  position: "absolute",
                                  left: 16,
                                  bottom: 16,
                                  height: 28,
                                  padding: "0 10px",
                                  borderRadius: 999,
                                  border: "1px solid rgba(0,0,0,0.12)",
                                  background: "rgba(255,255,255,0.96)",
                                  fontSize: 12,
                                  display: "flex",
                                  alignItems: "center",
                                  cursor: "grab",
                                }}
                                onMouseDown={(e) =>
                                  startMediaInteraction(e, "frame-image-pan")
                                }
                              >
                                Move image
                              </div>
                            ) : null}

                            {imageLayout === "frame" &&
                            selectedId === "productImage" ? (
                              <div
                                title="Resize image inside frame"
                                style={{
                                  position: "absolute",
                                  right: 18,
                                  bottom: 18,
                                  width: 18,
                                  height: 18,
                                  borderRadius: 6,
                                  background: "#111827",
                                  border: "2px solid #fff",
                                  cursor: "nwse-resize",
                                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                                }}
                                onMouseDown={(e) =>
                                  startMediaInteraction(e, "frame-image-scale")
                                }
                              />
                            ) : null}

                            {selectedId === "productImage" ? (
                              <button
                                type="button"
                                style={{
                                  position: "absolute",
                                  right: -8,
                                  top: -40,
                                  height: 28,
                                  padding: "0 8px",
                                  borderRadius: 999,
                                  border: "1px solid rgba(0,0,0,0.12)",
                                  background: "#fff",
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSelectedImage();
                                }}
                              >
                                Remove
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {finalUrl ? (
              <div className="preview-videoWrap">
                <video
                  className="preview-video"
                  src={finalUrl}
                  controls
                  playsInline
                />
              </div>
            ) : null}
          </>
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
          <div className="export-actions-panel">
            <div className="export-actions-panel__header">
              <h3>Export</h3>
              <p>Generate or download the final content.</p>
            </div>

            <div className="export-actions-panel__actions">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  downloadPDF(e);
                }}
                disabled={loadingPdf || hasVideo}
                className="tb__action tb__action--primary"
              >
                {loadingPdf ? "Generating PDF..." : "Download PDF"}
              </button>
              {hasVideo ? (
                <p className="export-actions-panel__hint">
                  PDF export is disabled while a video object is on the canvas.
                  Please use Generate final.mp4.
                </p>
              ) : null}

              <button
                type="button"
                onClick={(e) => generateFinal(e)}
                disabled={finalLoading || !hasVideo}
                className="tb__action tb__action--dark"
              >
                {finalLoading ? "Generating..." : "Generate final.mp4"}
              </button>

              {finalUrl ? (
                <a
                  href={finalUrl}
                  download="final.mp4"
                  className="tb__download"
                >
                  Download generated video
                </a>
              ) : null}
            </div>
          </div>
        }
      />
    </LinkedInEditorBaseClient>
  );
}
