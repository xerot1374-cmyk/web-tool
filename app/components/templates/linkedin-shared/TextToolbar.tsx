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
      <div className="tt__header">
        <div className="tt__eyebrow">Text tools</div>
        <div className="tt__title">Formatting</div>
        <div className="tt__sub">
          Applying changes to {activeField === "body" ? "body copy" : "caption"}
        </div>
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
        <div className="tt__swatches">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              className="tt__swatch"
              onClick={() => {
                setActiveTextStyle({ color });
                applyColorSelection(color);
              }}
              title={color}
              style={{
                background: color,
                border:
                  activeTextStyle.color === color
                    ? "2px solid #111827"
                    : "1px solid rgba(15,23,42,0.14)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="tt__buttonGrid">
        <button
          className="tt__btn tt__btn--strong"
          type="button"
          onClick={() => applyUnicodeStyle("bold")}
        >
          Bold
        </button>

        <button
          className="tt__btn tt__btn--strong"
          type="button"
          onClick={() => applyUnicodeStyle("italic")}
        >
          Italic
        </button>

        <button className="tt__btn" type="button" onClick={applyBullet}>
          Bullet
        </button>

        <button className="tt__btn" type="button" onClick={applyNumbered}>
          Numbered
        </button>

        <button className="tt__btn" type="button" onClick={applyHashtag}>
          Hashtag
        </button>

        <button className="tt__btn" type="button" onClick={applyHighlightSelection}>
          Highlight
        </button>
      </div>

      <button className="tt__btn tt__btn--primary" type="button" onClick={copyActive}>
        {copied ? "Copied" : "Copy text"}
      </button>

      <div className="tt__label">Emoji</div>
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
