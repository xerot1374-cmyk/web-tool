"use client";

import type React from "react";
import "@/app/lib/editor/editor.css";

type Props = {
  title: string;
  onLogout: () => void;
  successMsg?: string;
  errorMsg?: string;
  children: React.ReactNode; // Contains the preview + toolbox layout.
};

export default function LinkedInEditorBaseClient({
  title,
  onLogout,
  successMsg,
  errorMsg,
  children,
}: Props) {
  return (
    <main className="editor-page">
      <div className="editor-page-topbar">
        <h1 className="editor-page-title">{title}</h1>
        <button type="button" onClick={onLogout} className="editor-logout-btn">
          logout
        </button>
      </div>

      {successMsg ? <div className="editor-msg editor-msg--success">{successMsg}</div> : null}
      {errorMsg ? <div className="editor-msg editor-msg--error">{errorMsg}</div> : null}

      {children}
    </main>
  );
}
