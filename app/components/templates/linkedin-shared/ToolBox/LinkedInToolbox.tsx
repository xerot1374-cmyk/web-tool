"use client";

import React, { useRef } from "react";
import { FRAME_PRESETS, type FrameSlot } from "@/app/lib/imageLayouts";
import ToolboxSection from "./ToolboxSection";
import ToolboxTextField from "./ToolboxTextField";

type EditorTextField = "badge" | "title" | "company" | "caption" | "body";
type ImageLayoutMode = "manual" | "collage" | "frame";
type ProductImageItem = {
  id: string;
  fileName?: string;
  frameSlotId?: string;
};
type VideoListItem = {
  id: string;
  file: File;
  radius: number;
};

const HIDDEN_FILE_INPUT_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const FILE_CONTROL_ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const FILE_BUTTON_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 16px",
  borderRadius: 16,
  border: "1px solid rgba(164, 7, 47, 0.16)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(252,244,246,0.98) 100%)",
  color: "var(--brand-ink)",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
};

const FILE_SUMMARY_STYLE: React.CSSProperties = {
  flex: "1 1 220px",
  minWidth: 0,
  pointerEvents: "none",
  color: "#64748b",
};

const RADIUS_CONTROL_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#334155",
};

const FRAME_PREVIEW_CARD_STYLE: React.CSSProperties = {
  marginTop: 12,
  display: "grid",
  gap: 12,
  padding: 14,
  borderRadius: 18,
  border: "1px solid #e5e7eb",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
};

const FRAME_PREVIEW_META_STYLE: React.CSSProperties = {
  display: "grid",
  gap: 4,
};

