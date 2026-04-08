"use client";

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

function TextControls({
  title,
  text,
  setText,
  style,
  setStyle,
  showTextInput = true,
}: {
  title: string;
  text: string;
  setText?: (v: string) => void;
  style: BoxTextStyle;
  setStyle: (updater: (prev: BoxTextStyle) => BoxTextStyle) => void;
  showTextInput?: boolean;
}) {
  return (
    <div className="properties-panel">
      <h3>{title}</h3>

      {showTextInput && setText ? (
        <>
          <label>Text</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
        </>
      ) : null}

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

      <label>Color</label>
      <input
        type="color"
        value={style.color}
        onChange={(e) =>
          setStyle((prev) => ({ ...prev, color: e.target.value }))
        }
      />

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
  );
}

function RowButtons({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}
    >
      {children}
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
    return (
      <div className="properties-panel">
        <h3>Properties</h3>

        <label>Raster / Grid</label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <input
            type="checkbox"
            checked={showRaster}
            onChange={(e) => setShowRaster?.(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: "#374151" }}>
            Show raster in preview
          </span>
        </div>

        <p style={{ opacity: 0.6, margin: 0 }}>Select an element</p>
      </div>
    );
  }

  if (selectedId === "title") {
    return (
      <TextControls
        title="Title"
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
        <h3>Image</h3>

        <label>Raster / Grid</label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <input
            type="checkbox"
            checked={showRaster}
            onChange={(e) => setShowRaster?.(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: "#374151" }}>
            Show raster in preview
          </span>
        </div>

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

        <label>Crop X</label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={selectedImageCropX}
          onChange={(e) => setSelectedImageCropX?.(Number(e.target.value))}
        />

        <label>Crop Y</label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={selectedImageCropY}
          onChange={(e) => setSelectedImageCropY?.(Number(e.target.value))}
        />

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

        <RowButtons>
          <button
            type="button"
            onClick={onDuplicateSelectedImage}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Duplicate
          </button>

          <button
            type="button"
            onClick={onDeleteSelectedImage}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Delete
          </button>
        </RowButtons>
      </div>
    );
  }

  if (selectedId === "links") {
    return (
      <div className="properties-panel">
        <h3>Links</h3>

        <label>Raster / Grid</label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <input
            type="checkbox"
            checked={showRaster}
            onChange={(e) => setShowRaster?.(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: "#374151" }}>
            Show raster in preview
          </span>
        </div>

        <p style={{ opacity: 0.6, margin: 0 }}>
          Links are managed in the toolbox for now.
        </p>
      </div>
    );
  }

  return (
    <div className="properties-panel">
      <h3>{selectedId}</h3>

      <label>Raster / Grid</label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <input
          type="checkbox"
          checked={showRaster}
          onChange={(e) => setShowRaster?.(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        <span style={{ fontSize: 13, color: "#374151" }}>
          Show raster in preview
        </span>
      </div>

      <p style={{ opacity: 0.6, margin: 0 }}>No settings yet.</p>
    </div>
  );
}