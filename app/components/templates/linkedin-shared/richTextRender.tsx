import React from "react";
import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/richTextTypes";

export type LinkedInRichTextMark = {
  start: number;
  end: number;
  style?: {
    fontFamily?: string;
    fontSize?: number | string;
    color?: string;
    highlight?: boolean;
    highlightColor?: string;
    fontWeight?: number | string;
    fontStyle?: string;
  };
};

type RenderOptions = {
  baseStyle?: React.CSSProperties;
  normalizeFontFamily?: (fontFamily?: string) => string | undefined;
};

type HtmlRenderOptions = {
  normalizeFontFamily?: (fontFamily?: string) => string | undefined;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeMarks(text: string, marks?: LinkedInRichTextMark[]) {
  return (
    marks
      ?.map((mark) => ({
        start: Math.max(0, Math.min(mark.start, text.length)),
        end: Math.max(0, Math.min(mark.end, text.length)),
        style: mark.style ?? {},
      }))
      .filter((mark) => mark.end > mark.start)
      .sort((a, b) => a.start - b.start) ?? []
  );
}

function normalizeBlocks(text: string, blocks?: RichTextBlock[]) {
  return (
    blocks
      ?.map((block) => ({
        ...block,
        start: Math.max(0, Math.min(block.start, text.length)),
        end: Math.max(0, Math.min(block.end, text.length)),
        contentStart: Math.max(0, Math.min(block.contentStart, text.length)),
        contentEnd: Math.max(0, Math.min(block.contentEnd, text.length)),
      }))
      .filter(
        (block) =>
          block.end >= block.start && block.contentEnd >= block.contentStart,
      ) ?? []
  );
}

function cssFontSize(value: number | string | undefined) {
  if (value === undefined || value === null) return undefined;
  const raw = String(value);
  return typeof value === "number" || !raw.endsWith("px") ? `${raw}px` : raw;
}

export function renderLinkedInRichText(
  text: string,
  marks?: LinkedInRichTextMark[],
  blocks?: RichTextBlock[],
  options: RenderOptions = {},
) {
  const value = String(text ?? "");
  const safeMarks = normalizeMarks(value, marks);
  const safeBlocks = normalizeBlocks(value, blocks);

  const renderSegment = (rangeStart: number, rangeEnd: number) => {
    if (rangeEnd <= rangeStart) return null;
    if (!safeMarks.length) return value.slice(rangeStart, rangeEnd);

    const out: React.ReactNode[] = [];
    let pos = rangeStart;

    for (let i = 0; i < safeMarks.length; i++) {
      const mark = safeMarks[i];
      if (mark.end <= rangeStart || mark.start >= rangeEnd) continue;

      const start = Math.max(mark.start, rangeStart);
      const end = Math.min(mark.end, rangeEnd);

      if (start > pos) {
        out.push(
          <React.Fragment key={`t-${pos}`}>
            {value.slice(pos, start)}
          </React.Fragment>,
        );
      }

      const style: React.CSSProperties = {
        fontFamily: mark.style.fontFamily
          ? (options.normalizeFontFamily?.(mark.style.fontFamily) ??
            mark.style.fontFamily)
          : undefined,
        fontSize: mark.style.fontSize,
        color: mark.style.color,
        fontWeight: mark.style.fontWeight,
        fontStyle: mark.style.fontStyle,
        background: mark.style.highlight
          ? (mark.style.highlightColor ?? "rgba(250,204,21,0.18)")
          : undefined,
      };

      out.push(
        <span key={`m-${start}-${end}-${i}`} style={style}>
          {value.slice(start, end)}
        </span>,
      );
      pos = end;
    }

    if (pos < rangeEnd) {
      out.push(
        <React.Fragment key={`t-${pos}-end`}>
          {value.slice(pos, rangeEnd)}
        </React.Fragment>,
      );
    }

    return out;
  };

  const getLeadingListItemStyle = (
    rangeStart: number,
    rangeEnd: number,
  ): React.CSSProperties | undefined => {
    const leadingMark = safeMarks.find(
      (mark) => mark.end > rangeStart && mark.start < rangeEnd,
    );
    if (!leadingMark) return undefined;

    return {
      fontFamily: leadingMark.style.fontFamily
        ? (options.normalizeFontFamily?.(leadingMark.style.fontFamily) ??
          leadingMark.style.fontFamily)
        : options.baseStyle?.fontFamily,
      fontSize: leadingMark.style.fontSize ?? options.baseStyle?.fontSize,
      color: leadingMark.style.color ?? options.baseStyle?.color,
      fontWeight: leadingMark.style.fontWeight ?? options.baseStyle?.fontWeight,
      fontStyle: leadingMark.style.fontStyle ?? options.baseStyle?.fontStyle,
    };
  };

  if (!safeBlocks.length) {
    if (!safeMarks.length) return value;
    return renderSegment(0, value.length);
  }

  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: "bullet" | "number" | null = null;

  const flushList = () => {
    if (!listType || !listItems.length) return;
    nodes.push(
      <div
        key={`list-${nodes.length}`}
        style={{ display: "grid", gap: "0.2em", margin: 0 }}
      >
        {listItems}
      </div>,
    );
    listItems = [];
    listType = null;
  };

  safeBlocks.forEach((block, index) => {
    const content = renderSegment(block.contentStart, block.contentEnd);

    if (block.type === "bullet" || block.type === "number") {
      if (listType && listType !== block.type) flushList();
      listType = block.type;
      const itemStyle = getLeadingListItemStyle(
        block.contentStart,
        block.contentEnd,
      );
      listItems.push(
        <div
          key={`li-${index}`}
          style={{
            display: "grid",
            gridTemplateColumns: "max-content minmax(0, 1fr)",
            columnGap: "0.65em",
            alignItems: "start",
            overflow: "visible",
            ...options.baseStyle,
            ...itemStyle,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              minWidth: listType === "number" ? "1.8em" : "1.1em",
              font: "inherit",
              lineHeight: "inherit",
              display: "inline-block",
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {block.type === "number" ? `${listItems.length + 1}.` : "•"}
          </span>
          <div style={{ minWidth: 0, overflow: "visible" }}>{content}</div>
        </div>,
      );
      return;
    }

    flushList();
    nodes.push(
      <React.Fragment key={`p-${index}`}>
        {content}
        {index < safeBlocks.length - 1 ? "\n" : null}
      </React.Fragment>,
    );
  });

  flushList();
  return nodes;
}

function renderLinkedInRichTextHtmlRange(
  text: string,
  marks: LinkedInRichTextMark[] | undefined,
  rangeStart: number,
  rangeEnd: number,
  options: HtmlRenderOptions,
) {
  const value = String(text ?? "");
  const safeRangeStart = Math.max(0, Math.min(rangeStart, value.length));
  const safeRangeEnd = Math.max(
    safeRangeStart,
    Math.min(rangeEnd, value.length),
  );
  const safeMarks = normalizeMarks(value, marks).filter(
    (mark) => mark.end > safeRangeStart && mark.start < safeRangeEnd,
  );

  if (!safeMarks.length) {
    return escapeHtml(value.slice(safeRangeStart, safeRangeEnd)).replace(
      /\n/g,
      "<br/>",
    );
  }

  const boundaries = Array.from(
    new Set([
      safeRangeStart,
      safeRangeEnd,
      ...safeMarks.flatMap((mark) => [
        Math.max(mark.start, safeRangeStart),
        Math.min(mark.end, safeRangeEnd),
      ]),
    ]),
  ).sort((a, b) => a - b);

  let out = "";

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    if (end <= start) continue;

    const activeStyle = safeMarks
      .filter((mark) => mark.start <= start && mark.end >= end)
      .reduce<
        NonNullable<LinkedInRichTextMark["style"]>
      >((acc, mark) => ({ ...acc, ...mark.style }), {});

    const styles: string[] = [];
    if (activeStyle.fontFamily) {
      styles.push(
        `font-family:${escapeHtml(
          options.normalizeFontFamily?.(String(activeStyle.fontFamily)) ??
            String(activeStyle.fontFamily),
        )}`,
      );
    }
    const fontSize = cssFontSize(activeStyle.fontSize);
    if (fontSize) styles.push(`font-size:${escapeHtml(fontSize)}`);
    if (activeStyle.color) {
      styles.push(`color:${escapeHtml(String(activeStyle.color))}`);
    }
    const highlightColor =
      activeStyle.highlightColor || (activeStyle.highlight ? "#fff3a3" : "");
    if (highlightColor) {
      styles.push(`background-color:${escapeHtml(String(highlightColor))}`);
    }
    if (activeStyle.fontWeight) {
      styles.push(`font-weight:${escapeHtml(String(activeStyle.fontWeight))}`);
    }
    if (activeStyle.fontStyle) {
      styles.push(`font-style:${escapeHtml(String(activeStyle.fontStyle))}`);
    }

    const styleAttr = styles.length ? ` style="${styles.join(";")}"` : "";
    const chunk = escapeHtml(value.slice(start, end)).replace(/\n/g, "<br/>");
    out += `<span${styleAttr}>${chunk}</span>`;
  }

  return out;
}

function richStyleToInline(
  style: LinkedInRichTextMark["style"] | undefined,
  options: HtmlRenderOptions,
) {
  if (!style) return "";
  const styles: string[] = [];
  if (style.fontFamily) {
    styles.push(
      `font-family:${escapeHtml(
        options.normalizeFontFamily?.(String(style.fontFamily)) ??
          String(style.fontFamily),
      )}`,
    );
  }
  const fontSize = cssFontSize(style.fontSize);
  if (fontSize) styles.push(`font-size:${escapeHtml(fontSize)}`);
  if (style.color) styles.push(`color:${escapeHtml(String(style.color))}`);
  if (style.fontWeight) {
    styles.push(`font-weight:${escapeHtml(String(style.fontWeight))}`);
  }
  if (style.fontStyle) {
    styles.push(`font-style:${escapeHtml(String(style.fontStyle))}`);
  }
  return styles.length ? styles.join(";") : "";
}

function leadingStyleForRange(
  marks: LinkedInRichTextMark[] | undefined,
  rangeStart: number,
  rangeEnd: number,
) {
  return marks?.find((mark) => mark.end > rangeStart && mark.start < rangeEnd)
    ?.style;
}

export function renderLinkedInRichTextHtml(
  text: string | undefined,
  marks?: LinkedInRichTextMark[],
  blocks?: RichTextBlock[],
  options: HtmlRenderOptions = {},
) {
  const value = String(text ?? "");
  const safeBlocks = normalizeBlocks(value, blocks);

  if (!safeBlocks.length) {
    return renderLinkedInRichTextHtmlRange(
      value,
      marks,
      0,
      value.length,
      options,
    );
  }

  const nodes: string[] = [];
  let listItems: string[] = [];
  let listType: "bullet" | "number" | null = null;

  const flushList = () => {
    if (!listType || !listItems.length) return;
    nodes.push(
      `<div style="display:grid;gap:0.2em;margin:0">${listItems.join("")}</div>`,
    );
    listItems = [];
    listType = null;
  };

  safeBlocks.forEach((block, index) => {
    const content = renderLinkedInRichTextHtmlRange(
      value,
      marks,
      block.contentStart,
      block.contentEnd,
      options,
    );

    if (block.type === "bullet" || block.type === "number") {
      if (listType && listType !== block.type) flushList();
      listType = block.type;
      const marker = block.type === "number" ? `${listItems.length + 1}.` : "•";
      const itemStyle = richStyleToInline(
        leadingStyleForRange(marks, block.contentStart, block.contentEnd),
        options,
      );
      listItems.push(
        `<div style="display:grid;grid-template-columns:max-content minmax(0,1fr);column-gap:0.65em;align-items:start;overflow:visible;${itemStyle}"><span aria-hidden="true" style="min-width:${block.type === "number" ? "1.8em" : "1.1em"};font:inherit;line-height:inherit;display:inline-block;text-align:right;flex-shrink:0">${marker}</span><div style="min-width:0;overflow:visible">${content}</div></div>`,
      );
      return;
    }

    flushList();
    nodes.push(content);
    if (index < safeBlocks.length - 1) nodes.push("<br/>");
  });

  flushList();
  return nodes.join("");
}
