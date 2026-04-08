"use client";

import type React from "react";

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
  return (
    <div className="editor-layout-4col">
      <aside className="editor-toolbar">{toolbar}</aside>
      <aside className="editor-panel editor-panel--sticky">{toolbox}</aside>
      <main className="editor-preview">{preview}</main>
      <aside className="editor-properties">{properties}</aside>
    </div>
  );
}