"use client";

import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $createListItemNode,
  $createListNode,
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type EditorState,
  type LexicalNode,
  type LexicalEditor,
  type ElementFormatType,
  LineBreakNode,
  ParagraphNode,
  TextNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  getStyleObjectFromCSS,
} from "@lexical/selection";

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

export type RichTextBlock = {
  type: "paragraph" | "bullet" | "number";
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
};

type SelectionRange = {
  start: number;
  end: number;
};

type Props = {
  text: string;
  marks: TextMark[];
  blocks?: RichTextBlock[];
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  onAlignChange?: (align: "left" | "center" | "right") => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onKeyUp: () => void;
  onMouseUp: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onMouseDown: (event: MouseEvent<HTMLElement>) => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onDoubleClick: (event: MouseEvent<HTMLElement>) => void;
  onChange: (payload: {
    text: string;
    marks: TextMark[];
    blocks: RichTextBlock[];
    html: string;
  }) => void;
};

export type LexicalInlineEditorHandle = {
  focus: () => void;
  getRootElement: () => HTMLElement | null;
  syncContent: (
    text: string,
    marks: TextMark[],
    blocks?: RichTextBlock[],
    selection?: SelectionRange,
  ) => void;
  undo: () => void;
  redo: () => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  setFontFamily: (value: string) => void;
  setFontSize: (value: number) => void;
  setColor: (value: string) => void;
  setHighlightColor: (value: string) => void;
  setTextAlign: (value: "left" | "center" | "right") => void;
  toggleList: (value: "bullet" | "number") => void;
  insertText: (value: string) => void;
};

const FONT_OPTIONS = [
  { label: "System", value: "system-ui" },
  { label: "Arial", value: "Arial" },
  { label: "Inter", value: "Inter" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: '"Times New Roman"' },
];

const SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

type NativeToolbarState = {
  visible: boolean;
  x: number;
  y: number;
  placement: "above" | "below";
  fontFamily: string;
  fontSize: number;
  color: string;
  highlightColor: string;
  bold: boolean;
  italic: boolean;
  textAlign: "left" | "center" | "right";
  listType: "bullet" | "number" | null;
  canUndo: boolean;
  canRedo: boolean;
};

function cleanStyle(style: RichStyle): RichStyle {
  const next: RichStyle = {};
  if (style.fontFamily) next.fontFamily = style.fontFamily;
  if (style.fontSize) next.fontSize = style.fontSize;
  if (style.color) next.color = style.color;
  if (style.highlight) next.highlight = true;
  if (style.highlightColor) next.highlightColor = style.highlightColor;
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
  for (const mark of next) {
    const style = cleanStyle(mark.style ?? {});
    if (mark.end <= mark.start || !hasStyle(style)) continue;

    const last = merged[merged.length - 1];
    if (last && last.end === mark.start && stylesEqual(last.style, style)) {
      last.end = mark.end;
      continue;
    }

    merged.push({
      start: mark.start,
      end: mark.end,
      style,
    });
  }

  return merged;
}

function buildCssStyle(style: RichStyle) {
  const entries: string[] = [];
  if (style.fontFamily) entries.push(`font-family:${style.fontFamily}`);
  if (style.fontSize) entries.push(`font-size:${style.fontSize}px`);
  if (style.color) entries.push(`color:${style.color}`);
  if (style.highlight) {
    entries.push(
      `background-color:${style.highlightColor ?? "rgba(250,204,21,0.18)"}`,
    );
  }
  return entries.join(";");
}

function applyTextWithBreaks(
  parent: ParagraphNode | ListItemNode,
  text: string,
  style: RichStyle,
) {
  if (text.length === 0) {
    parent.append($createTextNode(""));
    return;
  }

  const chunks = text.split("\n");
  chunks.forEach((chunk, index) => {
    const node = $createTextNode(chunk);
    const css = buildCssStyle(style);
    if (css) node.setStyle(css);
    if (style.fontWeight === 800 || style.fontWeight === "800") {
      node.setFormat("bold");
    }
    if (style.fontStyle === "italic") {
      node.setFormat("italic");
    }
    parent.append(node);
    if (index < chunks.length - 1) {
      parent.append($createLineBreakNode());
    }
  });
}

