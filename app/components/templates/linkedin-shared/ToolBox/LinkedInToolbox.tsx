"use client";

import React from "react";
import { FRAME_PRESETS, type FrameSlot } from "@/app/lib/imageLayouts";

type TextMark = {
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

  caption: string;
  setCaption: (v: string) => void;
  captionRef: React.RefObject<HTMLTextAreaElement | null>;
  captionMarks?: TextMark[];

  activeField: EditorTextField;
  setActiveField: React.Dispatch<React.SetStateAction<EditorTextField>>;

  copied: boolean;

  copyCaption: () => void;

  link: string[];
  setLink: React.Dispatch<React.SetStateAction<string[]>>;

  linkInput: string;
  setLinkInput: (v: string) => void;

  handleAddLink: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTextChange?: (
    field: EditorTextField,
    value: string,
    selectionStart: number | null,
  ) => void;
  onTextKeyDown?: (
    field: "body" | "caption",
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => void;

  company: string;
  setCompany: (v: string) => void;
  companyRef: React.RefObject<HTMLInputElement | null>;

  onPickProductImage: (file: File | null) => void;
  imageLayout: ImageLayoutMode;
  setImageLayout: (mode: ImageLayoutMode) => void;
  framePresetId: string;
  setFramePresetId: (id: string) => void;
  frameSlots: Array<FrameSlot & { imageId?: string }>;
  selectedFrameSlotId?: string | null;
  onAssignImageToFrameSlot: (slotId: string) => void;

  setVideoFile: (file: File | null) => void;
};

function renderMarkedText(text: string, marks: TextMark[] = []) {
  if (!marks.length) return text;

  const safeMarks = marks
    .map((mark) => ({
      start: Math.max(0, Math.min(mark.start, text.length)),
      end: Math.max(0, Math.min(mark.end, text.length)),
      style: mark.style ?? {},
    }))
    .filter((mark) => mark.end > mark.start)
    .sort((a, b) => a.start - b.start);

  const out: React.ReactNode[] = [];
  let pos = 0;

  safeMarks.forEach((mark, index) => {
    if (mark.start > pos) {
      out.push(
        <React.Fragment key={`t-${pos}`}>
          {text.slice(pos, mark.start)}
        </React.Fragment>,
      );
    }

    out.push(
      <span
        key={`m-${mark.start}-${mark.end}-${index}`}
        style={{
          fontFamily: mark.style.fontFamily,
          fontSize: mark.style.fontSize,
          color: mark.style.color,
          fontWeight: mark.style.fontWeight,
          fontStyle: mark.style.fontStyle,
          background: mark.style.highlight
            ? "rgba(250,204,21,0.28)"
            : undefined,
        }}
      >
        {text.slice(mark.start, mark.end)}
      </span>,
    );

    pos = mark.end;
  });

  if (pos < text.length) {
    out.push(
      <React.Fragment key={`t-${pos}`}>{text.slice(pos)}</React.Fragment>,
    );
  }

  return out;
}

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
  captionMarks = [],
  copied,
  activeField,
  setActiveField,
  link,
  setLink,
  linkInput,
  setLinkInput,
  handleAddLink,
  onTextChange,
  onTextKeyDown,
  company,
  setCompany,
  companyRef,
  onPickProductImage,
  imageLayout,
  setImageLayout,
  framePresetId,
  setFramePresetId,
  frameSlots,
  selectedFrameSlotId,
  onAssignImageToFrameSlot,
  setVideoFile,
  copyCaption,
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
              onChange={(e) => {
                if (onTextChange) {
                  onTextChange(
                    "badge",
                    e.target.value,
                    e.target.selectionStart,
                  );
                } else {
                  setBadgeText(e.target.value);
                }
              }}
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
              onChange={(e) => {
                if (onTextChange) {
                  onTextChange(
                    "title",
                    e.target.value,
                    e.target.selectionStart,
                  );
                } else {
                  setTitle(e.target.value);
                }
              }}
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
              onChange={(e) => {
                if (onTextChange) {
                  onTextChange(
                    "company",
                    e.target.value,
                    e.target.selectionStart,
                  );
                } else {
                  setCompany(e.target.value);
                }
              }}
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
              onKeyDown={(e) => onTextKeyDown?.("body", e)}
              onChange={(e) => {
                if (onTextChange) {
                  onTextChange(
                    "body",
                    e.target.value,
                    e.target.selectionStart,
                  );
                } else {
                  setBody(e.target.value);
                }
              }}
              placeholder="Write the main body copy here"
              rows={6}
            />
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
                      <div
                        className={`tb__frameMini tb__frameMini--${preset.id}`}
                      >
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
                      <span className="tb__frameCardMeta">
                        {preset.description}
                      </span>
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
                  Select a slot, then upload an image or move the selected image
                  into that slot.
                </div>
              </div>
            </>
          ) : null}
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
            onChange={(e) => {
              if (onTextChange) {
                onTextChange(
                  "caption",
                  e.target.value,
                  e.target.selectionStart,
                );
              } else {
                setCaption(e.target.value);
              }
            }}
            onFocus={() => setActiveField("caption")}
            onSelect={() => setActiveField("caption")}
            onDoubleClick={() => setActiveField("caption")}
            onKeyDown={(e) => onTextKeyDown?.("caption", e)}
            placeholder="Draft the supporting post caption"
            rows={6}
          />

          <div className="tb__hint">{caption.length} characters</div>

          {caption.trim() ? (
            <div className="tb__captionPreview">
              <div className="tb__captionPreviewHeader">
                <div className="tb__captionPreviewTitle">Preview</div>
                <button
                  type="button"
                  onClick={copyCaption}
                  className="tb__copyBtn"
                >
                  {copied ? "Copied" : "Copy Caption"}
                </button>
              </div>

              <div className="tb__captionText">
                {renderMarkedText(caption, captionMarks)}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
