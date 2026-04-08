"use client";

import type React from "react";

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  highlight: boolean;
};

type Props = {
  activeField: "caption" | "body";
  copied: boolean;

  applyUnicodeStyle: (style: "bold" | "italic") => void;
  applyBullet: () => void;
  applyNumbered: () => void;
  applyHashtag: () => void;
  copyActive: () => void;
  insertEmoji: (emoji: string) => void;
  EMOJIS: string[];

  activeTextStyle: TextStyle;
  setActiveTextStyle: (patch: Partial<TextStyle>) => void;

  applyHighlightSelection: () => void;
  applyFontSelection: (fontFamily: string) => void;
  applySizeSelection: (size: number) => void;
  applyColorSelection: (color: string) => void;
};

const FONT_OPTIONS = [
  { label: "System", value: "system-ui" },
  { label: "Arial", value: "Arial" },
  { label: "Inter", value: "Inter" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: '"Times New Roman"' },
];

const SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32];

const COLOR_OPTIONS = [
  "#111827",
  "#374151",
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#F97316",
  "#7C3AED",
  "#0D9488",
];

export default function TextToolbar({
  activeField,
  copied,
  applyUnicodeStyle,
  applyBullet,
  applyNumbered,
  applyHashtag,
  copyActive,
  insertEmoji,
  EMOJIS,
  activeTextStyle,
  setActiveTextStyle,
  applyHighlightSelection,
  applyFontSelection,
  applySizeSelection,
  applyColorSelection,
}: Props) {
  return (
    <div className="tt">
      <div className="tt__title">Text Toolbar</div>
      <div className="tt__sub">
        Active: {activeField === "body" ? "Body" : "Caption"}
      </div>

      <div className="tt__group">
        <div className="tt__label">Font</div>
        <select
          className="tt__select"
          value={activeTextStyle.fontFamily}
          onChange={(e) => {
            setActiveTextStyle({ fontFamily: e.target.value });
            applyFontSelection(e.target.value);
          }}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div className="tt__group">
        <div className="tt__label">Size</div>
        <select
          className="tt__select"
          value={activeTextStyle.fontSize}
          onChange={(e) => {
            const next = Number(e.target.value);
            setActiveTextStyle({ fontSize: next });
            applySizeSelection(next);
          }}
        >
          {SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="tt__group">
        <div className="tt__label">Color</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              className="tt__emojiBtn"
              onClick={() => {
                setActiveTextStyle({ color });
                applyColorSelection(color);
              }}
              title={color}
              style={{
                background: color,
                height: 34,
                border:
                  activeTextStyle.color === color
                    ? "2px solid #111827"
                    : "1px solid rgba(0,0,0,.12)",
              }}
            />
          ))}
        </div>
      </div>

      <button
        className="tt__btn"
        type="button"
        onClick={() => applyUnicodeStyle("bold")}
      >
        Bold
      </button>

      <button
        className="tt__btn"
        type="button"
        onClick={() => applyUnicodeStyle("italic")}
      >
        Italic
      </button>

      <button className="tt__btn" type="button" onClick={applyBullet}>
        • Bullet
      </button>

      <button className="tt__btn" type="button" onClick={applyNumbered}>
        1. List
      </button>

      <button className="tt__btn" type="button" onClick={applyHashtag}>
        # Hashtag
      </button>

      <button className="tt__btn" type="button" onClick={copyActive}>
        {copied ? "Copied ✓" : "Copy"}
      </button>

      <button
        className="tt__btn"
        type="button"
        onClick={applyHighlightSelection}
      >
        Highlight
      </button>

      <div className="tt__emoji">
        {EMOJIS.map((em) => (
          <button
            key={em}
            type="button"
            className="tt__emojiBtn"
            onClick={() => insertEmoji(em)}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}