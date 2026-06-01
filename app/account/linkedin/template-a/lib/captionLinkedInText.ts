import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import type { TextMark } from "./templateA.types";

type UnicodeStyle = "regular" | "bold" | "italic" | "boldItalic";

const UNICODE_MAPS: Record<
  UnicodeStyle,
  { upper: number; lower: number; digits: number }
> = {
  regular: { upper: 0x1d5a0, lower: 0x1d5ba, digits: 0x1d7e2 },
  bold: { upper: 0x1d5d4, lower: 0x1d5ee, digits: 0x1d7ec },
  italic: { upper: 0x1d608, lower: 0x1d622, digits: 0x1d7e2 },
  boldItalic: { upper: 0x1d63c, lower: 0x1d656, digits: 0x1d7ec },
};

function isBoldWeight(fontWeight: TextMark["style"]["fontWeight"]) {
  if (typeof fontWeight === "number") return fontWeight >= 600;
  if (!fontWeight) return false;
  if (fontWeight.toLowerCase() === "bold") return true;

  const numericWeight = Number(fontWeight);
  return Number.isFinite(numericWeight) && numericWeight >= 600;
}

function getUnicodeStyle(marks: TextMark[]) {
  const bold = marks.some((mark) => isBoldWeight(mark.style.fontWeight));
  const italic = marks.some((mark) => mark.style.fontStyle === "italic");

  if (bold && italic) return "boldItalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "regular";
}

export function toUnicodeStyledChar(ch: string, style: UnicodeStyle) {
  const code = ch.codePointAt(0);
  if (code == null) return ch;

  const map = UNICODE_MAPS[style];

  if (code >= 0x41 && code <= 0x5a) {
    return String.fromCodePoint(map.upper + (code - 0x41));
  }

  if (code >= 0x61 && code <= 0x7a) {
    if (style === "italic" && code === 0x68) return "\u210e";
    return String.fromCodePoint(map.lower + (code - 0x61));
  }

  if (code >= 0x30 && code <= 0x39 && map.digits >= 0) {
    return String.fromCodePoint(map.digits + (code - 0x30));
  }

  return ch;
}

export function styleUnicodeText(input: string, style: UnicodeStyle) {
  let out = "";

  for (const ch of input) {
    out += toUnicodeStyledChar(ch, style);
  }

  return out;
}

function getProtectedPlainTextRanges(input: string) {
  const ranges: Array<{ start: number; end: number }> = [];

  // LinkedIn link and hashtag detection can break when ASCII characters are
  // converted to mathematical Unicode, so keep these substrings plain.
  const patterns = [
    /https?:\/\/[^\s]+|www\.[^\s]+/gi,
    /#[\p{L}\p{N}_-]+/gu,
  ];

  for (const pattern of patterns) {
    for (const match of input.matchAll(pattern)) {
      if (match.index == null) continue;
      ranges.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return ranges.sort((a, b) => a.start - b.start);
}

function isProtectedOffset(
  ranges: Array<{ start: number; end: number }>,
  start: number,
  end: number,
) {
  return ranges.some((range) => range.start < end && range.end > start);
}

export function buildLinkedInReadyCaption(
  caption: string,
  captionMarks: TextMark[],
  captionBlocks: RichTextBlock[],
) {
  // Blocks remain represented by caption text; they are accepted so the export
  // signature stays aligned with the caption editor state.
  void captionBlocks;

  if (!caption) return caption;

  const safeMarks = captionMarks
    .map((mark) => ({
      ...mark,
      start: Math.max(0, Math.min(mark.start, caption.length)),
      end: Math.max(0, Math.min(mark.end, caption.length)),
    }))
    .filter((mark) => mark.end > mark.start);

  let out = "";
  let offset = 0;
  const protectedRanges = getProtectedPlainTextRanges(caption);

  for (const ch of caption) {
    const nextOffset = offset + ch.length;
    if (isProtectedOffset(protectedRanges, offset, nextOffset)) {
      out += ch;
      offset = nextOffset;
      continue;
    }

    const unicodeStyle = getUnicodeStyle(
      safeMarks.filter(
        (mark) => mark.start < nextOffset && mark.end > offset,
      ),
    );

    out += styleUnicodeText(ch, unicodeStyle);
    offset = nextOffset;
  }

  return out;
}
