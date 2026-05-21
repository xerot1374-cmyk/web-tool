import EditorStatusMessage from "@/app/components/templates/linkedin-shared/EditorStatusMessage";
import type { BoxTextStyle, TextMark } from "../lib/templateA.types";

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
        <span key={`caption-${pos}`}>{text.slice(pos, mark.start)}</span>,
      );
    }

    out.push(
      <span
        key={`caption-mark-${mark.start}-${mark.end}-${index}`}
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
    out.push(<span key={`caption-${pos}`}>{text.slice(pos)}</span>);
  }

  return out;
}

type TemplateAExportPanelProps = {
  loadingPdf: boolean;
  hasVideo: boolean;
  finalLoading: boolean;
  finalUrl: string | null;
  caption: string;
  captionMarks: TextMark[];
  captionStyle: BoxTextStyle;
  copied: boolean;
  successMsg?: string;
  errorMsg?: string;
  captionRef: React.RefObject<HTMLTextAreaElement | null>;
  onCaptionChange: (value: string, selectionStart: number | null) => void;
  onCaptionFocus: () => void;
  onCaptionKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onCopyCaption: () => void;
  onDownloadPdf: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onGenerateFinal: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export default function TemplateAExportPanel({
  loadingPdf,
  hasVideo,
  finalLoading,
  finalUrl,
  caption,
  captionMarks,
  captionStyle,
  copied,
  successMsg,
  errorMsg,
  captionRef,
  onCaptionChange,
  onCaptionFocus,
  onCaptionKeyDown,
  onCopyCaption,
  onDownloadPdf,
  onGenerateFinal,
}: TemplateAExportPanelProps) {
  return (
    <div className="export-actions-panel">
      <div className="export-actions-panel__header">
        <h3>Export</h3>
        <p>Generate or download the final content.</p>
      </div>

      <div className="export-actions-panel__actions">
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={loadingPdf || hasVideo}
          className="tb__action tb__action--primary"
        >
          {loadingPdf ? "Generating PDF..." : "Download PDF"}
        </button>
        {hasVideo ? (
          <p className="export-actions-panel__hint">
            PDF export is disabled while a video object is on the canvas. Please
            use Generate final.mp4.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onGenerateFinal}
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

      <EditorStatusMessage successMsg={successMsg} errorMsg={errorMsg} />

      <div className="tb__section" style={{ marginTop: 16 }}>
        <div className="tb__sectionTitle">
          <span>Caption</span>
          <span className="tb__sectionMeta">Social copy</span>
        </div>

        <textarea
          ref={captionRef}
          className="editor-textarea"
          style={{
            fontFamily: captionStyle.fontFamily,
            fontSize: captionStyle.fontSize,
            color: captionStyle.color,
            textAlign: captionStyle.textAlign,
          }}
          value={caption}
          onChange={(e) =>
            onCaptionChange(e.target.value, e.target.selectionStart)
          }
          onFocus={onCaptionFocus}
          onSelect={onCaptionFocus}
          onDoubleClick={onCaptionFocus}
          onKeyDown={onCaptionKeyDown}
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
                onClick={onCopyCaption}
                className="tb__copyBtn"
              >
                {copied ? "Copied" : "Copy Caption"}
              </button>
            </div>

            <div
              className="tb__captionText"
              style={{
                fontFamily: captionStyle.fontFamily,
                fontSize: captionStyle.fontSize,
                color: captionStyle.color,
                textAlign: captionStyle.textAlign,
              }}
            >
              {renderMarkedText(caption, captionMarks)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
