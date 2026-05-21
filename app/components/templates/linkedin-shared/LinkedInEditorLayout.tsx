"use client";

import type React from "react";
import { createPortal } from "react-dom";

type Props = {
  toolbar?: React.ReactNode;
  toolbox: React.ReactNode;
  preview: React.ReactNode;
  properties?: React.ReactNode;
};

export default function LinkedInEditorLayout({
  toolbar,
  toolbox,
  preview,
  properties,
}: Props) {
  const portalTarget =
    typeof document === "undefined" ? null : document.body;

  return (
    <>
      <div
        className="editor-layout-4col editor-layout-4col--noToolbar"
      >
        <aside className="editor-panel editor-panel--sticky editor-shell-card">
          {toolbox}
        </aside>
        <main className="editor-preview">{preview}</main>
        <aside className="editor-properties editor-shell-card">
          {properties}
        </aside>
      </div>
      {toolbar && portalTarget
        ? createPortal(
            <div className="editor-bottomToolbarWrap">{toolbar}</div>,
            portalTarget,
          )
        : null}
    </>
  );
}
