import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import type { TextMark } from "./templateA.types";

type UnicodeStyle = "bold" | "italic" | "boldItalic";

const UNICODE_MAPS: Record<
  UnicodeStyle,
  { upper: number; lower: number; digits: number }
> = {
  bold: { upper: 0x1d400, lower: 0x1d41a, digits: 0x1d7ce },
  italic: { upper: 0x1d434, lower: 0x1d44e, digits: -1 },
  boldItalic: { upper: 0x1d468, lower: 0x1d482, digits: 0x1d7ce },
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
  return null;
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

export function buildLinkedInReadyCaption(
  caption: string,
  captionMarks: TextMark[],
  captionBlocks: RichTextBlock[],
) {
  // Blocks remain represented by caption text; they are accepted so the export
  // signature stays aligned with the caption editor state.
  void captionBlocks;

  if (!caption || !captionMarks.length) return caption;

  const safeMarks = captionMarks
    .map((mark) => ({
      ...mark,
      start: Math.max(0, Math.min(mark.start, caption.length)),
      end: Math.max(0, Math.min(mark.end, caption.length)),
    }))
    .filter((mark) => mark.end > mark.start);

  let out = "";
  let offset = 0;

  for (const ch of caption) {
    const nextOffset = offset + ch.length;
    const unicodeStyle = getUnicodeStyle(
      safeMarks.filter(
        (mark) => mark.start < nextOffset && mark.end > offset,
      ),
    );

    out += unicodeStyle ? styleUnicodeText(ch, unicodeStyle) : ch;
    offset = nextOffset;
  }

  return out;
}