type Props = {
  badgeText: string;
  setBadgeText: (v: string) => void;
  badgeRef: React.RefObject<HTMLInputElement | null>;

  title: string;
  setTitle: (v: string) => void;
  titleRef: React.RefObject<HTMLInputElement | null>;

  body: string;
  setBody: (v: string) => void;
  bodyRef: React.RefObject<HTMLTextAreaElement | null>;

  setActiveField: React.Dispatch<React.SetStateAction<EditorTextField>>;

  link: string[];
  setLink: React.Dispatch<React.SetStateAction<string[]>>;

  linkInput: string;
  setLinkInput: (v: string) => void;

  addLink: () => void;
  handleAddLink: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  hashtags: string[];
  setHashtags: React.Dispatch<React.SetStateAction<string[]>>;
  hashtagInput: string;
  setHashtagInput: (v: string) => void;
  addHashtag: () => void;
  handleAddHashtag: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTextChange?: (
    field: EditorTextField,
    value: string,
    selectionStart: number | null,
  ) => void;
  onTextKeyDown?: (
    field: "body",
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => void;

  company: string;
  setCompany: (v: string) => void;
  companyRef: React.RefObject<HTMLInputElement | null>;

  onPickProductImage: (file: File | null) => void;
  productImages: ProductImageItem[];
  removeImage: (imageId: string) => void;
  imageLayout: ImageLayoutMode;
  setImageLayout: (mode: ImageLayoutMode) => void;
  framePresetId: string;
  setFramePresetId: (id: string) => void;
  frameSlots: Array<FrameSlot & { imageId?: string }>;
  selectedFrameSlotId?: string | null;
  selectedImageRadius: number | null;
  setSelectedImageRadius: (radius: number) => void;
  selectedVideoRadius: number | null;
  setSelectedVideoRadius: (radius: number) => void;
  onAssignImageToFrameSlot: (slotId: string) => void;

  onPickVideos: (files: FileList | File[] | null) => void;
  videos: VideoListItem[];
  clearVideo: (videoId: string) => void;
  draftPanel?: React.ReactNode;
};

export default function LinkedInToolbox({
  badgeText,
  setBadgeText,
  badgeRef,
  title,
  setTitle,
  titleRef,
  body,
  setBody,
  bodyRef,
  setActiveField,
  link,
  setLink,
  linkInput,
  setLinkInput,
  addLink,
  handleAddLink,
  hashtags,
  setHashtags,
  hashtagInput,
  setHashtagInput,
  addHashtag,
  handleAddHashtag,
  onTextChange,
  onTextKeyDown,
  company,
  setCompany,
  companyRef,
  onPickProductImage,
  productImages,
  removeImage,
  imageLayout,
  setImageLayout,
  framePresetId,
  setFramePresetId,
  frameSlots,
  selectedFrameSlotId,
  selectedImageRadius,
  setSelectedImageRadius,
  selectedVideoRadius,
  setSelectedVideoRadius,
  onAssignImageToFrameSlot,
  onPickVideos,
  videos,
  clearVideo,
  draftPanel,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const selectedFramePreset =
    FRAME_PRESETS.find((preset) => preset.id === framePresetId) ??
    FRAME_PRESETS[0];

  return (
    <aside className="tb">
      <div className="tb__header">
        <div className="tb__eyebrow">Workspace</div>
        <h2 className="tb__title">Content editor</h2>
        <p className="tb__subtitle">
          Manage message structure, assets, export, and social copy from one
          control surface.
        </p>
      </div>

      <div className="tb__scroll">
        <ToolboxSection
          title="Content"
          meta="Core message"
          collapsible
        >
          <ToolboxTextField
            label="Eye-Catcher"
            value={badgeText}
            inputRef={badgeRef}
            onFocus={() => setActiveField("badge")}
            onSelect={() => setActiveField("badge")}
            onDoubleClick={() => setActiveField("badge")}
            onChange={(value, selectionStart) => {
              if (onTextChange) {
                onTextChange("badge", value, selectionStart);
              } else {
                setBadgeText(value);
              }
            }}
          />

          <ToolboxTextField
            label="Title"
            value={title}
            inputRef={titleRef}
            onFocus={() => setActiveField("title")}
            onSelect={() => setActiveField("title")}
            onDoubleClick={() => setActiveField("title")}
            onChange={(value, selectionStart) => {
              if (onTextChange) {
                onTextChange("title", value, selectionStart);
              } else {
                setTitle(value);
              }
            }}
          />

          <ToolboxTextField
            label="Company"
            value={company}
            inputRef={companyRef}
            onFocus={() => setActiveField("company")}
            onSelect={() => setActiveField("company")}
            onDoubleClick={() => setActiveField("company")}
            onChange={(value, selectionStart) => {
              if (onTextChange) {
                onTextChange("company", value, selectionStart);
              } else {
                setCompany(value);
              }
            }}
          />

          <div className="editor-field">
            <label className="editor-label">Body</label>
            <textarea
              className="editor-textarea"
              value={body}
              ref={bodyRef}
              onFocus={() => setActiveField("body")}
              onSelect={() => setActiveField("body")}
              onDoubleClick={() => setActiveField("body")}
              onKeyDown={(e) => onTextKeyDown?.("body", e)}
              onChange={(e) => {
                if (onTextChange) {
                  onTextChange("body", e.target.value, e.target.selectionStart);
                } else {
                  setBody(e.target.value);
                }
              }}
              placeholder="Write the main body copy here"
              rows={6}
            />
          </div>
        </ToolboxSection>

        {draftPanel}

        <ToolboxSection title="Link" meta="CTA" collapsible>
          <div className="editor-field">
            <label className="editor-label">Add Link (press Enter)</label>

            <div className="tb__addInput">
              <input
                className="editor-input"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={handleAddLink}
                placeholder="Paste link and press Enter"
              />
              <button
                type="button"
                className="tb__addInputButton"
                onClick={addLink}
                disabled={!linkInput.trim()}
                aria-label="Add link"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M9 3h2v6h6v2h-6v6H9v-6H3V9h6V3Z" />
                </svg>
              </button>
            </div>

            {link.length > 0 ? (
              <div className="tb__links" style={{ marginTop: 10 }}>
                {link
                  .map((l: string) => l.trim())
                  .filter(Boolean)
                  .map((l: string, i: number) => (
                    <div key={`${l}-${i}`} className="tb__linkItem">
                      <span className="tb__linkText">{l}</span>

                      <button
                        type="button"
                        className="tb__linkRemove"
                        onClick={() =>
                          setLink((prev: string[]) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                      >
                        x
                      </button>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        </ToolboxSection>

        <ToolboxSection title="Hashtag" meta="Opportunity" collapsible>
          <div className="editor-field">
            <label className="editor-label">Add Hashtag (press Enter)</label>

            <div className="tb__addInput">
              <input
                className="editor-input"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleAddHashtag}
                placeholder="#hashtag and press Enter"
              />
              <button
                type="button"
                className="tb__addInputButton"
                onClick={addHashtag}
                disabled={!hashtagInput.trim()}
                aria-label="Add hashtag"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M9 3h2v6h6v2h-6v6H9v-6H3V9h6V3Z" />
                </svg>
              </button>
            </div>

            {hashtags.length > 0 ? (
              <div className="tb__links" style={{ marginTop: 10 }}>
                {hashtags
                  .map((hashtag: string) => hashtag.trim())
                  .filter(Boolean)
                  .map((hashtag: string, i: number) => (
                    <div key={`${hashtag}-${i}`} className="tb__linkItem">
                      <span className="tb__linkText">{hashtag}</span>

                      <button
                        type="button"
                        className="tb__linkRemove"
                        onClick={() =>
                          setHashtags((prev: string[]) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                      >
                        x
                      </button>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        </ToolboxSection>

        <ToolboxSection title="Product" meta="Assets" collapsible>
          <div className="editor-field">
            <label className="editor-label">Add Image</label>
            <div className="tb__fileControlRow" style={FILE_CONTROL_ROW_STYLE}>
              <input
                ref={imageInputRef}
                className="tb__fileInput"
                style={HIDDEN_FILE_INPUT_STYLE}
                type="file"
                accept="image/*"
                onChange={(e) =>
                  onPickProductImage(e.target.files?.[0] ?? null)
                }
              />
              <button
                type="button"
                className="tb__fileButton"
                style={FILE_BUTTON_STYLE}
                onClick={() => imageInputRef.current?.click()}
              >
                Choose image
              </button>
              <input
                className="tb__fileSummary"
                style={FILE_SUMMARY_STYLE}
                value={
                  productImages.length
                    ? `${productImages.length} image${productImages.length === 1 ? "" : "s"} selected`
                    : "No image selected"
                }
                readOnly
              />

              <label className="tb__radiusControl" style={RADIUS_CONTROL_STYLE}>
                <span>Radius</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={selectedImageRadius ?? ""}
                  disabled={selectedImageRadius == null}
                  onChange={(e) =>
                    setSelectedImageRadius(Number(e.target.value || 0))
                  }
                  className="editor-input"
                  style={{ width: 88 }}
                />
              </label>
            </div>
            <div className="tb__hint tb__hint--left">
              Select an image or frame slot to adjust its corner radius.
            </div>

            {productImages.length ? (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {productImages.map((image, index) => {
                  const slotIndex = image.frameSlotId
                    ? frameSlots.findIndex(
                        (slot) => slot.id === image.frameSlotId,
                      )
                    : -1;

                  return (
                    <div
                      key={image.id}
                      className="tb__linkItem"
                      style={{ alignItems: "center" }}
                    >
                      <span className="tb__linkText">
                        {`${image.fileName || `Image ${index + 1}`}${
                          slotIndex >= 0 ? ` - Slot ${slotIndex + 1}` : ""
                        }`}
                      </span>
                      <button
                        type="button"
                        className="tb__linkRemove"
                        onClick={() => removeImage(image.id)}
                        aria-label={`Remove image ${index + 1}`}
                      >
                        x
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="editor-field">
            <label className="editor-label">Image Layout</label>
            <select
              value={imageLayout}
              onChange={(e) =>
                setImageLayout(e.target.value as ImageLayoutMode)
              }
              style={{ width: "100%" }}
            >
              <option value="manual">Manual Layout</option>
              <option value="collage">Collage Layout</option>
              <option value="frame">Frame Layout</option>
            </select>
            <div className="tb__hint tb__hint--left">
              Frame Layout lets users choose a template and place each image
              into a specific slot.
            </div>
          </div>

          {imageLayout === "frame" ? (
            <>
              <div className="editor-field">
                <label className="editor-label">Frame Examples</label>
                <select
                  value={framePresetId}
                  onChange={(e) => setFramePresetId(e.target.value)}
                  className="tb__frameSelect"
                >
                  {FRAME_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <div
                  className="tb__framePreviewCard"
                  style={FRAME_PREVIEW_CARD_STYLE}
                >
                  <div
                    className={`tb__frameMini tb__frameMini--${selectedFramePreset.id}`}
                  >
                    <div className="tb__frameMiniBackdrop" />
                    {selectedFramePreset.slots.map((slot) => (
                      <span
                        key={slot.id}
                        className="tb__frameMiniSlot"
                        style={{
                          left: `${slot.x * 100}%`,
                          top: `${slot.y * 100}%`,
                          width: `${slot.w * 100}%`,
                          height: `${slot.h * 100}%`,
                          borderRadius: slot.radius ?? 12,
                          transform: `rotate(${slot.rotation ?? 0}deg)`,
                          clipPath: slot.clipPath,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className="tb__framePreviewMeta"
                    style={FRAME_PREVIEW_META_STYLE}
                  >
                    <span className="tb__frameCardTitle">
                      {selectedFramePreset.label}
                    </span>
                    <span className="tb__frameCardMeta">
                      {selectedFramePreset.description}
                    </span>
                  </div>
                </div>
              </div>

              <div className="editor-field">
                <label className="editor-label">Frame Slots</label>
                <div className="tb__slotList">
                  {frameSlots.map((slot, index) => (
                    <button
                      key={slot.id}
                      type="button"
                      className={
                        slot.id === selectedFrameSlotId
                          ? "tb__slotBtn tb__slotBtn--active"
                          : "tb__slotBtn"
                      }
                      onClick={() => onAssignImageToFrameSlot(slot.id)}
                    >
                      <span>{`Slot ${index + 1}`}</span>
                      <span>{slot.imageId ? "Filled" : "Empty"}</span>
                    </button>
                  ))}
                </div>
                <div className="tb__hint tb__hint--left">
                  Select a slot, then upload an image or move the selected image
                  into that slot.
                </div>
              </div>
            </>
          ) : null}
        </ToolboxSection>

        <ToolboxSection title="Media" meta="Video" collapsible>
          <div className="editor-field">
            <label className="editor-label">Video</label>
            <div className="tb__fileControlRow" style={FILE_CONTROL_ROW_STYLE}>
              <input
                ref={videoInputRef}
                className="tb__fileInput"
                style={HIDDEN_FILE_INPUT_STYLE}
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => onPickVideos(e.target.files)}
              />
              <button
                type="button"
                className="tb__fileButton"
                style={FILE_BUTTON_STYLE}
                onClick={() => videoInputRef.current?.click()}
              >
                Choose video
              </button>
              <input
                className="tb__fileSummary"
                style={FILE_SUMMARY_STYLE}
                value={
                  videos.length
                    ? `${videos.length} video${videos.length === 1 ? "" : "s"} selected`
                    : "No video selected"
                }
                readOnly
              />

              <label className="tb__radiusControl" style={RADIUS_CONTROL_STYLE}>
                <span>Radius</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={selectedVideoRadius ?? ""}
                  disabled={selectedVideoRadius == null}
                  onChange={(e) =>
                    setSelectedVideoRadius(Number(e.target.value || 0))
                  }
                  className="editor-input"
                  style={{ width: 88 }}
                />
              </label>
            </div>

            <div className="tb__hint tb__hint--left">
              Select a video on canvas to adjust its corner radius.
            </div>

            {videos.length ? (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {videos.map((video, index) => (
                  <div
                    key={video.id}
                    className="tb__linkItem"
                    style={{ alignItems: "center" }}
                  >
                    <span className="tb__linkText">
                      {`Video ${index + 1} - ${video.file.name}`}
                    </span>
                    <button
                      type="button"
                      className="tb__linkRemove"
                      onClick={() => clearVideo(video.id)}
                      aria-label={`Remove video ${index + 1}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </ToolboxSection>
      </div>
    </aside>
  );
}
