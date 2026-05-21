"use client";

import type { TextMark } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import type { EditorTextField, RichEditField } from "../lib/templateA.types";
import { useMemo, useState } from "react";

const FONT_OPTIONS = [
  { label: "System", value: "system-ui" },
  { label: "Arial", value: "Arial" },
  { label: "Inter", value: "Inter" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: '"Times New Roman"' },
];

const SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
const EMOJIS = ["😀", "🙂", "😉", "🔥", "✨", "🚀", "🎯", "💡", "✅", "👏"];

type Props = {
  activeField: EditorTextField;
  editField: RichEditField | null;
  visible: boolean;
  currentMarks: TextMark[];
  currentTextAlign: "left" | "center" | "right";
  onInsertEmoji: (emoji: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onSetFontFamily: (value: string) => void;
  onSetFontSize: (value: number) => void;
  onSetColor: (value: string) => void;
  onSetHighlightColor: (value: string) => void;
  onToggleList: (value: "bullet" | "number") => void;
  onSetTextAlign: (value: "left" | "center" | "right") => void;
};

function getCurrentStyle(marks: TextMark[]) {
  const latest = marks.at(-1)?.style ?? {};
  return {
    fontFamily: latest.fontFamily ?? "system-ui",
    fontSize: latest.fontSize ?? 16,
    color: latest.color ?? "#111827",
    highlightColor: latest.highlightColor ?? "#facc15",
    bold:
      latest.fontWeight === 700 ||
      latest.fontWeight === "700" ||
      latest.fontWeight === "bold",
    italic: latest.fontStyle === "italic",
  };
}

export default function TemplateAStickyToolbar({
  activeField,
  editField,
  visible,
  currentMarks,
  currentTextAlign,
  onInsertEmoji,
  onUndo,
  onRedo,
  onToggleBold,
  onToggleItalic,
  onSetFontFamily,
  onSetFontSize,
  onSetColor,
  onSetHighlightColor,
  onToggleList,
  onSetTextAlign,
}: Props) {
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const currentStyle = useMemo(() => getCurrentStyle(currentMarks), [currentMarks]);

  if (!visible) return null;

  return (
    <div
      className="editor-bottomToolbar editor-shell-card"
      onMouseDown={(event) => {
        event.preventDefault();
      }}
    >
      <div className="editor-bottomToolbar__meta">
        <span className="editor-bottomToolbar__label">Editing</span>
        <span className="editor-bottomToolbar__field">{activeField}</span>
      </div>

      <div className="editor-bottomToolbar__controls">
        <>
          <button
            type="button"
            className="lexical-toolbar__button"
            onClick={onUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="lexical-toolbar__button"
            onClick={onRedo}
          >
            Redo
          </button>
          <select
            className="lexical-toolbar__select lexical-toolbar__select--font"
            value={currentStyle.fontFamily}
            onChange={(event) => onSetFontFamily(event.target.value)}
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <select
            className="lexical-toolbar__select lexical-toolbar__select--size"
            value={String(currentStyle.fontSize)}
            onChange={(event) => onSetFontSize(Number(event.target.value))}
          >
            {SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`lexical-toolbar__button${
              currentStyle.bold ? " lexical-toolbar__button--active" : ""
            }`}
            onClick={onToggleBold}
          >
            B
          </button>
          <button
            type="button"
            className={`lexical-toolbar__button${
              currentStyle.italic ? " lexical-toolbar__button--active" : ""
            }`}
            onClick={onToggleItalic}
          >
            I
          </button>
          <input
            className="lexical-toolbar__color"
            type="color"
            value={currentStyle.color}
            onChange={(event) => onSetColor(event.target.value)}
          />
          <input
            className="lexical-toolbar__color"
            type="color"
            value={currentStyle.highlightColor}
            onChange={(event) => onSetHighlightColor(event.target.value)}
          />
          {editField !== "badge" ? (
            <>
              <button
                type="button"
                className="lexical-toolbar__button"
                onClick={() => onToggleList("bullet")}
              >
                • List
              </button>
              <button
                type="button"
                className="lexical-toolbar__button"
                onClick={() => onToggleList("number")}
              >
                1. List
              </button>
            </>
          ) : null}
          <select
            className="lexical-toolbar__select lexical-toolbar__select--align"
            value={currentTextAlign}
            onChange={(event) =>
              onSetTextAlign(event.target.value as "left" | "center" | "right")
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </>

        <div className="editor-bottomToolbar__emojiWrap">
          <button
            type="button"
            className="lexical-toolbar__button"
            onClick={() => setShowEmojiMenu((prev) => !prev)}
          >
            🙂
          </button>
          {showEmojiMenu ? (
            <div className="editor-bottomToolbar__emojiMenu">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="editor-bottomToolbar__emojiBtn"
                  onClick={() => {
                    onInsertEmoji(emoji);
                    setShowEmojiMenu(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
