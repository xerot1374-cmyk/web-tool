"use client";

import React, { useMemo, useRef, useCallback } from "react";

export type MediaBox = {
  x: number;
  y: number;
  w: number;
  h: number;
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

export type RasterMode = "none" | "grid" | "dots" | "cross" | "blueprint";

export type LinkedInTemplate2Data = {
  profileImage: string;
  name: string;
  role: string;

  productImage?: string;
  productImages?: ImageItem[];

  badgeText?: string;

  linkTitle?: string;
  company?: string;
  companyLogo?: string;

  headline?: string;
  subline?: string;
  bodyText?: string;
  bodyMarks?: TextMark[];
  captionMarks?: TextMark[];

  titleStyle?: {
    fontFamily: string;
    fontSize: number;
    color: string;
    textAlign?: "left" | "center" | "right";
  };

  badgeStyle?: {
    fontFamily: string;
    fontSize: number;
    color: string;
    textAlign?: "left" | "center" | "right";
  };

  bodyStyle?: {
    fontFamily: string;
    fontSize: number;
    color: string;
    textAlign?: "left" | "center" | "right";
  };

  companyStyle?: {
    fontFamily: string;
    fontSize: number;
    color: string;
    textAlign?: "left" | "center" | "right";
  };

  headlineStyle?: {
    fontFamily: string;
    fontSize: number;
    color: string;
    textAlign?: "left" | "center" | "right";
  };

  sublineStyle?: {
    fontFamily: string;
    fontSize: number;
    color: string;
    textAlign?: "left" | "center" | "right";
  };

  linkUrl?: string | string[];
  linkUrls?: string[];

  productOrientation?: "landscape" | "portrait";
  productAlign?: "left" | "center" | "right";
  mediaBox?: MediaBox;

  canvasPreset?: "linkedin" | "instagram" | "instagramStory";

  showRaster?: boolean;
  rasterMode?: RasterMode;
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

type Props = {
  data: LinkedInTemplate2Data;
  mode: "edit" | "preview" | "export";
  scale?: number;

  onFieldChange?: (key: keyof LinkedInTemplate2Data, value: string) => void;
  onPickProductImage?: (file: File) => void;
};

function safeScale(scale?: number) {
  return Number.isFinite(scale) && (scale as number) > 0 ? (scale as number) : 1;
}

function linkLabel(linkUrl: string) {
  try {
    const u = new URL(linkUrl);
    return u.host.replace(/^www\./, "");
  } catch {
    return linkUrl;
  }
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const clean = (v?: string) => (v?.trim() ? v.trim() : "");

function EditableInput({
  value,
  placeholder,
  className,
  onChange,
}: {
  value: string;
  placeholder: string;
  className: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        outline: "none",
        padding: 0,
        margin: 0,
      }}
    />
  );
}

function EditableTextarea({
  value,
  placeholder,
  className,
  onChange,
  rows = 6,
}: {
  value: string;
  placeholder: string;
  className: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      rows={rows}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        outline: "none",
        resize: "none",
        padding: 0,
        margin: 0,
      }}
    />
  );
}

function renderMarkedText(text: string, marks?: TextMark[]) {
  const t = String(text ?? "");
  if (!marks || marks.length === 0) return t;

  const safeMarks = marks
    .map((m) => ({
      start: Math.max(0, Math.min(m.start, t.length)),
      end: Math.max(0, Math.min(m.end, t.length)),
      style: m.style ?? {},
    }))
    .filter((m) => m.end > m.start)
    .sort((a, b) => a.start - b.start);

  const out: React.ReactNode[] = [];
  let pos = 0;

  for (let i = 0; i < safeMarks.length; i++) {
    const m = safeMarks[i];

    if (m.start > pos) {
      out.push(<React.Fragment key={`t-${pos}`}>{t.slice(pos, m.start)}</React.Fragment>);
    }

    const chunk = t.slice(m.start, m.end);
    const style: React.CSSProperties = {
      fontFamily: m.style.fontFamily,
      fontSize: m.style.fontSize,
      color: m.style.color,
      background: m.style.highlight ? "rgba(250,204,21,0.18)" : undefined,
    };

    out.push(
      <span key={`m-${m.start}-${m.end}-${i}`} style={style}>
        {chunk}
      </span>
    );

    pos = m.end;
  }

  if (pos < t.length) {
    out.push(<React.Fragment key={`t-${pos}-end`}>{t.slice(pos)}</React.Fragment>);
  }

  return out;
}

