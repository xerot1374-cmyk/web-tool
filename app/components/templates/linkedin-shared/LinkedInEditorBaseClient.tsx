"use client";

import type React from "react";
import "@/app/lib/editor/editor.css";

type Props = {
  title: string;
  children: React.ReactNode; // Contains the preview + toolbox layout.
};

export default function LinkedInEditorBaseClient({
  title,
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

      {children}
    </main>
  );
}
