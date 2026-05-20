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
} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type EditorState,
  type LexicalNode,
  type LexicalEditor,
  LineBreakNode,
  ParagraphNode,
  TextNode,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_LOW,
} from "lexical";
import { getStyleObjectFromCSS } from "@lexical/selection";

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

const LexicalInlineEditor = forwardRef<LexicalInlineEditorHandle, Props>(
  function LexicalInlineEditor(
    {
      text,
      marks,
      className,
      style,
      multiline = true,
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