function syncEditorContent(
  editor: LexicalEditor,
  text: string,
  marks: TextMark[],
  blocks: RichTextBlock[] = [],
) {
  editor.update(() => {
    const root = $getRoot();
    root.clear();
    const safeMarks = marks
      .map((mark) => ({
        start: Math.max(0, Math.min(mark.start, text.length)),
        end: Math.max(0, Math.min(mark.end, text.length)),
        style: cleanStyle(mark.style ?? {}),
      }))
      .filter((mark) => mark.end > mark.start)
      .sort((a, b) => a.start - b.start);
    const appendMarkedRange = (
      parent: ParagraphNode | ListItemNode,
      rangeStart: number,
      rangeEnd: number,
    ) => {
      if (rangeEnd <= rangeStart) {
        applyTextWithBreaks(parent, "", {});
        return;
      }

      let position = rangeStart;
      for (const mark of safeMarks) {
        if (mark.end <= rangeStart || mark.start >= rangeEnd) continue;

        const sliceStart = Math.max(mark.start, rangeStart);
        const sliceEnd = Math.min(mark.end, rangeEnd);

        if (sliceStart > position) {
          applyTextWithBreaks(parent, text.slice(position, sliceStart), {});
        }

        applyTextWithBreaks(parent, text.slice(sliceStart, sliceEnd), mark.style);
        position = sliceEnd;
      }

      if (position < rangeEnd) {
        applyTextWithBreaks(parent, text.slice(position, rangeEnd), {});
      }
    };

    const normalizedBlocks = blocks
      .map((block) => ({
        ...block,
        start: Math.max(0, Math.min(block.start, text.length)),
        end: Math.max(0, Math.min(block.end, text.length)),
        contentStart: Math.max(0, Math.min(block.contentStart, text.length)),
        contentEnd: Math.max(0, Math.min(block.contentEnd, text.length)),
      }))
      .filter((block) => block.end >= block.start && block.contentEnd >= block.contentStart);

    const shouldUseBlocks = normalizedBlocks.length > 0;
    const blockSource = shouldUseBlocks
      ? normalizedBlocks
      : text.split("\n").map((line, index, lines) => {
          const prefixLength =
            line.match(/^(\s*•\s?)/)?.[1].length ??
            line.match(/^(\s*\d+\.\s)/)?.[1].length ??
            0;
          const start = lines
            .slice(0, index)
            .reduce((sum, part) => sum + part.length + 1, 0);
          const end = start + line.length;

          return {
            type: prefixLength
              ? /^\s*•/.test(line)
                ? ("bullet" as const)
                : ("number" as const)
              : ("paragraph" as const),
            start,
            end,
            contentStart: start + prefixLength,
            contentEnd: end,
          };
        });

    let activeList: ListNode | null = null;
    let activeListType: "bullet" | "number" | null = null;

    const closeActiveList = () => {
      activeList = null;
      activeListType = null;
    };

    blockSource.forEach((block) => {
      if (block.type === "bullet" || block.type === "number") {
        const nextListType = block.type;
        if (!activeList || activeListType !== nextListType) {
          activeList = $createListNode(nextListType);
          activeListType = nextListType;
          root.append(activeList);
        }

        const item = $createListItemNode();
        appendMarkedRange(item, block.contentStart, block.contentEnd);
        activeList.append(item);
      } else {
        closeActiveList();
        const paragraph = $createParagraphNode();
        appendMarkedRange(paragraph, block.contentStart, block.contentEnd);
        root.append(paragraph);
      }
    });
  });
}

