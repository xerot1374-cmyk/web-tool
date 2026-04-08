// app/lib/renderUtils.ts
export function absUrl(req: Request, p: string) {
  if (/^https?:\/\//i.test(p)) return p;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return p;
  return `${proto}://${host}${p.startsWith("/") ? p : `/${p}`}`;
}

export function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export type CanvasPreset = "linkedin" | "instagram" | "instagramStory";

export const CANVAS_PRESETS: Record<CanvasPreset, { w: number; h: number }> = {
  linkedin: { w: 800, h: 3000 },
  instagram: { w: 1080, h: 1080 },
  instagramStory: { w: 1080, h: 1920 },
};

export const LINKEDIN_CANVAS = CANVAS_PRESETS.linkedin;

export function getCanvasFrame(preset?: CanvasPreset) {
  return CANVAS_PRESETS[preset ?? "linkedin"];
}