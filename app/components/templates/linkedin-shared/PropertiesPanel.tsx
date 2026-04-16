"use client";

import type React from "react";

type BoxTextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  textAlign: "left" | "center" | "right";
};

type Props = {
  selectedId: string | null;

  title: string;
  setTitle: (v: string) => void;
  titleStyle: BoxTextStyle;
  setTitleStyle: (updater: (prev: BoxTextStyle) => BoxTextStyle) => void;

  body: string;
  setBody: (v: string) => void;
  bodyStyle: BoxTextStyle;
  setBodyStyle: (updater: (prev: BoxTextStyle) => BoxTextStyle) => void;

  badgeText: string;
  setBadgeText: (v: string) => void;
  badgeStyle: BoxTextStyle;
  setBadgeStyle: (updater: (prev: BoxTextStyle) => BoxTextStyle) => void;

  company: string;
  setCompany: (v: string) => void;
  companyStyle: BoxTextStyle;
  setCompanyStyle: (updater: (prev: BoxTextStyle) => BoxTextStyle) => void;

  headline: string;
  setHeadline: (v: string) => void;
  headlineStyle: BoxTextStyle;
  setHeadlineStyle: (updater: (prev: BoxTextStyle) => BoxTextStyle) => void;

  subline: string;
  setSubline: (v: string) => void;
  sublineStyle: BoxTextStyle;
  setSublineStyle: (updater: (prev: BoxTextStyle) => BoxTextStyle) => void;

  productAlign: "left" | "center" | "right";
  setProductAlign: (v: "left" | "center" | "right") => void;

  selectedImageRotation?: number;
  setSelectedImageRotation?: (deg: number) => void;

  selectedImageCropX?: number;
  selectedImageCropY?: number;
  selectedImageCropScale?: number;
  setSelectedImageCropX?: (v: number) => void;
  setSelectedImageCropY?: (v: number) => void;
  setSelectedImageCropScale?: (v: number) => void;

  showRaster?: boolean;
  setShowRaster?: (v: boolean) => void;

  onDeleteSelectedImage?: () => void;
  onDuplicateSelectedImage?: () => void;
};

