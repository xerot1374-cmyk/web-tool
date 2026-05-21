"use client";

import type React from "react";
import type { RichStyle, TextMark } from "./templateA.types";

export type LinePrefixChange = {
  oldLineStart: number;
  oldLineEnd: number;
  oldPrefixLength: number;
  newPrefixLength: number;
};

export function getNodeTextLength(node: Node | null) {
  return node?.textContent?.length ?? 0;
}

export function getContentEditableOffset(
  root: HTMLElement,
  node: Node,
  offset: number,
) {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const current = walker.currentNode;
    if (current === node) {
      return total + Math.min(offset, getNodeTextLength(current));
    }
    total += getNodeTextLength(current);
  }

  if (node === root) {
    return Array.from(root.childNodes)
      .slice(0, offset)
      .reduce((sum, child) => sum + getNodeTextLength(child), 0);
  }

  return total;
}

export function readContentEditableSelection(
  field: string,
  root: HTMLElement | null,
  selectionRef: React.MutableRefObject<Record<string, { start: number; end: number }>>,
) {
  const selection = window.getSelection();
  if (!root || !selection || selection.rangeCount === 0) {
    return selectionRef.current[field];
  }

  const range = selection.getRangeAt(0);
  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  ) {
    return selectionRef.current[field];
  }

  const start = getContentEditableOffset(
    root,
    range.startContainer,
    range.startOffset,
  );
  const end = getContentEditableOffset(
    root,
    range.endContainer,
    range.endOffset,
  );
  const next = { start: Math.min(start, end), end: Math.max(start, end) };
  selectionRef.current[field] = next;
  return next;
}

export function findContentEditablePosition(root: HTMLElement, target: number) {
  let remaining = Math.max(0, target);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const current = walker.currentNode;
    const length = getNodeTextLength(current);
    if (remaining <= length) {
      return { node: current, offset: remaining };
    }
    remaining -= length;
  }

  return { node: root, offset: root.childNodes.length };
}

export function restoreContentEditableSelection(
  root: HTMLElement | null,
  range: { start: number; end: number },
) {
  if (!root) return;
  const selection = window.getSelection();
  if (!selection) return;

  const start = findContentEditablePosition(root, range.start);
  const end = findContentEditablePosition(root, range.end);
  const domRange = document.createRange();
  domRange.setStart(start.node, start.offset);
  domRange.setEnd(end.node, end.offset);
  selection.removeAllRanges();
  selection.addRange(domRange);
}

export function getContentEditablePlainText(root: HTMLElement) {
  return root.innerText.replace(/\r\n/g, "\n").replace(/\n$/, "");
}

export function getTextChangeRange(prev: string, next: string) {
  let start = 0;
  while (
    start < prev.length &&
    start < next.length &&
    prev[start] === next[start]
  ) {
    start += 1;
  }

  let prevEnd = prev.length;
  let nextEnd = next.length;
  while (
    prevEnd > start &&
    nextEnd > start &&
    prev[prevEnd - 1] === next[nextEnd - 1]
  ) {
    prevEnd -= 1;
    nextEnd -= 1;
  }

  return { start, prevEnd, nextEnd };
}

export function overlaps(
  a: { start: number; end: number },
  b: { start: number; end: number },
) {
  return a.start < b.end && b.start < a.end;
}

export function cleanStyle(style: RichStyle): RichStyle {
  const next: RichStyle = {};
  if (style.fontFamily) next.fontFamily = style.fontFamily;
  if (style.fontSize) next.fontSize = style.fontSize;
  if (style.color) next.color = style.color;
  if (style.highlight) next.highlight = true;
  if (style.highlight && style.highlightColor) {
    next.highlightColor = style.highlightColor;
  }
  if (style.fontWeight && style.fontWeight !== "normal") {
    next.fontWeight = style.fontWeight;
  }
  if (style.fontStyle && style.fontStyle !== "normal") {
    next.fontStyle = style.fontStyle;
  }
  return next;
}

export function hasStyle(style: RichStyle) {
  return Object.keys(cleanStyle(style)).length > 0;
}

export function stylesEqual(a: RichStyle, b: RichStyle) {
  return JSON.stringify(cleanStyle(a)) === JSON.stringify(cleanStyle(b));
}

export function mergeMarks(next: TextMark[]) {
  next.sort((a, b) => a.start - b.start);

  const merged: TextMark[] = [];
  for (const mark of next) {
    const style = cleanStyle(mark.style ?? {});
    if (mark.end <= mark.start || !hasStyle(style)) continue;

    const last = merged[merged.length - 1];
    if (last && last.end === mark.start && stylesEqual(last.style, style)) {
      last.end = mark.end;
    } else {
      merged.push({ ...mark, style });
    }
  }

  return merged;
}

export function styleForSegment(prev: TextMark[], start: number, end: number) {
  return prev.reduce<RichStyle>((style, mark) => {
    if (!overlaps(mark, { start, end })) return style;
    return { ...style, ...(mark.style ?? {}) };
  }, {});
}

export function shiftMarksAfterTextChange(
  marks: TextMark[],
  replaceStart: number,
  replaceEnd: number,
  delta: number,
  replacementMarkLength = 0,
) {
  const replacementStyle =
    replacementMarkLength > 0
      ? cleanStyle(styleForSegment(marks, replaceStart, replaceEnd))
      : {};
  const shifted = marks
    .flatMap((mark) => {
      if (mark.end <= replaceStart) return [mark];
      if (mark.start >= replaceEnd) {
        return [{ ...mark, start: mark.start + delta, end: mark.end + delta }];
      }

      const pieces: TextMark[] = [];
      if (mark.start < replaceStart) {
        pieces.push({ ...mark, end: replaceStart });
      }
      if (mark.end > replaceEnd) {
        pieces.push({
          ...mark,
          start: replaceStart + Math.max(0, delta),
          end: mark.end + delta,
        });
      }
      return pieces;
    })
    .filter((mark) => mark.end > mark.start);

  if (replacementMarkLength > 0 && hasStyle(replacementStyle)) {
    shifted.push({
      start: replaceStart,
      end: replaceStart + replacementMarkLength,
      style: replacementStyle,
    });
  }

  return mergeMarks(shifted);
}

export function remapMarksForLinePrefixChanges(
  marks: TextMark[],
  changes: LinePrefixChange[],
) {
  if (!changes.length) return marks;

  const shiftPoint = (pos: number) => {
    let cumulativeDelta = 0;

    for (const change of changes) {
      const oldContentStart = change.oldLineStart + change.oldPrefixLength;
      const delta = change.newPrefixLength - change.oldPrefixLength;

      if (pos < change.oldLineStart) continue;
      if (pos <= change.oldLineEnd) {
        const newPrefixStart = change.oldLineStart + cumulativeDelta;
        if (pos <= oldContentStart) {
          return newPrefixStart + change.newPrefixLength;
        }
        return pos + cumulativeDelta + delta;
      }

      cumulativeDelta += delta;
    }

    return pos + cumulativeDelta;
  };

  return mergeMarks(
    marks
      .map((mark) => ({
        ...mark,
        start: shiftPoint(mark.start),
        end: shiftPoint(mark.end),
      }))
      .filter((mark) => mark.end > mark.start),
  );
}
