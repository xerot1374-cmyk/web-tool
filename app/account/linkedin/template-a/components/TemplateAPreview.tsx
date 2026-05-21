"use client";

import LinkedInTemplate2 from "@/app/components/templates/linkedin/LinkedInTemplate2";
import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import { type CanvasPreset } from "@/app/lib/renderUtils";
import type { FrameSlot, ImageLayoutMode } from "@/app/lib/imageLayouts";
import { CANVAS_LABELS, getCropScale, getCropX, getCropY, isPreviewTextSelectableId } from "../lib/templateA.utils";
import type {
  ActiveRichTextEditor,
  BoxTextStyle,
  DragMode,
  EditorMediaImage,
  ImageItem,
  SelectableId,
  TextMark,
  VideoItem,
} from "../lib/templateA.types";
import { useMemo, type MouseEvent, type MutableRefObject, type RefObject } from "react";

type EffectivePreviewData = {
  canvasPreset: CanvasPreset;
  productImage?: string;
  productImages: ImageItem[];
  productOrientation: "landscape" | "portrait";
  productAlign: "left" | "center" | "right";
  imageLayout: ImageLayoutMode;
  framePresetId: string;
  frameSlots: FrameSlot[];
  mediaBox: { x: number; y: number; w: number; h: number };
  profileImage: string;
  name: string;
  role: string;
  badgeText?: string;
  badgeHtml: string;
  badgeMarks: TextMark[];
  badgeBlocks: RichTextBlock[];
  linkTitle: string;
  titleHtml: string;
  titleMarks: TextMark[];
  titleBlocks: RichTextBlock[];
  company: string;
  companyHtml: string;
  companyMarks: TextMark[];
  companyBlocks: RichTextBlock[];
  bodyText: string;
  bodyHtml: string;
  bodyMarks: TextMark[];
  bodyBlocks: RichTextBlock[];
  linkUrl?: string;
  hashtags?: string;
  headline?: string;
  subline?: string;
  titleStyle: BoxTextStyle;
  bodyStyle: BoxTextStyle;
  badgeStyle: BoxTextStyle;
  companyStyle: BoxTextStyle;
  headlineStyle: BoxTextStyle;
  sublineStyle: BoxTextStyle;
};

type TemplateAPreviewProps = {
  canvasPreset: CanvasPreset;
  onCanvasPresetChange: (preset: CanvasPreset) => void;
  clearSelection: () => void;
  previewViewportW: number;
  previewViewportH: number;
  previewScale: number;
  previewContentHeight: number;
  currentCanvas: { w: number; h: number };
  canvasWrapRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  editField: string | null;
  selectedId: SelectableId | null;
  selectedImageId: string | null;
  imageLayout: ImageLayoutMode;
  selectedRect: DOMRect | null;
  activeRichTextEditor: ActiveRichTextEditor | null;
  effective: EffectivePreviewData;
  editorMediaImages: EditorMediaImage[];
  editorVideos: Array<VideoItem & { zIndex?: number }>;
  selectedVideoId: string | null;
  finalUrl: string | null;
  suppressNextCanvasClickRef: MutableRefObject<boolean>;
  onCanvasClick: (e: MouseEvent<HTMLDivElement>) => void;
  onCanvasDoubleClick: (e: MouseEvent<HTMLDivElement>) => void;
  onSelectableClick: (
    field: "badge" | "title" | "body" | "company",
    event: MouseEvent<HTMLElement>,
  ) => void;
  onSelectableDoubleClick: (
    field: "badge" | "title" | "body" | "company",
    event: MouseEvent<HTMLElement>,
  ) => void;
  onStartFrameImageDrag: (
    imageId: string,
    event: MouseEvent<HTMLDivElement>,
  ) => void;
  onImageSelect: (image: EditorMediaImage) => void;
  onImageInteractionStart: (
    e: MouseEvent<HTMLDivElement>,
    mode: DragMode,
    image?: EditorMediaImage | null,
  ) => void;
  onVideoSelect: (video?: VideoItem | null) => void;
  onVideoInteractionStart: (
    e: MouseEvent<HTMLDivElement>,
    mode: DragMode,
    video?: VideoItem | null,
  ) => void;
  onFrameSlotResizeStart: (
    e: MouseEvent<HTMLDivElement>,
    mode: DragMode,
  ) => void;
  onRemoveSelectedImage: () => void;
  onRemoveSelectedVideo: () => void;
};

