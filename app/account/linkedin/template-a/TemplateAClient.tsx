"use client";

import LinkedInEditorBaseClient from "@/app/components/templates/linkedin-shared/LinkedInEditorBaseClient";
import LinkedInEditorLayout from "@/app/components/templates/linkedin-shared/LinkedInEditorLayout";
import { LinkedInToolbox } from "@/app/components/templates/linkedin-shared/ToolBox";
import LinkedInTemplate2 from "@/app/components/templates/linkedin/LinkedInTemplate2";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { type LexicalInlineEditorHandle } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import { CANVAS_PRESETS, getCanvasFrame } from "@/app/lib/renderUtils";
import TemplateADraftsPanel from "./components/TemplateADraftsPanel";
import TemplateAExportPanel from "./components/TemplateAExportPanel";
import TemplateAPreview from "./components/TemplateAPreview";
import TemplateAStickyToolbar from "./components/TemplateAStickyToolbar";
import useTemplateAExport from "./hooks/useTemplateAExport";
import useTemplateAHydration from "./hooks/useTemplateAHydration";
import useTemplateAMediaEditor from "./hooks/useTemplateAMediaEditor";
import useTemplateATextState from "./hooks/useTemplateATextState";
import type {
  ActiveRichTextEditor,
  BoxTextStyle,
  CanvasPresetKey,
  EditField,
  EditorTextField,
  FieldErrors,
  PdfPayload,
  RichEditField,
  SelectableId,
  TemplateADraft,
  TemplateADraftPayload,
  TemplateAClientProps,
  TemplateDraftPagination,
  TemplateDraftSummary,
  TextMark,
} from "./lib/templateA.types";
import {
  getLineBounds,
  getPdfModeAndPayload,
  isPreviewSelectableId,
  safePx,
} from "./lib/templateA.utils";
import {
  getContentEditablePlainText,
  getTextChangeRange,
  hasStyle,
  mergeMarks,
  readContentEditableSelection,
  remapMarksForLinePrefixChanges,
  restoreContentEditableSelection,
  shiftMarksAfterTextChange,
} from "./lib/templateARichText.utils";
import { buildLinkedInReadyCaption } from "./lib/captionLinkedInText";

const INITIAL_RICH_EDIT_SESSION_KEYS = {
  badge: 0,
  title: 0,
  company: 0,
  body: 0,
} as const;

const TEMPLATE_KEY = "linkedin-template-a";
const DEFAULT_DRAFT_PAGINATION: TemplateDraftPagination = {
  page: 1,
  pageSize: 5,
  total: 0,
  totalPages: 1,
};

const DEFAULT_TEMPLATE_A_DRAFT: TemplateADraftPayload = {
  productOrientation: "landscape",
  productAlign: "center",
  imageLayout: "manual",
  mediaBox: { x: 420, y: 240, w: 240, h: 240 },
  images: [],
  badgeText: "Your Eye Catching Text",
  linkTitle: "Your Tile Goes Here",
  company: "PROTOS-3D Metrology GmbH",
  bodyText: "The main content. You can edit using the rich text editor.",
  captionText: "",
  titleStyle: {
    fontFamily: "system-ui",
    fontSize: 34,
    color: "#111827",
    textAlign: "left",
  },
  bodyStyle: {
    fontFamily: "system-ui",
    fontSize: 16,
    color: "#111827",
    textAlign: "left",
  },
  captionStyle: {
    fontFamily: "system-ui",
    fontSize: 16,
    color: "#111827",
    textAlign: "left",
  },
  badgeStyle: {
    fontFamily: "system-ui",
    fontSize: 20,
    color: "#ffffff",
    textAlign: "left",
  },
  companyStyle: {
    fontFamily: "system-ui",
    fontSize: 18,
    color: "#111827",
    textAlign: "left",
  },
  headlineStyle: {
    fontFamily: "system-ui",
    fontSize: 28,
    color: "#111827",
    textAlign: "left",
  },
  sublineStyle: {
    fontFamily: "system-ui",
    fontSize: 18,
    color: "#374151",
    textAlign: "left",
  },
  headline: "",
  subline: "",
  link: "",
  hashtags: "",
  canvasPreset: "linkedin",
};