function serializeEditorState(editorState: EditorState) {
  return editorState.read(() => {
    let text = "";
    const marks: TextMark[] = [];
    const blocks: RichTextBlock[] = [];

    const visit = (node: LexicalNode) => {
      if ($isTextNode(node)) {
        const content = node.getTextContent();
        const start = text.length;
        text += content;

        const styleObject = getStyleObjectFromCSS(node.getStyle() ?? "");
        const style: RichStyle = {};

        if (styleObject["font-family"]) {
          style.fontFamily = styleObject["font-family"];
        }
        if (styleObject["font-size"]) {
          const parsed = Number.parseFloat(styleObject["font-size"]);
          if (Number.isFinite(parsed)) style.fontSize = parsed;
        }
        if (styleObject.color) style.color = styleObject.color;
        if (styleObject["background-color"]) {
          style.highlight = true;
          style.highlightColor = styleObject["background-color"];
        }
        if (node.hasFormat("bold")) style.fontWeight = 800;
        if (node.hasFormat("italic")) style.fontStyle = "italic";

        if (content.length > 0 && hasStyle(style)) {
          marks.push({
            start,
            end: text.length,
            style,
          });
        }
        return;
      }

      if ($isLineBreakNode(node)) {
        text += "\n";
        return;
      }

      if ($isListNode(node)) {
        const listType = node.getListType();
        const items = node.getChildren();
        items.forEach((child, index) => {
          if (!(child instanceof ListItemNode)) return;
          const prefix = listType === "number" ? `${index + 1}. ` : "• ";
          const start = text.length;
          text += prefix;
          const contentStart = text.length;
          child.getChildren().forEach((grandChild) => visit(grandChild));
          blocks.push({
            type: listType === "number" ? "number" : "bullet",
            start,
            end: text.length,
            contentStart,
            contentEnd: text.length,
          });
          if (index < items.length - 1) {
            text += "\n";
          }
        });
        return;
      }

      if ($isElementNode(node)) {
        const blockStart = text.length;
        const children = node.getChildren();
        children.forEach((child) => visit(child));
        if (
          $isParagraphNode(node) &&
          !(node.getParent() instanceof ListItemNode) &&
          node.getNextSibling() != null
        ) {
          blocks.push({
            type: "paragraph",
            start: blockStart,
            end: text.length,
            contentStart: blockStart,
            contentEnd: text.length,
          });
          text += "\n";
          return;
        }
        if ($isParagraphNode(node) && !(node.getParent() instanceof ListItemNode)) {
          blocks.push({
            type: "paragraph",
            start: blockStart,
            end: text.length,
            contentStart: blockStart,
            contentEnd: text.length,
          });
        }
      }
    };

    $getRoot()
      .getChildren()
      .forEach((child) => visit(child));

    return {
      text,
      marks: mergeMarks(marks),
      blocks,
    };
  });
}

function EditorRefPlugin({
  onReady,
}: {
  onReady: (editor: LexicalEditor) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);

  return null;
}

function EnterBehaviorPlugin({ multiline }: { multiline: boolean }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!multiline) {
          event?.preventDefault();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, multiline]);

  return null;
}

