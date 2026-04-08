import React from "react";
import LinkedInTemplate2Renderer, {
  type LinkedInTemplate2Data,
  type MediaBox,
  type RasterMode,
} from "./LinkedInTemplate2Renderer";

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
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  cropX?: number;
  cropY?: number;
  cropScale?: number;
};

type Props = LinkedInTemplate2Data & {
  scale?: number;
  mode?: "edit" | "preview" | "export";

  bodyStyle?: BoxTextStyle;
  bodyMarks?: TextMark[];

  titleStyle?: BoxTextStyle;
  badgeStyle?: BoxTextStyle;
  companyStyle?: BoxTextStyle;
  headlineStyle?: BoxTextStyle;
  sublineStyle?: BoxTextStyle;

  mediaBox?: MediaBox;
  productImages?: ImageItem[];

  canvasPreset?: "linkedin" | "instagram" | "instagramStory";
  showRaster?: boolean;
  rasterMode?: RasterMode;
};

export default function LinkedInTemplate2(props: Props) {
  const {
    scale,
    mode = "preview",
    bodyStyle,
    bodyMarks,
    titleStyle,
    badgeStyle,
    companyStyle,
    headlineStyle,
    sublineStyle,
    mediaBox,
    productImages,
    canvasPreset,
    showRaster,
    rasterMode,
    ...rest
  } = props;

  return (
    <LinkedInTemplate2Renderer
      data={{
        ...rest,
        bodyStyle,
        bodyMarks,
        titleStyle,
        badgeStyle,
        companyStyle,
        headlineStyle,
        sublineStyle,
        mediaBox,
        productImages,
        canvasPreset,
        showRaster,
        rasterMode,
      }}
      mode={mode}
      scale={scale}
    />
  );
}