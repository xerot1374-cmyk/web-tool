type EditorStatusMessageProps = {
  successMsg?: string;
  errorMsg?: string;
};

export default function EditorStatusMessage({
  successMsg,
  errorMsg,
}: EditorStatusMessageProps) {
  if (!successMsg && !errorMsg) return null;

  return (
    <>
      {successMsg ? (
        <div className="editor-msg editor-msg--success">{successMsg}</div>
      ) : null}
      {errorMsg ? (
        <div className="editor-msg editor-msg--error">{errorMsg}</div>
      ) : null}
    </>
  );
}
