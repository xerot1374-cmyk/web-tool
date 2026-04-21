import { CANVAS_PRESETS, type CanvasPreset } from "@/app/lib/renderUtils";

export type ImageLayoutMode = "manual" | "collage" | "frame";

export type FrameSlot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  rotation?: number;
  clipPath?: string;
  shape?: "rect" | "organic" | "pill" | "arch" | "blob";
};

type FrameSlotTemplate = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  rotation?: number;
  clipPath?: string;
  shape?: "rect" | "organic" | "pill" | "arch" | "blob";
};

export type FramePreset = {
  id: string;
  label: string;
  description: string;
  slots: FrameSlotTemplate[];
};

export const FRAME_PRESETS: FramePreset[] = [
  {
    id: "split-duo",
    label: "Split Duo",
    description: "Two tall panels side by side.",
    slots: [
      { id: "slot-1", x: 0.09, y: 0.22, w: 0.38, h: 0.5, radius: 26 },
      { id: "slot-2", x: 0.53, y: 0.22, w: 0.38, h: 0.5, radius: 26 },
    ],
  },
  {
    id: "hero-right-stack",
    label: "Hero + Stack",
    description: "One large hero with two stacked side frames.",
    slots: [
      { id: "slot-1", x: 0.08, y: 0.2, w: 0.5, h: 0.56, radius: 28 },
      { id: "slot-2", x: 0.63, y: 0.2, w: 0.24, h: 0.26, radius: 22 },
      { id: "slot-3", x: 0.63, y: 0.5, w: 0.24, h: 0.26, radius: 22 },
    ],
  },
  {
    id: "mosaic-four",
    label: "Mosaic Four",
    description: "Balanced four-piece photo mosaic.",
    slots: [
      { id: "slot-1", x: 0.08, y: 0.2, w: 0.38, h: 0.26, radius: 24 },
      { id: "slot-2", x: 0.5, y: 0.2, w: 0.34, h: 0.38, radius: 24 },
      { id: "slot-3", x: 0.08, y: 0.5, w: 0.38, h: 0.26, radius: 24 },
      { id: "slot-4", x: 0.5, y: 0.62, w: 0.34, h: 0.14, radius: 20 },
    ],
  },
  {
    id: "rounded-story",
    label: "Rounded Story",
    description: "Soft rounded stack with a hero and side moments.",
    slots: [
      { id: "slot-1", x: 0.08, y: 0.19, w: 0.48, h: 0.56, radius: 40, shape: "organic" },
      { id: "slot-2", x: 0.61, y: 0.2, w: 0.22, h: 0.22, radius: 999, shape: "pill" },
      { id: "slot-3", x: 0.59, y: 0.48, w: 0.26, h: 0.24, radius: 36, shape: "organic" },
    ],
  },
  {
    id: "organic-trio",
    label: "Organic Trio",
    description: "Three playful shapes with soft, irregular curves.",
    slots: [
      {
        id: "slot-1",
        x: 0.08,
        y: 0.24,
        w: 0.34,
        h: 0.4,
        radius: 42,
        rotation: -4,
        shape: "blob",
        clipPath: "polygon(12% 6%, 88% 4%, 98% 28%, 92% 88%, 14% 96%, 2% 64%, 6% 22%)",
      },
      {
        id: "slot-2",
        x: 0.41,
        y: 0.18,
        w: 0.42,
        h: 0.46,
        radius: 48,
        rotation: 3,
        shape: "organic",
        clipPath: "polygon(10% 2%, 88% 8%, 100% 26%, 94% 84%, 74% 100%, 18% 94%, 0% 66%, 2% 16%)",
      },
      {
        id: "slot-3",
        x: 0.27,
        y: 0.57,
        w: 0.38,
        h: 0.19,
        radius: 999,
        rotation: -2,
        shape: "pill",
      },
    ],
  },
  {
    id: "editorial-angles",
    label: "Editorial Angles",
    description: "Magazine-like asymmetry with angled blocks.",
    slots: [
      { id: "slot-1", x: 0.06, y: 0.18, w: 0.3, h: 0.5, radius: 24, rotation: -5 },
      { id: "slot-2", x: 0.39, y: 0.14, w: 0.46, h: 0.26, radius: 24, rotation: 2 },
      { id: "slot-3", x: 0.49, y: 0.44, w: 0.28, h: 0.33, radius: 26, rotation: 5 },
      { id: "slot-4", x: 0.16, y: 0.71, w: 0.24, h: 0.1, radius: 20, rotation: -3 },
    ],
  },
  {
    id: "magazine-cutout",
    label: "Magazine Cutout",
    description: "Uneven editorial collage with nested story blocks.",
    slots: [
      { id: "slot-1", x: 0.07, y: 0.16, w: 0.4, h: 0.28, radius: 24 },
      { id: "slot-2", x: 0.52, y: 0.16, w: 0.28, h: 0.5, radius: 28 },
      { id: "slot-3", x: 0.08, y: 0.49, w: 0.36, h: 0.27, radius: 28, shape: "arch", clipPath: "polygon(0% 100%, 0% 24%, 20% 6%, 50% 0%, 80% 6%, 100% 24%, 100% 100%)" },
      { id: "slot-4", x: 0.31, y: 0.28, w: 0.18, h: 0.16, radius: 999, shape: "pill" },
    ],
  },
];

export function getHeaderHeightForPreset(preset: CanvasPreset) {
  if (preset === "instagram") return 420;
  if (preset === "instagramStory") return 760;
  return 850;
}

export function getFramePreset(framePresetId?: string) {
  return (
    FRAME_PRESETS.find((preset) => preset.id === framePresetId) ?? FRAME_PRESETS[0]
  );
}

export function resolveFrameSlots(
  framePresetId: string | undefined,
  canvasPreset: CanvasPreset
): FrameSlot[] {
  const preset = getFramePreset(framePresetId);
  const canvas = CANVAS_PRESETS[canvasPreset];
  const headerHeight = getHeaderHeightForPreset(canvasPreset);
  const verticalOffset = Math.round(headerHeight * 0.14);

  return preset.slots.map((slot) => ({
    id: slot.id,
    x: Math.round(slot.x * canvas.w),
    y: Math.round(slot.y * headerHeight) + verticalOffset,
    w: Math.round(slot.w * canvas.w),
    h: Math.round(slot.h * headerHeight),
    radius: slot.radius ?? 24,
    rotation: slot.rotation ?? 0,
    clipPath: slot.clipPath,
    shape: slot.shape ?? "rect",
  }));
}

export function getFirstAvailableFrameSlotId(
  framePresetId: string | undefined,
  canvasPreset: CanvasPreset,
  usedSlotIds: string[]
) {
  const slots = resolveFrameSlots(framePresetId, canvasPreset);
  return slots.find((slot) => !usedSlotIds.includes(slot.id))?.id ?? slots[0]?.id;
}
