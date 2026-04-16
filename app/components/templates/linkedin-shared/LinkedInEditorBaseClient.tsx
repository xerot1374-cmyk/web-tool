"use client";

import type React from "react";
import "@/app/lib/editor/editor.css";

type Props = {
  title: string;
  successMsg?: string;
  errorMsg?: string;
  children: React.ReactNode; // Contains the preview + toolbox layout.
};

export default function LinkedInEditorBaseClient({
  title,
  successMsg,
  errorMsg,
  children,
}: Props) {
  return (
    <main className="editor-page">
      <div className="editor-page-topbar">
        <div className="editor-page-intro">
          <span className="editor-page-kicker">Creative Studio</span>
          <h1 className="editor-page-title">{title}</h1>
          <p className="editor-page-description">
            Shape layout, spacing, typography, and export-ready content from one
            professional workspace.
          </p>
        </div>
      </div>

      {successMsg ? <div className="editor-msg editor-msg--success">{successMsg}</div> : null}
      {errorMsg ? <div className="editor-msg editor-msg--error">{errorMsg}</div> : null}

      {children}
    </main>
  );
}
