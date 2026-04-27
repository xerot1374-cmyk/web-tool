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
import TextToolbar from "@/app/components/templates/linkedin-shared/TextToolbar";

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
import PropertiesPanel from "@/app/components/templates/linkedin-shared/PropertiesPanel";

type SessionUser = {
  name: string;
  role: string;
  profileImage: string;
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

type UnicodeStyle = "bold" | "italic";

const UNICODE_MAPS: Record<
  UnicodeStyle,
  { upper: number; lower: number; digits: number }
> = {
  bold: { upper: 0x1d400, lower: 0x1d41a, digits: 0x1d7ce },
  italic: { upper: 0x1d434, lower: 0x1d44e, digits: -1 },
};

function toUnicodeStyledChar(ch: string, style: UnicodeStyle) {
  const code = ch.codePointAt(0);
  if (code == null) return ch;

  const map = UNICODE_MAPS[style];

  if (code >= 0x41 && code <= 0x5a) {
    return String.fromCodePoint(map.upper + (code - 0x41));
  }
  if (code >= 0x61 && code <= 0x7a) {
    return String.fromCodePoint(map.lower + (code - 0x61));
  }
  if (code >= 0x30 && code <= 0x39) {
    if (map.digits >= 0) {
      return String.fromCodePoint(map.digits + (code - 0x30));
    }
    return ch;
  }
  return ch;
}

function styleUnicodeText(input: string, style: UnicodeStyle) {
  let out = "";
  for (const ch of input) out += toUnicodeStyledChar(ch, style);
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function applyOnSelection(
  text: string,
  selStart: number,
  selEnd: number,
  transform: (selected: string) => string
) {
  const start = clamp(Math.min(selStart, selEnd), 0, text.length);
  const end = clamp(Math.max(selStart, selEnd), 0, text.length);

  const selected = text.slice(start, end);
  const replaced = transform(selected);

  const next = text.slice(0, start) + replaced + text.slice(end);
  const nextSelStart = start;
  const nextSelEnd = start + replaced.length;

  return { next, nextSelStart, nextSelEnd };
}

function applyOnLines(
  text: string,
  selStart: number,
  selEnd: number,
  perLine: (line: string, idx: number) => string
) {
  const start = clamp(Math.min(selStart, selEnd), 0, text.length);
  const end = clamp(Math.max(selStart, selEnd), 0, text.length);

  const rangeStart =
    start === end ? text.lastIndexOf("\n", start - 1) + 1 : start;
  const rangeEnd =
    start === end
      ? (() => {
          const n = text.indexOf("\n", end);
          return n === -1 ? text.length : n;
        })()
      : end;

  const lineStart = text.lastIndexOf("\n", rangeStart - 1) + 1;
  const after = text.indexOf("\n", rangeEnd);
  const lineEnd = after === -1 ? text.length : after;

  const block = text.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const replacedLines = lines.map((ln, i) => perLine(ln, i));
  const replacedBlock = replacedLines.join("\n");

  const next = text.slice(0, lineStart) + replacedBlock + text.slice(lineEnd);
  const nextSelStart = lineStart;
  const nextSelEnd = lineStart + replacedBlock.length;

  return { next, nextSelStart, nextSelEnd };
}

function toHashtag(s: string) {
  const cleaned = s
    .trim()
    .replace(/[\u200c]/g, "")
    .replace(/[^\p{L}\p{N}\s_]+/gu, "")
    .replace(/\s+/g, "");

  if (!cleaned) return "";
  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
}

async function copyTextToClipboard(
  text: string,
  fallbackEl?: HTMLTextAreaElement | HTMLInputElement | null
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

const EMOJIS = [
  "🔥",
  "✅",
  "🚀",
  "💡",
  "🎯",
  "📌",
  "🤝",
  "📈",
  "🧠",
  "✨",
  "💬",
  "🧩",
];

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

function getPdfModeAndPayload(): { isPdf: boolean; payload: PdfPayload | null } {
  if (typeof window === "undefined") return { isPdf: false, payload: null };
  const isPdf = new URLSearchParams(window.location.search).get("__pdf") === "1";
  const payload = isPdf ? window.__PDF_PAYLOAD__ ?? null : null;
  return { isPdf, payload };
}

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  highlight: boolean;
};

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

type EditorTextField = "title" | "body" | "badge" | "company" | "caption";

type EditField = Exclude<EditorTextField, "caption"> | null;

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

function safePx(v: string | null | undefined, fallback: number) {
  const n = v ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function imageToViewportRect(
  image: Pick<ImageItem, "x" | "y" | "w" | "h">,
  _scale: number
) {
  return new DOMRect(
    image.x,
    image.y,
    image.w,
    image.h
  );
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

function getImageAspectRatio(image: Pick<ImageItem, "w" | "h" | "orientation">) {
  if (image.w > 0 && image.h > 0) {
    return image.w / image.h;
  }
  return image.orientation === "portrait" ? 3 / 4 : 4 / 3;
}

function fitImageToBounds(
  image: Pick<ImageItem, "w" | "h" | "orientation">,
  maxW: number,
  maxH: number
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
  align: "left" | "center" | "right"
) {
  const alignShift =
    align === "left" ? -canvasW * 0.12 : align === "right" ? canvasW * 0.12 : 0;

  if (count <= 1) {
    return [
      { cx: canvasW * 0.5 + alignShift, cy: headerH * 0.57, bw: canvasW * 0.44, bh: headerH * 0.5, rotation: -3 },
    ];
  }

  if (count === 2) {
    return [
      { cx: canvasW * 0.4 + alignShift, cy: headerH * 0.57, bw: canvasW * 0.34, bh: headerH * 0.45, rotation: -9 },
      { cx: canvasW * 0.62 + alignShift, cy: headerH * 0.52, bw: canvasW * 0.34, bh: headerH * 0.45, rotation: 8 },
    ];
  }

  if (count === 3) {
    return [
      { cx: canvasW * 0.3 + alignShift, cy: headerH * 0.59, bw: canvasW * 0.28, bh: headerH * 0.38, rotation: -11 },
      { cx: canvasW * 0.7 + alignShift, cy: headerH * 0.57, bw: canvasW * 0.28, bh: headerH * 0.38, rotation: 10 },
      { cx: canvasW * 0.5 + alignShift, cy: headerH * 0.5, bw: canvasW * 0.35, bh: headerH * 0.47, rotation: -2 },
    ];
  }

  if (count === 4) {
    return [
      { cx: canvasW * 0.31 + alignShift, cy: headerH * 0.43, bw: canvasW * 0.24, bh: headerH * 0.33, rotation: -10 },
      { cx: canvasW * 0.68 + alignShift, cy: headerH * 0.42, bw: canvasW * 0.24, bh: headerH * 0.33, rotation: 9 },
      { cx: canvasW * 0.38 + alignShift, cy: headerH * 0.68, bw: canvasW * 0.24, bh: headerH * 0.33, rotation: -4 },
      { cx: canvasW * 0.62 + alignShift, cy: headerH * 0.64, bw: canvasW * 0.24, bh: headerH * 0.33, rotation: 6 },
    ];
  }

  const baseSlots = [
    { cx: canvasW * 0.25 + alignShift, cy: headerH * 0.44, bw: canvasW * 0.22, bh: headerH * 0.3, rotation: -12 },
    { cx: canvasW * 0.74 + alignShift, cy: headerH * 0.43, bw: canvasW * 0.22, bh: headerH * 0.3, rotation: 12 },
    { cx: canvasW * 0.35 + alignShift, cy: headerH * 0.68, bw: canvasW * 0.22, bh: headerH * 0.3, rotation: -6 },
    { cx: canvasW * 0.65 + alignShift, cy: headerH * 0.66, bw: canvasW * 0.22, bh: headerH * 0.3, rotation: 7 },
    { cx: canvasW * 0.5 + alignShift, cy: headerH * 0.54, bw: canvasW * 0.28, bh: headerH * 0.38, rotation: -1 },
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
  frameSlotsOverride?: FrameSlot[]
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
        img.frameSlotId && slotIds.includes(img.frameSlotId) ? img.frameSlotId : undefined;

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
      Math.max(safeSide, canvas.w - safeSide - fit.w)
    );
    const y = clamp(
      Math.round(slot.cy - fit.h / 2),
      safeTop,
      Math.max(safeTop, headerH - safeBottom - fit.h)
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

export default function TemplateAClient({
  sessionUser,
}: TemplateAClientProps) {
  const router = useRouter();

  const [{isPdf, payload}, setPdfCtx] = useState<{
    isPdf: boolean;
    payload: PdfPayload | null;
  }>(() => ({isPdf: false, payload: null}));

  useEffect(() => {
    setPdfCtx(getPdfModeAndPayload());
  }, []);

  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageClipboardRef = useRef<ImageClipboardPayload | null>(null);

  const [canvasPreset, setCanvasPreset] = useState<CanvasPresetKey>("linkedin");

  const [selectedId, setSelectedId] = useState<SelectableId | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [selectedFrameSlotId, setSelectedFrameSlotId] = useState<string | null>(null);
  const [hoverFrameSlotId, setHoverFrameSlotId] = useState<string | null>(null);

  const [editField, setEditField] = useState<EditField>(null);
  const editRef = useRef<HTMLTextAreaElement | null>(null);
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
    startFrameSlot?: FrameSlot | null;
    startAngle: number;
    centerX: number;
    centerY: number;
    hoverFrameSlotId?: string | null;
  } | null>(null);

  const [previewContentHeight, setPreviewContentHeight] = useState<number>(
      getCanvasFrame("linkedin").h
  );

  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [finalLoading, setFinalLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const sessionName = sessionUser?.name ?? "";
  const sessionRole = sessionUser?.role ?? "";
  const sessionProfileImage = sessionUser?.profileImage ?? "/avatar.png";

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

  const [bodyStyle] = useState<TextStyle>({
    fontFamily: "system-ui",
    fontSize: 14,
    color: "#111827",
    highlight: false,
  });

  const [captionStyle] = useState<TextStyle>({
    fontFamily: "system-ui",
    fontSize: 14,
    color: "#111827",
    highlight: false,
  });

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

  const [toolbarStyles, setToolbarStyles] = useState<Record<EditorTextField, TextStyle>>({
    badge: {
      fontFamily: "system-ui",
      fontSize: 20,
      color: "#ffffff",
      highlight: false,
    },
    title: {
      fontFamily: "system-ui",
      fontSize: 34,
      color: "#111827",
      highlight: false,
    },
    company: {
      fontFamily: "system-ui",
      fontSize: 18,
      color: "#111827",
      highlight: false,
    },
    body: {
      fontFamily: "system-ui",
      fontSize: 14,
      color: "#111827",
      highlight: false,
    },
    caption: {
      fontFamily: "system-ui",
      fontSize: 14,
      color: "#111827",
      highlight: false,
    },
  });

  const [productImage, setProductImage] = useState<string>("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productOrientation, setProductOrientation] =
      useState<"landscape" | "portrait">("landscape");
  const [productAlign, setProductAlign] = useState<"left" | "center" | "right">(
      "center"
  );
  const [imageLayout, setImageLayout] = useState<ImageLayoutMode>("manual");
  const [framePresetId, setFramePresetId] = useState<string>(FRAME_PRESETS[0].id);
  const [frameSlotsState, setFrameSlotsState] = useState<FrameSlot[]>(() =>
    resolveFrameSlots(FRAME_PRESETS[0].id, "linkedin")
  );

  const [images, setImages] = useState<ImageItem[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
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
    return {w: Math.round(w * r), h: Math.round(h * r)};
  }

  function clampImageBox(
      item: Pick<ImageItem, "x" | "y" | "w" | "h">,
      canvasW: number,
      canvasH: number
  ) {
    const minW = 60;
    const minH = 60;

    const w = clamp(item.w, minW, canvasW);
    const h = clamp(item.h, minH, canvasH);
    const x = clamp(item.x, 0, Math.max(0, canvasW - w));
    const y = clamp(item.y, 0, Math.max(0, canvasH - h));

    return {x, y, w, h};
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

    const {w, h} = calcFitSize(w0, h0, preset.maxW, preset.maxH);

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
          preset.quality
      );
    });

    return new File([blob], `product-resized.jpg`, {type: preset.mime});
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
        prev.map((img) => (img.id === selectedImageId ? updater(img) : img))
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
    setMediaBox({x: first.x, y: first.y, w: first.w, h: first.h});
  }

  function applyImageLayout(
    nextLayout: ImageLayoutMode,
    sourceImages: ImageItem[],
    align: "left" | "center" | "right" = productAlign
  ) {
    return arrangeImagesForLayout(
      sourceImages,
      nextLayout,
      canvasPreset,
      align,
      framePresetId,
      frameSlotsState
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
        nextFrameSlots
      );
      syncLegacyFromFirstImage(next);
      return next;
    });
  }

  function setProductAlignValue(nextAlign: "left" | "center" | "right") {
    setProductAlign(nextAlign);

    if (imageLayout === "collage") {
      setImages((prev) => {
        const next = applyImageLayout(imageLayout, prev, nextAlign);
        syncLegacyFromFirstImage(next);
        return next;
      });
      return;
    }

    if (imageLayout === "frame") {
      return;
    }

    if (selectedImageId) {
      updateSelectedImageAlign(nextAlign);
    }
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
        currentCanvas.h * 0.5
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
        ? selectedFrameSlotId ??
          getSelectedImage()?.frameSlotId ??
          getFirstAvailableFrameSlotId(
            framePresetId,
            canvasPreset,
            images.map((img) => img.frameSlotId).filter(Boolean) as string[]
          )
        : undefined;

    setImages((prev) => {
      if (imageLayout === "frame") {
        const existingIndex = prev.findIndex((img) => img.frameSlotId === targetFrameSlotId);
        const nextWithSlot = { ...nextImage, frameSlotId: targetFrameSlotId };
        const raw =
          existingIndex >= 0
            ? prev.map((img, index) => (index === existingIndex ? nextWithSlot : img))
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
    setSelectedRect(targetFrameSlotId ? getFrameSlotRect(targetFrameSlotId) : null);
  }

  function removeSelectedImage() {
    if (!selectedImageId) return;
    setImages((prev) => {
      const next = applyImageLayout(
        imageLayout,
        prev.filter((img) => img.id !== selectedImageId)
      );
      syncLegacyFromFirstImage(next);
      return next;
    });
    setSelectedImageId(null);
    setSelectedId(null);
    setSelectedRect(null);
  }

  function duplicateSelectedImage() {
    const current = getSelectedImage();
    if (!current) return;

    const dup: ImageItem = {
      ...current,
      id: uid(),
      x: clamp(current.x + 24, 0, Math.max(0, currentCanvas.w - current.w)),
      y: clamp(current.y + 24, 0, Math.max(0, currentCanvas.h - current.h)),
    };

    setImages((prev) => {
      const next = applyImageLayout(imageLayout, [...prev, dup]);
      syncLegacyFromFirstImage(next);
      return next;
    });
    setSelectedId("productImage");
    setSelectedImageId(dup.id);
  }

  function copySelectedImageToClipboard() {
    const current = getSelectedImage();
    if (!current) return;
    imageClipboardRef.current = {
      type: "image",
      image: {...current},
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
  }

  function rotateSelectedImage(delta: number) {
    updateSelectedImage((prev) => ({
      ...prev,
      rotation: normalizeAngle(prev.rotation + delta),
    }));
  }

  function setSelectedImageRotation(rotation: number) {
    updateSelectedImage((prev) => ({
      ...prev,
      rotation: normalizeAngle(rotation),
    }));
  }

  function setSelectedImageCropX(v: number) {
    updateSelectedImage((prev) => ({
      ...prev,
      cropX: clamp(v, 0, 100),
    }));
  }

  function setSelectedImageCropY(v: number) {
    updateSelectedImage((prev) => ({
      ...prev,
      cropY: clamp(v, 0, 100),
    }));
  }

  function setSelectedImageCropScale(v: number) {
    updateSelectedImage((prev) => ({
      ...prev,
      cropScale: clamp(v, 1, 3),
    }));
  }

  function updateSelectedImageAlign(dir: "left" | "center" | "right") {
    const current = getSelectedImage();
    if (!current) return;

    let x = current.x;
    if (dir === "left") x = 24;
    if (dir === "center") x = Math.round((currentCanvas.w - current.w) / 2);
    if (dir === "right") x = Math.round(currentCanvas.w - current.w - 24);

    updateSelectedImage((prev) => ({
      ...prev,
      x: clamp(x, 0, Math.max(0, currentCanvas.w - prev.w)),
    }));
  }

  function getFrameSlotRect(slotId: string) {
    const slot = frameSlotsState.find((item) => item.id === slotId);
    if (!slot) return null;
    return new DOMRect(slot.x, slot.y, slot.w, slot.h);
  }

  function getFrameSlotAtPoint(x: number, y: number) {
    return frameSlotsState.find(
      (slot) => x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h
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
        (img) => img.id !== imageId && img.frameSlotId === targetSlotId
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
        slot.id === selectedFrameSlotId ? updater(slot) : slot
      );
      setImages((currentImages) => {
        const nextImages = arrangeImagesForLayout(
          currentImages,
          "frame",
          canvasPreset,
          productAlign,
          framePresetId,
          nextSlots
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
          img.id === selectedImageId ? { ...img, frameSlotId: slotId } : img
        )
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

  function onCanvasClick(e: React.MouseEvent) {
    const t = getSelectableTarget(e.target);

    if (!t) {
      clearSelection();
      return;
    }

    const id = (t.getAttribute("data-select") || "") as SelectableId;
    setSelectedId(id);

    if (id === "productImage") {
      const imageId = t.getAttribute("data-image-id");
      if (imageId) {
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
    } else {
      const rect = computeRectRelativeToStage(t);
      setSelectedRect(rect);
      setSelectedImageId(null);
      setSelectedFrameSlotId(null);
    }

    if (editField && id !== editField) setEditField(null);
  }

  function startEdit(field: Exclude<EditField, null>, targetEl: HTMLElement) {
    setEditField(field);
    setSelectedId(field);

    const rect = computeRectRelativeToStage(targetEl);
    setSelectedRect(rect);

    const cs = window.getComputedStyle(targetEl);
    const fontSize = safePx(
        cs.fontSize,
        field === "title" ? 34 : field === "badge" ? 20 : field === "company" ? 18 : 16
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
      background: "rgba(255,255,255,0.92)",
      borderRadius: 8,
    });
  }

  function onCanvasDoubleClick(e: React.MouseEvent) {
    const t = getSelectableTarget(e.target);
    if (!t) return;

    const id = (t.getAttribute("data-select") || "") as SelectableId;
    if (id !== "title" && id !== "body" && id !== "badge" && id !== "company") return;

    if (id === "badge") {
      setEditField(null);
      setSelectedId("badge");
      setSelectedRect(computeRectRelativeToStage(t));
      setSelectedImageId(null);
      setSelectedFrameSlotId(null);
      return;
    }

    startEdit(id, t);
  }

  function selectCanvasField(
    field: "title" | "body" | "badge" | "company",
    targetEl: HTMLElement
  ) {
    setSelectedId(field);
    setSelectedRect(computeRectRelativeToStage(targetEl));
    setSelectedImageId(null);
    setSelectedFrameSlotId(null);
    if (editField && field !== editField) setEditField(null);
  }

  function activateCanvasField(
    field: "title" | "body" | "badge" | "company",
    targetEl: HTMLElement
  ) {
    if (field === "badge") {
      setEditField(null);
      selectCanvasField(field, targetEl);
      return;
    }
    startEdit(field, targetEl);
  }

    useEffect(() => {
      if (!editField) return;
      requestAnimationFrame(() => {
        editRef.current?.focus();
        const v = editRef.current?.value ?? "";
        editRef.current?.setSelectionRange(v.length, v.length);
      });
    }, [editField]);

    function onEditBlur() {
      setEditField(null);
    }

    function onEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Escape") {
        e.preventDefault();
        setEditField(null);
      }
    }

    function startMediaInteraction(
        e: React.MouseEvent<HTMLDivElement>,
        mode: DragMode,
        imageOverride?: ImageItem | null
    ) {
      const current = imageOverride ?? getSelectedImage();
      if (!current) return;

      e.preventDefault();
      e.stopPropagation();

      if (imageLayout === "frame") {
        const selectedSlot = current.frameSlotId
          ? frameSlotsState.find((slot) => slot.id === current.frameSlotId) ?? null
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
          stagePoint?.y ?? centerY
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

    function startFrameImageDrag(
      imageId: string,
      e: React.MouseEvent<HTMLDivElement>
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
        if (!drag || !drag.mode || !drag.startImage) return;

        const dx = (e.clientX - drag.startClientX) / previewScale;
        const dy = (e.clientY - drag.startClientY) / previewScale;
        const start = drag.startImage;

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
            (drag.startImage.cropX ?? 50) - (dx / Math.max(frameSlot.w, 1)) * 100,
            0,
            100
          );
          const nextCropY = clamp(
            (drag.startImage.cropY ?? 50) - (dy / Math.max(frameSlot.h, 1)) * 100,
            0,
            100
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
              stagePoint?.y ?? drag.centerY
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
              currentCanvas.h
          );
          updateSelectedImage((prev) => ({...prev, ...next}));
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
            currentCanvas.h
        );

        updateSelectedImage((prev) => ({...prev, ...fixed}));
      }

      function onWindowUp() {
        const drag = dragStateRef.current;
        if (drag?.mode === "frame-swap" && drag.startImage) {
          const targetSlotId = drag.hoverFrameSlotId ?? drag.startImage.frameSlotId ?? null;
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
    }, [previewScale, currentCanvas.w, currentCanvas.h, selectedImageId, images, imageLayout, framePresetId, canvasPreset]);

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
          nextFrameSlots
        );
        syncLegacyFromFirstImage(next);
        return next;
      });
    }, [imageLayout, framePresetId, canvasPreset]);

    useEffect(() => {
      function onWindowKeyDown(e: KeyboardEvent) {
        const metaOrCtrl = e.ctrlKey || e.metaKey;

        if (metaOrCtrl && e.key.toLowerCase() === "c" && selectedImageId && !editField) {
          if (isEditableTarget(e.target)) return;
          e.preventDefault();
          copySelectedImageToClipboard();
          return;
        }

        if (metaOrCtrl && e.key.toLowerCase() === "x" && selectedImageId && !editField) {
          if (isEditableTarget(e.target)) return;
          e.preventDefault();
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
    }, [selectedImageId, editField, images, canvasPreset]);

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

    function getEditorFieldControl(
        field: EditorTextField = activeField
    ): {
      text: string;
      setText: (value: string) => void;
      ref: RefObject<HTMLInputElement | null> | RefObject<HTMLTextAreaElement | null>;
    } {
      switch (field) {
        case "badge":
          return {text: badgeText, setText: setBadgeTextValue, ref: badgeRef};
        case "title":
          return {text: title, setText: setTitleValue, ref: titleRef};
        case "company":
          return {text: company, setText: setCompanyValue, ref: companyRef};
        case "body":
          return {text: body, setText: setBody, ref: bodyRef};
        case "caption":
        default:
          return {text: caption, setText: setCaption, ref: captionRef};
      }
    }

    function withActiveSelection(
        fn: (
            text: string,
            s: number,
            e: number
        ) => {
          next: string;
          nextSelStart: number;
          nextSelEnd: number;
        }
    ) {
      const {text, setText, ref} = getEditorFieldControl();
      const el = ref.current;
      if (!el) return;

      const s = el.selectionStart ?? 0;
      const e = el.selectionEnd ?? 0;

      const {next, nextSelStart, nextSelEnd} = fn(text, s, e);
      setText(next);

      requestAnimationFrame(() => {
        const node = ref.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(nextSelStart, nextSelEnd);
      });
    }

    function getActiveMarksState(field: EditorTextField = activeField) {
      switch (field) {
        case "badge":
          return {marks: badgeMarks, setMarks: setBadgeMarks};
        case "title":
          return {marks: titleMarks, setMarks: setTitleMarks};
        case "company":
          return {marks: companyMarks, setMarks: setCompanyMarks};
        case "body":
          return {marks: bodyMarks, setMarks: setBodyMarks};
        case "caption":
        default:
          return {marks: captionMarks, setMarks: setCaptionMarks};
      }
    }

    function clampRange(start: number, end: number, max: number) {
      const s = Math.max(0, Math.min(start, max));
      const e = Math.max(0, Math.min(end, max));
      return s <= e ? {s, e} : {s: e, e: s};
    }

    function overlaps(
        a: { start: number; end: number },
        b: { start: number; end: number }
    ) {
      return a.start < b.end && b.start < a.end;
    }

    function splitMark(mark: TextMark, cutStart: number, cutEnd: number): TextMark[] {
      const out: TextMark[] = [];
      if (mark.start < cutStart) out.push({...mark, end: cutStart});
      if (cutEnd < mark.end) out.push({...mark, start: cutEnd});
      return out;
    }

    function applyStyleToMarks(
        prev: TextMark[],
        range: { start: number; end: number },
        patch: RichStyle
    ) {
      const next: TextMark[] = [];
      let covered = false;

      for (const m of prev) {
        if (!overlaps(m, range)) {
          next.push(m);
          continue;
        }

        if (m.start < range.start) {
          next.push({...m, end: range.start});
        }

        const midStart = Math.max(m.start, range.start);
        const midEnd = Math.min(m.end, range.end);
        if (midEnd > midStart) {
          covered = true;
          next.push({
            start: midStart,
            end: midEnd,
            style: {...(m.style ?? {}), ...patch},
          });
        }

        if (range.end < m.end) {
          next.push({...m, start: range.end});
        }
      }

      if (!covered) {
        next.push({start: range.start, end: range.end, style: {...patch}});
      }

      next.sort((a, b) => a.start - b.start);

      const merged: TextMark[] = [];
      for (const m of next) {
        const last = merged[merged.length - 1];
        if (
            last &&
            last.end === m.start &&
            JSON.stringify(last.style) === JSON.stringify(m.style)
        ) {
          last.end = m.end;
        } else {
          merged.push({...m, style: {...(m.style ?? {})}});
        }
      }

      return merged.filter((m) => m.end > m.start);
    }

    function toggleHighlightMarks(
        prev: TextMark[],
        range: { start: number; end: number }
    ) {
      let had = false;
      for (const m of prev) {
        if (overlaps(m, range) && m.style.highlight) {
          had = true;
          break;
        }
      }

      if (had) {
        const out: TextMark[] = [];
        for (const m of prev) {
          if (!overlaps(m, range)) {
            out.push(m);
            continue;
          }
          out.push(...splitMark(m, range.start, range.end));
        }
        return out;
      }

      return applyStyleToMarks(prev, range, {highlight: true});
    }

    function applyStyleSelection(
        patch: RichStyle,
        mode: "set" | "toggleHighlight" = "set"
    ) {
      withActiveSelection((text, s0, e0) => {
        const {s, e} = clampRange(s0, e0, text.length);
        if (s === e) return {next: text, nextSelStart: s, nextSelEnd: e};

        const {setMarks, marks} = getActiveMarksState();

        if (mode === "toggleHighlight") {
          setMarks(toggleHighlightMarks(marks, {start: s, end: e}));
        } else {
          setMarks(applyStyleToMarks(marks, {start: s, end: e}, patch));
        }

        return {next: text, nextSelStart: s, nextSelEnd: e};
      });
    }

    function applySelectionStyleForField(
        field: "title" | "body" | "badge" | "company",
        patch: RichStyle,
        mode: "set" | "toggleHighlight" = "set"
    ) {
      const {text, ref} = getEditorFieldControl(field);
      const el = ref.current;
      if (!el) return false;

      const {s, e} = clampRange(el.selectionStart ?? 0, el.selectionEnd ?? 0, text.length);
      if (s === e) return false;

      const {setMarks, marks} = getActiveMarksState(field);

      if (mode === "toggleHighlight") {
        setMarks(toggleHighlightMarks(marks, {start: s, end: e}));
      } else {
        setMarks(applyStyleToMarks(marks, {start: s, end: e}, patch));
      }

      setActiveField(field);
      setToolbarStyles((prev) => ({
        ...prev,
        [field]: {...prev[field], ...patch},
      }));

      return true;
    }

    function applyUnicodeStyle(style: UnicodeStyle) {
      withActiveSelection((text, s, e) =>
          applyOnSelection(text, s, e, (selected) => {
            if (!selected) return "";
            return styleUnicodeText(selected, style);
          })
      );
    }

    function applyBullet() {
      withActiveSelection((text, s, e) =>
          applyOnLines(text, s, e, (line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (/^\s*•\s+/.test(line)) return line;
            return `• ${line}`;
          })
      );
    }

    function applyNumbered() {
      withActiveSelection((text, s, e) =>
          applyOnLines(text, s, e, (line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (/^\s*\d+\.\s+/.test(line)) return line;
            return `${idx + 1}. ${line}`;
          })
      );
    }

    function applyHashtag() {
      withActiveSelection((text, s, e) =>
          applyOnSelection(text, s, e, (selected) => {
            if (!selected.trim()) return selected;
            const tag = toHashtag(selected);
            return tag || selected;
          })
      );
    }

    function insertEmoji(emoji: string) {
      withActiveSelection((text, s, e) =>
          applyOnSelection(text, s, e, (selected) => {
            if (!selected) return `${emoji} `;
            return `${emoji} ${selected}`;
          })
      );
    }

    function applyHighlightSelection() {
      applyStyleSelection({}, "toggleHighlight");
    }

    function applyColorSelection(color: string) {
      applyStyleSelection({color});
      setActiveTextStyle({color});
    }

    function applySizeSelection(size: number) {
      applyStyleSelection({fontSize: size});
      setActiveTextStyle({fontSize: size});
    }

    function applyFontSelection(fontFamily: string) {
      applyStyleSelection({fontFamily});
      setActiveTextStyle({fontFamily});
    }

    async function copyCaption() {
      const {text, ref} = getEditorFieldControl();
      const el = ref.current as HTMLTextAreaElement | HTMLInputElement | null;
      const ok = await copyTextToClipboard(text, el);
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    function setActiveTextStyle(patch: Partial<TextStyle>) {
      setToolbarStyles((prev) => ({
        ...prev,
        [activeField]: {...prev[activeField], ...patch},
      }));
    }

    const activeTextStyle = toolbarStyles[activeField];

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
              : []
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
          : resolveFrameSlots(payload.framePresetId ?? FRAME_PRESETS[0].id, payload.canvasPreset ?? "linkedin")
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
          frameSlots:
            payload.frameSlots?.length
              ? payload.frameSlots
              : resolveFrameSlots(
                  payload.framePresetId ?? FRAME_PRESETS[0].id,
                  payload.canvasPreset ?? "linkedin"
                ),
          mediaBox: payload.mediaBox ?? mediaBox,
          badgeText: payload.badgeText?.trim() ? payload.badgeText.trim() : undefined,
          badgeMarks: payload.badgeMarks ?? [],
          linkTitle: payload.linkTitle ?? "",
          titleMarks: payload.titleMarks ?? [],
          company: payload.company ?? "",
          companyMarks: payload.companyMarks ?? [],
          bodyText: payload.bodyText ?? "",
          bodyMarks: payload.bodyMarks ?? [],
          linkUrl: raw.trim() ? raw : undefined,
          headline: payload.headline?.trim() ? payload.headline.trim() : undefined,
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
          headers: {"Content-Type": "application/json"},
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

        URL.revokeObjectURL(url);
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
            })
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
        const message = err instanceof Error ? err.message : "the creation failed.";
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
      [framePresetId, canvasPreset, images]
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
                          Edit directly on canvas, then fine-tune details from the side panels.
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
                          overflow: "hidden",
                          userSelect: editField ? "text" : "none",
                        }}
                        onClick={onCanvasClick}
                        onDoubleClick={onCanvasDoubleClick}
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
                            canvasPreset={canvasPreset}
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

                        {selectedRect ? (
                          <div
                            style={{
                              position: "absolute",
                              left: selectedRect.x,
                              top: selectedRect.y,
                              width: selectedRect.width,
                              height: selectedRect.height,
                              border: "2px solid rgba(59,130,246,0.95)",
                              borderRadius: 10,
                              pointerEvents:
                                (selectedId === "productImage" || selectedId === "frameSlot") &&
                                !editField
                                  ? "auto"
                                  : "none",
                              boxSizing: "border-box",
                              boxShadow: "0 0 0 2px rgba(59,130,246,0.12)",
                              cursor:
                                selectedId === "productImage"
                                  ? imageLayout === "frame"
                                    ? "grab"
                                    : "move"
                                  : "default",
                              zIndex: 9999,

                            }}
                            onMouseDown={
                              selectedId === "productImage"
                                ? (e) =>
                                    startMediaInteraction(
                                      e,
                                      imageLayout === "frame" ? "frame-image-pan" : "move"
                                    )
                                : undefined
                            }
                          >
                            {((selectedId === "productImage" && !editField && imageLayout !== "frame") ||
                              (imageLayout === "frame" && !editField && (selectedId === "productImage" || selectedId === "frameSlot"))) ? (
                              <>
                                {selectionHandles.map((h) => (
                                  <div
                                    key={h.key}
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
                                      if (imageLayout === "frame" && selectedId === "frameSlot") {
                                        e.stopPropagation();
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

                                {imageLayout !== "frame" ? (
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
                                    onMouseDown={(e) => startMediaInteraction(e, "rotate")}
                                  />
                                ) : null}

                                {imageLayout === "frame" && selectedId === "productImage" ? (
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
                                    onMouseDown={(e) => startMediaInteraction(e, "frame-image-pan")}
                                  >
                                    Move image
                                  </div>
                                ) : null}

                                {imageLayout === "frame" && selectedId === "productImage" ? (
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
                                    onMouseDown={(e) => startMediaInteraction(e, "frame-image-scale")}
                                  />
                                ) : null}

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
                              </>
                            ) : null}
                          </div>
                        ) : null}

                        {editField && selectedRect ? (
                          <textarea
                            ref={editRef}
                            value={
                              editField === "title"
                                ? title
                                : editField === "badge"
                                ? badgeText
                                : editField === "company"
                                ? company
                                : body
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              if (editField === "title") setTitleValue(v);
                              else if (editField === "badge") setBadgeTextValue(v);
                              else if (editField === "company") setCompanyValue(v);
                              else setBody(v);
                            }}
                            onBlur={onEditBlur}
                            onKeyDown={onEditKeyDown}
                            spellCheck={false}
                            style={{
                              position: "absolute",
                              left: selectedRect.x,
                              top: selectedRect.y,
                              width: selectedRect.width,
                              height: Math.max(
                                selectedRect.height,
                                editField === "body"
                                  ? 140
                                  : editField === "badge"
                                  ? 48
                                  : editField === "company"
                                  ? 40
                                  : 60
                              ),
                              border: "1px dashed rgba(59,130,246,0.85)",
                              outline: "none",
                              resize: "none",
                              overflow: "auto",
                              padding: "6px 8px",
                              caretColor: "#111",
                              whiteSpace: "pre-wrap",
                              boxSizing: "border-box",
                              zIndex: 10000,
                              ...editStyle,
                            }}
                          />
                        ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {finalUrl ? (
                    <div className="preview-videoWrap">
                      <video className="preview-video" src={finalUrl} controls playsInline />
                    </div>
                  ) : null}
                </>
              }
              toolbar={
                <TextToolbar
                    activeField={activeField}
                    copied={copied}
                    applyUnicodeStyle={applyUnicodeStyle}
                    applyBullet={applyBullet}
                    applyNumbered={applyNumbered}
                    applyHashtag={applyHashtag}
                    copyActive={copyCaption}
                    insertEmoji={insertEmoji}
                    EMOJIS={EMOJIS}
                    activeTextStyle={activeTextStyle}
                    setActiveTextStyle={setActiveTextStyle}
                    applyHighlightSelection={applyHighlightSelection}
                    applyFontSelection={applyFontSelection}
                    applySizeSelection={applySizeSelection}
                    applyColorSelection={applyColorSelection}
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
                    bodyStyle={bodyStyle}
                    caption={caption}
                    setCaption={setCaption}
                    captionRef={captionRef}
                    captionStyle={captionStyle}
                    activeField={activeField}
                    setActiveField={setActiveField}
                    activeTextStyle={activeTextStyle}
                    setActiveTextStyle={setActiveTextStyle}
                    copied={copied}
                    applyUnicodeStyle={applyUnicodeStyle}
                    applyBullet={applyBullet}
                    applyNumbered={applyNumbered}
                    applyHashtag={applyHashtag}
                    copyCaption={copyCaption}
                    insertEmoji={insertEmoji}
                    EMOJIS={EMOJIS}
                    link={link}
                    setLink={setLink}
                    linkInput={linkInput}
                    setLinkInput={setLinkInput}
                    handleAddLink={handleAddLink}
                    company={company}
                    setCompany={setCompanyValue}
                    companyRef={companyRef}
                    onPickProductImage={onPickProductImage}
                    productAlign={productAlign}
                    setProductAlign={setProductAlignValue}
                    imageLayout={imageLayout}
                    setImageLayout={setImageLayoutMode}
                    framePresetId={framePresetId}
                    setFramePresetId={setFramePresetValue}
                    frameSlots={frameSlots}
                    selectedFrameSlotId={selectedFrameSlotId}
                    onAssignImageToFrameSlot={assignSelectedImageToFrameSlot}
                    setVideoFile={setVideoFile}
                    loadingPdf={loadingPdf}
                    downloadPDF={downloadPDF}
                    finalLoading={finalLoading}
                    hasVideo={hasVideo}
                    generateFinal={generateFinal}
                    finalUrl={finalUrl}
                    selectedImageId={selectedImageId}
                    selectedImageRotation={selectedImage?.rotation ?? 0}
                    onRotateSelectedImage={rotateSelectedImage}
                    onSetSelectedImageRotation={setSelectedImageRotation}
                    imageCount={images.length}
                    onDeleteSelectedImage={removeSelectedImage}
                    onDuplicateSelectedImage={duplicateSelectedImage}
                />
              }
              properties={
                <PropertiesPanel
                    selectedId={selectedId}
                    applySelectionStylePatch={applySelectionStyleForField}
                    title={title}
                    setTitle={setTitleValue}
                    titleStyle={titleStyle}
                    setTitleStyle={setTitleStyle}
                    body={body}
                    setBody={setBody}
                    bodyStyle={bodyBoxStyle}
                    setBodyStyle={setBodyBoxStyle}
                    badgeText={badgeText}
                    setBadgeText={setBadgeTextValue}
                    badgeStyle={badgeStyle}
                    setBadgeStyle={setBadgeStyle}
                    company={company}
                    setCompany={setCompanyValue}
                    companyStyle={companyStyle}
                    setCompanyStyle={setCompanyStyle}
                    headline={headline}
                    setHeadline={setHeadline}
                    headlineStyle={headlineStyle}
                    setHeadlineStyle={setHeadlineStyle}
                    subline={subline}
                    setSubline={setSubline}
                    sublineStyle={sublineStyle}
                    setSublineStyle={setSublineStyle}
                    productAlign={productAlign}
                    setProductAlign={setProductAlignValue}
                    imageLayout={imageLayout}
                    setImageLayout={setImageLayoutMode}
                    selectedImageRotation={selectedImage?.rotation ?? 0}
                    setSelectedImageRotation={setSelectedImageRotation}
                    selectedImageCropX={getCropX(selectedImage)}
                    selectedImageCropY={getCropY(selectedImage)}
                    selectedImageCropScale={getCropScale(selectedImage)}
                    setSelectedImageCropX={setSelectedImageCropX}
                    setSelectedImageCropY={setSelectedImageCropY}
                    setSelectedImageCropScale={setSelectedImageCropScale}
                    onDeleteSelectedImage={removeSelectedImage}
                    onDuplicateSelectedImage={duplicateSelectedImage}
                />
              }
          />
        </LinkedInEditorBaseClient>
    );

}
