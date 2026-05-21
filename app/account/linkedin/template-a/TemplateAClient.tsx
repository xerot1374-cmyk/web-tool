"use client";

import LinkedInEditorBaseClient from "@/app/components/templates/linkedin-shared/LinkedInEditorBaseClient";
import LinkedInEditorLayout from "@/app/components/templates/linkedin-shared/LinkedInEditorLayout";
import { LinkedInToolbox } from "@/app/components/templates/linkedin-shared/ToolBox";
import LinkedInTemplate2 from "@/app/components/templates/linkedin/LinkedInTemplate2";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { type LexicalInlineEditorHandle } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import { CANVAS_PRESETS, getCanvasFrame } from "@/app/lib/renderUtils";
import TemplateAExportPanel from "./components/TemplateAExportPanel";
import TemplateAPreview from "./components/TemplateAPreview";
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
  getContentEditablePlainText,
  getTextChangeRange,
  hasStyle,
  mergeMarks,
  readContentEditableSelection,
  remapMarksForLinePrefixChanges,
  restoreContentEditableSelection,
  shiftMarksAfterTextChange,
} from "./lib/templateARichText.utils";

export default function TemplateAClient({ sessionUser }: TemplateAClientProps) {
  const [{ isPdf, payload }, setPdfCtx] = useState<{
    isPdf: boolean;
    payload: PdfPayload | null;
  }>(() => ({ isPdf: false, payload: null }));

  useEffect(() => {
    // This client-only sync is required to read window PDF payload state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPdfCtx(getPdfModeAndPayload());
  }, []);

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
    videoFile,
    setVideoFile,
    videoPreviewUrl,
    videoBox,
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
  } = useTemplateAMediaEditor({
    stageRef,
    previewScale,
    canvasPreset,
    editField,
    setEditField,
    badgeText,
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
      selectVideoObject();
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
    setBadgeMarks,
    setTitleMarks,
    setBodyMarks,
    setCompanyMarks,
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