function NativeToolbarPlugin({
  multiline,
  onAlignChange,
}: {
  multiline: boolean;
  onAlignChange?: (align: "left" | "center" | "right") => void;
}) {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [toolbar, setToolbar] = useState<NativeToolbarState>({
    visible: false,
    x: 0,
    y: 0,
    placement: "above",
    fontFamily: "system-ui",
    fontSize: 16,
    color: "#111827",
    highlightColor: "rgba(250,204,21,0.28)",
    bold: false,
    italic: false,
    textAlign: "left",
    listType: null,
    canUndo: false,
    canRedo: false,
  });

  const updateToolbar = useCallback(() => {
    const root = editor.getRootElement();
    const domSelection = window.getSelection();
    const activeElement = document.activeElement;
    const focusIsInToolbar = Boolean(
      activeElement instanceof Node &&
      toolbarRef.current?.contains(activeElement),
    );
    if (!root || !domSelection || domSelection.rangeCount === 0) {
      if (focusIsInToolbar) return;
      setToolbar((prev) => ({ ...prev, visible: false }));
      return;
    }

    const domRange = domSelection.getRangeAt(0);
    if (
      !root.contains(domRange.startContainer) ||
      !root.contains(domRange.endContainer)
    ) {
      if (focusIsInToolbar) return;
      setToolbar((prev) => ({ ...prev, visible: false }));
      return;
    }

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        setToolbar((prev) => ({ ...prev, visible: false }));
        return;
      }

      const fontFamily =
        $getSelectionStyleValueForProperty(
          selection,
          "font-family",
          "system-ui",
        ) || "system-ui";
      const fontSizeValue =
        $getSelectionStyleValueForProperty(selection, "font-size", "16px") ||
        "16px";
      const parsedFontSize = Number.parseFloat(fontSizeValue);
      const color =
        $getSelectionStyleValueForProperty(selection, "color", "#111827") ||
        "#111827";
      const highlightColor =
        $getSelectionStyleValueForProperty(
          selection,
          "background-color",
          "rgba(250,204,21,0.28)",
        ) || "rgba(250,204,21,0.28)";
      const anchorNode = selection.anchor.getNode();
      const topLevel = anchorNode.getTopLevelElementOrThrow();
      const format = $isElementNode(topLevel) ? topLevel.getFormatType() : "";
      const textAlign: "left" | "center" | "right" =
        format === "center" || format === "right" ? format : "left";
      let listType: "bullet" | "number" | null = null;
      let currentNode = anchorNode;
      while (currentNode) {
        if ($isListNode(currentNode)) {
          const type = currentNode.getListType();
          listType =
            type === "bullet" ? "bullet" : type === "number" ? "number" : null;
          break;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        currentNode = currentNode.getParent();
      }

      const rect = selection.isCollapsed()
        ? root.getBoundingClientRect()
        : (() => {
            const base = domRange.getBoundingClientRect();
            if (base.width || base.height) return base;
            return domRange.getClientRects()[0] ?? root.getBoundingClientRect();
          })();

      const width = 360;
      const height = 52;
      const margin = 12;
      const centerX = rect.left + rect.width / 2;
      const minX = width / 2 + margin;
      const maxX = window.innerWidth - width / 2 - margin;
      const x =
        maxX > minX
          ? Math.min(Math.max(centerX, minX), maxX)
          : window.innerWidth / 2;
      const hasSpaceAbove = rect.top >= height + margin * 2;
      const placement: "above" | "below" = hasSpaceAbove ? "above" : "below";
      const y = hasSpaceAbove ? rect.top - margin : rect.bottom + margin;

      setToolbar((prev) => ({
        ...prev,
        visible: true,
        x,
        y,
        placement,
        fontFamily,
        fontSize: Number.isFinite(parsedFontSize) ? parsedFontSize : 16,
        color,
        highlightColor,
        bold: selection.hasFormat("bold"),
        italic: selection.hasFormat("italic"),
        textAlign,
        listType,
      }));
    });
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updateToolbar();
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setToolbar((prev) => ({ ...prev, canUndo: payload }));
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setToolbar((prev) => ({ ...prev, canRedo: payload }));
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    const onViewportChange = () => updateToolbar();
    const onSelectionChange = () => updateToolbar();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [updateToolbar]);

  const patchSelectionStyle = useCallback(
    (patch: Record<string, string>) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, patch);
        }
      });
      requestAnimationFrame(updateToolbar);
    },
    [editor, updateToolbar],
  );

  const setTextAlign = useCallback(
    (nextAlign: "left" | "center" | "right") => {
      editor.dispatchCommand(
        FORMAT_ELEMENT_COMMAND,
        nextAlign as ElementFormatType,
      );
      onAlignChange?.(nextAlign);
      requestAnimationFrame(updateToolbar);
    },
    [editor, onAlignChange, updateToolbar],
  );

  const toggleList = useCallback(
    (nextType: "bullet" | "number") => {
      if (toolbar.listType === nextType) {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      } else if (nextType === "bullet") {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      } else {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      }
      requestAnimationFrame(updateToolbar);
    },
    [editor, toolbar.listType, updateToolbar],
  );

  if (!toolbar.visible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={toolbarRef}
      data-lexical-toolbar="true"
      className="lexical-toolbar"
      style={{
        position: "fixed",
        left: toolbar.x,
        top: toolbar.y,
        transform:
          toolbar.placement === "above"
            ? "translate(-50%, -100%)"
            : "translate(-50%, 0)",
        zIndex: 50000,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 16,
        border: "1px solid rgba(15,23,42,0.1)",
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(18px)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
      }}
      onMouseDown={(event) => {
        const target = event.target;
        if (
          !(target instanceof HTMLElement) ||
          !target.closest("select,input,button,option")
        ) {
          event.preventDefault();
        }
        event.stopPropagation();
      }}
    >
      <select
        className="lexical-toolbar__select lexical-toolbar__select--font"
        value={toolbar.fontFamily}
        onChange={(event) =>
          patchSelectionStyle({ "font-family": event.target.value })
        }
      >
        {FONT_OPTIONS.map((font) => (
          <option key={font.value} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>
      <select
        className="lexical-toolbar__select lexical-toolbar__select--size"
        value={String(toolbar.fontSize)}
        onChange={(event) =>
          patchSelectionStyle({ "font-size": `${event.target.value}px` })
        }
      >
        {SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <button
        className={`lexical-toolbar__button${
          toolbar.bold ? " lexical-toolbar__button--active" : ""
        }`}
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        B
      </button>
      <button
        className={`lexical-toolbar__button${
          toolbar.italic ? " lexical-toolbar__button--active" : ""
        }`}
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        I
      </button>
      <input
        className="lexical-toolbar__color"
        type="color"
        value={toolbar.color}
        onChange={(event) => patchSelectionStyle({ color: event.target.value })}
      />
      <input
        className="lexical-toolbar__color"
        type="color"
        value={rgbaToHex(toolbar.highlightColor)}
        onChange={(event) =>
          patchSelectionStyle({
            "background-color": hexToRgba(event.target.value, 0.28),
          })
        }
      />
      {multiline ? (
        <button
          className={`lexical-toolbar__button${
            toolbar.listType === "bullet"
              ? " lexical-toolbar__button--active"
              : ""
          }`}
          type="button"
          onClick={() => toggleList("bullet")}
        >
          • List
        </button>
      ) : null}
      {multiline ? (
        <button
          className={`lexical-toolbar__button${
            toolbar.listType === "number"
              ? " lexical-toolbar__button--active"
              : ""
          }`}
          type="button"
          onClick={() => toggleList("number")}
        >
          1. List
        </button>
      ) : null}
      <select
        className="lexical-toolbar__select lexical-toolbar__select--align"
        value={toolbar.textAlign}
        onChange={(event) =>
          setTextAlign(event.target.value as "left" | "center" | "right")
        }
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
    </div>,
    document.body,
  );
}

function rgbaToHex(value: string) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return "#facc15";
  const toHex = (channel: string) =>
    Number(channel).toString(16).padStart(2, "0");
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}

function hexToRgba(hex: string, alpha: number) {
  const cleanHex = hex.replace("#", "");
  const expanded =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : cleanHex;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

const LexicalInlineEditor = forwardRef<LexicalInlineEditorHandle, Props>(
  function LexicalInlineEditor(
    {
      text,
      marks,
      blocks = [],
      className,
      style,
      multiline = true,
      onAlignChange,
      onBlur,
      onKeyDown,
      onKeyUp,
      onMouseUp,
      onPointerDown,
      onMouseDown,
      onClick,
      onDoubleClick,
      onChange,
    },
    ref,
  ) {
    const editorRef = useRef<LexicalEditor | null>(null);
    const latestContentRef = useRef<string>("");

    const setEditor = useCallback(
      (editor: LexicalEditor) => {
        editorRef.current = editor;
        const initialSerialized = JSON.stringify({ text, marks, blocks });
        if (latestContentRef.current === initialSerialized) return;
        syncEditorContent(editor, text, marks, blocks);
        latestContentRef.current = initialSerialized;
      },
      [text, marks, blocks],
    );

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          editorRef.current?.focus();
        },
        getRootElement() {
          return editorRef.current?.getRootElement() ?? null;
        },
        syncContent(nextText, nextMarks, nextBlocks = []) {
          const editor = editorRef.current;
          if (!editor) return;
          const nextSerialized = JSON.stringify({
            text: nextText,
            marks: nextMarks,
            blocks: nextBlocks,
          });
          if (latestContentRef.current === nextSerialized) return;
          syncEditorContent(editor, nextText, nextMarks, nextBlocks);
          latestContentRef.current = nextSerialized;
        },
        undo() {
          editorRef.current?.dispatchCommand(UNDO_COMMAND, undefined);
        },
        redo() {
          editorRef.current?.dispatchCommand(REDO_COMMAND, undefined);
        },
        toggleBold() {
          editorRef.current?.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        },
        toggleItalic() {
          editorRef.current?.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        },
        setFontFamily(value) {
          const editor = editorRef.current;
          if (!editor) return;
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $patchStyleText(selection, { "font-family": value });
            }
          });
        },
        setFontSize(value) {
          const editor = editorRef.current;
          if (!editor) return;
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $patchStyleText(selection, { "font-size": `${value}px` });
            }
          });
        },
        setColor(value) {
          const editor = editorRef.current;
          if (!editor) return;
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $patchStyleText(selection, { color: value });
            }
          });
        },
        setHighlightColor(value) {
          const editor = editorRef.current;
          if (!editor) return;
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $patchStyleText(selection, {
                "background-color": hexToRgba(value, 0.28),
              });
            }
          });
        },
        setTextAlign(value) {
          editorRef.current?.dispatchCommand(
            FORMAT_ELEMENT_COMMAND,
            value as ElementFormatType,
          );
        },
        toggleList(value) {
          const editor = editorRef.current;
          if (!editor) return;
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            const anchorNode = selection.anchor.getNode();
            let currentNode = anchorNode;
            let listType: "bullet" | "number" | null = null;
            while (currentNode) {
              if ($isListNode(currentNode)) {
                const type = currentNode.getListType();
                listType =
                  type === "bullet"
                    ? "bullet"
                    : type === "number"
                      ? "number"
                      : null;
                break;
              }
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              currentNode = currentNode.getParent();
            }

            if (listType === value) {
              editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            } else if (value === "bullet") {
              editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            } else {
              editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            }
          });
        },
        insertText(value) {
          const editor = editorRef.current;
          if (!editor) return;
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.insertText(value);
            }
          });
        },
      }),
      [],
    );

    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const nextSerialized = JSON.stringify({ text, marks, blocks });
      if (latestContentRef.current === nextSerialized) return;
      syncEditorContent(editor, text, marks, blocks);
      latestContentRef.current = nextSerialized;
    }, [blocks, marks, text]);

    const initialConfig = useMemo(
      () => ({
        namespace: "template-inline-editor",
        editable: true,
        theme: {},
        nodes: [ParagraphNode, TextNode, LineBreakNode, ListNode, ListItemNode],
        onError(error: Error) {
          throw error;
        },
      }),
      [],
    );

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <EditorRefPlugin onReady={setEditor} />
        <EnterBehaviorPlugin multiline={multiline} />
        <NativeToolbarPlugin
          multiline={multiline}
          onAlignChange={onAlignChange}
        />
        <ListPlugin />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={className}
              style={style}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              onPointerDown={onPointerDown}
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUp}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
              spellCheck={false}
            />
          }
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin
          onChange={(editorState, editor) => {
            const next = serializeEditorState(editorState);
            latestContentRef.current = JSON.stringify(next);
            onChange({
              ...next,
              html: editor.getRootElement()?.innerHTML ?? "",
            });
          }}
          ignoreHistoryMergeTagChange={true}
          ignoreSelectionChange={true}
        />
      </LexicalComposer>
    );
  },
);

export default LexicalInlineEditor;
