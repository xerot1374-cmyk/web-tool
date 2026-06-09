import type { CanvasPreset } from "@/app/lib/renderUtils";
import type { FrameSlot, ImageLayoutMode } from "@/app/lib/imageLayouts";
import type { CSSProperties } from "react";
import type {
  LexicalInlineEditorHandle,
  RichTextBlock,
} from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";

export type SessionUser = {
  name: string;
  role: string;
  profileImage: string | null;
};

export type TemplateAClientProps = {
  sessionUser: SessionUser | null;
  initialDraft: TemplateADraft | null;
};

export type FieldErrors = {
  title?: string;
  body?: string;
};

export type RichStyle = {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  highlight?: boolean;
  highlightColor?: string;
  fontWeight?: number | string;
  fontStyle?: "normal" | "italic";
};

export type TextMark = {
  start: number;
  end: number;
  style: RichStyle;
};

export type MediaBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ImageItem = {
  id: string;
  src: string;
  fileName?: string;
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
};

export type EditorMediaImage = ImageItem & {
  radius?: number;
  clipPath?: string;
  zIndex: number;
};

export type ImagePayloadItem = {
  id: string;
  src?: string;
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
};

export type VideoItem = {
  id: string;
  file?: File;
  previewUrl: string;
  src?: string;
  fileName?: string;
  mimeType?: string;
  durationSeconds?: number;
  frameRate?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  zIndex?: number;
};

export type VideoPayloadItem = {
  id: string;
  fileKey?: string;
  src?: string;
  fileName?: string;
  mimeType?: string;
  durationSeconds?: number;
  frameRate?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  zIndex?: number;
};

export type BoxTextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  textAlign: "left" | "center" | "right";
};

export type PdfPayload = {
  profileImage: string;
  name: string;
  role: string;
  productImage?: string;
  productOrientation?: "landscape" | "portrait";
  productAlign?: "left" | "center" | "right";
  imageLayout?: ImageLayoutMode;
  framePresetId?: string;
  frameSlots?: FrameSlot[];
  productImageBase64?: string;
  mediaBox?: MediaBox;
  images?: ImagePayloadItem[];
  videos?: VideoPayloadItem[];
  videoRadius?: number;
  badgeText?: string;
  badgeStyle?: BoxTextStyle;
  linkTitle?: string;
  company?: string;
  headline?: string;
  subline?: string;
  bodyText?: string;
  bodyHtml?: string;
  bodyMarks?: TextMark[];
  bodyBlocks?: RichTextBlock[];
  titleMarks?: TextMark[];
  titleHtml?: string;
  titleBlocks?: RichTextBlock[];
  badgeMarks?: TextMark[];
  badgeHtml?: string;
  badgeBlocks?: RichTextBlock[];
  companyMarks?: TextMark[];
  companyHtml?: string;
  companyBlocks?: RichTextBlock[];
  caption?: string;
  captionText?: string;
  captionMarks?: TextMark[];
  captionHtml?: string;
  captionBlocks?: RichTextBlock[];
  captionStyle?: BoxTextStyle;
  titleStyle?: BoxTextStyle;
  bodyStyle?: BoxTextStyle;
  companyStyle?: BoxTextStyle;
  headlineStyle?: BoxTextStyle;
  sublineStyle?: BoxTextStyle;
  link?: string;
  linkLabel?: string;
  hashtags?: string;
  canvasPreset?: CanvasPreset;
};

export type TemplateADraftPayload = Omit<PdfPayload, "profileImage" | "name" | "role">;

export type TemplateDraftSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type TemplateDraftPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TemplateADraft = TemplateDraftSummary & {
  payload: TemplateADraftPayload;
};

export type CanvasPresetKey = CanvasPreset;

export type SelectableId =
  | "title"
  | "body"
  | "badge"
  | "productImage"
  | "frameSlot"
  | "video"
  | "links"
  | "hashtags"
  | "company"
  | "headline"
  | "subline";

export type EditorTextField = "title" | "body" | "badge" | "company" | "caption";

export type EditField = Exclude<EditorTextField, "caption"> | null;

export type RichEditField = "title" | "body" | "company" | "badge";

export type DragMode =
  | "frame-swap"
  | "frame-image-pan"
  | "frame-image-scale"
  | "move"
  | "resize-n"
  | "resize-s"
  | "resize-e"
  | "resize-w"
  | "resize-ne"
  | "resize-nw"
  | "resize-se"
  | "resize-sw"
  | "rotate";

export type SelectionHandle = {
  key: string;
  cursor: string;
  mode: DragMode;
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
  transform?: string;
};

export type ImageClipboardPayload = {
  type: "image";
  image: ImageItem;
};

export type VideoSnapshot = {
  video: VideoItem | null;
};

export type VideoClipboardPayload = {
  type: "video";
  snapshot: VideoSnapshot;
} | null;

export type ActiveRichTextEditor = {
  field: RichEditField;
  sessionKey: number;
  editorRef: React.Ref<LexicalInlineEditorHandle>;
  text: string;
  marks: TextMark[];
  blocks: RichTextBlock[];
  multiline: boolean;
  className: string;
  style: CSSProperties;
  onAlignChange: (align: "left" | "center" | "right") => void;
  onChange: (payload: {
    text: string;
    marks: TextMark[];
    blocks: RichTextBlock[];
    html: string;
  }) => void;
  onBlur: (e: React.FocusEvent<HTMLElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  onKeyUp: () => void;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseUp: () => void;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLElement>) => void;
};
