"use client";

import LinkedInEditorBaseClient from "@/app/components/templates/linkedin-shared/LinkedInEditorBaseClient";
import LinkedInEditorLayout from "@/app/components/templates/linkedin-shared/LinkedInEditorLayout";
import { LinkedInToolbox } from "@/app/components/templates/linkedin-shared/ToolBox";
import LinkedInTemplate2 from "@/app/components/templates/linkedin/LinkedInTemplate2";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { type LexicalInlineEditorHandle } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import { CANVAS_PRESETS, getCanvasFrame } from "@/app/lib/renderUtils";
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
  TemplateAClientProps,
  TextMark,
} from "./lib/templateA.types";
import {
  getLineBounds,
  getPdfModeAndPayload,
  isPreviewSelectableId,
  safePx,
} from "./lib/templateA.utils";
import {
  cleanStyle,
  getContentEditablePlainText,
  getTextChangeRange,
  hasStyle,
  mergeMarks,
  overlaps,
  readContentEditableSelection,
  remapMarksForLinePrefixChanges,
  restoreContentEditableSelection,
  shiftMarksAfterTextChange,
  styleForSegment,
} from "./lib/templateARichText.utils";

export default function TemplateAClient({ sessionUser }: TemplateAClientProps) {
  const [{ isPdf, payload }] = useState<{
    isPdf: boolean;
    payload: PdfPayload | null;
  }>(() => getPdfModeAndPayload());

  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [canvasPreset, setCanvasPreset] = useState<CanvasPresetKey>("linkedin");

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
    handleAddLink,
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
    videos,
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
    setCanvasPreset,
    setHeadline,
    setSubline,
    setBadgeText,
    setTitle,
    setBodyRaw: _setBody,
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
  });

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

    if (activeField !== "caption") return;
    const node = captionRef.current;
    const start = node?.selectionStart ?? caption.length;
    const end = node?.selectionEnd ?? caption.length;
    const next = `${caption.slice(0, start)}${emoji}${caption.slice(end)}`;
    handleTextChange("caption", next, start + emoji.length);
    requestAnimationFrame(() => node?.focus());
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

  function getCaptionSelectionRange() {
    const node = captionRef.current;
    const start = node?.selectionStart ?? 0;
    const end = node?.selectionEnd ?? start;
    return { node, start: Math.min(start, end), end: Math.max(start, end) };
  }

  function focusCaptionSelection(start: number, end = start) {
    requestAnimationFrame(() => {
      const node = captionRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(start, end);
    });
  }

  function updateCaptionMarksInSelection(
    transformStyle: (style: TextMark["style"]) => TextMark["style"],
  ) {
    const { node, start, end } = getCaptionSelectionRange();
    if (!node || start === end) return;

    setActiveField("caption");
    setCaptionMarks((prevMarks) => {
      const outside = prevMarks
        .flatMap((mark) => {
          if (!overlaps(mark, { start, end })) return [mark];

          const pieces: TextMark[] = [];
          if (mark.start < start) {
            pieces.push({ ...mark, end: start });
          }
          if (mark.end > end) {
            pieces.push({ ...mark, start: end });
          }
          return pieces;
        })
        .filter((mark) => mark.end > mark.start);

      const boundaries = new Set<number>([start, end]);
      prevMarks.forEach((mark) => {
        if (!overlaps(mark, { start, end })) return;
        boundaries.add(Math.max(start, mark.start));
        boundaries.add(Math.min(end, mark.end));
      });

      const segments = Array.from(boundaries).sort((a, b) => a - b);
      const nextMarks = [...outside];
      for (let index = 0; index < segments.length - 1; index += 1) {
        const segmentStart = segments[index];
        const segmentEnd = segments[index + 1];
        if (segmentEnd <= segmentStart) continue;

        const nextStyle = cleanStyle(
          transformStyle(styleForSegment(prevMarks, segmentStart, segmentEnd)),
        );
        if (hasStyle(nextStyle)) {
          nextMarks.push({
            start: segmentStart,
            end: segmentEnd,
            style: nextStyle,
          });
        }
      }

      return mergeMarks(nextMarks);
    });

    focusCaptionSelection(start, end);
  }

  function captionSelectionHasStyle(
    predicate: (style: TextMark["style"]) => boolean,
  ) {
    const { start, end } = getCaptionSelectionRange();
    if (start === end) return false;

    const boundaries = new Set<number>([start, end]);
    captionMarks.forEach((mark) => {
      if (!overlaps(mark, { start, end })) return;
      boundaries.add(Math.max(start, mark.start));
      boundaries.add(Math.min(end, mark.end));
    });

    const segments = Array.from(boundaries).sort((a, b) => a - b);
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segmentStart = segments[index];
      const segmentEnd = segments[index + 1];
      if (segmentEnd <= segmentStart) continue;
      if (!predicate(styleForSegment(captionMarks, segmentStart, segmentEnd))) {
        return false;
      }
    }

    return true;
  }

  function toggleCaptionInlineStyle(
    kind: "bold" | "italic",
    active: boolean,
  ) {
    updateCaptionMarksInSelection((style) => {
      if (kind === "bold") {
        if (active) {
          const rest = { ...style };
          delete rest.fontWeight;
          return rest;
        }
        return { ...style, fontWeight: 700 };
      }

      if (active) {
        const rest = { ...style };
        delete rest.fontStyle;
        return rest;
      }
      return { ...style, fontStyle: "italic" };
    });
  }

  function toggleCaptionList(listType: "bullet" | "number") {
    const { node, start, end } = getCaptionSelectionRange();
    if (!node) return;

    const lineStart = caption.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndLookup = caption.indexOf("\n", end);
    const blockEnd = lineEndLookup === -1 ? caption.length : lineEndLookup;
    const blockText = caption.slice(lineStart, blockEnd);
    const lines = blockText.split("\n");
    if (!lines.length) return;

    const prefixMatcher =
      listType === "bullet"
        ? /^(\s*)•\s/
        : /^(\s*)\d+\.\s/;
    const shouldRemove = lines.every((line) => prefixMatcher.test(line));

    let cursor = lineStart;
    const changes = lines.map((line, index) => {
      const match = line.match(prefixMatcher);
      const oldPrefixLength = match?.[0].length ?? 0;
      const indent = match?.[1] ?? line.match(/^(\s*)/)?.[1] ?? "";
      const baseContent = match ? line.slice(match[0].length) : line.slice(indent.length);
      const nextPrefix = shouldRemove
        ? indent
        : `${indent}${listType === "bullet" ? "• " : `${index + 1}. `}`;
      const nextLine = `${nextPrefix}${baseContent}`;
      const oldLineStart = cursor;
      const oldLineEnd = cursor + line.length;
      cursor += line.length + 1;

      return {
        line,
        nextLine,
        oldLineStart,
        oldLineEnd,
        oldPrefixLength,
        newPrefixLength: nextPrefix.length,
      };
    });

    const nextBlockText = changes.map((change) => change.nextLine).join("\n");
    const nextCaption =
      caption.slice(0, lineStart) + nextBlockText + caption.slice(blockEnd);
    _setCaption(nextCaption);
    setCaptionMarks((prevMarks) =>
      remapMarksForLinePrefixChanges(
        prevMarks,
        changes.map((change) => ({
          oldLineStart: change.oldLineStart,
          oldLineEnd: change.oldLineEnd,
          oldPrefixLength: change.oldPrefixLength,
          newPrefixLength: change.newPrefixLength,
        })),
      ),
    );

    const nextSelectionEnd = lineStart + nextBlockText.length;
    focusCaptionSelection(lineStart, nextSelectionEnd);
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

  function getToolbarTextAlign() {
    if (activeField === "caption") return captionStyle.textAlign;
    if (editField === "title") return titleStyle.textAlign;
    if (editField === "company") return companyStyle.textAlign;
    if (editField === "badge") return badgeStyle.textAlign;
    return bodyBoxStyle.textAlign;
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
        blocks: getRichEditBlocks(editField),
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
            visible={Boolean(editField) || activeField === "caption"}
            activeField={activeField}
            editField={isRichEditField(editField) ? editField : null}
            currentMarks={getActiveMarksState().marks}
            currentTextAlign={getToolbarTextAlign()}
            onInsertEmoji={insertEmojiIntoActiveField}
            onUndo={() => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.undo();
                return;
              }
              if (activeField === "caption") {
                captionRef.current?.focus();
                document.execCommand("undo");
              }
            }}
            onRedo={() => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.redo();
                return;
              }
              if (activeField === "caption") {
                captionRef.current?.focus();
                document.execCommand("redo");
              }
            }}
            onToggleBold={() => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.toggleBold();
                return;
              }
              if (activeField === "caption") {
                toggleCaptionInlineStyle(
                  "bold",
                  captionSelectionHasStyle(
                    (style) =>
                      style.fontWeight === 700 ||
                      style.fontWeight === "700" ||
                      style.fontWeight === "bold",
                  ),
                );
              }
            }}
            onToggleItalic={() => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.toggleItalic();
                return;
              }
              if (activeField === "caption") {
                toggleCaptionInlineStyle(
                  "italic",
                  captionSelectionHasStyle(
                    (style) => style.fontStyle === "italic",
                  ),
                );
              }
            }}
            onSetFontFamily={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.setFontFamily(value);
                return;
              }
              if (activeField === "caption") {
                updateCaptionMarksInSelection((style) => ({
                  ...style,
                  fontFamily: value,
                }));
              }
            }}
            onSetFontSize={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.setFontSize(value);
                return;
              }
              if (activeField === "caption") {
                updateCaptionMarksInSelection((style) => ({
                  ...style,
                  fontSize: value,
                }));
              }
            }}
            onSetColor={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.setColor(value);
                return;
              }
              if (activeField === "caption") {
                updateCaptionMarksInSelection((style) => ({
                  ...style,
                  color: value,
                }));
              }
            }}
            onSetHighlightColor={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.setHighlightColor(value);
                return;
              }
              if (activeField === "caption") {
                updateCaptionMarksInSelection((style) => ({
                  ...style,
                  highlight: true,
                  highlightColor: value,
                }));
              }
            }}
            onToggleList={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.toggleList(value);
                return;
              }
              if (activeField === "caption") {
                toggleCaptionList(value);
              }
            }}
            onSetTextAlign={(value) => {
              if (isRichEditField(editField)) {
                getRichEditEditor(editField)?.setTextAlign(value);
                return;
              }
              if (activeField === "caption") {
                setFieldTextAlign("caption", value);
              }
            }}
          />
        }
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
            editorVideos={editorVideos}
            selectedVideoId={selectedVideoId}
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
            handleAddLink={handleAddLink}
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
            videos={videos}
            clearVideo={clearVideo}
          />
        }
        properties={
          <TemplateAExportPanel
            loadingPdf={loadingPdf}
            hasVideo={hasVideo}
            finalLoading={finalLoading}
            finalUrl={finalUrl}
            caption={caption}
            captionMarks={captionMarks}
            captionStyle={captionStyle}
            copied={copied}
            successMsg={successMsg}
            errorMsg={errorMsg}
            captionRef={captionRef}
            onCaptionChange={(value, selectionStart) =>
              handleTextChange("caption", value, selectionStart)
            }
            onCaptionFocus={() => setActiveField("caption")}
            onCaptionKeyDown={(e) => handleNumberedListEnter("caption", e)}
            onCopyCaption={copyCaption}
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