const SELECTION_HANDLES = [
  { key: "nw", left: -8, top: -8, cursor: "nwse-resize", mode: "resize-nw" },
  { key: "n", left: "50%", top: -8, transform: "translateX(-50%)", cursor: "ns-resize", mode: "resize-n" },
  { key: "ne", right: -8, top: -8, cursor: "nesw-resize", mode: "resize-ne" },
  { key: "e", right: -8, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize", mode: "resize-e" },
  { key: "se", right: -8, bottom: -8, cursor: "nwse-resize", mode: "resize-se" },
  { key: "s", left: "50%", bottom: -8, transform: "translateX(-50%)", cursor: "ns-resize", mode: "resize-s" },
  { key: "sw", left: -8, bottom: -8, cursor: "nesw-resize", mode: "resize-sw" },
  { key: "w", left: -8, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize", mode: "resize-w" },
] satisfies Array<{
  key: string;
  cursor: string;
  mode: DragMode;
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
  transform?: string;
}>;

export default function TemplateAPreview({
  canvasPreset,
  onCanvasPresetChange,
  clearSelection,
  previewViewportW,
  previewViewportH,
  previewScale,
  previewContentHeight,
  currentCanvas,
  canvasWrapRef,
  stageRef,
  editField,
  selectedId,
  selectedImageId,
  imageLayout,
  selectedRect,
  activeRichTextEditor,
  effective,
  editorMediaImages,
  editorVideos,
  selectedVideoId,
  finalUrl,
  suppressNextCanvasClickRef,
  onCanvasClick,
  onCanvasDoubleClick,
  onSelectableClick,
  onSelectableDoubleClick,
  onStartFrameImageDrag,
  onImageSelect,
  onImageInteractionStart,
  onVideoSelect,
  onVideoInteractionStart,
  onFrameSlotResizeStart,
  onRemoveSelectedImage,
  onRemoveSelectedVideo,
}: TemplateAPreviewProps) {
  const selectionHandles = useMemo(
    () => (selectedRect ? SELECTION_HANDLES : []),
    [selectedRect],
  );

  return (
    <>
      <div className="editor-previewShell">
        <div className="editor-previewHeader">
          <div>
            <div className="editor-previewEyebrow">Live canvas</div>
            <h2 className="editor-previewTitle">Preview</h2>
            <p className="editor-previewText">
              Edit directly on canvas, then fine-tune details from the side
              panels.
            </p>
          </div>

          <label className="editor-previewControl">
            <span>Canvas</span>
            <select
              value={canvasPreset}
              onChange={(e) => {
                onCanvasPresetChange(e.target.value as CanvasPreset);
                clearSelection();
              }}
              className="editor-previewSelect"
            >
              <option value="linkedin">{CANVAS_LABELS.linkedin}</option>
              <option value="instagram">{CANVAS_LABELS.instagram}</option>
              <option value="instagramStory">{CANVAS_LABELS.instagramStory}</option>
            </select>
          </label>
        </div>

        <div className="preview-stage">
          <div
            ref={canvasWrapRef}
            className="preview-canvasWrap"
            style={{
              width: previewViewportW,
              height: previewViewportH,
              position: "relative",
              overflow: "visible",
              userSelect: editField ? "text" : "none",
            }}
            onClick={onCanvasClick}
            onDoubleClick={onCanvasDoubleClick}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                borderRadius: "inherit",
              }}
            >
              <div
                ref={stageRef}
                className="li2-stage"
                style={{
                  width: currentCanvas.w,
                  height: previewContentHeight,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  left: 0,
                  top: 0,
                }}
              >
                <div className="li2-template">
                  <LinkedInTemplate2
                    scale={1}
                    mode="edit"
                    activeRichTextEditor={activeRichTextEditor ?? undefined}
                    canvasPreset={canvasPreset}
                    productImage={effective.productImage}
                    productImages={effective.productImages}
                    editorHideProductMedia
                    editorReserveProductMediaSlot={editorVideos.length > 0}
                    productOrientation={effective.productOrientation}
                    productAlign={effective.productAlign}
                    imageLayout={effective.imageLayout}
                    framePresetId={effective.framePresetId}
                    frameSlots={effective.frameSlots}
                    mediaBox={effective.mediaBox}
                    profileImage={effective.profileImage}
                    name={effective.name}
                    role={effective.role}
                    badgeText={effective.badgeText}
                    badgeHtml={effective.badgeHtml}
                    badgeMarks={effective.badgeMarks}
                    badgeBlocks={effective.badgeBlocks}
                    linkTitle={effective.linkTitle}
                    titleHtml={effective.titleHtml}
                    titleMarks={effective.titleMarks}
                    titleBlocks={effective.titleBlocks}
                    company={effective.company}
                    companyHtml={effective.companyHtml}
                    companyMarks={effective.companyMarks}
                    companyBlocks={effective.companyBlocks}
                    bodyText={effective.bodyText}
                    bodyHtml={effective.bodyHtml}
                    bodyMarks={effective.bodyMarks}
                    bodyBlocks={effective.bodyBlocks}
                    companyLogo="/logo.png"
                    linkUrl={effective.linkUrl}
                    hashtags={effective.hashtags}
                    headline={effective.headline}
                    subline={effective.subline}
                    titleStyle={effective.titleStyle}
                    bodyStyle={effective.bodyStyle}
                    badgeStyle={effective.badgeStyle}
                    companyStyle={effective.companyStyle}
                    headlineStyle={effective.headlineStyle}
                    sublineStyle={effective.sublineStyle}
                    onStartFrameImageDrag={onStartFrameImageDrag}
                    onSelectableClick={onSelectableClick}
                    onSelectableDoubleClick={onSelectableDoubleClick}
                  />
                </div>

                {editorMediaImages.map((img) => {
                  const cropX = getCropX(img);
                  const cropY = getCropY(img);
                  const cropScale = getCropScale(img);

                  return (
                    <div
                      key={`editor-media-${img.id}`}
                      data-select="productImage"
                      data-image-id={img.id}
                      data-frame-slot-id={img.frameSlotId}
                      aria-label="Product image"
                      style={{
                        position: "absolute",
                        left: img.x,
                        top: img.y,
                        width: img.w,
                        height: img.h,
                        zIndex: img.zIndex,
                        overflow: "hidden",
                        borderRadius: img.radius,
                        clipPath: img.clipPath,
                        transform: `rotate(${img.rotation}deg)`,
                        transformOrigin: "center center",
                        border:
                          imageLayout === "collage"
                            ? "1px solid rgba(255,255,255,0.92)"
                            : "1px solid rgba(15,23,42,0.10)",
                        background:
                          imageLayout === "collage" ? "#ffffff" : "transparent",
                        pointerEvents: "auto",
                        boxSizing: "border-box",
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        suppressNextCanvasClickRef.current = true;
                        if (selectedId === "productImage" && selectedImageId === img.id) {
                          onImageInteractionStart(
                            e,
                            imageLayout === "frame" ? "frame-image-pan" : "move",
                            img,
                          );
                          return;
                        }
                        onImageSelect(img);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        suppressNextCanvasClickRef.current = true;
                        onImageSelect(img);
                      }}
                    >
                      <img
                        src={img.src}
                        alt="product"
                        draggable={false}
                        style={{
                          position: "absolute",
                          left: `${cropX}%`,
                          top: `${cropY}%`,
                          width: `${cropScale * 100}%`,
                          height: `${cropScale * 100}%`,
                          maxWidth: "none",
                          maxHeight: "none",
                          transform: "translate(-50%, -50%)",
                          objectFit: "cover",
                          display: "block",
                          userSelect: "none",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  );
                })}

                {editorVideos.map((video) => (
                  <div
                    key={video.id}
                    data-select="video"
                    data-video-id={video.id}
                    aria-label="Uploaded video preview"
                    style={{
                      position: "absolute",
                      left: video.x,
                      top: video.y,
                      width: video.w,
                      height: video.h,
                      zIndex: video.zIndex,
                      overflow: "hidden",
                      borderRadius: video.radius,
                      transformOrigin: "center center",
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "#111827",
                      pointerEvents: "auto",
                      boxSizing: "border-box",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      suppressNextCanvasClickRef.current = true;
                      if (selectedId === "video" && selectedVideoId === video.id) {
                        onVideoInteractionStart(e, "move", video);
                        return;
                      }
                      onVideoSelect(video);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      suppressNextCanvasClickRef.current = true;
                      onVideoSelect(video);
                    }}
                  >
                    <video
                      src={video.previewUrl}
                      muted
                      playsInline
                      preload="metadata"
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    />
                  </div>
                ))}

                {selectedRect && !(editField && isPreviewTextSelectableId(selectedId)) ? (
                  <div
                    className={`editor-canvasSelection ${
                      isPreviewTextSelectableId(selectedId)
                        ? "editor-canvasSelection--text"
                        : "editor-canvasSelection--media"
                    }`}
                    data-selection-overlay="true"
                    data-media-selection-ui="true"
                    data-select={selectedId ?? undefined}
                    data-image-id={
                      selectedId === "productImage" ? (selectedImageId ?? undefined) : undefined
                    }
                    data-active-element={selectedId ?? undefined}
                    style={{
                      position: "absolute",
                      left: selectedRect.x,
                      top: selectedRect.y,
                      width: selectedRect.width,
                      height: selectedRect.height,
                      pointerEvents:
                        (selectedId === "productImage" ||
                          selectedId === "frameSlot" ||
                          selectedId === "video") &&
                        !editField
                          ? "auto"
                          : "none",
                      boxSizing: "border-box",
                      cursor:
                        selectedId === "productImage"
                          ? imageLayout === "frame"
                            ? "grab"
                            : "move"
                          : selectedId === "video"
                            ? "move"
                            : "default",
                      zIndex: 9999,
                    }}
                    onMouseDown={
                      selectedId === "productImage"
                        ? (e) => {
                            e.stopPropagation();
                            onImageInteractionStart(
                              e,
                              imageLayout === "frame" ? "frame-image-pan" : "move",
                            );
                          }
                        : selectedId === "video"
                          ? (e) => {
                              e.stopPropagation();
                              onVideoInteractionStart(e, "move");
                            }
                          : undefined
                    }
                  >
                    {((selectedId === "productImage" && !editField && imageLayout !== "frame") ||
                      (selectedId === "video" && !editField) ||
                      (imageLayout === "frame" &&
                        !editField &&
                        (selectedId === "productImage" || selectedId === "frameSlot"))) && (
                      <>
                        {selectionHandles.map((handle) => (
                          <div
                            key={handle.key}
                            data-resize-handle="true"
                            style={{
                              position: "absolute",
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              background: "#2563eb",
                              border: "2px solid #fff",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                              cursor: handle.cursor,
                              left: handle.left,
                              right: handle.right,
                              top: handle.top,
                              bottom: handle.bottom,
                              transform: handle.transform,
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (selectedId === "video") {
                                onVideoInteractionStart(e, handle.mode);
                              } else if (imageLayout === "frame" && selectedId === "frameSlot") {
                                onFrameSlotResizeStart(e, handle.mode);
                              } else {
                                onImageInteractionStart(e, handle.mode);
                              }
                            }}
                          />
                        ))}

                        {imageLayout !== "frame" && selectedId === "productImage" ? (
                          <div
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: -34,
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              background: "#111827",
                              border: "2px solid #fff",
                              transform: "translateX(-50%)",
                              cursor: "grab",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                            }}
                            onMouseDown={(e) => onImageInteractionStart(e, "rotate")}
                          />
                        ) : null}

                        {imageLayout === "frame" && selectedId === "productImage" ? (
                          <div
                            title="Drag to move image inside frame"
                            style={{
                              position: "absolute",
                              left: 16,
                              bottom: 16,
                              height: 28,
                              padding: "0 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(0,0,0,0.12)",
                              background: "rgba(255,255,255,0.96)",
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              cursor: "grab",
                            }}
                            onMouseDown={(e) => onImageInteractionStart(e, "frame-image-pan")}
                          >
                            Move image
                          </div>
                        ) : null}

                        {imageLayout === "frame" && selectedId === "productImage" ? (
                          <div
                            title="Resize image inside frame"
                            style={{
                              position: "absolute",
                              right: 18,
                              bottom: 18,
                              width: 18,
                              height: 18,
                              borderRadius: 6,
                              background: "#111827",
                              border: "2px solid #fff",
                              cursor: "nwse-resize",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                            }}
                            onMouseDown={(e) => onImageInteractionStart(e, "frame-image-scale")}
                          />
                        ) : null}

                        {selectedId === "productImage" ? (
                          <button
                            type="button"
                            style={{
                              position: "absolute",
                              right: -8,
                              top: -40,
                              height: 28,
                              padding: "0 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(0,0,0,0.12)",
                              background: "#fff",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveSelectedImage();
                            }}
                          >
                            Remove
                          </button>
                        ) : null}

                        {selectedId === "video" ? (
                          <button
                            type="button"
                            style={{
                              position: "absolute",
                              right: -8,
                              top: -40,
                              height: 28,
                              padding: "0 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(0,0,0,0.12)",
                              background: "#fff",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveSelectedVideo();
                            }}
                          >
                            Remove
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {finalUrl ? (
        <div className="preview-videoWrap">
          <video className="preview-video" src={finalUrl} controls playsInline />
        </div>
      ) : null}
    </>
  );
}
