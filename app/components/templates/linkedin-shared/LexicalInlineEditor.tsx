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
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
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

type SelectionRange = {
  start: number;
  end: number;
};

type Props = {
  text: string;
  marks: TextMark[];
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
  onChange: (payload: { text: string; marks: TextMark[] }) => void;
};

export type LexicalInlineEditorHandle = {
  focus: () => void;
  getRootElement: () => HTMLElement | null;
  syncContent: (
    text: string,
    marks: TextMark[],
    selection?: SelectionRange,
  ) => void;
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
  highlight: boolean;
  bold: boolean;
  italic: boolean;
  textAlign: "left" | "center" | "right";
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
  paragraph: ParagraphNode,
  text: string,
  style: RichStyle,
) {
  if (text.length === 0) {
    paragraph.append($createTextNode(""));
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
    paragraph.append(node);
    if (index < chunks.length - 1) {
      paragraph.append($createLineBreakNode());
    }
  });
}

function syncEditorContent(editor: LexicalEditor, text: string, marks: TextMark[]) {
  editor.update(() => {
    const root = $getRoot();
    root.clear();

    const paragraph = $createParagraphNode();
    const safeMarks = marks
      .map((mark) => ({
        start: Math.max(0, Math.min(mark.start, text.length)),
        end: Math.max(0, Math.min(mark.end, text.length)),
        style: cleanStyle(mark.style ?? {}),
      }))
      .filter((mark) => mark.end > mark.start)
      .sort((a, b) => a.start - b.start);

    let position = 0;
    for (const mark of safeMarks) {
      if (mark.start > position) {
        applyTextWithBreaks(paragraph, text.slice(position, mark.start), {});
      }

      applyTextWithBreaks(
        paragraph,
        text.slice(mark.start, mark.end),
        mark.style,
      );
      position = mark.end;
    }

    if (position < text.length || safeMarks.length === 0) {
      applyTextWithBreaks(paragraph, text.slice(position), {});
    }

    root.append(paragraph);
  });
}

function serializeEditorState(editorState: EditorState) {
  return editorState.read(() => {
    let text = "";
    const marks: TextMark[] = [];

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

      if ($isElementNode(node)) {
        const children = node.getChildren();
        children.forEach((child) => visit(child));
        if ($isParagraphNode(node) && node.getNextSibling() != null) {
          text += "\n";
        }
      }
    };

    $getRoot()
      .getChildren()
      .forEach((child) => visit(child));

    return {
      text,
      marks: mergeMarks(marks),
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
  const [toolbar, setToolbar] = useState<NativeToolbarState>({
    visible: false,
    x: 0,
    y: 0,
    placement: "above",
    fontFamily: "system-ui",
    fontSize: 16,
    color: "#111827",
    highlightColor: "rgba(250,204,21,0.28)",
    highlight: false,
    bold: false,
    italic: false,
    textAlign: "left",
    canUndo: false,
    canRedo: false,
  });

  const updateToolbar = useCallback(() => {
    const root = editor.getRootElement();
    const domSelection = window.getSelection();
    if (!root || !domSelection || domSelection.rangeCount === 0) {
      setToolbar((prev) => ({ ...prev, visible: false }));
      return;
    }

    const domRange = domSelection.getRangeAt(0);
    if (
      !root.contains(domRange.startContainer) ||
      !root.contains(domRange.endContainer)
    ) {
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
      const format = $isElementNode(topLevel)
        ? topLevel.getFormatType()
        : "";
      const textAlign: "left" | "center" | "right" =
        format === "center" || format === "right" ? format : "left";

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
        highlight: highlightColor !== "" && highlightColor !== "transparent",
        highlightColor,
        bold: selection.hasFormat("bold"),
        italic: selection.hasFormat("italic"),
        textAlign,
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
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
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

  if (!toolbar.visible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
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
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        disabled={!toolbar.canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        style={{ opacity: toolbar.canUndo ? 1 : 0.45 }}
      >
        Undo
      </button>
      <button
        type="button"
        disabled={!toolbar.canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        style={{ opacity: toolbar.canRedo ? 1 : 0.45 }}
      >
        Redo
      </button>
      <select
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
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        style={{ fontWeight: toolbar.bold ? 800 : 500 }}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        style={{ fontStyle: toolbar.italic ? "italic" : "normal" }}
      >
        I
      </button>
      <input
        type="color"
        value={toolbar.color}
        onChange={(event) =>
          patchSelectionStyle({ color: event.target.value })
        }
      />
      <input
        type="color"
        value={rgbaToHex(toolbar.highlight ? toolbar.highlightColor : "rgba(250,204,21,0.28)")}
        onChange={(event) =>
          patchSelectionStyle({
            "background-color": hexToRgba(event.target.value, 0.28),
          })
        }
      />
      <button
        type="button"
        onClick={() =>
          patchSelectionStyle({
            "background-color": toolbar.highlight ? "" : "rgba(250,204,21,0.28)",
          })
        }
      >
        Highlight
      </button>
      <select
        value={toolbar.textAlign}
        onChange={(event) =>
          setTextAlign(event.target.value as "left" | "center" | "right")
        }
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      {multiline ? <span style={{ fontSize: 12, color: "#6b7280" }}>Lexical</span> : null}
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

    const setEditor = useCallback((editor: LexicalEditor) => {
      editorRef.current = editor;
      const initialSerialized = JSON.stringify({ text, marks });
      if (latestContentRef.current === initialSerialized) return;
      syncEditorContent(editor, text, marks);
      latestContentRef.current = initialSerialized;
    }, [text, marks]);

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          editorRef.current?.focus();
        },
        getRootElement() {
          return editorRef.current?.getRootElement() ?? null;
        },
        syncContent(nextText, nextMarks) {
          const editor = editorRef.current;
          if (!editor) return;
          const nextSerialized = JSON.stringify({ text: nextText, marks: nextMarks });
          if (latestContentRef.current === nextSerialized) return;
          syncEditorContent(editor, nextText, nextMarks);
          latestContentRef.current = nextSerialized;
        },
      }),
      [],
    );

    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const nextSerialized = JSON.stringify({ text, marks });
      if (latestContentRef.current === nextSerialized) return;
      syncEditorContent(editor, text, marks);
      latestContentRef.current = nextSerialized;
    }, [marks, text]);

    const initialConfig = useMemo(
      () => ({
        namespace: "template-inline-editor",
        editable: true,
        theme: {},
        nodes: [ParagraphNode, TextNode, LineBreakNode],
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
          onChange={(editorState) => {
            const next = serializeEditorState(editorState);
            latestContentRef.current = JSON.stringify(next);
            onChange(next);
          }}
          ignoreHistoryMergeTagChange={true}
          ignoreSelectionChange={true}
        />
      </LexicalComposer>
    );
  },
);

export default LexicalInlineEditor;