function getCropValues(img: ImageItem) {
  return {
    cropX: Number.isFinite(img.cropX) ? Number(img.cropX) : 50,
    cropY: Number.isFinite(img.cropY) ? Number(img.cropY) : 50,
    cropScale: Number.isFinite(img.cropScale) ? Number(img.cropScale) : 1,
  };
}

function getEffectiveRasterMode(
  mode?: RasterMode,
  legacyShowRaster?: boolean
): RasterMode {
  if (mode && mode !== "none") return mode;
  if (legacyShowRaster) return "grid";
  return "none";
}

export default function LinkedInTemplate2Renderer({
  data,
  mode,
  scale = 1,
  onFieldChange,
  onPickProductImage,
}: Props) {
  const s = safeScale(scale);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isEdit = mode === "edit";
  const isPreviewLike = mode === "preview" || mode === "edit";

  const images = useMemo<ImageItem[]>(() => {
    if (Array.isArray(data.productImages) && data.productImages.length) {
      return data.productImages.filter((img) => Boolean(img?.src));
    }

    if (data.productImage) {
      const fallback: ImageItem = {
        id: "legacy-single-image",
        src: data.productImage,
        orientation: data.productOrientation ?? "landscape",
        x: data.mediaBox?.x ?? 420,
        y: data.mediaBox?.y ?? 240,
        w: data.mediaBox?.w ?? 240,
        h: data.mediaBox?.h ?? 240,
        rotation: 0,
        cropX: 50,
        cropY: 50,
        cropScale: 1,
      };
      return [fallback];
    }

    return [];
  }, [data.productImages, data.productImage, data.productOrientation, data.mediaBox]);

  const hasProductImage = images.length > 0;

  const vBadge = isEdit ? (data.badgeText ?? "") : clean(data.badgeText);
  const vTitle = isEdit ? (data.linkTitle ?? "") : clean(data.linkTitle);
  const vCompany = isEdit ? (data.company ?? "") : clean(data.company);
  const vHeadline = isEdit ? (data.headline ?? "") : clean(data.headline);
  const vSubline = isEdit ? (data.subline ?? "") : clean(data.subline);
  const vBody = isEdit ? (data.bodyText ?? "") : clean(data.bodyText);

  const vLink = useMemo(() => {
    if (!isEdit) return "";
    const raw = data.linkUrl;
    if (Array.isArray(raw)) return raw.join("\n");
    return raw ?? "";
  }, [isEdit, data.linkUrl]);

  const urls = useMemo((): string[] => {
    if (Array.isArray(data.linkUrls) && data.linkUrls.length) {
      return data.linkUrls.map((s) => String(s).trim()).filter(Boolean);
    }

    if (Array.isArray(data.linkUrl) && data.linkUrl.length) {
      return data.linkUrl.map((s) => String(s).trim()).filter(Boolean);
    }

    const raw = typeof data.linkUrl === "string" ? data.linkUrl : "";
    return String(raw)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [data.linkUrls, data.linkUrl]);

  const linkText = useMemo(() => (urls[0] ? linkLabel(urls[0]) : ""), [urls]);

  const setField = useCallback(
    (key: keyof LinkedInTemplate2Data, value: string) => {
      onFieldChange?.(key, value);
    },
    [onFieldChange]
  );

  const canPickImage = isEdit && typeof onPickProductImage === "function";

  const openFilePicker = useCallback(() => {
    if (!canPickImage) return;
    fileRef.current?.click();
  }, [canPickImage]);

  const onFilePicked = useCallback(
    (file: File | null) => {
      if (!file) return;
      onPickProductImage?.(file);
    },
    [onPickProductImage]
  );

  const presetClass =
    data.canvasPreset === "instagramStory"
      ? "story"
      : data.canvasPreset === "instagram"
      ? "instagram"
      : "linkedin";

  const rasterMode = getEffectiveRasterMode(data.rasterMode, data.showRaster);

  return (
    <div
      className={cx(
        "li2-viewport",
        `li2-viewport--${presetClass}`,
        isPreviewLike && "li2-viewport--autoHeight"
      )}
      style={{
        ["--li2-scale" as any]: String(s),
      }}
    >
      <div
        className={cx(
          "li2-root",
          `li2-root--${presetClass}`,
          "li2-theme-cream",
          isPreviewLike && "li2-root--autoHeight",
          isEdit && "li2-root--editing"
        )}
        style={{
          position: "relative",
        }}
      >
        {rasterMode !== "none" ? (
          <div
            className={cx("li2-raster", `li2-raster--${rasterMode}`)}
            aria-hidden="true"
          />
        ) : null}

        <div
          className={cx(
            "li2-header",
            hasProductImage ? "li2-header--hasimg" : "li2-header--noimg"
          )}
        >
          {images.map((img) => {
            const crop = getCropValues(img);
            const imageOrientationClass =
              img.orientation === "portrait"
                ? "li2-productFrame--portrait"
                : "li2-productFrame--landscape";

            const alignClass =
              data.productAlign === "left"
                ? "li2-productSlot--left"
                : data.productAlign === "right"
                ? "li2-productSlot--right"
                : "li2-productSlot--center";

            return (
              <div
                key={img.id}
                className={cx("li2-productSlot", alignClass)}
                data-select="productImage"
                data-image-id={img.id}
                style={{
                  position: "absolute",
                  left: img.x,
                  top: img.y,
                  width: img.w,
                  height: img.h,
                  zIndex: 2,
                  pointerEvents: "auto",
                  transform: "none",
                  right: "auto",
                  bottom: "auto",
                  margin: 0,
                }}
                onClick={canPickImage ? openFilePicker : undefined}
                title={canPickImage ? "Click to add/change image" : undefined}
              >
                <div
                  className={cx("li2-productFrame", imageOrientationClass)}
                  style={{
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    display: "block",
                    overflow: "hidden",
                    position: "relative",
                    left: "auto",
                    top: "auto",
                    transform: `rotate(${img.rotation ?? 0}deg)`,
                    transformOrigin: "center center",
                    borderRadius: 20,
                    background: "transparent",
                    border: "1px solid rgba(15,23,42,0.10)",
                  }}
                >
                  <img
                    className="li2-productImg li2-productImg--cropped"
                    src={img.src}
                    alt="product"
                    draggable={false}
                    style={{
                      position: "absolute",
                      left: `${crop.cropX}%`,
                      top: `${crop.cropY}%`,
                      width: `${crop.cropScale * 100}%`,
                      height: `${crop.cropScale * 100}%`,
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
              </div>
            );
          })}

          {canPickImage ? (
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
            />
          ) : null}

          {data.companyLogo ? (
            <img
              src={data.companyLogo}
              alt="Company logo"
              className="li2-companyLogo"
            />
          ) : null}

          <div
            className="li2-badge"
            data-select="badge"
            style={{
              minWidth: 120,
              fontFamily: data.badgeStyle?.fontFamily,
              fontSize: data.badgeStyle?.fontSize,
              color: data.badgeStyle?.color,
              textAlign: data.badgeStyle?.textAlign,
              pointerEvents: "auto",
            }}
          >
            {vBadge || "\u00A0"}
          </div>

          <div className="li2-userTop">
            <div className="li2-userTopMeta">
              <div className="li2-userTopName" title={data.name}>
                {data.name}
              </div>
              <div className="li2-userTopRole" title={data.role}>
                {data.role}
              </div>
            </div>

            <div className="li2-avatarWrap">
              <img className="li2-avatar" src={data.profileImage} alt="profile" />
            </div>
          </div>
        </div>

        <div
          className={cx(
            "li2-content",
            isPreviewLike && "li2-content--autoHeight"
          )}
        >
          {vTitle ? (
            <div
              className="li2-linkTitle"
              data-select="title"
              style={{
                fontFamily: data.titleStyle?.fontFamily,
                fontSize: data.titleStyle?.fontSize,
                color: data.titleStyle?.color,
                textAlign: data.titleStyle?.textAlign,
              }}
            >
              {vTitle || "\u00A0"}
            </div>
          ) : null}

          {isEdit ? (
            <div
              className="li2-company"
              data-select="company"
              style={{
                fontFamily: data.companyStyle?.fontFamily,
                fontSize: data.companyStyle?.fontSize,
                color: data.companyStyle?.color,
                textAlign: data.companyStyle?.textAlign,
              }}
            >
              <EditableInput
                value={vCompany}
                placeholder="Company"
                className="li2-company"
                onChange={(val) => setField("company", val)}
              />
            </div>
          ) : vCompany ? (
            <div
              className="li2-company"
              data-select="company"
              style={{
                fontFamily: data.companyStyle?.fontFamily,
                fontSize: data.companyStyle?.fontSize,
                color: data.companyStyle?.color,
                textAlign: data.companyStyle?.textAlign,
              }}
            >
              {vCompany}
            </div>
          ) : null}

          {isEdit ? (
            <div
              className="li2-headline"
              data-select="headline"
              style={{
                fontFamily: data.headlineStyle?.fontFamily,
                fontSize: data.headlineStyle?.fontSize,
                color: data.headlineStyle?.color,
                textAlign: data.headlineStyle?.textAlign,
              }}
            >
              <EditableInput
                value={vHeadline}
                placeholder="Headline"
                className="li2-headline"
                onChange={(val) => setField("headline", val)}
              />
            </div>
          ) : vHeadline ? (
            <div
              className="li2-headline"
              data-select="headline"
              style={{
                fontFamily: data.headlineStyle?.fontFamily,
                fontSize: data.headlineStyle?.fontSize,
                color: data.headlineStyle?.color,
                textAlign: data.headlineStyle?.textAlign,
              }}
            >
              {vHeadline}
            </div>
          ) : null}

          {isEdit ? (
            <div
              className="li2-subline"
              data-select="subline"
              style={{
                fontFamily: data.sublineStyle?.fontFamily,
                fontSize: data.sublineStyle?.fontSize,
                color: data.sublineStyle?.color,
                textAlign: data.sublineStyle?.textAlign,
              }}
            >
              <EditableInput
                value={vSubline}
                placeholder="Subline"
                className="li2-subline"
                onChange={(val) => setField("subline", val)}
              />
            </div>
          ) : vSubline ? (
            <div
              className="li2-subline"
              data-select="subline"
              style={{
                fontFamily: data.sublineStyle?.fontFamily,
                fontSize: data.sublineStyle?.fontSize,
                color: data.sublineStyle?.color,
                textAlign: data.sublineStyle?.textAlign,
              }}
            >
              {vSubline}
            </div>
          ) : null}

          {isEdit ? (
            <div
              className="li2-body"
              data-select="body"
              style={{
                fontFamily: data.bodyStyle?.fontFamily,
                fontSize: data.bodyStyle?.fontSize,
                color: data.bodyStyle?.color,
                textAlign: data.bodyStyle?.textAlign,
              }}
            >
              <EditableTextarea
                value={vBody}
                placeholder="Body"
                className="li2-body"
                onChange={(val) => setField("bodyText", val)}
                rows={6}
              />
            </div>
          ) : vBody ? (
            <div
              className="li2-body"
              data-select="body"
              style={{
                fontFamily: data.bodyStyle?.fontFamily,
                fontSize: data.bodyStyle?.fontSize,
                color: data.bodyStyle?.color,
                textAlign: data.bodyStyle?.textAlign,
              }}
            >
              {renderMarkedText(vBody, data.bodyMarks)}
            </div>
          ) : null}

          {isEdit ? (
            <div className="li2-linkRow" data-select="links">
              <EditableInput
                value={vLink}
                placeholder="Link (optional)"
                className="li2-link"
                onChange={(val) => setField("linkUrl", val)}
              />
            </div>
          ) : urls.length ? (
            <div className="li2-linkRow" data-select="links">
              {urls.length === 1 ? (
                <a className="li2-link" href={urls[0]} target="_blank" rel="noreferrer">
                  {linkText}
                  <span className="li2-linkArrow" aria-hidden="true">
                    {" "}
                    →
                  </span>
                </a>
              ) : (
                <div className="li2-linksList">
                  {urls.map((u, i) => (
                    <a
                      key={`${u}-${i}`}
                      className="li2-link"
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "inline-block", marginRight: 12 }}
                    >
                      {linkLabel(u)}
                      <span className="li2-linkArrow" aria-hidden="true">
                        {" "}
                        →
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="li2-bottom">
          <div className="li2-bottomLeft">
            <img className="li2-profileMini" src={data.profileImage} alt="profile-small" />
            <div className="li2-bottomMeta">
              <div className="li2-bottomName" title={data.name}>
                {data.name}
              </div>
              <div className="li2-bottomRole" title={data.role}>
                {data.role}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}