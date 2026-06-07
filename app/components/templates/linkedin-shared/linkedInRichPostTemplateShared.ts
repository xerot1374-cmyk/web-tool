import type { CanvasPreset } from "@/app/lib/renderUtils";

const LI2_EMOJI_FONT_FALLBACK =
  '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", Arial, Helvetica, sans-serif';
const LI2_DETERMINISTIC_BASE_FONT = '"Inter", Arial, Helvetica, sans-serif';
const LI2_DETERMINISTIC_EMOJI_FONT = `"Inter", ${LI2_EMOJI_FONT_FALLBACK}`;
const LI2_ARIAL_EXPORT_FONT = '"Arial", "Liberation Sans", Helvetica, sans-serif';
const LI2_GEORGIA_EXPORT_FONT = '"Liberation Serif", "Times New Roman", Times, serif';
const LI2_TIMES_EXPORT_FONT = '"Times New Roman", Times, serif';

export function sanitizeTemplateTextAlign(
  value: unknown,
): "left" | "center" | "right" {
  return value === "center" || value === "right" ? value : "left";
}

export function normalizeHttpUrl(raw?: string) {
  const value = raw?.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function linkLabel(linkUrl: string) {
  const value = normalizeHttpUrl(linkUrl);
  const withoutProtocol = value.replace(/^https?:\/\//i, "");
  const host = withoutProtocol.split(/[/?#]/)[0];
  return (host || linkUrl.trim()).replace(/^www\./i, "");
}

export function normalizeHashtag(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  return value.startsWith("#") ? value : `#${value}`;
}

export function buildHashtagHref(raw: string) {
  const value = normalizeHashtag(raw);
  const target = value.replace(/^#+/, "").replace(/\s+/g, "");
  if (!target) return "";
  return `https://www.linkedin.com/feed/hashtag/?keywords=${encodeURIComponent(target)}`;
}

export function parseTemplateLinks(data: {
  link?: string;
  linkUrl?: string | string[];
  linkUrls?: string[];
}) {
  if (Array.isArray(data.linkUrls) && data.linkUrls.length) {
    return data.linkUrls.map((item) => normalizeHttpUrl(item)).filter(Boolean);
  }

  if (Array.isArray(data.linkUrl) && data.linkUrl.length) {
    return data.linkUrl.map((item) => normalizeHttpUrl(item)).filter(Boolean);
  }

  const raw =
    typeof data.linkUrl === "string"
      ? data.linkUrl
      : typeof data.link === "string"
        ? data.link
        : "";

  return raw
    .split("\n")
    .map((item) => normalizeHttpUrl(item))
    .filter(Boolean);
}

export function parseTemplateHashtags(
  hashtags: string | string[] | undefined,
) {
  if (Array.isArray(hashtags)) {
    return hashtags.map((item) => normalizeHashtag(item)).filter(Boolean);
  }

  return String(hashtags ?? "")
    .split("\n")
    .map((item) => normalizeHashtag(item))
    .filter(Boolean);
}

function isLegacySystemFont(fontFamily?: string) {
  const value = fontFamily?.trim();
  return (
    !value ||
    /system-ui|-apple-system|BlinkMacSystemFont/i.test(value) ||
    /["']?Segoe UI["']?(?=\s*,|$)/i.test(value)
  );
}

export function normalizeTemplateFontFamily(fontFamily?: string) {
  if (!isLegacySystemFont(fontFamily)) return fontFamily;
  const emojiSuffix =
    fontFamily?.match(
      /,\s*(?:"Apple Color Emoji"|"Segoe UI Emoji"|"Noto Color Emoji"|"Segoe UI Symbol").*$/i,
    )?.[0] ?? "";
  return `${LI2_DETERMINISTIC_BASE_FONT}${emojiSuffix}`;
}

export function normalizeTemplateExportFontFamily(fontFamily?: string) {
  const value = fontFamily?.trim();
  if (!value || isLegacySystemFont(value)) return LI2_DETERMINISTIC_EMOJI_FONT;
  if (/^["']?Arial["']?(?=\s*,|$)/i.test(value)) {
    return `${LI2_ARIAL_EXPORT_FONT}, ${LI2_EMOJI_FONT_FALLBACK}`;
  }
  if (/^["']?Georgia["']?(?=\s*,|$)/i.test(value)) {
    return `${LI2_GEORGIA_EXPORT_FONT}, ${LI2_EMOJI_FONT_FALLBACK}`;
  }
  if (/^["']?Times New Roman["']?(?=\s*,|$)/i.test(value)) {
    return `${LI2_TIMES_EXPORT_FONT}, ${LI2_EMOJI_FONT_FALLBACK}`;
  }
  const customValue = value;
  return /Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji/i.test(customValue)
    ? value
    : `${customValue}, ${LI2_EMOJI_FONT_FALLBACK}`;
}

export function getPresetClass(preset?: CanvasPreset) {
  if (preset === "instagramStory") return "story";
  if (preset === "instagram") return "instagram";
  return "linkedin";
}
