"use client";

import { useState } from "react";

export default function ProductIntroTemplatePage() {
  const [headline, setHeadline] = useState("Neues Produkt-Highlight");
  const [subline, setSubline] = useState("Kurz das wichtigste Feature erklären.");
  const [cta, setCta] = useState("Mehr erfahren");

  return (
    <main className="app-container">
      <div className="content-wrapper">
        <h1 className="main-heading">LinkedIn – Produktvorstellung</h1>
        <p className="description">
          Bearbeiten Sie die Texte und sehen Sie rechts die Vorschau des Templates.
        </p>

        <div className="editor-layout">
          {/* Panel چپ – فرم */}
          <div className="editor-panel">{/* دکمه‌ها */}
<div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>

  {/* دکمه برگشت */}
  <a
    href="/linkedin"
    style={{
      padding: "10px 18px",
      backgroundColor: "#e5e7eb",
      borderRadius: "8px",
      fontWeight: "600",
      textDecoration: "none",
      color: "#111827",
      flex: 1,
      textAlign: "center",
      cursor: "pointer"
    }}
  >
    ← Zurück
  </a>

  {/* دکمه Fake-Download */}
  <button
    onClick={() => alert("Download kommt später 😉")}
    style={{
      padding: "10px 18px",
      backgroundColor: "#4f46e5",
      color: "#ffffff",
      borderRadius: "8px",
      fontWeight: "600",
      flex: 1,
      border: "none",
      cursor: "pointer"
    }}
  >
    Download
  </button>
</div>

            <h2>Inhalte bearbeiten</h2>

            <div className="editor-field">
              <label className="editor-label">Headline</label>
              <input
                className="editor-input"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="z.B. Unser neues Produkt ist da!"
              />
            </div>

            <div className="editor-field">
              <label className="editor-label">Subline / Beschreibung</label>
              <textarea
                className="editor-textarea"
                value={subline}
                onChange={(e) => setSubline(e.target.value)}
                placeholder="Kurz erklären, was das Produkt besonders macht."
              />
            </div>

            <div className="editor-field">
              <label className="editor-label">Call-to-Action</label>
              <input
                className="editor-input"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="z.B. Mehr erfahren"
              />
            </div>
          </div>

          <div className="template-card">
            <div className="template-tag">Preview</div>
            <div className="template-title">{headline}</div>
            <div className="template-desc">{subline}</div>
            <div className="template-meta">Button: {cta}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
