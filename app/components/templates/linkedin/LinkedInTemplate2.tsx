import React from "react";
import LinkedInTemplate2Renderer, {
  type LinkedInTemplate2Data,
  type MediaBox,
  type RasterMode,
} from "./LinkedInTemplate2Renderer";
import type { FrameSlot } from "@/app/lib/imageLayouts";

export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  highlight: boolean;
};

export type BoxTextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  textAlign: "left" | "center" | "right";
};

export type TextMark = {
  start: number;
  end: number;
  style: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    highlight?: boolean;
  };
};

export type ImageItem = {
  id: string;
  src: string;
  base64?: string;
  orientation: "landscape" | "portrait";
  frameSlotId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  cropX?: number;
  cropY?: number;
  cropScale?: number;
};

export type ImageLayoutMode = "manual" | "collage" | "frame";

type Props = LinkedInTemplate2Data & {
  scale?: number;
  mode?: "edit" | "preview" | "export";

  bodyStyle?: BoxTextStyle;
  bodyMarks?: TextMark[];
  titleMarks?: TextMark[];
  badgeMarks?: TextMark[];
  companyMarks?: TextMark[];

  titleStyle?: BoxTextStyle;
  badgeStyle?: BoxTextStyle;
  companyStyle?: BoxTextStyle;
  headlineStyle?: BoxTextStyle;
  sublineStyle?: BoxTextStyle;

  mediaBox?: MediaBox;
  productImages?: ImageItem[];
  imageLayout?: ImageLayoutMode;
  framePresetId?: string;
  frameSlots?: FrameSlot[];

  canvasPreset?: "linkedin" | "instagram" | "instagramStory";
  showRaster?: boolean;
  rasterMode?: RasterMode;
  onStartFrameImageDrag?: (
    imageId: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => void;
};

export default function LinkedInTemplate2(props: Props) {
  const {
    scale,
    mode = "preview",
    bodyStyle,
    bodyMarks,
    titleMarks,
    badgeMarks,
    companyMarks,
    titleStyle,
    badgeStyle,
    companyStyle,
    headlineStyle,
    sublineStyle,
    mediaBox,
    productImages,
    imageLayout,
    framePresetId,
    frameSlots,
    canvasPreset,
    showRaster,
    rasterMode,
    onStartFrameImageDrag,
    ...rest
  } = props;

  return (
    <LinkedInTemplate2Renderer
      data={{
        ...rest,
        bodyStyle,
        bodyMarks,
        titleMarks,
        badgeMarks,
        companyMarks,
        titleStyle,
        badgeStyle,
        companyStyle,
        headlineStyle,
        sublineStyle,
        mediaBox,
        productImages,
        imageLayout,
        framePresetId,
        frameSlots,
        canvasPreset,
        showRaster,
        rasterMode,
      }}
      mode={mode}
      scale={scale}
      onStartFrameImageDrag={onStartFrameImageDrag}
    />
  );
}
