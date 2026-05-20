"use client";

import type React from "react";

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  highlight: boolean;
  highlightColor?: string;
  bold?: boolean;
  italic?: boolean;
  textAlign?: "left" | "center" | "right";
  mixed?: Partial<
    Record<"fontFamily" | "fontSize" | "color" | "highlightColor", boolean>
  >;
};

type Props = {
  variant?: "panel" | "floating";
  activeField: "badge" | "title" | "company" | "caption" | "body";
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
  applyAlignSelection?: (align: "left" | "center" | "right") => void;
  applyHighlightColorSelection?: (color: string | null) => void;
};

const FONT_OPTIONS = [
  { label: "System", value: "system-ui" },
  { label: "Arial", value: "Arial" },
  { label: "Inter", value: "Inter" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: '"Times New Roman"' },
];

const SIZE_OPTIONS = Array.from({ length: 91 }, (_, index) => index + 10);

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

const FORMAT_ACTIONS: Array<{
  label: string;
  icon: string;
  title: string;
  variant?: "strong";
  action: "bold" | "italic" | "bullet" | "numbered" | "hashtag" | "highlight";
}> = [
  {
    label: "Bold",
    icon: "B",
    title: "Bold selected text",
    variant: "strong",
    action: "bold",
  },
  {
    label: "Italic",
    icon: "I",
    title: "Italicize selected text",
    variant: "strong",
    action: "italic",
  },
  {
    label: "Bullet",
    icon: "\u2022",
    title: "Toggle bullet list",
    action: "bullet",
  },
  {
    label: "Numbered",
    icon: "1.",
    title: "Toggle numbered list",
    action: "numbered",
  },
  {
    label: "Hashtag",
    icon: "#",
    title: "Convert selection to hashtag",
    action: "hashtag",
  },
  {
    label: "Highlight",
    icon: "H",
    title: "Highlight selected text",
    action: "highlight",
  },
];

const HIGHLIGHT_OPTIONS = [
  { label: "None", value: "" },
  { label: "Yellow", value: "rgba(250,204,21,0.28)" },
  { label: "Light green", value: "rgba(134,239,172,0.32)" },
  { label: "Light blue", value: "rgba(147,197,253,0.34)" },
  { label: "Pink", value: "rgba(249,168,212,0.34)" },
  { label: "Orange", value: "rgba(253,186,116,0.34)" },
  { label: "Purple", value: "rgba(196,181,253,0.34)" },
];

