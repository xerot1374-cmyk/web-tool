import React from "react";
import LinkedInRichPostRenderer, {
  type LinkedInRichPostTemplateData,
  type MediaBox,
} from "./LinkedInRichPostRenderer";
import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/richTextTypes";
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
    fontWeight?: number | string;
    fontStyle?: "normal" | "italic";
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
  radius?: number;
  cropX?: number;
  cropY?: number;
  cropScale?: number;
  cropTop?: number;
  cropRight?: number;
  cropBottom?: number;
  cropLeft?: number;
  contentX?: number;
  contentY?: number;
  contentW?: number;
  contentH?: number;
};

export type ImageLayoutMode = "manual" | "collage" | "frame";

type Props = LinkedInRichPostTemplateData & {
  scale?: number;
  mode?: "edit" | "preview" | "export";
  activeRichTextEditor?: React.ComponentProps<
    typeof LinkedInRichPostRenderer
  >["activeRichTextEditor"];

  bodyStyle?: BoxTextStyle;
  bodyHtml?: string;
  bodyMarks?: TextMark[];
  bodyBlocks?: RichTextBlock[];
  titleHtml?: string;
  titleMarks?: TextMark[];
  titleBlocks?: RichTextBlock[];
  badgeHtml?: string;
  badgeMarks?: TextMark[];
  badgeBlocks?: RichTextBlock[];
  companyHtml?: string;
  companyMarks?: TextMark[];
  companyBlocks?: RichTextBlock[];

  titleStyle?: BoxTextStyle;
  badgeStyle?: BoxTextStyle;
  companyStyle?: BoxTextStyle;
  headlineStyle?: BoxTextStyle;
  sublineStyle?: BoxTextStyle;

  mediaBox?: MediaBox;
  videoRadius?: number;
  productImages?: ImageItem[];
  editorHideProductMedia?: boolean;
  editorReserveProductMediaSlot?: boolean;
  imageLayout?: ImageLayoutMode;
  framePresetId?: string;
  frameSlots?: FrameSlot[];

  canvasPreset?: "linkedin" | "instagram" | "instagramStory";
  onStartFrameImageDrag?: (
    imageId: string,
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
  onSelectableClick?: (
    field: "badge" | "title" | "body" | "company",
    event: React.MouseEvent<HTMLElement>,
  ) => void;
  onSelectableDoubleClick?: (
    field: "badge" | "title" | "body" | "company",
    event: React.MouseEvent<HTMLElement>,
  ) => void;
};

export default function LinkedInRichPostTemplate(props: Props) {
  const {
    scale,
    mode = "preview",
    bodyStyle,
    bodyHtml,
    bodyMarks,
    bodyBlocks,
    titleHtml,
    titleMarks,
    titleBlocks,
    badgeHtml,
    badgeMarks,
    badgeBlocks,
    companyHtml,
    companyMarks,
    companyBlocks,
    titleStyle,
    badgeStyle,
    companyStyle,
    headlineStyle,
    sublineStyle,
    mediaBox,
    productImages,
    editorHideProductMedia,
    editorReserveProductMediaSlot,
    imageLayout,
    framePresetId,
    frameSlots,
    canvasPreset,
    onStartFrameImageDrag,
    onSelectableClick,
    onSelectableDoubleClick,
    activeRichTextEditor,
    ...rest
  } = props;

  return (
    <LinkedInRichPostRenderer
      data={{
        ...rest,
        bodyStyle,
        bodyHtml,
        bodyMarks,
        bodyBlocks,
        titleHtml,
        titleMarks,
        titleBlocks,
        badgeHtml,
        badgeMarks,
        badgeBlocks,
        companyHtml,
        companyMarks,
        companyBlocks,
        titleStyle,
        badgeStyle,
        companyStyle,
        headlineStyle,
        sublineStyle,
        mediaBox,
        productImages,
        editorHideProductMedia,
        editorReserveProductMediaSlot,
        imageLayout,
        framePresetId,
        frameSlots,
        canvasPreset,
      }}
      mode={mode}
      scale={scale}
      activeRichTextEditor={activeRichTextEditor}
      onStartFrameImageDrag={onStartFrameImageDrag}
      onSelectableClick={onSelectableClick}
      onSelectableDoubleClick={onSelectableDoubleClick}
    />
  );
}