function getDraftSummary(draft: TemplateDraftSummary): TemplateDraftSummary {
  return {
    id: draft.id,
    name: draft.name,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

export default function TemplateAClient({
  sessionUser,
  initialDraft,
}: TemplateAClientProps) {
  const [{ isPdf, payload }] = useState<{
    isPdf: boolean;
    payload: PdfPayload | null;
  }>(() => getPdfModeAndPayload());

  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [canvasPreset, setCanvasPreset] = useState<CanvasPresetKey>("linkedin");

  const [editField, setEditField] = useState<EditField>(null);
  const [richEditSessionKeys, setRichEditSessionKeys] = useState(
    INITIAL_RICH_EDIT_SESSION_KEYS,
  );
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const titleEditRef = useRef<LexicalInlineEditorHandle | null>(null);
  const bodyEditRef = useRef<LexicalInlineEditorHandle | null>(null);
  const companyEditRef = useRef<LexicalInlineEditorHandle | null>(null);
  const badgeEditRef = useRef<LexicalInlineEditorHandle | null>(null);
  const captionEditRef = useRef<LexicalInlineEditorHandle | null>(null);
  const captionSectionRef = useRef<HTMLDivElement | null>(null);
  const richEditSessionRef = useRef(INITIAL_RICH_EDIT_SESSION_KEYS);
  const richEditSelectionRef = useRef<
    Record<RichEditField, { start: number; end: number }>
  >({
    title: { start: 0, end: 0 },
    body: { start: 0, end: 0 },
    company: { start: 0, end: 0 },
    badge: { start: 0, end: 0 },
  });
  const [editStyle, setEditStyle] = useState<CSSProperties>({});

  const [previewContentHeight, setPreviewContentHeight] = useState<number>(
    getCanvasFrame("linkedin").h,
  );
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftStatus, setDraftStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [draftError, setDraftError] = useState("");
  const [draftToHydrate, setDraftToHydrate] = useState(
    initialDraft?.payload ?? null,
  );
  const [activeDraft, setActiveDraft] = useState<TemplateDraftSummary | null>(
    () => (initialDraft ? getDraftSummary(initialDraft) : null),
  );
  const [drafts, setDrafts] = useState<TemplateDraftSummary[] | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftPagination, setDraftPagination] = useState(
    DEFAULT_DRAFT_PAGINATION,
  );
  const [draftListLoading, setDraftListLoading] = useState(false);
  const [draftListError, setDraftListError] = useState("");
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [switchingDraftId, setSwitchingDraftId] = useState<string | null>(
    null,
  );
  const initialDraftSerializedRef = useRef(
    initialDraft ? JSON.stringify(initialDraft.payload) : null,
  );
  const lastSavedDraftRef = useRef<string | null>(null);
  const activeDraftIdRef = useRef(initialDraft?.id ?? null);
  const draftListRequestRef = useRef(0);

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
    titleHtml,
    setTitleHtml,
    titleBlocks,
    setTitleBlocks,
    badgeMarks,
    setBadgeMarks,
    badgeHtml,
    setBadgeHtml,
    badgeBlocks,
    setBadgeBlocks,
    companyMarks,
    setCompanyMarks,
    companyHtml,
    setCompanyHtml,
    companyBlocks,
    setCompanyBlocks,
    bodyMarks,
    setBodyMarks,
    bodyHtml,
    setBodyHtml,
    bodyBlocks,
    setBodyBlocks,
    captionHtml,
    setCaptionHtml,
    captionBlocks,
    setCaptionBlocks,
    captionMarks,
    setCaptionMarks,
    link,
    setLink,
    linkInput,
    setLinkInput,
    hashtags,
    setHashtags,
    hashtagInput,
    setHashtagInput,
    company,
    setCompany,
    setCompanyValue,
    activeField,
    setActiveField,
    copied,
    badgeRef,
    titleRef,
    companyRef,
    bodyRef,
    titleStyle,
    setTitleStyle,
    bodyBoxStyle,
    setBodyBoxStyle,
    captionStyle,
    setCaptionStyle,
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
    getRichEditBlocks,
    addLink,
    handleAddLink,
    addHashtag,
    handleAddHashtag,
    copyCaption: copyCaptionText,
  } = useTemplateATextState();

  const previewViewportW = 560;
  const previewScale = previewViewportW / CANVAS_PRESETS[canvasPreset].w;

  const {
    currentCanvas,
    productImage,
    productImageFile,
    setProductImage,
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
    videos,
    setVideos,
    editorVideos,
    selectedVideoId,
    addVideoFiles,
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
    removeImageById,
    setSelectedImageRadius,
    getSelectedImageRadius,
    setSelectedVideoRadius,
    getSelectedVideoRadius,
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
    deleteSelectedVideo,
    clearVideo,
    startFrameImageDrag,
    startSelectedFrameSlotResize,
  } = useTemplateAMediaEditor({
    stageRef,
    previewScale,
    canvasPreset,
    editField,
    setEditField,
    badgeText,
  });

  const hasVideo = videos.length > 0;
  const toolboxVideos = useMemo(
    () =>
      videos.map((video) => ({
        id: video.id,
        file: video.file ?? ({ name: video.fileName ?? "Stored video" } as File),
        radius: video.radius,
      })),
    [videos],
  );

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
    videos: editorVideos,
    setErrors,
  });

  const previewViewportH = Math.round(previewContentHeight * previewScale);

  function onCanvasClick(e: React.MouseEvent) {
    if (suppressNextCanvasClickRef.current) {
      suppressNextCanvasClickRef.current = false;
      return;
    }

    if (isMediaSelectionUiTarget(e.target)) return;

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
        const img = images.find((x) => x.id === imageId);
        if (img) selectImageObject(img);
      }
    } else if (id === "frameSlot") {
      const frameSlotId = t.getAttribute("data-frame-slot-id");
      setSelectedImageId(null);
      if (frameSlotId) {
        setSelectedFrameSlotId(frameSlotId);
        setSelectedRect(getFrameSlotRect(frameSlotId));
      }
    } else if (id === "video") {
      const videoId = t.getAttribute("data-video-id");
      if (videoId) {
        const video = videos.find((item) => item.id === videoId);
        if (video) selectVideoObject(video);
      }
      const rect = computeRectRelativeToStage(t);
      if (rect) setSelectedRect(rect);
    } else {
      const rect = computeRectRelativeToStage(t);
      setSelectedRect(rect);
      setSelectedImageId(null);
      setSelectedFrameSlotId(null);
    }

    if (editField && id !== editField) setEditField(null);
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
    setRichEditSessionKeys((prev) => ({
      ...prev,
      [field]: richEditSessionRef.current[field] + 1,
    }));
    richEditSessionRef.current = {
      ...richEditSessionRef.current,
      [field]: richEditSessionRef.current[field] + 1,
    };
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
    const lineHeightRatio = Math.max(
      1,
      Number((lineHeight / Math.max(fontSize, 1)).toFixed(3)),
    );

    setEditStyle({
      fontFamily: cs.fontFamily || "system-ui",
      fontSize,
      fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing,
      lineHeight: String(lineHeightRatio),
      textAlign: (cs.textAlign as CSSProperties["textAlign"]) || "left",
      padding: cs.padding,
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

  const getRichEditEditor = (field: RichEditField) => {
    if (field === "title") return titleEditRef.current;
    if (field === "company") return companyEditRef.current;
    if (field === "badge") return badgeEditRef.current;
    return bodyEditRef.current;
  };

  const getRichEditRoot = (field: RichEditField) =>
    getRichEditEditor(field)?.getRootElement() ?? null;

  const syncFocusedEditor = useEffectEvent((field: EditField) => {
    if (!field) return;

    requestAnimationFrame(() => {
      if (isRichEditField(field)) {
        const text = getRichEditText(field);
        const next = { start: text.length, end: text.length };
        richEditSelectionRef.current[field] = next;
        const editor = getRichEditEditor(field);
        editor?.syncContent(text, getRichEditMarks(field), getRichEditBlocks(field));
        editor?.focus();
        const root = getRichEditRoot(field);
        restoreContentEditableSelection(root, next);
        return;
      }

      editRef.current?.focus();
      const v = editRef.current?.value ?? "";
      editRef.current?.setSelectionRange(v.length, v.length);
    });
  });

  useEffect(() => {
    if (!editField) return;
    syncFocusedEditor(editField);
  }, [editField]);

  const blurCaptionOnOutsidePointer = useEffectEvent((event: PointerEvent) => {
    if (activeField !== "caption") return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (captionSectionRef.current?.contains(target)) return;
    if (target.closest(".editor-bottomToolbarWrap")) return;
    if (target.closest(".tt--floating")) return;

    captionEditRef.current?.getRootElement()?.blur();
    if (!editField) {
      setActiveField("body");
    }
  });

  useEffect(() => {
    document.addEventListener("pointerdown", blurCaptionOnOutsidePointer);
    return () => {
      document.removeEventListener("pointerdown", blurCaptionOnOutsidePointer);
    };
  }, []);

  function onEditBlur(e: React.FocusEvent<HTMLElement>) {
    const currentField = editField;
    const currentSession =
      currentField && isRichEditField(currentField)
        ? richEditSessionRef.current[currentField]
        : null;
    const currentTarget = e.currentTarget;
    const nextTarget = e.relatedTarget;
    const toolbar = document.querySelector('[data-lexical-toolbar="true"]');
    const stickyToolbar = document.querySelector(".editor-bottomToolbarWrap");

    if (nextTarget instanceof Node) {
      if (currentTarget.contains(nextTarget)) {
        return;
      }

      if (toolbar?.contains(nextTarget)) {
        return;
      }

      if (stickyToolbar?.contains(nextTarget)) {
        return;
      }
    }

    requestAnimationFrame(() => {
      if (!currentField) return;
      if (
        isRichEditField(currentField) &&
        currentSession != null &&
        richEditSessionRef.current[currentField] !== currentSession
      ) {
        return;
      }

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

        if (stickyToolbar?.contains(activeElement)) {
          return;
        }
      }
      window.getSelection()?.removeAllRanges();

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

    const selection = readContentEditableSelection(
      "body",
      root,
      richEditSelectionRef,
    );
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
        getRichEditBlocks("body"),
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
      getRichEditBlocks("body"),
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

  useTemplateAHydration({
    isPdf,
    payload,
    initialDraft: draftToHydrate,
    setDraftHydrated,
    setCanvasPreset,
    setHeadline,
    setSubline,
    setBadgeText,
    setTitle,
    setBodyRaw: _setBody,
    setCaptionRaw: _setCaption,
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
    setVideos,
    setTitleStyle,
    setBodyBoxStyle,
    setCaptionStyle,
    setBadgeStyle,
    setCompanyStyle,
    setHeadlineStyle,
    setSublineStyle,
  });

  const draftPayload = useMemo(
    () => ({
      productImage:
        images[0]?.base64 ?? (productImage?.trim() ? productImage : undefined),
      productOrientation,
      productAlign,
      imageLayout,
      framePresetId,
      frameSlots: frameSlotsState,
      mediaBox,
      images: images.map((img) => ({
        id: img.id,
        src: img.base64 ?? img.src,
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
      })),
      videos: editorVideos
        .filter((video) => Boolean(video.src))
        .map((video) => ({
          id: video.id,
          src: video.src,
          fileName: video.fileName,
          mimeType: video.mimeType,
          x: video.x,
          y: video.y,
          w: video.w,
          h: video.h,
          radius: video.radius,
          zIndex: video.zIndex,
        })),
      videoRadius: editorVideos[0]?.radius ?? 20,
      badgeText: badgeText?.trim() ? badgeText.trim() : undefined,
      badgeHtml,
      badgeMarks,
      badgeBlocks,
      badgeStyle,
      linkTitle: title,
      titleHtml,
      titleMarks,
      titleBlocks,
      company,
      companyHtml,
      companyMarks,
      companyBlocks,
      bodyText: body,
      bodyHtml,
      bodyMarks,
      bodyBlocks,
      captionText: caption,
      captionHtml,
      captionMarks,
      captionBlocks,
      captionStyle,
      titleStyle,
      bodyStyle: bodyBoxStyle,
      companyStyle,
      headlineStyle,
      sublineStyle,
      headline,
      subline,
      link: link.length ? link.join("\n") : "",
      hashtags: hashtags.length ? hashtags.join("\n") : "",
      canvasPreset,
    }),
    [
      productImage,
      productOrientation,
      productAlign,
      imageLayout,
      framePresetId,
      frameSlotsState,
      mediaBox,
      images,
      editorVideos,
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
      titleStyle,
      bodyBoxStyle,
      companyStyle,
      headlineStyle,
      sublineStyle,
      headline,
      subline,
      link,
      hashtags,
      canvasPreset,
    ],
  );
  const serializedDraft = useMemo(
    () => JSON.stringify(draftPayload),
    [draftPayload],
  );

  useEffect(() => {
    if (!draftHydrated || isPdf) return;
    if (lastSavedDraftRef.current !== null) return;
    lastSavedDraftRef.current =
      initialDraftSerializedRef.current ?? serializedDraft;
  }, [draftHydrated, isPdf, serializedDraft]);

  function updateDraftSummary(nextDraft: TemplateDraftSummary) {
    const summary = getDraftSummary(nextDraft);

    setActiveDraft((current) =>
      current?.id === summary.id ? summary : current,
    );
    setDrafts((current) => {
      if (!current) return current;
      const hasSummary = current.some((draft) => draft.id === summary.id);

      if (!hasSummary) {
        return [summary, ...current];
      }

      return current.map((draft) =>
        draft.id === summary.id ? summary : draft,
      );
    });
  }

  async function persistDraft(serialized: string) {
    setDraftStatus("saving");
    setDraftError("");

    try {
      const draftId = activeDraftIdRef.current;
      const endpoint = draftId
        ? `/api/account/template-drafts/${TEMPLATE_KEY}/${draftId}`
        : `/api/account/template-drafts/${TEMPLATE_KEY}`;
      const res = await fetch(endpoint, {
        method: draftId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: JSON.parse(serialized) }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message ?? "Draft save failed");
      }

      const body = (await res.json()) as { draft: TemplateADraft };
      activeDraftIdRef.current = body.draft.id;
      setActiveDraft(getDraftSummary(body.draft));
      updateDraftSummary(body.draft);
      lastSavedDraftRef.current = serialized;
      setDraftStatus("saved");
    } catch (err: unknown) {
      setDraftStatus("error");
      setDraftError(
        err instanceof Error ? err.message : "Draft save failed",
      );
    }
  }

  const saveDraft = useEffectEvent(persistDraft);

  async function loadDraftList({
    page = draftPagination.page,
    search = draftSearch,
    force = false,
  }: {
    page?: number;
    search?: string;
    force?: boolean;
  } = {}) {
    if (!force && (drafts !== null || draftListLoading)) return;

    const requestId = draftListRequestRef.current + 1;
    draftListRequestRef.current = requestId;
    setDraftListLoading(true);
    setDraftListError("");

    try {
      const params = new URLSearchParams({ page: String(page) });
      const trimmedSearch = search.trim();

      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }

      const res = await fetch(
        `/api/account/template-drafts/${TEMPLATE_KEY}?${params}`,
      );
      const body = (await res.json().catch(() => null)) as
        | {
            drafts?: TemplateDraftSummary[];
            pagination?: TemplateDraftPagination;
            message?: string;
          }
        | null;

      if (!res.ok) {
        throw new Error(body?.message ?? "Draft list failed to load");
      }

      if (requestId !== draftListRequestRef.current) return;

      setDrafts(body?.drafts ?? []);
      setDraftPagination(body?.pagination ?? DEFAULT_DRAFT_PAGINATION);
    } catch (err: unknown) {
      if (requestId !== draftListRequestRef.current) return;

      setDraftListError(
        err instanceof Error ? err.message : "Draft list failed to load",
      );
    } finally {
      if (requestId === draftListRequestRef.current) {
        setDraftListLoading(false);
      }
    }
  }

  async function createDraft(payloadToCreate: TemplateADraftPayload) {
    setCreatingDraft(true);
    setDraftListError("");

    try {
      const res = await fetch(`/api/account/template-drafts/${TEMPLATE_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: payloadToCreate }),
      });
      const body = (await res.json().catch(() => null)) as
        | { draft?: TemplateADraft; message?: string }
        | null;

      if (!res.ok || !body?.draft) {
        throw new Error(body?.message ?? "Draft could not be created");
      }

      activeDraftIdRef.current = body.draft.id;
      const serializedCreatedDraft = JSON.stringify(body.draft.payload);
      lastSavedDraftRef.current = serializedCreatedDraft;
      setActiveDraft(getDraftSummary(body.draft));
      setDraftHydrated(false);
      setDraftToHydrate(body.draft.payload);
      setDrafts((current) =>
        current
          ? [
              getDraftSummary(body.draft as TemplateADraft),
              ...current.filter((draft) => draft.id !== body.draft?.id),
            ].slice(0, draftPagination.pageSize)
          : current,
      );
      if (drafts !== null) {
        setDraftSearch("");
        void loadDraftList({ page: 1, search: "", force: true });
      }
      setDraftStatus("saved");
    } catch (err: unknown) {
      setDraftListError(
        err instanceof Error ? err.message : "Draft could not be created",
      );
    } finally {
      setCreatingDraft(false);
    }
  }

  async function deleteDraft(draft: TemplateDraftSummary) {
    setDeletingDraftId(draft.id);
    setDraftListError("");

    try {
      const res = await fetch(
        `/api/account/template-drafts/${TEMPLATE_KEY}/${draft.id}`,
        { method: "DELETE" },
      );
      const body = (await res.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!res.ok) {
        throw new Error(body?.message ?? "Draft could not be deleted");
      }

      setDrafts((current) =>
        current?.filter((currentDraft) => currentDraft.id !== draft.id) ??
        current,
      );
      if (drafts !== null) {
        const nextPage =
          drafts.length <= 1 && draftPagination.page > 1
            ? draftPagination.page - 1
            : draftPagination.page;

        void loadDraftList({ page: nextPage, force: true });
      }

      if (draft.id === activeDraftIdRef.current) {
        activeDraftIdRef.current = null;
        setActiveDraft(null);
        lastSavedDraftRef.current = serializedDraft;
        setDraftStatus("idle");
        setDraftError("");
      }
    } catch (err: unknown) {
      setDraftListError(
        err instanceof Error ? err.message : "Draft could not be deleted",
      );
    } finally {
      setDeletingDraftId(null);
    }
  }

  function changeDraftName(draftId: string, name: string) {
    setDrafts((current) =>
      current?.map((draft) =>
        draft.id === draftId ? { ...draft, name } : draft,
      ) ?? current,
    );
    setActiveDraft((current) =>
      current?.id === draftId ? { ...current, name } : current,
    );
  }

  async function renameDraft(draftId: string, name: string) {
    setDraftListError("");
    const nextName = name.trim() || "Untitled draft";
    changeDraftName(draftId, nextName);

    try {
      const res = await fetch(
        `/api/account/template-drafts/${TEMPLATE_KEY}/${draftId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nextName }),
        },
      );
      const body = (await res.json().catch(() => null)) as
        | { draft?: TemplateADraft; message?: string }
        | null;

      if (!res.ok || !body?.draft) {
        throw new Error(body?.message ?? "Draft name could not be saved");
      }

      updateDraftSummary(body.draft);
    } catch (err: unknown) {
      setDraftListError(
        err instanceof Error ? err.message : "Draft name could not be saved",
      );
    }
  }

  async function selectDraft(draft: TemplateDraftSummary) {
    if (draft.id === activeDraftIdRef.current) return;

    setSwitchingDraftId(draft.id);
    setDraftListError("");

    try {
      if (serializedDraft !== lastSavedDraftRef.current) {
        await persistDraft(serializedDraft);

        if (serializedDraft !== lastSavedDraftRef.current) {
          throw new Error("Save the current draft before opening another one.");
        }
      }

      setDraftHydrated(false);
      const res = await fetch(
        `/api/account/template-drafts/${TEMPLATE_KEY}/${draft.id}`,
      );
      const body = (await res.json().catch(() => null)) as
        | { draft?: TemplateADraft; message?: string }
        | null;

      if (!res.ok || !body?.draft) {
        throw new Error(body?.message ?? "Draft could not be opened");
      }

      activeDraftIdRef.current = body.draft.id;
      lastSavedDraftRef.current = JSON.stringify(body.draft.payload);
      setActiveDraft(getDraftSummary(body.draft));
      setDraftToHydrate(body.draft.payload);
      updateDraftSummary(body.draft);
      setDraftStatus("idle");
      setDraftError("");
    } catch (err: unknown) {
      setDraftHydrated(true);
      setDraftListError(
        err instanceof Error ? err.message : "Draft could not be opened",
      );
    } finally {
      setSwitchingDraftId(null);
    }
  }

  useEffect(() => {
    if (!draftHydrated || isPdf) return;
    if (serializedDraft === lastSavedDraftRef.current) return;

    const timeoutId = window.setTimeout(() => {
      void saveDraft(serializedDraft);
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftHydrated, isPdf, serializedDraft]);

  function handleRichEditableInput(
    field: RichEditField,
    payload: {
      text: string;
      marks: TextMark[];
      blocks: ActiveRichTextEditor["blocks"];
      html: string;
    },
  ) {
    const currentText = getRichEditText(field);
    const { marks: currentMarks, setMarks } = getActiveMarksState(field);
    const { blocks: currentBlocks, setBlocks } = getActiveBlocksState(field);
    const { html: currentHtml, setHtml } = getActiveHtmlState(field);
    const nextMarksSerialized = JSON.stringify(payload.marks);
    const currentMarksSerialized = JSON.stringify(currentMarks);
    const nextBlocksSerialized = JSON.stringify(payload.blocks);
    const currentBlocksSerialized = JSON.stringify(currentBlocks);

    if (payload.text !== currentText) {
      setFieldTextRaw(field, payload.text);
    }

    if (nextMarksSerialized !== currentMarksSerialized) {
      setMarks(payload.marks);
    }

    if (nextBlocksSerialized !== currentBlocksSerialized) {
      setBlocks(payload.blocks);
    }

    if (payload.html !== currentHtml) {
      setHtml(payload.html);
    }

    const root = getRichEditRoot(field);
    const selection = readContentEditableSelection(
      field,
      root,
      richEditSelectionRef,
    );
    richEditSelectionRef.current[field] = selection;

    if (field === "badge") {
      requestAnimationFrame(() => remeasureBadgeSelection());
    }
  }

  function handleCaptionEditableInput(payload: {
    text: string;
    marks: TextMark[];
    blocks: ActiveRichTextEditor["blocks"];
    html: string;
  }) {
    if (payload.text !== caption) {
      _setCaption(payload.text);
    }

    if (JSON.stringify(payload.marks) !== JSON.stringify(captionMarks)) {
      setCaptionMarks(payload.marks);
    }

    if (JSON.stringify(payload.blocks) !== JSON.stringify(captionBlocks)) {
      setCaptionBlocks(payload.blocks);
    }

    if (payload.html !== captionHtml) {
      setCaptionHtml(payload.html);
    }
  }

  function syncRichEditOverlayDom(
    field: RichEditField,
    marks: TextMark[],
    blocks: ActiveRichTextEditor["blocks"],
    range: { start: number; end: number },
    textOverride?: string,
  ) {
    const text = textOverride ?? getRichEditText(field);
    const editor = getRichEditEditor(field);
    editor?.syncContent(text, marks, blocks, range);
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
        return { text: caption, setText: setCaption, ref: refForField(bodyRef) };
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

  function insertEmojiIntoActiveField(emoji: string) {
    if (isRichEditField(editField)) {
      getRichEditEditor(editField)?.insertText(emoji);
      return;
    }

    if (activeField === "caption") {
      captionEditRef.current?.insertText(emoji);
    }
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

  function getActiveBlocksState(field: RichEditField) {
    switch (field) {
      case "badge":
        return { blocks: badgeBlocks, setBlocks: setBadgeBlocks };
      case "title":
        return { blocks: titleBlocks, setBlocks: setTitleBlocks };
      case "company":
        return { blocks: companyBlocks, setBlocks: setCompanyBlocks };
      case "body":
      default:
        return { blocks: bodyBlocks, setBlocks: setBodyBlocks };
    }
  }

  function getActiveHtmlState(field: RichEditField) {
    switch (field) {
      case "badge":
        return { html: badgeHtml, setHtml: setBadgeHtml };
      case "title":
        return { html: titleHtml, setHtml: setTitleHtml };
      case "company":
        return { html: companyHtml, setHtml: setCompanyHtml };
      case "body":
      default:
        return { html: bodyHtml, setHtml: setBodyHtml };
    }
  }

  function setFieldTextAlign(
    field: EditorTextField,
    textAlign: BoxTextStyle["textAlign"],
  ) {
    if (field === "caption") {
      setCaptionStyle((prev) => ({ ...prev, textAlign }));
    } else if (field === "title") {
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

  function handleNumberedListEnter(
    field: "body",
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

  const linkedInReadyCaption = useMemo(
    () => buildLinkedInReadyCaption(caption, captionMarks, captionBlocks),
    [caption, captionMarks, captionBlocks],
  );

  async function copyCaption() {
    await copyCaptionText(linkedInReadyCaption);
  }

  const draftStatusMessage =
    draftStatus === "saving"
      ? "Saving draft..."
      : draftStatus === "saved"
        ? "Draft saved to your account."
        : draftStatus === "error"
          ? draftError || "Draft save failed."
          : "";

  function handleCaptionBlur() {
    requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (activeElement instanceof Node) {
        if (captionSectionRef.current?.contains(activeElement)) {
          return;
        }

        const toolbar = document.querySelector('[data-lexical-toolbar="true"]');
        if (toolbar?.contains(activeElement)) {
          return;
        }

        const stickyToolbar = document.querySelector(".editor-bottomToolbarWrap");
        if (stickyToolbar?.contains(activeElement)) {
          return;
        }
      }

      window.getSelection()?.removeAllRanges();
      if (!editField) {
        setActiveField("body");
      }
    });
  }

  function getToolbarTextAlign() {
    if (activeField === "caption") return captionStyle.textAlign;
    if (editField === "title") return titleStyle.textAlign;
    if (editField === "company") return companyStyle.textAlign;
    if (editField === "badge") return badgeStyle.textAlign;
    return bodyBoxStyle.textAlign;
  }

  const bottomToolbarHasActiveEditor =
    isRichEditField(editField) || activeField === "caption";

  const activeRichTextEditor: ActiveRichTextEditor | null = isRichEditField(
    editField,
  )
    ? {
        field: editField,
        sessionKey: richEditSessionKeys[editField],
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
        blocks: getRichEditBlocks(editField),
        multiline: editField !== "badge",
        className: "template-inline-editor",
        style: {
          display: "block",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          minHeight:
            editField === "body" ? Math.max(selectedRect?.height ?? 0, 140) : undefined,
          padding: 0,
          margin: 0,
          border: "none",
          background: "transparent",
          boxShadow: "none",
          outline: "none",
          overflow:
            editField === "badge" ||
            editField === "body" ||
            editField === "company"
              ? "visible"
              : "hidden",
          whiteSpace: editField === "badge" ? "nowrap" : "pre-wrap",
          wordBreak: editField === "badge" ? "normal" : "break-word",
          caretColor: String(editStyle.color ?? "#111827"),
          ...editStyle,
        } satisfies CSSProperties,
        onAlignChange: (align: "left" | "center" | "right") =>
          setFieldTextAlign(editField, align),
        onChange: (payload) =>
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
          badgeHtml={effective.badgeHtml}
          badgeMarks={effective.badgeMarks}
          badgeBlocks={effective.badgeBlocks}
          linkTitle={effective.linkTitle}
          titleHtml={effective.titleHtml}
          titleMarks={effective.titleMarks}
          titleBlocks={effective.titleBlocks}
          company={effective.company}
          companyHtml={effective.companyHtml}
          companyMarks={effective.companyMarks}
          companyBlocks={effective.companyBlocks}
          bodyText={effective.bodyText}
          bodyHtml={effective.bodyHtml}
          bodyMarks={effective.bodyMarks}
          bodyBlocks={effective.bodyBlocks}
          linkUrl={effective.linkUrl}
          hashtags={effective.hashtags}
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
    >
      <LinkedInEditorLayout
        toolbar={
          <TemplateAStickyToolbar
            visible={true}
            activeField={activeField}
            editField={isRichEditField(editField) ? editField : null}
            currentMarks={getActiveMarksState().marks}
            currentTextAlign={getToolbarTextAlign()}
            canUndo={bottomToolbarHasActiveEditor}
            canRedo={bottomToolbarHasActiveEditor}
            onInsertEmoji={insertEmojiIntoActiveField}
            onUndo={() => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.undo();
                return;
              }
              if (activeField === "caption") {
                captionEditRef.current?.undo();
              }
            }}
            onRedo={() => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.redo();
                return;
              }
              if (activeField === "caption") {
                captionEditRef.current?.redo();
              }
            }}
            onToggleBold={() => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.toggleBold();
                return;
              }
              if (activeField === "caption") {
                captionEditRef.current?.toggleBold();
              }
            }}
            onToggleItalic={() => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.toggleItalic();
                return;
              }
              if (activeField === "caption") {
                captionEditRef.current?.toggleItalic();
              }
            }}
            onSetFontFamily={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.setFontFamily(value);
                return;
              }
              if (activeField === "caption") {
                captionEditRef.current?.setFontFamily(value);
              }
            }}
            onSetFontSize={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.setFontSize(value);
                return;
              }
              if (activeField === "caption") {
                captionEditRef.current?.setFontSize(value);
              }
            }}
            onSetColor={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.setColor(value);
                return;
              }
              if (activeField === "caption") {
                captionEditRef.current?.setColor(value);
              }
            }}
            onSetHighlightColor={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.setHighlightColor(value);
                return;
              }
              if (activeField === "caption") {
                captionEditRef.current?.setHighlightColor(value);
              }
            }}
            onToggleList={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.toggleList(value);
                return;
              }
              if (activeField === "caption") {
                captionEditRef.current?.toggleList(value);
              }
            }}
            onSetTextAlign={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.setTextAlign(value);
                setFieldTextAlign(editField, value);
                return;
              }
              if (activeField === "caption") {
                captionEditRef.current?.setTextAlign(value);
                setFieldTextAlign("caption", value);
              }
            }}
          />
        }
        preview={
          <TemplateAPreview
            canvasPreset={canvasPreset}
            draftName={activeDraft?.name ?? null}
            onCanvasPresetChange={setCanvasPreset}
            clearSelection={clearSelection}
            previewViewportW={previewViewportW}
            previewViewportH={previewViewportH}
            previewScale={previewScale}
            previewContentHeight={previewContentHeight}
            currentCanvas={currentCanvas}
            canvasWrapRef={canvasWrapRef}
            stageRef={stageRef}
            captionSectionRef={captionSectionRef}
            captionEditorRef={captionEditRef}
            editField={editField}
            selectedId={selectedId}
            selectedImageId={selectedImageId}
            imageLayout={imageLayout}
            selectedRect={selectedRect}
            activeRichTextEditor={activeRichTextEditor}
            effective={effective}
            editorMediaImages={editorMediaImages}
            editorVideos={editorVideos}
            selectedVideoId={selectedVideoId}
            caption={caption}
            captionMarks={captionMarks}
            captionBlocks={captionBlocks}
            captionStyle={captionStyle}
            copied={copied}
            linkedInReadyCaption={linkedInReadyCaption}
            finalUrl={finalUrl}
            suppressNextCanvasClickRef={suppressNextCanvasClickRef}
            onCaptionBlur={handleCaptionBlur}
            onCaptionFocus={() => setActiveField("caption")}
            onCaptionChange={handleCaptionEditableInput}
            onCopyCaption={copyCaption}
            onCanvasClick={onCanvasClick}
            onCanvasDoubleClick={onCanvasDoubleClick}
            onSelectableClick={(field, event) => {
              event.stopPropagation();
              if (event.detail >= 2) {
                activateCanvasField(field, event.currentTarget);
                return;
              }
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
            onRemoveSelectedVideo={deleteSelectedVideo}
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
            setActiveField={setActiveField}
            link={link}
            setLink={setLink}
            linkInput={linkInput}
            setLinkInput={setLinkInput}
            addLink={addLink}
            handleAddLink={handleAddLink}
            hashtags={hashtags}
            setHashtags={setHashtags}
            hashtagInput={hashtagInput}
            setHashtagInput={setHashtagInput}
            addHashtag={addHashtag}
            handleAddHashtag={handleAddHashtag}
            onTextChange={handleTextChange}
            onTextKeyDown={handleNumberedListEnter}
            company={company}
            setCompany={setCompanyValue}
            companyRef={companyRef}
            onPickProductImage={onPickProductImage}
            productImages={images}
            removeImage={removeImageById}
            imageLayout={imageLayout}
            setImageLayout={setImageLayoutMode}
            framePresetId={framePresetId}
            setFramePresetId={setFramePresetValue}
            frameSlots={frameSlots}
            selectedFrameSlotId={selectedFrameSlotId}
            selectedImageRadius={getSelectedImageRadius()}
            setSelectedImageRadius={setSelectedImageRadius}
            selectedVideoRadius={getSelectedVideoRadius()}
            setSelectedVideoRadius={setSelectedVideoRadius}
            onAssignImageToFrameSlot={assignSelectedImageToFrameSlot}
            onPickVideos={addVideoFiles}
            videos={toolboxVideos}
            clearVideo={clearVideo}
            draftPanel={
              <TemplateADraftsPanel
                activeDraftId={activeDraft?.id ?? null}
                drafts={drafts}
                error={draftListError}
                loading={draftListLoading}
                creating={creatingDraft}
                pagination={draftPagination}
                search={draftSearch}
                deletingDraftId={deletingDraftId}
                switchingDraftId={switchingDraftId}
                onNew={() => {
                  void createDraft(DEFAULT_TEMPLATE_A_DRAFT);
                }}
                onDuplicate={() => {
                  void createDraft(draftPayload);
                }}
                onDelete={(draft) => {
                  void deleteDraft(draft);
                }}
                onLoad={() => {
                  void loadDraftList();
                }}
                onPageChange={(page) => {
                  void loadDraftList({ page, force: true });
                }}
                onSearchChange={(search) => {
                  setDraftSearch(search);
                  void loadDraftList({ page: 1, search, force: true });
                }}
                onNameChange={changeDraftName}
                onRename={(draftId, name) => {
                  void renameDraft(draftId, name);
                }}
                onSelect={(draft) => {
                  void selectDraft(draft);
                }}
              />
            }
          />
        }
        properties={
          <TemplateAExportPanel
            loadingPdf={loadingPdf}
            hasVideo={hasVideo}
            finalLoading={finalLoading}
            finalUrl={finalUrl}
            draftStatus={draftStatus}
            draftStatusMessage={draftStatusMessage}
            successMsg={successMsg}
            errorMsg={errorMsg}
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
