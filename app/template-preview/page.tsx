"use client";

import { useState } from "react";
import LinkedInTemplate2 from "@/app/components/templates/linkedin/LinkedInTemplate2";

export default function TemplatePreviewPage() {
  const [loading, setLoading] = useState(false);

  const data = {
    profileImage: "/profile.jpg",
    name: "Max Mustermann",
    role: "Marketing Manager",
    title: "5 Learnings aus unserem letzten Projekt",
    body: "Learning 1\nLearning 2\nLearning 3",
    companyLogo: "/logo.png",
    link: "https://example.com",
  };

  const downloadPDF = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), // ✅ فقط دیتا رو می‌فرستیم
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "PDF API failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "linkedin-template.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <button
        onClick={downloadPDF}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid #ddd",
          background: "#fff",
          cursor: "pointer",
          marginBottom: "12px",
        }}
      >
        {loading ? "Generating PDF..." : "Download PDF"}
      </button>

      {/* ✅ این فقط Preview ـه */}
      <LinkedInTemplate2 {...data} />
    </div>
  );
}
