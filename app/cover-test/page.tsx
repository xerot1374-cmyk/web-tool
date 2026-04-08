"use client";

export default function CoverTestPage() {
  const data = {
    profileImage: "/profile.jpg",
    name: "Max Mustermann",
    role: "Marketing Manager",
    title: "5 Learnings aus unserem letzten Projekt",
    body: "Learning 1\nLearning 2\nLearning 3",
    companyLogo: "/logo.png",
    link: "https://example.com",
  };

  const downloadCover = async () => {
    const res = await fetch("/api/video/cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
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
    a.download = "cover.mp4";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 40 }}>
      <button onClick={downloadCover}>Download cover.mp4</button>
    </div>
  );
}

