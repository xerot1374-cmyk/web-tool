"use client";

import type React from "react";
import { FRAME_PRESETS, type FrameSlot } from "@/app/lib/imageLayouts";

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  highlight: boolean;
};

type EditorTextField = "badge" | "title" | "company" | "caption" | "body";
type ImageLayoutMode = "manual" | "collage" | "frame";

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
  bodyStyle: TextStyle;

  caption: string;
  setCaption: (v: string) => void;
  captionRef: React.RefObject<HTMLTextAreaElement | null>;
  captionStyle: TextStyle;

  activeField: EditorTextField;
  setActiveField: React.Dispatch<React.SetStateAction<EditorTextField>>;

  activeTextStyle: TextStyle;
  setActiveTextStyle: (patch: Partial<TextStyle>) => void;

  copied: boolean;

  applyUnicodeStyle: (style: "bold" | "italic") => void;
  applyBullet: () => void;
  applyNumbered: () => void;
  applyHashtag: () => void;
  copyCaption: () => void;
  insertEmoji: (emoji: string) => void;
  EMOJIS: string[];

  link: string[];
  setLink: React.Dispatch<React.SetStateAction<string[]>>;

  linkInput: string;
  setLinkInput: (v: string) => void;

  handleAddLink: (e: React.KeyboardEvent<HTMLInputElement>) => void;

  company: string;
  setCompany: (v: string) => void;
  companyRef: React.RefObject<HTMLInputElement | null>;

  onPickProductImage: (file: File | null) => void;
  productAlign: "left" | "center" | "right";
  setProductAlign: (value: "left" | "center" | "right") => void;
  imageLayout: ImageLayoutMode;
  setImageLayout: (mode: ImageLayoutMode) => void;
  framePresetId: string;
  setFramePresetId: (id: string) => void;
  frameSlots: Array<FrameSlot & { imageId?: string }>;
  selectedFrameSlotId?: string | null;
  onAssignImageToFrameSlot: (slotId: string) => void;

  setVideoFile: (file: File | null) => void;

  loadingPdf: boolean;
  downloadPDF: (e?: React.MouseEvent<HTMLButtonElement>) => void;

  finalLoading: boolean;
  hasVideo: boolean;
  generateFinal: (e?: React.MouseEvent<HTMLButtonElement>) => void;

  finalUrl: string | null;

  selectedImageId?: string | null;
  selectedImageRotation?: number;
  onRotateSelectedImage?: (delta: number) => void;
  onSetSelectedImageRotation?: (deg: number) => void;
  imageCount?: number;

  onDeleteSelectedImage?: () => void;
  onDuplicateSelectedImage?: () => void;
  showRaster?: boolean;
  setShowRaster?: (v: boolean) => void;
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
  caption,
  setCaption,
  captionRef,
  copied,
  activeField,
  setActiveField,
  link,
  setLink,
  linkInput,
  setLinkInput,
  handleAddLink,
  company,
  setCompany,
  companyRef,
  onPickProductImage,
  productAlign,
  setProductAlign,
  imageLayout,
  setImageLayout,
  framePresetId,
  setFramePresetId,
  frameSlots,
  selectedFrameSlotId,
  onAssignImageToFrameSlot,
  setVideoFile,
  loadingPdf,
  downloadPDF,
  finalLoading,
  hasVideo,
  generateFinal,
  finalUrl,
  copyCaption,
  selectedImageId,
  selectedImageRotation = 0,
  onRotateSelectedImage,
  onSetSelectedImageRotation,
  imageCount = 0,
  onDeleteSelectedImage,
  onDuplicateSelectedImage,
  showRaster = false,
  setShowRaster,
}: Props) {
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
        <section className="tb__section">
          <div className="tb__sectionTitle">
            <span>Content</span>
            <span className="tb__sectionMeta">Core message</span>
          </div>

          <div className="editor-field">
            <label className="editor-label">Eye-Catcher</label>
            <input
              ref={badgeRef}
              className="editor-input"
              value={badgeText}
              onFocus={() => setActiveField("badge")}
              onSelect={() => setActiveField("badge")}
              onDoubleClick={() => setActiveField("badge")}
              onChange={(e) => setBadgeText(e.target.value)}
            />
          </div>

          <div className="editor-field">
            <label className="editor-label">Title</label>
            <input
              ref={titleRef}
              className="editor-input"
              value={title}
              onFocus={() => setActiveField("title")}
              onSelect={() => setActiveField("title")}
              onDoubleClick={() => setActiveField("title")}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="editor-field">
            <label className="editor-label">Company</label>
            <input
              ref={companyRef}
              className="editor-input"
              value={company}
              onFocus={() => setActiveField("company")}
              onSelect={() => setActiveField("company")}
              onDoubleClick={() => setActiveField("company")}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="editor-field">
            <label className="editor-label">Body</label>
            <textarea
              className="editor-textarea"
              value={body}
              ref={bodyRef}
              onFocus={() => setActiveField("body")}
              onSelect={() => setActiveField("body")}
              onDoubleClick={() => setActiveField("body")}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the main body copy here"
              rows={6}
            />
          </div>
        </section>

        <section className="tb__section">
          <div className="tb__sectionTitle">
            <span>Product</span>
            <span className="tb__sectionMeta">Assets</span>
          </div>

          <div className="editor-field">
            <label className="editor-label">Add Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onPickProductImage(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="tb__stat">
            <span className="tb__statValue">{imageCount}</span>
            <span className="tb__statLabel">image(s) on canvas</span>
          </div>

          <div className="editor-field">
            <label className="editor-label">Product Alignment</label>
            <select
              value={productAlign}
              onChange={(e) =>
                setProductAlign(e.target.value as "left" | "center" | "right")
              }
              style={{ width: "100%" }}
            >
              <option value="center">Center</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className="editor-field">
            <label className="editor-label">Image Layout</label>
            <select
              value={imageLayout}
              onChange={(e) => setImageLayout(e.target.value as ImageLayoutMode)}
              style={{ width: "100%" }}
            >
              <option value="manual">Manual Layout</option>
              <option value="collage">Collage Layout</option>
              <option value="frame">Frame Layout</option>
            </select>
            <div className="tb__hint tb__hint--left">
              Frame Layout lets users choose a template and place each image into a specific slot.
            </div>
          </div>

          {imageLayout === "frame" ? (
            <>
              <div className="editor-field">
                <label className="editor-label">Frame Examples</label>
                <div className="tb__frameGrid">
                  {FRAME_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={
                        preset.id === framePresetId
                          ? "tb__frameCard tb__frameCard--active"
                          : "tb__frameCard"
                      }
                      onClick={() => setFramePresetId(preset.id)}
                    >
                      <div className={`tb__frameMini tb__frameMini--${preset.id}`}>
                        <div className="tb__frameMiniBackdrop" />
                        {preset.slots.map((slot) => (
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
                      <span className="tb__frameCardTitle">{preset.label}</span>
                      <span className="tb__frameCardMeta">{preset.description}</span>
                    </button>
                  ))}
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
                  Select a slot, then upload an image or move the selected image into that slot.
                </div>
              </div>
            </>
          ) : null}

          <div className="editor-field">
            <label className="editor-label">Rotation</label>

            <div className="tb__row tb__row--split">
              <button
                type="button"
                className="editor-btn"
                onClick={() => onRotateSelectedImage?.(-15)}
                disabled={!selectedImageId}
              >
                -15 deg
              </button>

              <button
                type="button"
                className="editor-btn"
                onClick={() => onRotateSelectedImage?.(15)}
                disabled={!selectedImageId}
              >
                +15 deg
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={selectedImageRotation}
              onChange={(e) => onSetSelectedImageRotation?.(Number(e.target.value))}
              disabled={!selectedImageId}
            />

            <div className="tb__hint tb__hint--left">
              {selectedImageId
                ? `Selected image: ${selectedImageRotation} degrees`
                : "No image selected"}
            </div>
          </div>

          <div className="editor-field">
            <label className="editor-label">Image Actions</label>

            <div className="tb__row tb__row--split">
              <button
                type="button"
                className="editor-btn"
                onClick={onDuplicateSelectedImage}
                disabled={!selectedImageId}
              >
                Duplicate
              </button>

              <button
                type="button"
                className="editor-btn"
                onClick={onDeleteSelectedImage}
                disabled={!selectedImageId}
              >
                Delete
              </button>
            </div>

            <div className="tb__shortcutCard">
              <div>Copy: Ctrl/Cmd + C</div>
              <div>Cut: Ctrl/Cmd + X</div>
              <div>Paste: Ctrl/Cmd + V</div>
              <div>Delete: Del / Backspace</div>
            </div>
          </div>

          <div className="editor-field">
            <label className="editor-label">Raster / Grid</label>
            <label className="tb__toggle">
              <input
                type="checkbox"
                checked={showRaster}
                onChange={(e) => setShowRaster?.(e.target.checked)}
              />
              Show raster in preview
            </label>
          </div>

          <div className="tb__hint tb__hint--left">
            Crop is controlled in the Properties panel when an image is selected.
          </div>
        </section>

        <section className="tb__section">
          <div className="tb__sectionTitle">
            <span>Link</span>
            <span className="tb__sectionMeta">CTA</span>
          </div>

          <div className="editor-field">
            <label className="editor-label">Add Link (press Enter)</label>

            <input
              className="editor-input"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={handleAddLink}
              placeholder="Paste link and press Enter"
            />

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
                          setLink((prev: string[]) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        x
                      </button>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="tb__section">
          <div className="tb__sectionTitle">
            <span>Media</span>
            <span className="tb__sectionMeta">Video</span>
          </div>

          <div className="editor-field">
            <label className="editor-label">Video</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </section>

        <section className="tb__section">
          <div className="tb__sectionTitle">
            <span>Caption</span>
            <span className="tb__sectionMeta">
              {activeField === "caption" ? "Active" : "Social copy"}
            </span>
          </div>

          <textarea
            ref={captionRef}
            className="editor-textarea"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onFocus={() => setActiveField("caption")}
            onSelect={() => setActiveField("caption")}
            onDoubleClick={() => setActiveField("caption")}
            placeholder="Draft the supporting post caption"
            rows={6}
          />

          <div className="tb__hint">{caption.length} characters</div>

          {caption.trim() ? (
            <div className="tb__captionPreview">
              <div className="tb__captionPreviewHeader">
                <div className="tb__captionPreviewTitle">Preview</div>
                <button type="button" onClick={copyCaption} className="tb__copyBtn">
                  {copied ? "Copied" : "Copy Caption"}
                </button>
              </div>

              <div className="tb__captionText">{caption}</div>
            </div>
          ) : null}
        </section>
      </div>

      <div className="tb__actions">
        <button
          type="button"
          onClick={(e) => downloadPDF(e)}
          disabled={loadingPdf}
          className="tb__action tb__action--primary"
        >
          {loadingPdf ? "Generating PDF..." : "Download PDF"}
        </button>

        <button
          type="button"
          onClick={(e) => generateFinal(e)}
          disabled={finalLoading || !hasVideo}
          className="tb__action tb__action--dark"
        >
          {finalLoading ? "Generating..." : "Generate final.mp4"}
        </button>

        {finalUrl ? (
          <a href={finalUrl} download="final.mp4" className="tb__download">
            Download generated video
          </a>
        ) : null}
      </div>
    </aside>
  );
}