const FONT_OPTIONS = [
  { label: "System", value: "system-ui" },
  { label: "Arial", value: "Arial" },
  { label: "Inter", value: "Inter" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: '"Times New Roman"' },
];

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="properties-panel__section">
      <div className="properties-panel__sectionHeader">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="properties-panel__toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function TextControls({
  title,
  subtitle,
  text,
  setText,
  style,
  setStyle,
  showTextInput = true,
}: {
  title: string;
  subtitle?: string;
  text: string;
  setText?: (v: string) => void;
  style: BoxTextStyle;
  setStyle: (updater: (prev: BoxTextStyle) => BoxTextStyle) => void;
  showTextInput?: boolean;
}) {
  return (
    <div className="properties-panel">
      <Section title={title} subtitle={subtitle}>
        {showTextInput && setText ? (
          <div className="properties-panel__field">
            <label>Text</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
          </div>
        ) : null}

        <div className="properties-panel__field">
          <label>Font</label>
          <select
            value={style.fontFamily}
            onChange={(e) =>
              setStyle((prev) => ({ ...prev, fontFamily: e.target.value }))
            }
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="properties-panel__grid">
          <div className="properties-panel__field">
            <label>Font Size</label>
            <input
              type="number"
              min={10}
              max={120}
              value={style.fontSize}
              onChange={(e) =>
                setStyle((prev) => ({
                  ...prev,
                  fontSize: Number(e.target.value) || prev.fontSize,
                }))
              }
            />
          </div>

          <div className="properties-panel__field">
            <label>Color</label>
            <input
              type="color"
              value={style.color}
              onChange={(e) =>
                setStyle((prev) => ({ ...prev, color: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="properties-panel__field">
          <label>Align</label>
          <select
            value={style.textAlign}
            onChange={(e) =>
              setStyle((prev) => ({
                ...prev,
                textAlign: e.target.value as "left" | "center" | "right",
              }))
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </Section>
    </div>
  );
}

function EmptyState({
  showRaster,
  setShowRaster,
}: {
  showRaster: boolean;
  setShowRaster?: (v: boolean) => void;
}) {
  return (
    <div className="properties-panel">
      <Section
        title="Properties"
        subtitle="Select any text block or image on the canvas to edit its settings."
      >
        <ToggleRow
          checked={showRaster}
          onChange={setShowRaster}
          label="Show raster in preview"
        />
      </Section>
    </div>
  );
}

export default function PropertiesPanel({
  selectedId,

  title,
  setTitle,
  titleStyle,
  setTitleStyle,

  body,
  setBody,
  bodyStyle,
  setBodyStyle,

  badgeText,
  setBadgeText,
  badgeStyle,
  setBadgeStyle,

  company,
  setCompany,
  companyStyle,
  setCompanyStyle,

  headline,
  setHeadline,
  headlineStyle,
  setHeadlineStyle,

  subline,
  setSubline,
  sublineStyle,
  setSublineStyle,

  productAlign,
  setProductAlign,

  selectedImageRotation = 0,
  setSelectedImageRotation,

  selectedImageCropX = 50,
  selectedImageCropY = 50,
  selectedImageCropScale = 1,
  setSelectedImageCropX,
  setSelectedImageCropY,
  setSelectedImageCropScale,

  showRaster = false,
  setShowRaster,

  onDeleteSelectedImage,
  onDuplicateSelectedImage,
}: Props) {
  if (!selectedId) {
    return <EmptyState showRaster={showRaster} setShowRaster={setShowRaster} />;
  }

  if (selectedId === "title") {
    return (
      <TextControls
        title="Title"
        subtitle="Refine the primary headline styling and copy."
        text={title}
        setText={setTitle}
        style={titleStyle}
        setStyle={setTitleStyle}
      />
    );
  }

  if (selectedId === "body") {
    return (
      <TextControls
        title="Body"
        subtitle="Adjust the supporting paragraph block."
        text={body}
        setText={setBody}
        style={bodyStyle}
        setStyle={setBodyStyle}
      />
    );
  }

  if (selectedId === "badge") {
    return (
      <TextControls
        title="Badge"
        subtitle="Control the eye-catcher label."
        text={badgeText}
        setText={setBadgeText}
        style={badgeStyle}
        setStyle={setBadgeStyle}
      />
    );
  }

  if (selectedId === "company") {
    return (
      <TextControls
        title="Company"
        subtitle="Tune the company line styling."
        text={company}
        setText={setCompany}
        style={companyStyle}
        setStyle={setCompanyStyle}
      />
    );
  }

  if (selectedId === "headline") {
    return (
      <TextControls
        title="Headline"
        subtitle="Control the larger supporting headline."
        text={headline}
        setText={setHeadline}
        style={headlineStyle}
        setStyle={setHeadlineStyle}
      />
    );
  }

  if (selectedId === "subline") {
    return (
      <TextControls
        title="Subline"
        subtitle="Adjust the secondary descriptive line."
        text={subline}
        setText={setSubline}
        style={sublineStyle}
        setStyle={setSublineStyle}
      />
    );
  }

  if (selectedId === "productImage") {
    return (
      <div className="properties-panel">
        <Section
          title="Image"
          subtitle="Refine placement, crop, and transformations for the selected image."
        >
          <ToggleRow
            checked={showRaster}
            onChange={setShowRaster}
            label="Show raster in preview"
          />

          <div className="properties-panel__field">
            <label>Align</label>
            <select
              value={productAlign}
              onChange={(e) =>
                setProductAlign(e.target.value as "left" | "center" | "right")
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className="properties-panel__field">
            <label>Rotation</label>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={selectedImageRotation}
              onChange={(e) => setSelectedImageRotation?.(Number(e.target.value))}
            />
            <input
              type="number"
              min={0}
              max={360}
              step={1}
              value={selectedImageRotation}
              onChange={(e) => setSelectedImageRotation?.(Number(e.target.value) || 0)}
            />
          </div>

          <div className="properties-panel__field">
            <label>Crop X</label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={selectedImageCropX}
              onChange={(e) => setSelectedImageCropX?.(Number(e.target.value))}
            />
          </div>

          <div className="properties-panel__field">
            <label>Crop Y</label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={selectedImageCropY}
              onChange={(e) => setSelectedImageCropY?.(Number(e.target.value))}
            />
          </div>

          <div className="properties-panel__field">
            <label>Crop Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={selectedImageCropScale}
              onChange={(e) => setSelectedImageCropScale?.(Number(e.target.value))}
            />
            <input
              type="number"
              min={1}
              max={3}
              step={0.01}
              value={selectedImageCropScale}
              onChange={(e) =>
                setSelectedImageCropScale?.(Number(e.target.value) || 1)
              }
            />
          </div>

          <div className="properties-panel__actions">
            <button type="button" onClick={onDuplicateSelectedImage}>
              Duplicate
            </button>

            <button
              type="button"
              className="properties-panel__danger"
              onClick={onDeleteSelectedImage}
            >
              Delete
            </button>
          </div>
        </Section>
      </div>
    );
  }

  if (selectedId === "links") {
    return (
      <div className="properties-panel">
        <Section
          title="Links"
          subtitle="Link management currently lives in the main toolbox column."
        >
          <ToggleRow
            checked={showRaster}
            onChange={setShowRaster}
            label="Show raster in preview"
          />
        </Section>
      </div>
    );
  }

  return (
    <div className="properties-panel">
      <Section
        title={selectedId}
        subtitle="More granular controls can be added here when this element supports them."
      >
        <ToggleRow
          checked={showRaster}
          onChange={setShowRaster}
          label="Show raster in preview"
        />
      </Section>
    </div>
  );
}
