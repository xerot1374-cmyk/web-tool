import EditorStatusMessage from "@/app/components/templates/linkedin-shared/EditorStatusMessage";

type TemplateAExportPanelProps = {
  loadingPdf: boolean;
  hasVideo: boolean;
  finalLoading: boolean;
  finalUrl: string | null;
  draftStatus: "idle" | "saving" | "saved" | "error";
  draftStatusMessage?: string;
  successMsg?: string;
  errorMsg?: string;
  onDownloadPdf: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onGenerateFinal: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export default function TemplateAExportPanel({
  loadingPdf,
  hasVideo,
  finalLoading,
  finalUrl,
  draftStatus,
  draftStatusMessage,
  successMsg,
  errorMsg,
  onDownloadPdf,
  onGenerateFinal,
}: TemplateAExportPanelProps) {
  return (
    <div className="export-actions-panel">
      <div className="export-actions-panel__header">
        <h3>Export</h3>
        <p>Generate or download the final content.</p>
        {draftStatusMessage ? (
          <p
            className={
              draftStatus === "error"
                ? "export-actions-panel__draftStatus export-actions-panel__draftStatus--error"
                : "export-actions-panel__draftStatus"
            }
          >
            {draftStatusMessage}
          </p>
        ) : null}
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
    </div>
  );
}