export default function TextToolbar({
  variant = "panel",
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
  applyAlignSelection,
  applyHighlightColorSelection,
}: Props) {
  const isFloating = variant === "floating";

  const runFormatAction = (
    action: (typeof FORMAT_ACTIONS)[number]["action"],
  ) => {
    if (action === "bold" || action === "italic") {
      applyUnicodeStyle(action);
      return;
    }
    if (action === "bullet") applyBullet();
    if (action === "numbered") applyNumbered();
    if (action === "hashtag") applyHashtag();
    if (action === "highlight") applyHighlightSelection();
  };

  const visibleFormatActions = isFloating
    ? FORMAT_ACTIONS.filter(
        (item) => item.action === "bold" || item.action === "italic",
      )
    : FORMAT_ACTIONS;
  const fontValue = activeTextStyle.mixed?.fontFamily
    ? "__mixed"
    : activeTextStyle.fontFamily;
  const sizeValue = activeTextStyle.mixed?.fontSize
    ? "__mixed"
    : String(activeTextStyle.fontSize);

  return (
    <div className={`tt${isFloating ? " tt--floating" : ""}`}>
      {!isFloating ? (
        <div className="tt__header">
          <div className="tt__eyebrow">Text tools</div>
          <div className="tt__title">Formatting</div>
          <div className="tt__sub">
            Applying changes to{" "}
            {activeField === "body"
              ? "body copy"
              : activeField === "caption"
                ? "caption"
                : activeField === "badge"
                  ? "eye-catcher"
                  : activeField === "title"
                    ? "title"
                    : "company"}
          </div>
        </div>
      ) : null}

      <div className="tt__group tt__group--font">
        <div className="tt__label">Font</div>
        <select
          className="tt__select"
          value={fontValue}
          onChange={(e) => {
            if (e.target.value === "__mixed") return;
            setActiveTextStyle({ fontFamily: e.target.value });
            applyFontSelection(e.target.value);
          }}
        >
          {activeTextStyle.mixed?.fontFamily ? (
            <option value="__mixed" disabled>
              Mixed
            </option>
          ) : null}
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div className="tt__group tt__group--size">
        <div className="tt__label">Size</div>
        <select
          className="tt__select"
          value={sizeValue}
          onChange={(e) => {
            if (e.target.value === "__mixed") return;
            const next = Number(e.target.value);
            setActiveTextStyle({ fontSize: next });
            applySizeSelection(next);
          }}
        >
          {activeTextStyle.mixed?.fontSize ? (
            <option value="__mixed" disabled>
              Mixed
            </option>
          ) : null}
          {SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="tt__group">
        <div className="tt__label">Color</div>
        {isFloating ? (
          <label className="tt__colorControl" title="Text color">
            <span
              className={`tt__colorPreview${
                activeTextStyle.mixed?.color ? " tt__colorPreview--mixed" : ""
              }`}
              style={{ background: activeTextStyle.color }}
              aria-hidden="true"
            />
            <input
              className="tt__colorInput"
              type="color"
              value={activeTextStyle.color}
              onChange={(e) => {
                setActiveTextStyle({ color: e.target.value });
                applyColorSelection(e.target.value);
              }}
              aria-label="Text color"
            />
          </label>
        ) : (
          <div className="tt__swatches">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                className="tt__swatch"
                onMouseDown={(e) => e.preventDefault()}
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
        )}
      </div>

      <div className="tt__buttonGrid">
        {visibleFormatActions.map((item) => (
          <button
            key={item.action}
            className={`tt__btn tt__formatBtn${
              item.variant === "strong" ? " tt__btn--strong" : ""
            }${
              (item.action === "bold" && activeTextStyle.bold) ||
              (item.action === "italic" && activeTextStyle.italic) ||
              (item.action === "highlight" && activeTextStyle.highlight)
                ? " tt__formatBtn--active"
                : ""
            }`}
            type="button"
            title={item.title}
            aria-label={item.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runFormatAction(item.action)}
          >
            <span className="tt__formatIcon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="tt__formatText">{item.label}</span>
          </button>
        ))}
      </div>

      {isFloating && applyAlignSelection ? (
        <select
          className="tt__select tt__alignSelect"
          value={activeTextStyle.textAlign ?? "left"}
          aria-label="Text alignment"
          onChange={(e) =>
            applyAlignSelection(e.target.value as "left" | "center" | "right")
          }
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      ) : null}

      {isFloating && applyHighlightColorSelection ? (
        <details className="tt__highlightPicker">
          <summary
            className={`tt__highlightSummary${
              activeTextStyle.highlight ? " tt__highlightSummary--active" : ""
            }`}
            title="Highlight"
            aria-label="Highlight"
          >
            <span
              className={`tt__highlightPreview${
                activeTextStyle.mixed?.highlightColor
                  ? " tt__colorPreview--mixed"
                  : ""
              }`}
              style={{
                background: activeTextStyle.highlight
                  ? (activeTextStyle.highlightColor ?? "rgba(250,204,21,0.28)")
                  : "transparent",
              }}
              aria-hidden="true"
            />
            H
          </summary>
          <div className="tt__highlightMenu">
            {HIGHLIGHT_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                className="tt__highlightOption"
                title={option.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  const details = e.currentTarget.closest("details");
                  applyHighlightColorSelection(option.value || null);
                  if (details) details.open = false;
                }}
              >
                {option.value ? (
                  <span
                    style={{ background: option.value }}
                    aria-hidden="true"
                  />
                ) : (
                  <span className="tt__highlightNone" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </details>
      ) : null}

      {!isFloating ? (
        <>
          <button
            className="tt__btn tt__btn--primary"
            type="button"
            onClick={copyActive}
          >
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
        </>
      ) : null}
    </div>
  );
}
