"use client";

import { useState } from "react";
import TemplateBase from "../../../components/templates/linkedin-shared/TemplateBase";

const styleOptions = [
  { id: "template-style-1", label: "Clean White" },
  { id: "template-style-2", label: "Dark Bold" },
  { id: "template-style-3", label: "Gradient" },
  { id: "template-style-4", label: "Corporate Blue" },
];

export default function TemplateB() {
  const [style, setStyle] = useState("template-style-2"); // B: default dark

  const [headline, setHeadline] = useState(
    "Starkes Statement von Protos 3D"
  );
  const [subline, setSubline] = useState("Kurzer Insight oder starkes Zitat.");
  const [body, setBody] = useState(
    "Hier steht ein kurzer, prÃ¤gnanter Text â€“ z.B. ein Learning oder eine These."
  );
  const [cta, setCta] = useState("Diskussion starten");

  const [caption, setCaption] = useState(
    "ðŸ’¡ Starkes Statement von Protos 3D.\nMehr dazu: https://protos3d.de\n#protos3d #3dprinting #innovation"
  );

  return (
    <main className="app-container">
      <div className="content-wrapper">
        <h1 className="main-heading">Template B â€“ Statement Layout</h1>
        <p className="description">
          Links: Inhalte & Style â€“ Rechts: Statement-Design
        </p>

        <div className="editor-layout">
          {/* Left: form + style + caption */}
          <div className="editor-panel">
            <h2>Inhalte & Style</h2>

            {/* Style selection */}
            <div className="editor-field">
              <label className="editor-label">Design-Stil</label>
              <select
                className="editor-input"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                {styleOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Headline */}
            <div className="editor-field">
              <label className="editor-label">Headline</label>
              <input
                className="editor-input"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>

            {/* Subline */}
            <div className="editor-field">
              <label className="editor-label">Subline</label>
              <input
                className="editor-input"
                value={subline}
                onChange={(e) => setSubline(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="editor-field">
              <label className="editor-label">Body-Text</label>
              <textarea
                className="editor-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            {/* CTA */}
            <div className="editor-field">
              <label className="editor-label">Call-to-Action</label>
              <input
                className="editor-input"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
              />
            </div>

            {/* Caption */}
            <div className="editor-field">
              <label className="editor-label">Caption (fÃ¼r LinkedIn)</label>
              <textarea
                className="editor-textarea"
                style={{ minHeight: "120px", whiteSpace: "pre-wrap" }}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <p style={{ fontSize: "12px", color: "#6b7280" }}>
              Links & Hashtags werden in LinkedIn automatisch klickbar.
            </p>
          </div>

          {/* Right: preview with TemplateBase */}
          <div>
            <TemplateBase
              headline={headline}
              subline={subline}
              body={body}
              cta={cta}
              variant={style}
            />

            <div
              style={{
                marginTop: "16px",
                fontSize: "12px",
                color: "#e5e7eb",
                whiteSpace: "pre-wrap",
              }}
            >
              <strong>Vorschlag Caption:</strong>
              <br />
              {caption}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
