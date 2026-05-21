import LexicalInlineEditor, {
  type LexicalInlineEditorHandle,
  type RichTextBlock,
  type TextMark,
} from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import EditorStatusMessage from "@/app/components/templates/linkedin-shared/EditorStatusMessage";
import type { BoxTextStyle } from "../lib/templateA.types";

type TemplateAExportPanelProps = {
  loadingPdf: boolean;
  hasVideo: boolean;
  finalLoading: boolean;
  finalUrl: string | null;
  caption: string;
  captionMarks: TextMark[];
  captionBlocks: RichTextBlock[];
  captionStyle: BoxTextStyle;
  copied: boolean;
  successMsg?: string;
  errorMsg?: string;
  captionEditorRef: React.RefObject<LexicalInlineEditorHandle | null>;
  captionSectionRef: React.RefObject<HTMLDivElement | null>;
  onCaptionBlur: () => void;
  onCaptionFocus: () => void;
  onCaptionChange: (payload: {
    text: string;
    marks: TextMark[];
    blocks: RichTextBlock[];
    html: string;
  }) => void;
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
  captionBlocks,
  captionStyle,
  copied,
  successMsg,
  errorMsg,
  captionEditorRef,
  captionSectionRef,
  onCaptionBlur,
  onCaptionFocus,
  onCaptionChange,
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

      <div
        ref={captionSectionRef}
        className="tb__section"
        style={{ marginTop: 16 }}
      >
        <div className="tb__captionPreviewHeader">
          <div className="tb__sectionTitle" style={{ marginBottom: 0 }}>
            <span>Caption</span>
          </div>
          <button
            type="button"
            onClick={onCopyCaption}
            className="tb__copyBtn"
          >
            {copied ? "Copied" : "Copy Caption"}
          </button>
        </div>

        <div className="tb__hint">{caption.length} characters</div>

        <LexicalInlineEditor
          ref={captionEditorRef}
          text={caption}
          marks={captionMarks}
          blocks={captionBlocks}
          multiline={true}
          className="editor-textarea template-captionEditor"
          style={{
            fontFamily: captionStyle.fontFamily,
            fontSize: captionStyle.fontSize,
            color: captionStyle.color,
            textAlign: captionStyle.textAlign,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
          onAlignChange={() => {}}
          onChange={onCaptionChange}
          onBlur={onCaptionBlur}
          onKeyDown={() => {}}
          onKeyUp={() => {}}
          onPointerDown={() => onCaptionFocus()}
          onMouseDown={() => onCaptionFocus()}
          onMouseUp={() => {}}
          onClick={() => onCaptionFocus()}
          onDoubleClick={() => onCaptionFocus()}
        />
      </div>
    </div>
  );
}
