import EditorStatusMessage from "@/app/components/templates/linkedin-shared/EditorStatusMessage";

type TemplateAExportPanelProps = {
  loadingPdf: boolean;
  hasVideo: boolean;
  videoUploadProgress: {
    active: boolean;
    percent: number;
    loadedBytes: number;
    totalBytes: number;
    fileName?: string;
    error?: string;
  } | null;
  finalLoading: boolean;
  finalProgress: {
    percent: number;
    elapsedSeconds: number;
    estimatedSeconds: number;
    wallElapsedSeconds: number;
  } | null;
  finalUrl: string | null;
  videoFrameRateHint?: string;
  draftStatus: "idle" | "saving" | "saved" | "error";
  draftStatusMessage?: string;
  successMsg?: string;
  errorMsg?: string;
  onDownloadPdf: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onGenerateFinal: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCancelFinal: () => void;
};

export default function TemplateAExportPanel({
  loadingPdf,
  hasVideo,
  videoUploadProgress,
  finalLoading,
  finalProgress,
  finalUrl,
  videoFrameRateHint,
  draftStatus,
  draftStatusMessage,
  successMsg,
  errorMsg,
  onDownloadPdf,
  onGenerateFinal,
  onCancelFinal,
}: TemplateAExportPanelProps) {
  const formatDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };
  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
  };

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
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDownloadPdf(event);
          }}
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

        {videoUploadProgress ? (
          <div
            className={`export-actions-panel__progress ${
              videoUploadProgress.error
                ? "export-actions-panel__progress--error"
                : ""
            }`}
            aria-label={`Video upload ${videoUploadProgress.percent}% complete`}
          >
            <div className="export-actions-panel__progressMeta">
              <span>
                {videoUploadProgress.error
                  ? "Upload failed"
                  : videoUploadProgress.active
                    ? "Uploading video"
                    : "Upload complete"}
              </span>
              <span>{videoUploadProgress.percent}%</span>
            </div>
            <div className="export-actions-panel__progressTrack">
              <div
                className="export-actions-panel__progressFill"
                style={{ width: `${videoUploadProgress.percent}%` }}
              />
            </div>
            <div className="export-actions-panel__progressDetail">
              {videoUploadProgress.error ? (
                videoUploadProgress.error
              ) : (
                <>
                  {formatBytes(videoUploadProgress.loadedBytes)} /{" "}
                  {formatBytes(videoUploadProgress.totalBytes)}
                </>
              )}
            </div>
          </div>
        ) : null}

        {videoFrameRateHint ? (
          <div className="export-actions-panel__notice">
            {videoFrameRateHint}
          </div>
        ) : null}

        <div className="export-actions-panel__row">
          <button
            type="button"
            onClick={onGenerateFinal}
            disabled={finalLoading || !hasVideo}
            className="tb__action tb__action--dark"
          >
            {finalLoading ? "Generating..." : "Generate final.mp4"}
          </button>
          {finalLoading ? (
            <button
              type="button"
              onClick={onCancelFinal}
              className="tb__action export-actions-panel__cancel"
            >
              Cancel
            </button>
          ) : null}
        </div>

        {finalProgress ? (
          <div
            className="export-actions-panel__progress"
            aria-label={`Final video generation ${finalProgress.percent}% complete`}
          >
            <div className="export-actions-panel__progressMeta">
              <span>{finalProgress.percent}%</span>
              <span>
                Video {formatDuration(finalProgress.elapsedSeconds)} /{" "}
                {formatDuration(finalProgress.estimatedSeconds)}
              </span>
            </div>
            <div className="export-actions-panel__progressTrack">
              <div
                className="export-actions-panel__progressFill"
                style={{ width: `${finalProgress.percent}%` }}
              />
            </div>
            <div className="export-actions-panel__progressDetail">
              Elapsed {formatDuration(finalProgress.wallElapsedSeconds)}
            </div>
          </div>
        ) : null}

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
