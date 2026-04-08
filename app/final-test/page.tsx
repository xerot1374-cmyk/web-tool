"use client";

import { useState } from "react";

export default function FinalTestPage() {
  const [file, setFile] = useState<File | null>(null);
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

  const generate = async () => {
    if (!file) return alert("اول یک ویدئو انتخاب کن");
    setLoading(true);

    try {
      const form = new FormData();
      form.append("data", JSON.stringify(data));
      form.append("video", file); // ✅ اسم فیلد باید video باشد

      const res = await fetch("/api/video/final", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        alert(text);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "final.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button onClick={generate} disabled={loading} style={{ marginLeft: 12 }}>
        {loading ? "Generating..." : "Generate final.mp4"}
      </button>
    </div>
  );
}
