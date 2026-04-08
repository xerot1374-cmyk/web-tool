"use client";

import type React from "react";
import "./Toolbox.css";

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  highlight: boolean;
};

type Props = {
  badgeText: string;
  setBadgeText: (v: string) => void;

  title: string;
  setTitle: (v: string) => void;

  body: string;
  setBody: (v: string) => void;
  bodyRef: React.RefObject<HTMLTextAreaElement | null>;
  bodyStyle: TextStyle;

  caption: string;
  setCaption: (v: string) => void;
  captionRef: React.RefObject<HTMLTextAreaElement | null>;
  captionStyle: TextStyle;

  activeField: "caption" | "body";
  setActiveField: React.Dispatch<React.SetStateAction<"caption" | "body">>;

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

  onPickProductImage: (file: File | null) => void;
  productAlign: "left" | "center" | "right";
  setProductAlign: React.Dispatch<React.SetStateAction<"left" | "center" | "right">>;

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
  title,
  setTitle,
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
  onPickProductImage,
  productAlign,
  setProductAlign,
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
  const bodyTextareaStyle: React.CSSProperties = {
    fontFamily: "system-ui",
    fontSize: 14,
    color: "#111827",
  };

  const captionTextareaStyle: React.CSSProperties = {
    fontFamily: "system-ui",
    fontSize: 14,
    color: "#111827",
  };

  return (
    <aside className="tb">
      <div className="tb__header">
        <h2 className="tb__title">Toolbox</h2>
      </div>

      <div className="tb__scroll">
        <section className="tb__section">
          <div className="tb__sectionTitle">Content</div>

          <div className="editor-field">
            <label className="editor-label">Eye-Catcher</label>
            <input
              className="editor-input"
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
            />
          </div>

          <div className="editor-field">
            <label className="editor-label">Title</label>
            <input
              className="editor-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="editor-field">
            <label className="editor-label">Company</label>
            <input
              className="editor-input"
              value={company}
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
              onChange={(e) => setBody(e.target.value)}
              placeholder="Body"
              rows={6}
              style={bodyTextareaStyle}
            />
          </div>
        </section>

        <section className="tb__section">
          <div className="tb__sectionTitle">Product</div>

          <div className="editor-field">
            <label className="editor-label">Add Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onPickProductImage(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="tb__hint" style={{ textAlign: "left", marginBottom: 10 }}>
            {imageCount} image(s) on template
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
            <label className="editor-label">Rotation</label>

            <div className="tb__row">
              <button
                type="button"
                className="editor-btn"
                onClick={() => onRotateSelectedImage?.(-15)}
                disabled={!selectedImageId}
              >
                -15°
              </button>

              <button
                type="button"
                className="editor-btn"
                onClick={() => onRotateSelectedImage?.(15)}
                disabled={!selectedImageId}
              >
                +15°
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

            <div className="tb__hint" style={{ textAlign: "left" }}>
              {selectedImageId
                ? `Selected image: ${selectedImageRotation}°`
                : "No image selected"}
            </div>
          </div>

          <div className="editor-field">
            <label className="editor-label">Image Actions</label>

            <div className="tb__row">
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

            <div className="tb__hint" style={{ textAlign: "left" }}>
              Copy: Ctrl/Cmd + C
              <br />
              Cut: Ctrl/Cmd + X
              <br />
              Paste: Ctrl/Cmd + V
              <br />
              Delete: Del / Backspace
            </div>
          </div>

          <div className="editor-field">
            <label className="editor-label">Raster / Grid</label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                color: "#374151",
              }}
            >
              <input
                type="checkbox"
                checked={showRaster}
                onChange={(e) => setShowRaster?.(e.target.checked)}
              />
              Show raster in preview
            </label>
          </div>

          <div className="tb__hint" style={{ textAlign: "left" }}>
            Crop is controlled in the Properties panel when an image is selected.
          </div>
        </section>

        <section className="tb__section">
          <div className="tb__sectionTitle">Link</div>

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
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="tb__section">
          <div className="tb__sectionTitle">Media</div>

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
          <div className="tb__sectionTitle">Caption</div>

          <textarea
            ref={captionRef}
            className="editor-textarea"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onFocus={() => setActiveField("caption")}
            placeholder="Caption"
            rows={6}
            style={captionTextareaStyle}
          />

          <div className="tb__hint">{caption.length} characters</div>

          {caption.trim() ? (
            <div className="tb__captionPreview">
              <div className="tb__captionPreviewHeader">
                <div className="tb__captionPreviewTitle">Preview</div>
                <button type="button" onClick={copyCaption} className="tb__copyBtn">
                  {copied ? "Copied ✓" : "Copy Caption"}
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
            Download
          </a>
        ) : null}
      </div>
    </aside>
  );
}